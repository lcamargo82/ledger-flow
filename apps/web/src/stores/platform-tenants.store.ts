import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  PlatformTenantResponse,
  PlatformTenantDetailsResponse,
  ListPlatformTenantsQuery,
  UpdatePlatformTenantDto,
  UpdatePlatformTenantStatusDto,
  UpdateTenantSubscriptionDto,
  CreatePlatformTenantDto,
  PlatformTenantOverviewResponse,
  PlatformTenantHealthResponse,
  PlatformTenantActivityResponse
} from '../types/platform.types';
import platformTenantsService from '../services/platform-tenants.service';
import { useToastStore } from './toast.store';
import { useI18n } from '../composables/useI18n';

export const usePlatformTenantsStore = defineStore('platformTenants', () => {
  const tenants = ref<PlatformTenantResponse[]>([]);
  const currentTenant = ref<PlatformTenantDetailsResponse | null>(null);
  const currentTenantOverview = ref<PlatformTenantOverviewResponse | null>(null);
  const currentTenantHealth = ref<PlatformTenantHealthResponse | null>(null);
  const currentTenantActivity = ref<PlatformTenantActivityResponse | null>(null);
  const total = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const toastStore = useToastStore();
  const { t } = useI18n();

  const fetchTenants = async (query?: ListPlatformTenantsQuery) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await platformTenantsService.findAll(query);
      tenants.value = response.data;
      total.value = response.total;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch tenants';
      toastStore.error(error.value || '', t('platform.error.loadFailed'));
    } finally {
      loading.value = false;
    }
  };

  const fetchTenant = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      currentTenant.value = await platformTenantsService.findOne(id);
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch tenant details';
      toastStore.error(error.value || '', t('platform.error.loadFailed'));
    } finally {
      loading.value = false;
    }
  };

  const updateTenant = async (id: string, dto: UpdatePlatformTenantDto) => {
    loading.value = true;
    error.value = null;
    try {
      const updated = await platformTenantsService.update(id, dto);
      const index = tenants.value.findIndex(t => t.id === id);
      if (index !== -1) {
        tenants.value[index] = updated;
      }
      if (currentTenant.value?.id === id) {
        currentTenant.value = { ...currentTenant.value, ...updated };
      }
      toastStore.success('Tenant updated', t('platform.toast.tenantUpdated'));
    } catch (err: any) {
      error.value = err.message || 'Failed to update tenant';
      toastStore.error(error.value || '', t('platform.error.updateFailed'));
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateStatus = async (id: string, active: boolean) => {
    loading.value = true;
    error.value = null;
    try {
      const updated = await platformTenantsService.updateStatus(id, { active });
      const index = tenants.value.findIndex(t => t.id === id);
      if (index !== -1) {
        tenants.value[index] = updated;
      }
      if (currentTenant.value && currentTenant.value.id === id) {
        currentTenant.value.active = active;
      }
      toastStore.success(
        active ? 'Tenant activated' : 'Tenant deactivated',
        active ? t('platform.toast.tenantActivated') : t('platform.toast.tenantDeactivated')
      );
    } catch (err: any) {
      error.value = err.message || 'Failed to update status';
      toastStore.error(error.value || '', t('platform.error.statusFailed'));
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateSubscription = async (id: string, dto: UpdateTenantSubscriptionDto) => {
    loading.value = true;
    error.value = null;
    try {
      const updated = await platformTenantsService.updateSubscription(id, dto);
      currentTenant.value = updated;
      
      const index = tenants.value.findIndex(t => t.id === id);
      const tenantInList = index !== -1 ? tenants.value[index] : undefined;
      if (tenantInList && updated.subscriptionDetails) {
        tenantInList.subscription = {
          plan: updated.subscriptionDetails.plan,
          status: updated.subscriptionDetails.status,
        };
      }
      
      toastStore.success('Subscription updated', t('platform.toast.subscriptionUpdated'));
    } catch (err: any) {
      error.value = err.message || 'Failed to update subscription';
      toastStore.error(error.value || '', t('platform.error.subscriptionFailed'));
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createTenant = async (dto: CreatePlatformTenantDto) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await platformTenantsService.createTenant(dto);
      toastStore.success('Organização criada', t('platform.tenants.create.success'));
      return response;
    } catch (err: any) {
      error.value = err.message || 'Failed to create tenant';
      toastStore.error(error.value || '', t('platform.tenants.create.failed'));
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const resendInvitation = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await platformTenantsService.resendTenantInvitation(id);
      toastStore.success('Convite reenviado', t('platform.tenants.actions.invitationSent'));
      return response;
    } catch (err: any) {
      error.value = err.message || 'Failed to resend invitation';
      toastStore.error(error.value || '', 'Erro ao reenviar convite');
      throw err;
=======
  const fetchTenantOverview = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const [overview, health, activity] = await Promise.all([
        platformTenantsService.getTenantOverview(id),
        platformTenantsService.getTenantHealth(id),
        platformTenantsService.getTenantActivity(id)
      ]);
      currentTenantOverview.value = overview;
      currentTenantHealth.value = health;
      currentTenantActivity.value = activity;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch tenant overview';
      toastStore.error(error.value || '', t('platform.error.loadFailed'));
    } finally {
      loading.value = false;
    }
  };

  return {
    tenants,
    currentTenant,
    total,
    loading,
    error,
    fetchTenants,
    fetchTenant,
    updateTenant,
    updateStatus,
    updateSubscription,
    createTenant,
    resendInvitation,
    currentTenantOverview,
    currentTenantHealth,
    currentTenantActivity,
    fetchTenantOverview,
  };
});
