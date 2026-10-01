<script setup lang="ts">
import { reactive, ref } from 'vue'

type Model = { name: string; email: string; role: string; bio: string; terms: boolean }
const model = reactive<Model>({ name: '', email: '', role: '', bio: '', terms: false })
const errors = reactive<Partial<Record<keyof Model, string>>>({})
const result = ref<Model>()

function submit() {
  errors.name = model.name.trim().length >= 2 ? '' : 'Use pelo menos 2 caracteres.'
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(model.email) ? '' : 'Informe um e-mail válido.'
  errors.role = model.role ? '' : 'Selecione um papel.'
  errors.bio = model.bio.trim().length <= 120 ? '' : 'Use no máximo 120 caracteres.'
  errors.terms = model.terms ? '' : 'Aceite os termos.'
  if (!Object.values(errors).some(Boolean)) result.value = { ...model, name: model.name.trim(), bio: model.bio.trim() }
}
</script>

<template>
  <header class="implementation-header"><span class="badge">Progressive framework</span><h2>Vue</h2><p><code>v-model</code> é nativo; o contrato de validação é da aplicação.</p></header>
  <form @submit.prevent="submit" novalidate>
    <label>Nome<input v-model="model.name" /></label><p class="error">{{ errors.name }}</p>
    <label>E-mail<input v-model="model.email" type="email" /></label><p class="error">{{ errors.email }}</p>
    <label>Papel<select v-model="model.role"><option value="">Selecione</option><option value="dev">Developer</option><option value="lead">Tech Lead</option><option value="manager">Engineering Manager</option></select></label><p class="error">{{ errors.role }}</p>
    <label>Bio<textarea v-model="model.bio" /></label><p class="error">{{ errors.bio }}</p>
    <label class="check"><input v-model="model.terms" type="checkbox" /> Aceito os termos</label><p class="error">{{ errors.terms }}</p>
    <button type="submit">Criar conta</button>
    <pre v-if="result">{{ JSON.stringify(result, null, 2) }}</pre>
  </form>
</template>
