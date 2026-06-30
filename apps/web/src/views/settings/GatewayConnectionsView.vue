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
      <div v-if="isLoading" class="flex justify-center p-8">
        <div class="lf-spinner"></div>
      </div>
      
      <GatewayConnectionEmptyState 
        v-else-if="!hasConnections" 
        @connectAsaas="openCreateModal"
        @connectMercadoPago="handleConnectMercadoPago"
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
        />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useToastStore } from '@/stores/toast.store';
import { useRoute, useRouter } from 'vue-router';
import { GatewayConnectionsService, type GatewayConnection } from '@/services/gateway-connections.service';

import GatewayConnectionEmptyState from '@components/gateways/GatewayConnectionEmptyState.vue';
import GatewayConnectionCard from '@components/gateways/GatewayConnectionCard.vue';
import GatewayConnectionForm from '@components/gateways/GatewayConnectionForm.vue';
import GatewayCredentialUpdateModal from '@components/gateways/GatewayCredentialUpdateModal.vue';
import GatewayConnectionStatusModal from '@components/gateways/GatewayConnectionStatusModal.vue';
import AppButton from '@components/common/AppButton.vue';

const { t } = useI18n();
const toast = useToastStore();
const route = useRoute();
const router = useRouter();

const connections = ref<GatewayConnection[]>([]);
const isLoading = ref(true);

const hasConnections = computed(() => connections.value.length > 0);

// Modals state
const isFormOpen = ref(false);
const isCredentialsOpen = ref(false);
const isStatusOpen = ref(false);
const selectedConnection = ref<GatewayConnection | null>(null);
const statusAction = ref<'activate' | 'deactivate'>('activate');

const isConnectingMp = ref(false);

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

const handleConnectMercadoPago = async () => {
  isConnectingMp.value = true;
  try {
    const url = await GatewayConnectionsService.getMercadoPagoAuthUrl();
    window.location.href = url;
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Erro ao iniciar conexão com Mercado Pago');
  } finally {
    isConnectingMp.value = false;
  }
};

onMounted(() => {
  if (route.query.success === 'true') {
    toast.success(t('gateways.messages.created'));
    router.replace({ query: {} });
  } else if (route.query.error === 'true') {
    toast.error(t('gateways.messages.errorConnecting') || 'Erro ao conectar com gateway');
    router.replace({ query: {} });
  }
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
</script>

<style scoped>
.connections-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
