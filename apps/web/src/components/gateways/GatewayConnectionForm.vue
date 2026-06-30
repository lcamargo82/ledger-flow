<template>
  <div class="lf-modal" v-if="isOpen">
    <div class="lf-modal-content">
      <div class="lf-modal-header">
        <h3>{{ isEdit ? t('gateways.actions.edit') : t('gateways.asaas.connect') }}</h3>
        <button class="lf-btn lf-btn-icon" @click="$emit('close')">
          <div class="i-ph-x"></div>
        </button>
      </div>

      <div class="lf-modal-body">
        <form @submit.prevent="submit" class="lf-form">
          <div class="lf-form-group">
            <label>{{ t('gateways.form.environment') }}</label>
            <input type="text" class="lf-input" :value="form.environment" disabled />
          </div>

          <div class="lf-form-group" v-if="!isEdit">
            <label>{{ t('gateways.form.apiKey') }}</label>
            <input type="password" class="lf-input" v-model="form.apiKey" :placeholder="t('gateways.form.apiKeyHint')" required />
          </div>

          <div class="lf-form-group">
            <label>{{ t('gateways.form.displayName') }}</label>
            <input type="text" class="lf-input" v-model="form.displayName" placeholder="Asaas Sandbox" />
          </div>

          <div class="lf-form-group">
            <label>{{ t('gateways.form.priority') }}</label>
            <input type="number" class="lf-input" v-model="form.priority" min="1" max="1000" />
          </div>

          <div class="lf-form-group">
            <label>{{ t('gateways.form.supportedMethods') }}</label>
            <div class="lf-checkbox-group mt-2">
              <label class="lf-checkbox">
                <input type="checkbox" value="PIX" v-model="form.supportedMethods" />
                <span>PIX</span>
              </label>
              <label class="lf-checkbox">
                <input type="checkbox" value="BOLETO" v-model="form.supportedMethods" />
                <span>BOLETO</span>
              </label>
            </div>
          </div>
        </form>
      </div>

      <div class="lf-modal-footer">
        <button class="lf-btn lf-btn-neutral" @click="$emit('close')">Cancelar</button>
        <button class="lf-btn lf-btn-primary" @click="submit" :disabled="isSubmitting">
          {{ isSubmitting ? t('gateways.asaas.connecting') : t('gateways.form.save') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { GatewayConnection } from '../../services/gateway-connections.service';

const { t } = useI18n();

const props = defineProps<{
  isOpen: boolean;
  connection?: GatewayConnection | null;
}>();

const emit = defineEmits(['close', 'saved']);

const isEdit = computed(() => !!props.connection);
const isSubmitting = ref(false);

const form = reactive({
  environment: 'SANDBOX',
  apiKey: '',
  displayName: '',
  priority: 1,
  supportedMethods: ['PIX', 'BOLETO'],
});

watch(() => props.isOpen, (open) => {
  if (open) {
    if (props.connection) {
      form.environment = props.connection.environment;
      form.displayName = props.connection.displayName || '';
      form.priority = props.connection.priority;
      form.supportedMethods = [...props.connection.supportedMethods];
    } else {
      form.environment = 'SANDBOX';
      form.apiKey = '';
      form.displayName = 'Asaas Sandbox';
      form.priority = 1;
      form.supportedMethods = ['PIX', 'BOLETO'];
    }
  }
});

import { computed } from 'vue';

const submit = () => {
  emit('saved', { ...form });
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
  max-width: 500px;
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
