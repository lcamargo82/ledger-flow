<script setup lang="ts">
defineProps<{
  text?: string
}>()
</script>

<template>
  <div class="lf-loading-container">
    <div class="lf-spinner"></div>
    <span v-if="text" class="lf-loading-text">{{ text }}</span>
  </div>
</template>
