#!/usr/bin/env node

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const PREFIX = 'protected-path:v1'
const KEY_ENV = 'REPORT_PATH_KEY'

function usage() {
  return `Usage:
  node scripts/protect-report-paths.mjs protect <input.json> <output.json>
  node scripts/protect-report-paths.mjs reveal  <input.json> <output.json>
  node scripts/protect-report-paths.mjs audit   <input.json>

Add --replace to protect/reveal to atomically replace an existing output.

Set ${KEY_ENV} to 64 hexadecimal characters (32 bytes):
  openssl rand -hex 32`
}

function readKey() {
  const encoded = process.env[KEY_ENV]
  if (!encoded || !/^[a-fA-F0-9]{64}$/.test(encoded)) {
    throw new Error(`${KEY_ENV} must contain exactly 64 hexadecimal characters.\n\n${usage()}`)
  }
  return Buffer.from(encoded, 'hex')
}

function protect(value, key) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [PREFIX, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join(':')
}

function reveal(value, key) {
  const [prefix, version, ivText, tagText, ciphertextText, ...extra] = value.split(':')
  if (`${prefix}:${version}` !== PREFIX || extra.length > 0 || !ivText || !tagText || ciphertextText === undefined) {
    throw new Error(`Invalid protected path: ${value}`)
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivText, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64url')),
    decipher.final()
  ]).toString('utf8')
}

function transform(value, mode, key, location = '$') {
  if (Array.isArray(value)) return value.map((item, index) => transform(item, mode, key, `${location}[${index}]`))
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(Object.entries(value).map(([field, item]) => {
    const itemLocation = `${location}.${field}`
    if (field === 'path') {
      if (typeof item !== 'string') throw new Error(`${itemLocation} must be a string`)
      const alreadyProtected = item.startsWith(`${PREFIX}:`)
      if (mode === 'protect') return [field, alreadyProtected ? item : protect(item, key)]
      return [field, alreadyProtected ? reveal(item, key) : item]
    }
    return [field, transform(item, mode, key, itemLocation)]
  }))
}

function audit(value, findings = [], location = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => audit(item, findings, `${location}[${index}]`))
    return findings
  }
  if (!value || typeof value !== 'object') return findings

  for (const [field, item] of Object.entries(value)) {
    const itemLocation = `${location}.${field}`
    if (field === 'path' && typeof item === 'string' && !item.startsWith(`${PREFIX}:`)) {
      findings.push({ severity: 'error', location: itemLocation, reason: 'unprotected path', value: item })
    } else if (typeof item === 'string' && /(?:src\/|\b(?:set|get|use)[A-Z]\w*|\w+Store\.|\w+Controller\.)/.test(item)) {
      findings.push({ severity: 'review', location: itemLocation, reason: 'possible source identifier in prose', value: item })
    } else {
      audit(item, findings, itemLocation)
    }
  }
  return findings
}

export { audit, protect, reveal, transform }

async function main() {
  const [mode, input, output, option] = process.argv.slice(2)
  if (!['protect', 'reveal', 'audit'].includes(mode) || !input || (mode !== 'audit' && !output)) {
    throw new Error(usage())
  }

  if (mode !== 'audit' && path.resolve(input) === path.resolve(output)) {
    throw new Error('Input and output must differ so the private source is not overwritten accidentally.')
  }

  const document = JSON.parse(await readFile(input, 'utf8'))
  if (mode === 'audit') {
    const findings = audit(document)
    for (const finding of findings) {
      console.log(`${finding.severity.toUpperCase()} ${finding.location}: ${finding.reason}\n  ${finding.value}`)
    }
    if (findings.some(finding => finding.severity === 'error')) process.exitCode = 1
    return
  }

  const result = transform(document, mode, readKey())
  if (result.anonymization && typeof result.anonymization === 'object') {
    result.anonymization.relativeSourcePathIncluded = mode === 'reveal'
    result.anonymization.pathProtection = mode === 'protect'
      ? 'AES-256-GCM field encryption (protected-path:v1)'
      : 'none; private working copy'
    result.anonymization.note = mode === 'protect'
      ? 'Source paths are encrypted. Line numbers and reviewed domain terminology are retained.'
      : 'Private working copy with relative source paths restored.'
  }
  await mkdir(path.dirname(path.resolve(output)), { recursive: true })
  const replace = option === '--replace'
  const temporaryOutput = replace ? `${output}.${process.pid}.tmp` : output
  await writeFile(temporaryOutput, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
  if (replace) await rename(temporaryOutput, output)
  console.log(`${mode === 'protect' ? 'Protected' : 'Revealed'} paths: ${input} -> ${output}`)
}

const isEntryPoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isEntryPoint) main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
