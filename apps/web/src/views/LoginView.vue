<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import AppCard from '../components/common/AppCard.vue'
import AppInput from '../components/common/AppInput.vue'
import AppButton from '../components/common/AppButton.vue'
import AppAlert from '../components/common/AppAlert.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = reactive({
  email: '',
  password: ''
})

const errors = reactive({
  email: '',
  password: ''
})

function validate() {
  let isValid = true
  errors.email = ''
  errors.password = ''

  if (!form.email) {
    errors.email = 'E-mail é obrigatório'
    isValid = false
  }
  
  if (!form.password) {
    errors.password = 'Senha é obrigatória'
    isValid = false
  }

  return isValid
}

async function handleSubmit() {
  if (!validate()) return

  try {
    await authStore.login(form.email, form.password)
    const redirect = route.query.redirect as string || '/dashboard'
    router.push(redirect)
  } catch (e) {
    // Error is handled and stored in authStore.error
  }
}
</script>

<template>
  <div class="lf-login-view">
    <AppCard class="lf-login-card">
      <div class="lf-login-header">
        <h1>LedgerFlow</h1>
        <p>Enterprise Payment & Ledger Platform</p>
      </div>

      <AppAlert 
        v-if="authStore.error" 
        :message="authStore.error" 
        variant="error" 
        class="lf-mb-4"
      />

      <form @submit.prevent="handleSubmit">
        <AppInput
          id="email"
          v-model="form.email"
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          :error="errors.email"
          autocomplete="username"
          class="lf-mb-4"
        />

        <AppInput
          id="password"
          v-model="form.password"
          label="Senha"
          type="password"
          placeholder="••••••••"
          :error="errors.password"
          autocomplete="current-password"
          class="lf-mb-6"
        />

        <AppButton
          type="submit"
          class="lf-w-full"
          :loading="authStore.isLoading"
        >
          Entrar
        </AppButton>
      </form>

      <div class="lf-demo-hint">
        <p><strong>Demo:</strong></p>
        <p>owner@ledgerflow.local</p>
        <p>ChangeMe123!</p>
      </div>
    </AppCard>
  </div>
</template>
