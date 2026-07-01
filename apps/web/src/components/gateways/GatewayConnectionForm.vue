<template>
  <AppModal
    :model-value="isOpen"
    @update:model-value="(val) => !val && $emit('close')"
    :title="isEdit ? t('gateways.actions.edit') : t('gateways.actions.connect')"
    @close="$emit('close')"
  >
    <form @submit.prevent="submit" class="flex flex-col gap-4">
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

      <div v-if="form.provider === 'MERCADO_PAGO'" class="p-4 bg-surface-hover rounded border border-divider text-center">
        <div class="i-ph-clock text-2xl mb-2 mx-auto opacity-50"></div>
        <p class="text-secondary text-sm">Integração via OAuth em breve.</p>
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

      <AppInput
        v-model.number="form.priority"
        type="number"
        :label="t('gateways.form.priority')"
        min="1"
        max="1000"
      />

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium">{{ t('gateways.form.supportedMethods') }}</label>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" value="PIX" v-model="form.supportedMethods" class="rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500" />
            <span>PIX</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" value="BOLETO" v-model="form.supportedMethods" class="rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500" />
            <span>BOLETO</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" value="CREDIT_CARD" v-model="form.supportedMethods" class="rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500" />
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


