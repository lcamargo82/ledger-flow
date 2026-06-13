<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import AppCard from '../components/common/AppCard.vue'
import AppButton from '../components/common/AppButton.vue'

const router = useRouter()
const authStore = useAuthStore()

function handleGoBack() {
  if (authStore.isAuthenticated) {
    router.push('/dashboard')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="lf-error-view">
    <AppCard class="lf-error-card">
      <h1 class="lf-error-title">404</h1>
      <h2>Página não encontrada</h2>
      <p>O recurso que você tentou acessar não existe.</p>
      
      <AppButton @click="handleGoBack" class="lf-mt-4">
        {{ authStore.isAuthenticated ? 'Voltar ao Dashboard' : 'Ir para o Login' }}
      </AppButton>
    </AppCard>
  </div>
</template>
