<template>
  <div class="lf-card connection-card" :class="{ 'is-inactive': !isActive }">
    <div class="lf-card-header">
      <div class="connection-title">
        <h4>{{ connection.displayName || connection.provider }}</h4>
        <span class="lf-badge" :class="statusBadgeClass">{{ t(`gateways.status.${connection.status}`) }}</span>
      </div>
      <div class="connection-actions">
        <button class="action-btn" @click="$emit('edit', connection)" :title="t('gateways.actions.edit')">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button v-if="connection.provider !== 'MERCADO_PAGO'" class="action-btn" @click="$emit('updateCredentials', connection)" :title="t('gateways.actions.updateCredentials')">
          <span class="material-symbols-outlined">key</span>
        </button>
        <button v-if="isActive" class="action-btn action-warning" @click="$emit('deactivate', connection)" :title="t('gateways.actions.deactivate')">
          <span class="material-symbols-outlined">pause</span>
        </button>
        <button v-else-if="connection.status === 'INACTIVE'" class="action-btn action-success" @click="$emit('activate', connection)" :title="t('gateways.actions.activate')">
          <span class="material-symbols-outlined">play_arrow</span>
        </button>
        <button class="action-btn action-danger" @click="$emit('disconnect', connection)" :title="t('gateways.actions.disconnect')">
          <span class="material-symbols-outlined">delete</span>
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

defineEmits(['edit', 'updateCredentials', 'activate', 'deactivate', 'disconnect']);

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

.lf-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--lf-border-primary);
}

.connection-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--lf-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: var(--lf-surface-secondary);
  color: var(--lf-text-primary);
}

.action-btn .material-symbols-outlined {
  font-size: 1.25rem;
}

.action-warning:hover {
  color: var(--lf-warning);
}

.action-success:hover {
  color: var(--lf-success);
}

.action-danger:hover {
  color: var(--lf-danger);
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
