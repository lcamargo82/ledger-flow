<template>
  <div class="lf-page">
    <div class="lf-page-header">
      <div class="title-area">
        <h2>{{ t('platform.gateways.title') }}</h2>
        <p class="text-secondary">{{ t('platform.gateways.description') }}</p>
      </div>
    </div>

    <div class="lf-page-content">
      <div v-if="isLoading" class="flex justify-center p-8">
        <div class="lf-spinner"></div>
      </div>
      
      <div v-else class="lf-card">
        <div class="table-responsive">
          <table class="lf-table">
            <thead>
              <tr>
                <th>{{ t('platform.gateways.table.tenant') }}</th>
                <th>{{ t('platform.gateways.table.provider') }}</th>
                <th>{{ t('platform.gateways.table.environment') }}</th>
                <th>{{ t('platform.gateways.table.status') }}</th>
                <th>{{ t('platform.gateways.table.health') }}</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="connections.length === 0">
                <td colspan="6" class="text-center text-secondary py-8">Nenhuma conexão de gateway encontrada.</td>
              </tr>
              <tr v-for="conn in connections" :key="conn.id">
                <td>
                  <span class="font-medium">{{ conn.tenantId }}</span>
                </td>
                <td>{{ conn.provider }}</td>
                <td>
                  <span class="lf-badge lf-badge-neutral">{{ conn.environment }}</span>
                </td>
                <td>
                  <span class="lf-badge" :class="getStatusBadgeClass(conn.status)">
                    {{ t(`gateways.status.${conn.status}`) }}
                  </span>
                </td>
                <td>
                  <span class="lf-badge" :class="getHealthBadgeClass(conn.healthStatus)">
                    {{ t(`gateways.health.${conn.healthStatus}`) || conn.healthStatus }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-2">
                    <button 
                      v-if="conn.status === 'ACTIVE'" 
                      class="lf-btn lf-btn-danger lf-btn-sm"
                      @click="openSuspendModal(conn)"
                    >
                      {{ t('platform.gateways.actions.suspend') }}
                    </button>
                    <button 
                      v-else 
                      class="lf-btn lf-btn-success lf-btn-sm"
                      @click="openReactivateModal(conn)"
                    >
                      {{ t('platform.gateways.actions.reactivate') }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

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
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import { PlatformGatewayConnectionsService, type PlatformGatewayConnection } from '../../../services/platform-gateway-connections.service';
import AppConfirmDialog from '../../../components/common/AppConfirmDialog.vue';

const { t } = useI18n();
const toast = useToast();

const connections = ref<PlatformGatewayConnection[]>([]);
const isLoading = ref(true);

const isSuspendModalOpen = ref(false);
const isReactivateModalOpen = ref(false);
const selectedConnection = ref<PlatformGatewayConnection | null>(null);
const suspendReason = ref('');

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

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'lf-badge-success';
    case 'INACTIVE': return 'lf-badge-warning';
    case 'DISABLED': return 'lf-badge-danger';
    default: return 'lf-badge-neutral';
  }
};

const getHealthBadgeClass = (health: string) => {
  switch (health) {
    case 'HEALTHY': return 'lf-badge-success';
    case 'ATTENTION': return 'lf-badge-warning';
    case 'CRITICAL': return 'lf-badge-danger';
    default: return 'lf-badge-neutral';
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
