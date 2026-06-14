<template>
  <div class="lf-error-view">
    <div class="lf-error-card">
      <h1 class="lf-error-title">404</h1>
      <h2 class="lf-mb-4" style="font-size: 1.5rem; font-weight: 600;">Página não encontrada</h2>
      <p class="lf-error-description">
        O recurso que você está procurando não existe ou foi movido.
      </p>
      <router-link to="/">
        <AppButton variant="primary">Voltar para Início</AppButton>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '../components/common/AppButton.vue';
</script>
