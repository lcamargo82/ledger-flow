<template>
  <AppModal
    :model-value="isOpen"
    @update:model-value="(val) => !val && $emit('close')"
    :title="t('gateways.form.updateCredentials')"
    @close="$emit('close')"
  >
    <p class="text-secondary mb-4">
      Para atualizar as credenciais do provedor {{ connection?.provider }} ({{ connection?.environment }}), insira a nova API Key.
    </p>
    <form @submit.prevent="submit" class="flex flex-col gap-4">
      <AppInput
        v-model="apiKey"
        type="password"
        :label="t('gateways.form.apiKey')"
        :placeholder="t('gateways.form.apiKeyHint')"
        required
      />
    </form>

    <template #footer>
      <AppButton variant="secondary" @click="$emit('close')">Cancelar</AppButton>
      <AppButton variant="primary" @click="submit" :disabled="!apiKey">
        {{ t('gateways.actions.updateCredentials') }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import AppModal from '@components/common/AppModal.vue';
import AppInput from '@components/common/AppInput.vue';
import AppButton from '@components/common/AppButton.vue';
import type { GatewayConnection } from '@/services/gateway-connections.service';

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


