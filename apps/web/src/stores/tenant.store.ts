import { defineStore } from 'pinia';
import { ref } from 'vue';
import { tenantsService } from '../services/tenants.service';
import { useToastStore } from './toast.store';
import type { TenantSettings, UpdateTenantSettingsRequest } from '../types/admin.types';

export const useTenantStore = defineStore('tenant', () => {
  const tenant = ref<TenantSettings | null>(null);
  const isLoading = ref(false);
  const isSaving = ref(false);
  const error = ref<string | null>(null);
  const toast = useToastStore();

  async function fetchCurrentTenant() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await tenantsService.getCurrentTenant();
      tenant.value = response.tenant;
    } catch (err) {
      error.value = 'tenantSettings.errors.loadFailed';
      toast.error('tenantSettings.errors.loadFailed');
      console.error(err);
    } finally {
      isLoading.value = false;
    }
  }

  async function updateCurrentTenant(payload: UpdateTenantSettingsRequest) {
    isSaving.value = true;
    error.value = null;
    try {
      const response = await tenantsService.updateCurrentTenant(payload);
      tenant.value = response.tenant;
      toast.success('tenantSettings.toast.updated');
    } catch (err) {
      error.value = 'tenantSettings.errors.updateFailed';
      toast.error('tenantSettings.errors.updateFailed');
      console.error(err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  return {
    tenant,
    isLoading,
    isSaving,
    error,
    fetchCurrentTenant,
    updateCurrentTenant,
  };
});
