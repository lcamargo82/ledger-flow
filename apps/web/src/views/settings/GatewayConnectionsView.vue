<template>
  <div class="lf-page">
    <div class="lf-page-header">
      <div class="title-area">
        <h2>{{ t('gateways.title') }}</h2>
        <p class="text-secondary">{{ t('gateways.description') }}</p>
      </div>
      <div class="actions flex gap-4" v-if="hasConnections">
        <AppButton variant="primary" icon="ph-plus" @click="openCreateModal">
          {{ t('gateways.asaas.connect') }}
        </AppButton>
        <AppButton variant="secondary" icon="ph-link" @click="handleConnectMercadoPago" :disabled="isConnectingMp" :loading="isConnectingMp">
          {{ t('gateways.mercadoPago.connect') }}
        </AppButton>
      </div>
    </div>

    <div class="lf-page-content">
      <div v-if="isLoading" class="loading-state">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="error" class="error-state">
        <span class="material-symbols-outlined">error</span>
        <p>{{ error }}</p>
        <button class="lf-btn lf-btn-secondary" @click="loadConnections">{{ t('common.retry') }}</button>
      </div>

      <template v-else>
        <GatewayConnectionEmptyState v-if="!hasConnections" @connect="openCreateModal" />
        
        <div v-else class="connections-list">
          <GatewayConnectionCard 
            v-for="connection in connections" 
            :key="connection.id" 
            :connection="connection" 
            @edit="openEditModal"
            @updateCredentials="openCredentialsModal"
            @activate="confirmStatusChange($event, 'activate')"
            @deactivate="confirmStatusChange($event, 'deactivate')"
            @disconnect="confirmDisconnect"
          />
        </div>
      </template>
    </div>

    <!-- Modals -->
    <GatewayConnectionForm
      v-if="isCreateModalOpen"
      :is-open="isCreateModalOpen"
      @close="closeCreateModal"
      @success="handleConnectionCreated"
    />

    <GatewayConnectionForm
      v-if="isEditModalOpen"
      :is-open="isEditModalOpen"
      :connection="selectedConnection"
      @close="closeEditModal"
      @success="handleConnectionUpdated"
    />

    <GatewayCredentialUpdateModal
      v-if="isCredentialsModalOpen"
      :is-open="isCredentialsModalOpen"
      :connection="selectedConnection"
      @close="closeCredentialsModal"
      @success="handleConnectionUpdated"
    />

    <GatewayConnectionStatusModal
      v-if="isStatusModalOpen"
      :is-open="isStatusModalOpen"
      :connection="selectedConnection"
      :action="statusAction"
      @close="closeStatusModal"
      @success="handleConnectionUpdated"
    />

    <GatewayConnectionDisconnectModal
      v-if="isDisconnectOpen"
      :is-open="isDisconnectOpen"
      :connection="selectedConnection"
      @close="closeDisconnectModal"
      @success="handleConnectionDisconnected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useToastStore } from '@/stores/toast.store';
import { useRoute, useRouter } from 'vue-router';
import { GatewayConnectionsService, type GatewayConnection } from '@/services/gateway-connections.service';
import AppButton from '@components/common/AppButton.vue';

import GatewayConnectionEmptyState from '@components/gateways/GatewayConnectionEmptyState.vue';
import GatewayConnectionCard from '@components/gateways/GatewayConnectionCard.vue';
import GatewayConnectionForm from '@components/gateways/GatewayConnectionForm.vue';
import GatewayCredentialUpdateModal from '@components/gateways/GatewayCredentialUpdateModal.vue';
import GatewayConnectionStatusModal from '@components/gateways/GatewayConnectionStatusModal.vue';
import GatewayConnectionDisconnectModal from '@components/gateways/GatewayConnectionDisconnectModal.vue';

const { t } = useI18n();
const toast = useToastStore();
const route = useRoute();
const router = useRouter();

const connections = ref<GatewayConnection[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

// Modal states
const isCreateModalOpen = ref(false);
const isEditModalOpen = ref(false);
const isCredentialsModalOpen = ref(false);
const isStatusModalOpen = ref(false);
const isDisconnectOpen = ref(false);

const selectedConnection = ref<GatewayConnection | null>(null);
const statusAction = ref<'activate' | 'deactivate'>('activate');
const isConnectingMp = ref(false);

const hasConnections = computed(() => connections.value.length > 0);

const loadConnections = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    connections.value = await GatewayConnectionsService.listConnections();
  } catch (err: any) {
    error.value = err.response?.data?.message || t('gateways.errors.loadFailed');
    toast.error(error.value || t('gateways.errors.loadFailed'));
  } finally {
    isLoading.value = false;
  }
};

const handleConnectMercadoPago = async () => {
  if (isConnectingMp.value) return;
  
  isConnectingMp.value = true;
  try {
    const url = await GatewayConnectionsService.getMercadoPagoAuthUrl();
    window.location.href = url;
  } catch (err: any) {
    const msg = err.response?.data?.message || t('gateways.errors.mpAuthFailed');
    toast.error(msg);
  } finally {
    isConnectingMp.value = false;
  }
};

// Handlers for checking OAuth results in URL
onMounted(async () => {
  await loadConnections();

  if (route.query.success === 'true' && route.query.provider === 'mercado_pago') {
    toast.success(t('gateways.messages.mpConnected'));
    router.replace({ query: {} });
  } else if (route.query.error === 'true' && route.query.provider === 'mercado_pago') {
    toast.error(t('gateways.errors.mpConnectionFailed'));
    router.replace({ query: {} });
  }
});

// Create Modal
const openCreateModal = () => {
  isCreateModalOpen.value = true;
};
const closeCreateModal = () => {
  isCreateModalOpen.value = false;
};
const handleConnectionCreated = async (newConnection: GatewayConnection) => {
  closeCreateModal();
  await loadConnections();
  toast.success(t('gateways.messages.connectionCreated'));
};

// Edit Modal
const openEditModal = (connection: GatewayConnection) => {
  selectedConnection.value = connection;
  isEditModalOpen.value = true;
};
const closeEditModal = () => {
  isEditModalOpen.value = false;
  selectedConnection.value = null;
};
const handleConnectionUpdated = async () => {
  closeEditModal();
  closeCredentialsModal();
  closeStatusModal();
  await loadConnections();
};

// Credentials Modal
const openCredentialsModal = (connection: GatewayConnection) => {
  selectedConnection.value = connection;
  isCredentialsModalOpen.value = true;
};
const closeCredentialsModal = () => {
  isCredentialsModalOpen.value = false;
  selectedConnection.value = null;
};

// Status Modal
const confirmStatusChange = (connection: GatewayConnection, action: 'activate' | 'deactivate') => {
  selectedConnection.value = connection;
  statusAction.value = action;
  isStatusModalOpen.value = true;
};
const closeStatusModal = () => {
  isStatusModalOpen.value = false;
  selectedConnection.value = null;
};

// Disconnect Modal
const confirmDisconnect = (connection: GatewayConnection) => {
  selectedConnection.value = connection;
  isDisconnectOpen.value = true;
};
const closeDisconnectModal = () => {
  isDisconnectOpen.value = false;
  selectedConnection.value = null;
};
const handleConnectionDisconnected = async () => {
  closeDisconnectModal();
  await loadConnections();
};
</script>

<style scoped>
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background-color: var(--lf-surface-primary);
  border-radius: var(--lf-radius-lg);
  border: 1px solid var(--lf-border-primary);
  text-align: center;
  color: var(--lf-text-secondary);
}

.error-state .material-symbols-outlined {
  font-size: 3rem;
  color: var(--lf-danger);
  margin-bottom: 1rem;
}

.error-state button {
  margin-top: 1rem;
}

.connections-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
