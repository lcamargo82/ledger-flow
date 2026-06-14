<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppToastContainer from './components/common/AppToastContainer.vue'
import AppConfirmDialog from './components/common/AppConfirmDialog.vue'
import { useConfirmDialogStore } from './stores/confirm-dialog.store'

const route = useRoute()
const confirmDialogStore = useConfirmDialogStore()

// Dynamically resolve layout from route meta
const layout = computed(() => {
  return route.meta.layout || 'div'
})
</script>

<template>
  <component :is="layout">
    <router-view />
  </component>
  
  <AppToastContainer />
  
  <AppConfirmDialog
    v-model="confirmDialogStore.state.isOpen"
    :title="confirmDialogStore.state.title"
    :message="confirmDialogStore.state.message"
    :confirm-text="confirmDialogStore.state.confirmText"
    :cancel-text="confirmDialogStore.state.cancelText"
    :confirm-variant="confirmDialogStore.state.confirmVariant"
    :loading="confirmDialogStore.state.loading"
    @confirm="confirmDialogStore.confirm"
    @cancel="confirmDialogStore.cancel"
  />
</template>

<style>
/* App.vue style removed as main.css handles globals */
</style>
