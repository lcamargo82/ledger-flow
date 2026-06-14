<template>
  <div class="lf-toast-container" aria-live="polite" aria-atomic="true">
    <AppToast
      v-for="toast in toastStore.toasts"
      :key="toast.id"
      :id="toast.id"
      :type="toast.type"
      :title="toast.title"
      :message="toast.message"
      :duration="toast.duration"
      @close="toastStore.removeToast"
    />
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '../../stores/toast.store';
import AppToast from './AppToast.vue';

const toastStore = useToastStore();
</script>

<style scoped>
.lf-toast-container {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-width: 380px;
  pointer-events: none;
}

@media (max-width: 640px) {
  .lf-toast-container {
    top: 1rem;
    right: 1rem;
    left: 1rem;
    max-width: calc(100% - 2rem);
  }
}
</style>
