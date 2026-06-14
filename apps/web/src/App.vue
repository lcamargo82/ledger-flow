<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth.store'
import { useI18n } from './composables/useI18n'
import AppToastContainer from './components/common/AppToastContainer.vue'
import AppConfirmDialog from './components/common/AppConfirmDialog.vue'
import AppLoading from './components/common/AppLoading.vue'
import { useConfirmDialogStore } from './stores/confirm-dialog.store'

const route = useRoute()
const authStore = useAuthStore()
const confirmDialogStore = useConfirmDialogStore()
const { t } = useI18n()

// Dynamically resolve layout from route meta
const layout = computed(() => {
  return route.meta.layout || 'div'
})
</script>

<template>
  <div v-if="authStore.isBootstrapping" class="lf-bootstrap-loader">
    <AppLoading :text="t('common.loading')" size="large" />
  </div>
  
  <component v-else :is="layout">
    <router-view />
  </component>
  
  <AppToastContainer />
  
  <AppConfirmDialog
    v-model="confirmDialogStore.state.isOpen"
    :title="confirmDialogStore.state.title"
    :message="confirmDialogStore.state.message"
    :confirm-text="confirmDialogStore.state.confirmText"
    :confirm-loading-text="confirmDialogStore.state.confirmLoadingText"
    :cancel-text="confirmDialogStore.state.cancelText"
    :confirm-variant="confirmDialogStore.state.confirmVariant"
    :loading="confirmDialogStore.state.loading"
    @confirm="confirmDialogStore.confirm"
    @cancel="confirmDialogStore.cancel"
  />
</template>

<style>
/* App.vue style removed as main.css handles globals */
.lf-bootstrap-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background-color: var(--lf-bg-primary);
}
</style>
