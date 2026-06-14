<template>
  <div>
    <AppPageHeader
      :title="t('nav.dashboard')"
      :description="t('dashboard.welcome', { name: authStore.userName })"
    >
      <template #actions>
        <AppButton variant="primary">
          {{ t('dashboard.newPayment') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <div class="lf-dashboard-grid">
      <AppCard>
        <h3>{{ t('dashboard.role') }}</h3>
        <div class="lf-card-data lf-mb-4">
          <ul class="lf-tag-list">
            <li v-for="role in authStore.roles" :key="role">
              <AppBadge variant="info">{{ role }}</AppBadge>
            </li>
          </ul>
        </div>
        
        <h3>{{ t('dashboard.permissions') }}</h3>
        <div class="lf-card-data">
          <ul class="lf-tag-list">
            <li v-for="perm in authStore.permissions" :key="perm">
              <AppBadge variant="default">{{ perm }}</AppBadge>
            </li>
          </ul>
        </div>
      </AppCard>

      <AppCard>
        <h3>{{ t('dashboard.sessionStatus') }}</h3>
        <div class="lf-card-data">
          <p class="lf-flex lf-items-center">
            <span class="lf-status-indicator lf-status-active"></span>
            {{ t('dashboard.active') }}
          </p>
          <p class="lf-text-secondary lf-mt-4" style="font-size: 0.875rem;">
            User ID: {{ authStore.user?.id }}
          </p>
        </div>
      </AppCard>
      
      <!-- Example usage of confirm dialog and toast -->
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
import { useAuthStore } from '../stores/auth.store';
import { useI18n } from '../composables/useI18n';
import { useToastStore } from '../stores/toast.store';
import { useConfirmDialogStore } from '../stores/confirm-dialog.store';

import AppCard from '../components/common/AppCard.vue';
import AppPageHeader from '../components/common/AppPageHeader.vue';
import AppBadge from '../components/common/AppBadge.vue';
import AppButton from '../components/common/AppButton.vue';

const authStore = useAuthStore();
const toastStore = useToastStore();
const confirmDialogStore = useConfirmDialogStore();
const { t } = useI18n();

const showToastDemo = () => {
  toastStore.info('This is a test notification from the Dashboard.', 'Hello World');
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
