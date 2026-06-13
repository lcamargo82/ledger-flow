<script setup lang="ts">
defineProps<{
  message: string
  variant?: 'error' | 'success' | 'warning' | 'info'
}>()
</script>

<template>
  <div class="lf-alert" :class="`lf-alert--${variant || 'error'}`">
    {{ message }}
  </div>
</template>
