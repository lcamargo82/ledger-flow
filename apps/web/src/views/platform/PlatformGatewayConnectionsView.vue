<template>
  <div class="space-y-6">
    <AppPageHeader
      :title="t('platform.gateways.title')"
      :description="t('platform.gateways.description')"
    />

    <AppTable
      :columns="columns"
      :items="connections"
      :is-loading="isLoading"
      empty-title="Nenhuma conexão de gateway encontrada."
    >
      <template #tenantId="{ item }">
        <span class="font-medium">{{ item.tenantId }}</span>
      </template>

      <template #provider="{ item }">
        {{ item.provider }}
      </template>

      <template #environment="{ item }">
        <AppBadge variant="neutral">{{ item.environment }}</AppBadge>
      </template>

      <template #status="{ item }">
        <AppBadge :variant="getStatusBadgeVariant(item.status)">
          {{ t(`gateways.status.${item.status}`) }}
        </AppBadge>
      </template>

      <template #health="{ item }">
        <AppBadge :variant="getHealthBadgeVariant(item.healthStatus)">
          {{ t(`gateways.health.${item.healthStatus}`) || item.healthStatus }}
        </AppBadge>
      </template>

      <template #actions="{ item }">
        <div class="flex gap-2">
          <AppButton 
            v-if="item.status === 'ACTIVE'" 
            variant="danger" 
            size="small"
            @click="openSuspendModal(item)"
          >
            {{ t('platform.gateways.actions.suspend') }}
          </AppButton>
          <AppButton 
            v-else 
            variant="success" 
            size="small"
            @click="openReactivateModal(item)"
          >
            {{ t('platform.gateways.actions.reactivate') }}
          </AppButton>
        </div>
      </template>
    </AppTable>

    <AppConfirmDialog
      v-model="isSuspendModalOpen"
      title="Suspender Conexão de Gateway"
      :message="`Tem certeza que deseja suspender a conexão do provedor ${selectedConnection?.provider} para este tenant?`"
      confirmText="Suspender"
      confirmVariant="danger"
      @confirm="handleSuspend"
    >
      <div class="mt-4">
        <label class="block text-sm font-medium mb-1">Motivo da Suspensão</label>
        <textarea 
          v-model="suspendReason" 
          class="lf-input w-full" 
          rows="3" 
          placeholder="Obrigatório. Mínimo 10 caracteres."
        ></textarea>
      </div>
    </AppConfirmDialog>

    <AppConfirmDialog
      v-model="isReactivateModalOpen"
      title="Reativar Conexão de Gateway"
      :message="`Tem certeza que deseja reativar a conexão do provedor ${selectedConnection?.provider}?`"
      confirmText="Reativar"
      confirmVariant="primary"
      @confirm="handleReactivate"
    >
      <div class="mt-4">
        <label class="block text-sm font-medium mb-1">Motivo da Reativação</label>
        <textarea 
          v-model="suspendReason" 
          class="lf-input w-full" 
          rows="3" 
          placeholder="Obrigatório. Mínimo 10 caracteres."
        ></textarea>
      </div>
    </AppConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useToastStore } from '@/stores/toast.store';
import { PlatformGatewayConnectionsService, type PlatformGatewayConnection } from '@/services/platform-gateway-connections.service';
import AppConfirmDialog from '@components/common/AppConfirmDialog.vue';
import AppPageHeader from '@components/common/AppPageHeader.vue';
import AppTable from '@components/common/AppTable.vue';
import AppBadge from '@components/common/AppBadge.vue';
import AppButton from '@components/common/AppButton.vue';

const { t } = useI18n();
const toast = useToastStore();

const connections = ref<PlatformGatewayConnection[]>([]);
const isLoading = ref(true);

const isSuspendModalOpen = ref(false);
const isReactivateModalOpen = ref(false);
const selectedConnection = ref<PlatformGatewayConnection | null>(null);
const suspendReason = ref('');

const columns = computed(() => [
  { key: 'tenantId', label: t('platform.gateways.table.tenant') },
  { key: 'provider', label: t('platform.gateways.table.provider') },
  { key: 'environment', label: t('platform.gateways.table.environment') },
  { key: 'status', label: t('platform.gateways.table.status') },
  { key: 'health', label: t('platform.gateways.table.health') },
  { key: 'actions', label: 'Ações' },
]);

const loadConnections = async () => {
  isLoading.value = true;
  try {
    connections.value = await PlatformGatewayConnectionsService.listConnections();
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Erro ao carregar conexões de gateways.');
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadConnections();
});

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'INACTIVE': return 'warning';
    case 'DISABLED': return 'danger';
    default: return 'neutral';
  }
};

const getHealthBadgeVariant = (health: string) => {
  switch (health) {
    case 'HEALTHY': return 'success';
    case 'ATTENTION': return 'warning';
    case 'CRITICAL': return 'danger';
    default: return 'neutral';
  }
};

const openSuspendModal = (conn: PlatformGatewayConnection) => {
  selectedConnection.value = conn;
  suspendReason.value = '';
  isSuspendModalOpen.value = true;
};

const openReactivateModal = (conn: PlatformGatewayConnection) => {
  selectedConnection.value = conn;
  suspendReason.value = '';
  isReactivateModalOpen.value = true;
};

const handleSuspend = async () => {
  if (!selectedConnection.value) return;
  if (!suspendReason.value || suspendReason.value.length < 10) {
    toast.error('O motivo da suspensão é obrigatório (mín. 10 caracteres).');
    return;
  }

  try {
    await PlatformGatewayConnectionsService.updateStatus(selectedConnection.value.id, {
      status: 'INACTIVE',
      reason: suspendReason.value
    });
    toast.success(t('platform.gateways.suspend.success'));
    isSuspendModalOpen.value = false;
    await loadConnections();
  } catch (err: any) {
    toast.error(err.response?.data?.message || t('platform.gateways.suspend.failed'));
  }
};

const handleReactivate = async () => {
  if (!selectedConnection.value) return;
  if (!suspendReason.value || suspendReason.value.length < 10) {
    toast.error('O motivo da reativação é obrigatório (mín. 10 caracteres).');
    return;
  }

  try {
    await PlatformGatewayConnectionsService.updateStatus(selectedConnection.value.id, {
      status: 'ACTIVE',
      reason: suspendReason.value
    });
    toast.success('Conexão reativada com sucesso.');
    isReactivateModalOpen.value = false;
    await loadConnections();
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Falha ao reativar conexão.');
  }
};
</script>
