# Protecting source paths

Public reports must not contain source paths from the production application. The
`path` fields are encrypted independently with AES-256-GCM, so the rest of a report
remains readable and each path is authenticated against tampering.

Generate a 32-byte key once and keep it outside Git:

```sh
openssl rand -hex 32
```

Store it as `REPORT_PATH_KEY` in a local `.env`. Load that file into the shell or use
Node's `--env-file=.env` option. Keep the clear report under the ignored
`.private-reports/` directory, then create the public copy:

```sh
node --env-file=.env scripts/protect-report-paths.mjs protect \
  .private-reports/state-ownership-classification.json \
  reports/state-ownership-classification.json \
  --replace
```

To use a public report with a tool that needs the original paths, reveal it into the
ignored directory:

```sh
node --env-file=.env scripts/protect-report-paths.mjs reveal \
  reports/state-ownership-classification.json \
  .private-reports/state-ownership-classification.json
```

The command refuses to overwrite an existing output unless `--replace` is explicit.
Replacement is performed through a temporary file and atomic rename. Never use
`--replace` when revealing into the only clear copy.

Before publishing, audit the report:

```sh
npm run report:paths:audit
```

This audits every JSON report in `reports/`, including intermediate classifier,
judge, and comparison artifacts. The audit fails on clear `path` fields. It also prints review warnings when prose
appears to contain source identifiers such as `src/`, camel-cased functions, store
fields, or controller fields. Those warnings require editorial review: encrypting
all explanatory prose would remove the report's value.

The classification builder and local Laya runner read and write path-bearing
working reports only under `.private-reports/`. After regenerating one, run
`protect-report-paths.mjs protect` to publish its encrypted counterpart.

Line numbers are retained for local verification. Remove or bucket them if an
attacker could compare the report with a suspected repository revision. Also review
business-domain names, operation IDs, entity names, field names, and code symbols;
these can identify a product even after its paths are protected.
