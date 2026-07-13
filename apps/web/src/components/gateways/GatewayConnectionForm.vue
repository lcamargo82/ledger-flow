<template>
  <AppModal
    :model-value="isOpen"
    @update:model-value="(val) => !val && $emit('close')"
    :title="isEdit ? t('gateways.actions.edit') : t('gateways.actions.connect')"
    @close="$emit('close')"
  >
    <form @submit.prevent="submit" class="connection-form">
      <AppSelect
        v-if="!isEdit"
        v-model="form.provider"
        label="Provedor"
        :options="[
          { label: 'Asaas', value: 'ASAAS' },
          { label: 'Mercado Pago', value: 'MERCADO_PAGO' }
        ]"
      />

      <AppSelect
        v-model="form.environment"
        :label="t('gateways.form.environment')"
        :options="[
          { label: 'Sandbox (Testes)', value: 'SANDBOX' },
          { label: 'Produção', value: 'PRODUCTION' }
        ]"
        :disabled="isEdit"
      />

      <div v-if="form.provider === 'MERCADO_PAGO'" class="info-alert">
        <div class="material-symbols-outlined info-alert__icon" style="font-variation-settings: 'FILL' 0">security</div>
        <p class="info-alert__text">{{ t('gateways.mercadoPago.oauthOnly') }}</p>
      </div>

      <template v-else>

      <AppInput
        v-if="!isEdit"
        v-model="form.apiKey"
        type="password"
        :label="t('gateways.form.apiKey')"
        :placeholder="t('gateways.form.apiKeyHint')"
        required
      />

      <AppInput
        v-model="form.displayName"
        :label="t('gateways.form.displayName')"
        placeholder="Asaas Sandbox"
      />

      <AppNumberInput
        v-model.number="form.priority"
        :label="t('gateways.form.priority')"
        min="1"
        max="1000"
      />

      <div class="methods-group">
        <label class="methods-group__label">{{ t('gateways.form.supportedMethods') }}</label>
        <div class="methods-group__options">
          <label class="method-checkbox">
            <input type="checkbox" value="PIX" v-model="form.supportedMethods" />
            <span>PIX</span>
          </label>
          <label class="method-checkbox">
            <input type="checkbox" value="BOLETO" v-model="form.supportedMethods" />
            <span>BOLETO</span>
          </label>
          <label class="method-checkbox">
            <input type="checkbox" value="CREDIT_CARD" v-model="form.supportedMethods" />
            <span>Cartão de Crédito</span>
          </label>
        </div>
      </div>
      </template>
    </form>

    <template #footer>
      <AppButton variant="secondary" @click="$emit('close')">Cancelar</AppButton>
      <AppButton 
        variant="primary" 
        @click="submit" 
        :loading="isSubmitting" 
        :disabled="isSubmitting || form.provider === 'MERCADO_PAGO'"
      >
        {{ isSubmitting ? t('gateways.asaas.connecting') : t('gateways.form.save') }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { useI18n } from '@/composables/useI18n';
import AppModal from '@components/common/AppModal.vue';
import AppInput from '@components/common/AppInput.vue';
import AppNumberInput from '@components/common/AppNumberInput.vue';
import AppSelect from '@components/common/AppSelect.vue';
import AppButton from '@components/common/AppButton.vue';
import type { GatewayConnection } from '@/services/gateway-connections.service';

const { t } = useI18n();

const props = defineProps<{
  isOpen: boolean;
  connection?: GatewayConnection | null;
}>();

const emit = defineEmits(['close', 'saved']);

const isEdit = computed(() => !!props.connection);
const isSubmitting = ref(false);

const form = reactive({
  provider: 'ASAAS',
  environment: 'SANDBOX',
  apiKey: '',
  displayName: '',
  priority: 1,
  supportedMethods: ['PIX', 'BOLETO'],
});

watch(() => props.isOpen, (open) => {
  if (open) {
    if (props.connection) {
      form.provider = props.connection.provider;
      form.environment = props.connection.environment;
      form.displayName = props.connection.displayName || '';
      form.priority = props.connection.priority;
      form.supportedMethods = [...props.connection.supportedMethods];
    } else {
      form.provider = 'ASAAS';
      form.environment = 'SANDBOX';
      form.apiKey = '';
      form.displayName = 'Asaas';
      form.priority = 1;
      form.supportedMethods = ['PIX', 'BOLETO', 'CREDIT_CARD'];
    }
  }
});

const submit = () => {
  emit('saved', { ...form });
};
</script>

<style scoped>
.connection-form {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-4);
  padding: var(--lf-space-2) 0;
}

.methods-group {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-2);
  margin-top: var(--lf-space-2);
}

.methods-group__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--lf-text-primary);
}

.methods-group__options {
  display: flex;
  gap: var(--lf-space-4);
  flex-wrap: wrap;
}

.method-checkbox {
  display: flex;
  align-items: center;
  gap: var(--lf-space-2);
  cursor: pointer;
  color: var(--lf-text-secondary);
  font-size: 0.875rem;
}

.method-checkbox:hover {
  color: var(--lf-text-primary);
}

.method-checkbox input {
  accent-color: var(--lf-primary);
  width: 16px;
  height: 16px;
}

.info-alert {
  padding: var(--lf-space-4);
  background-color: var(--lf-surface-secondary);
  border: 1px solid var(--lf-border-primary);
  border-radius: var(--lf-radius);
  text-align: center;
}

.info-alert__icon {
  font-size: 1.5rem;
  margin-bottom: var(--lf-space-2);
  opacity: 0.5;
  color: var(--lf-text-muted);
}

.info-alert__text {
  color: var(--lf-text-secondary);
  font-size: 0.875rem;
  margin: 0;
}
</style>
