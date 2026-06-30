<template>
  <div class="lf-page">
    <div class="lf-page-header">
      <div class="title-area">
        <h2>{{ t('gateways.title') }}</h2>
        <p class="text-secondary">{{ t('gateways.description') }}</p>
      </div>
      <div class="actions" v-if="hasConnections">
        <button class="lf-btn lf-btn-primary" @click="openCreateModal">
          <div class="i-ph-plus"></div>
          {{ t('gateways.asaas.connect') }}
        </button>
      </div>
    </div>

    <div class="lf-page-content">
      <div v-if="isLoading" class="flex justify-center p-8">
        <div class="lf-spinner"></div>
      </div>
      
      <GatewayConnectionEmptyState 
        v-else-if="!hasConnections" 
        @connect="openCreateModal"
      />

      <div v-else class="connections-list">
        <GatewayConnectionCard 
          v-for="conn in connections" 
          :key="conn.id"
          :connection="conn"
          @edit="openEditModal"
          @updateCredentials="openCredentialsModal"
          @activate="openStatusModal($event, 'activate')"
          @deactivate="openStatusModal($event, 'deactivate')"
          @disconnect="openDisconnectModal"
        />

        <div v-if="!hasMercadoPago" class="lf-card connection-card is-inactive p-4 border border-dashed border-gray-300">
          <div class="flex items-center gap-4 opacity-50">
            <div class="i-ph-plugs text-3xl"></div>
            <div>
              <h4 class="font-semibold">{{ t('gateways.mercadoPago.title') }}</h4>
              <p class="text-sm text-secondary">{{ t('gateways.mercadoPago.description') }}</p>
            </div>
            <div class="ml-auto">
              <span class="lf-badge lf-badge-neutral">{{ t('gateways.mercadoPago.comingSoon') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <GatewayConnectionForm 
      :is-open="isFormOpen"
      :connection="selectedConnection"
      @close="closeForm"
      @saved="handleFormSaved"
    />

    <GatewayCredentialUpdateModal
      :is-open="isCredentialsOpen"
      :connection="selectedConnection"
      @close="closeCredentials"
      @saved="handleCredentialsSaved"
    />

    <GatewayConnectionStatusModal
      :is-open="isStatusOpen"
      :connection="selectedConnection"
      :action="statusAction"
      @close="closeStatus"
      @confirm="handleStatusConfirm"
    />

    <GatewayConnectionDisconnectModal
      :is-open="isDisconnectOpen"
      :connection="selectedConnection"
      @close="closeDisconnect"
      @confirm="handleDisconnectConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useToastStore } from '@/stores/toast.store';
import { GatewayConnectionsService, type GatewayConnection } from '@/services/gateway-connections.service';

import GatewayConnectionEmptyState from '@components/gateways/GatewayConnectionEmptyState.vue';
import GatewayConnectionCard from '@components/gateways/GatewayConnectionCard.vue';
import GatewayConnectionForm from '@components/gateways/GatewayConnectionForm.vue';
import GatewayCredentialUpdateModal from '@components/gateways/GatewayCredentialUpdateModal.vue';
import GatewayConnectionStatusModal from '@components/gateways/GatewayConnectionStatusModal.vue';
import GatewayConnectionDisconnectModal from '@components/gateways/GatewayConnectionDisconnectModal.vue';

const { t } = useI18n();
const toast = useToastStore();

const connections = ref<GatewayConnection[]>([]);
const isLoading = ref(true);

const hasConnections = computed(() => connections.value.length > 0);

// Modals state
const isFormOpen = ref(false);
const isCredentialsOpen = ref(false);
const isStatusOpen = ref(false);
const isDisconnectOpen = ref(false);
const selectedConnection = ref<GatewayConnection | null>(null);
const statusAction = ref<'activate' | 'deactivate'>('activate');

const hasMercadoPago = computed(() => connections.value.some(c => c.provider === 'MERCADO_PAGO'));

const loadConnections = async () => {
  isLoading.value = true;
  try {
    connections.value = await GatewayConnectionsService.listConnections();
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Erro ao carregar conexões');
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadConnections();
});

// Create / Edit
const openCreateModal = () => {
  selectedConnection.value = null;
  isFormOpen.value = true;
};

const openEditModal = (conn: GatewayConnection) => {
  selectedConnection.value = conn;
  isFormOpen.value = true;
};

const closeForm = () => {
  isFormOpen.value = false;
  selectedConnection.value = null;
};

const handleFormSaved = async (formData: any) => {
  try {
    if (selectedConnection.value) {
      await GatewayConnectionsService.updateConnection(selectedConnection.value.id, {
        displayName: formData.displayName,
        priority: Number(formData.priority),
        supportedMethods: formData.supportedMethods,
      });
      toast.success(t('gateways.messages.updated'));
    } else {
      await GatewayConnectionsService.createAsaasConnection({
        environment: formData.environment,
        apiKey: formData.apiKey,
        displayName: formData.displayName,
        priority: Number(formData.priority),
        supportedMethods: formData.supportedMethods,
      });
      toast.success(t('gateways.messages.created'));
    }
    closeForm();
    await loadConnections();
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Erro ao salvar conexão');
  }
};

// Credentials
const openCredentialsModal = (conn: GatewayConnection) => {
  selectedConnection.value = conn;
  isCredentialsOpen.value = true;
};

const closeCredentials = () => {
  isCredentialsOpen.value = false;
  selectedConnection.value = null;
};

const handleCredentialsSaved = async (apiKey: string) => {
  if (!selectedConnection.value) return;
  try {
    await GatewayConnectionsService.updateCredentials(selectedConnection.value.id, { apiKey });
    toast.success(t('gateways.messages.credentialsUpdated'));
    closeCredentials();
    await loadConnections();
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Erro ao atualizar credenciais');
  }
};

// Status
const openStatusModal = (conn: GatewayConnection, action: 'activate' | 'deactivate') => {
  selectedConnection.value = conn;
  statusAction.value = action;
  isStatusOpen.value = true;
};

const closeStatus = () => {
  isStatusOpen.value = false;
  selectedConnection.value = null;
};

const handleStatusConfirm = async () => {
  if (!selectedConnection.value) return;
  const newStatus = statusAction.value === 'activate' ? 'ACTIVE' : 'INACTIVE';
  try {
    await GatewayConnectionsService.updateStatus(selectedConnection.value.id, { status: newStatus });
    toast.success(t('gateways.messages.statusUpdated'));
    closeStatus();
    await loadConnections();
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Erro ao alterar status');
  }
};

// Disconnect
const openDisconnectModal = (conn: GatewayConnection) => {
  selectedConnection.value = conn;
  isDisconnectOpen.value = true;
};

const closeDisconnect = () => {
  isDisconnectOpen.value = false;
  selectedConnection.value = null;
};

const handleDisconnectConfirm = async () => {
  if (!selectedConnection.value) return;
  try {
    await GatewayConnectionsService.disconnectConnection(selectedConnection.value.id);
    toast.success(t('gateways.disconnect.success'));
    closeDisconnect();
    await loadConnections();
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Erro ao desconectar');
  }
};
</script>

<style scoped>
.connections-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
