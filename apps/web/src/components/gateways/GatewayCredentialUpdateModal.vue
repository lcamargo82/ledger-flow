<template>
  <div class="lf-modal" v-if="isOpen">
    <div class="lf-modal-content">
      <div class="lf-modal-header">
        <h3>{{ t('gateways.form.updateCredentials') }}</h3>
        <button class="lf-btn lf-btn-icon" @click="$emit('close')">
          <div class="i-ph-x"></div>
        </button>
      </div>

      <div class="lf-modal-body">
        <p class="text-secondary mb-4">
          Para atualizar as credenciais do provedor {{ connection?.provider }} ({{ connection?.environment }}), insira a nova API Key.
        </p>
        <form @submit.prevent="submit" class="lf-form">
          <div class="lf-form-group">
            <label>{{ t('gateways.form.apiKey') }}</label>
            <input type="password" class="lf-input" v-model="apiKey" :placeholder="t('gateways.form.apiKeyHint')" required />
          </div>
        </form>
      </div>

      <div class="lf-modal-footer">
        <button class="lf-btn lf-btn-neutral" @click="$emit('close')">Cancelar</button>
        <button class="lf-btn lf-btn-primary" @click="submit" :disabled="!apiKey">
          {{ t('gateways.actions.updateCredentials') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { GatewayConnection } from '../../services/gateway-connections.service';

const { t } = useI18n();

const props = defineProps<{
  isOpen: boolean;
  connection: GatewayConnection | null;
}>();

const emit = defineEmits(['close', 'saved']);

const apiKey = ref('');

const submit = () => {
  emit('saved', apiKey.value);
  apiKey.value = '';
};
</script>

<style scoped>
.lf-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.lf-modal-content {
  background: var(--lf-panel-bg);
  border-radius: var(--lf-radius-lg);
  width: 100%;
  max-width: 400px;
  box-shadow: var(--lf-shadow-xl);
}
.lf-modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--lf-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.lf-modal-header h3 {
  margin: 0;
}
.lf-modal-body {
  padding: 1.5rem;
}
.lf-modal-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--lf-border-color);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
</style>
