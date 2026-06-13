<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppCard from '../components/common/AppCard.vue'
import AppButton from '../components/common/AppButton.vue'

const router = useRouter()
</script>

<template>
  <div class="lf-error-view">
    <AppCard class="lf-error-card">
      <h1 class="lf-error-title">403</h1>
      <h2>Acesso negado</h2>
      <p>Você não possui permissão para acessar este recurso.</p>
      
      <AppButton @click="router.push('/dashboard')" class="lf-mt-4">
        Voltar ao Dashboard
      </AppButton>
    </AppCard>
  </div>
</template>
