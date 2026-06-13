<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Dynamically resolve layout from route meta
const layout = computed(() => {
  return route.meta.layout || 'div'
})
</script>

<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<style>
/* App.vue style removed as main.css handles globals */
</style>
