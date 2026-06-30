<template>
  <div class="lf-card connection-card" :class="{ 'is-inactive': !isActive }">
    <div class="lf-card-header">
      <div class="connection-title">
        <h4>{{ connection.displayName || connection.provider }}</h4>
        <span class="lf-badge" :class="statusBadgeClass">{{ t(`gateways.status.${connection.status}`) }}</span>
      </div>
      <div class="connection-actions">
        <button class="lf-btn lf-btn-icon" @click="$emit('edit', connection)" :title="t('gateways.actions.edit')">
          <div class="i-ph-pencil-simple"></div>
        </button>
        <button v-if="connection.provider !== 'MERCADO_PAGO'" class="lf-btn lf-btn-icon" @click="$emit('updateCredentials', connection)" :title="t('gateways.actions.updateCredentials')">
          <div class="i-ph-key"></div>
        </button>
        <button v-if="isActive" class="lf-btn lf-btn-icon" @click="$emit('deactivate', connection)" :title="t('gateways.actions.deactivate')">
          <div class="i-ph-power text-danger"></div>
        </button>
        <button v-else class="lf-btn lf-btn-icon" @click="$emit('activate', connection)" :title="t('gateways.actions.activate')">
          <div class="i-ph-power text-success"></div>
        </button>
      </div>
    </div>
    
    <div class="lf-card-body">
      <div class="info-grid">
        <div class="info-item">
          <label>{{ t('gateways.form.environment') }}</label>
          <span>{{ connection.environment }}</span>
        </div>
        <div class="info-item">
          <label>{{ t('gateways.form.priority') }}</label>
          <span>{{ connection.priority }}</span>
        </div>
        <div class="info-item">
          <label>{{ t('gateways.form.supportedMethods') }}</label>
          <div class="methods-tags">
            <span v-for="method in connection.supportedMethods" :key="method" class="lf-badge lf-badge-neutral">
              {{ method }}
            </span>
          </div>
        </div>
        <div class="info-item">
          <label>{{ t('gateways.form.credentialsConfigured') }}</label>
          <span :class="connection.credentialsConfigured ? 'text-success' : 'text-danger'">
            {{ connection.credentialsConfigured ? t('gateways.messages.credentialsUpdated') : t('gateways.messages.notConfigured') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/composables/useI18n';
import type { GatewayConnection } from '@/services/gateway-connections.service';

const { t } = useI18n();

const props = defineProps<{
  connection: GatewayConnection
}>();

defineEmits(['edit', 'updateCredentials', 'activate', 'deactivate']);

const isActive = computed(() => props.connection.status === 'ACTIVE');

const statusBadgeClass = computed(() => {
  switch (props.connection.status) {
    case 'ACTIVE': return 'lf-badge-success';
    case 'INACTIVE': return 'lf-badge-warning';
    case 'DISABLED': return 'lf-badge-danger';
    default: return 'lf-badge-neutral';
  }
});
</script>

<style scoped>
.connection-card {
  margin-bottom: 1rem;
  transition: opacity 0.2s ease;
}

.is-inactive {
  opacity: 0.7;
}

.connection-title {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.connection-title h4 {
  margin: 0;
  font-weight: 600;
}

.connection-actions {
  display: flex;
  gap: 0.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item label {
  font-size: 0.75rem;
  color: var(--lf-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.methods-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.text-success {
  color: var(--lf-color-success);
}

.text-danger {
  color: var(--lf-color-danger);
}
</style>
