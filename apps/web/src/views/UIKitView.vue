<template>
  <div>
    <AppPageHeader
      title="UI Kit"
      description="Área de testes para componentes da plataforma"
    />

    <div class="lf-dashboard-grid">
      <AppCard>
        <h3>Interactive UI Demo</h3>
        <div class="lf-flex" style="gap: 0.5rem; margin-top: 1rem;">
          <AppButton variant="secondary" @click="showToastDemo">
            Test Toast
          </AppButton>
          <AppButton variant="danger" @click="showConfirmDemo">
            Test Confirm
          </AppButton>
        </div>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '../stores/toast.store';
import { useConfirmDialogStore } from '../stores/confirm-dialog.store';

import AppCard from '../components/common/AppCard.vue';
import AppPageHeader from '../components/common/AppPageHeader.vue';
import AppButton from '../components/common/AppButton.vue';

const toastStore = useToastStore();
const confirmDialogStore = useConfirmDialogStore();

const showToastDemo = () => {
  toastStore.info('This is a test notification from the UI Kit.', 'Hello World');
};

const showConfirmDemo = () => {
  confirmDialogStore.open({
    title: 'Delete Item',
    message: 'Are you sure you want to delete this item? This action cannot be undone.',
    confirmText: 'Delete',
    confirmVariant: 'danger',
    onConfirm: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toastStore.success('Item deleted successfully.');
    },
    onCancel: () => {
      toastStore.info('Action cancelled.');
    }
  });
};
</script>
