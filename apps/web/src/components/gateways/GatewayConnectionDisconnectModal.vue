<template>
  <AppModal
    :model-value="isOpen"
    @update:model-value="(val) => !val && close()"
    :title="t('gateways.disconnect.title')"
  >
    <p class="lf-text-secondary lf-mb-4">
      {{ t('gateways.disconnect.message') }}
    </p>

    <AppInput
      id="disconnect-confirm"
      v-model="confirmText"
      :label="t('gateways.disconnect.confirmLabel')"
      :placeholder="t('gateways.disconnect.confirmValue')"
    />

    <template #footer>
      <div class="lf-flex lf-justify-end lf-gap-2">
        <AppButton variant="secondary" @click="close" :disabled="isSubmitting">
          {{ t('common.cancel') }}
        </AppButton>
        <AppButton 
          variant="danger" 
          @click="confirm" 
          :disabled="isSubmitting || !isConfirmed"
          :loading="isSubmitting"
        >
          {{ t('gateways.actions.disconnect') }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from '@/composables/useI18n';
import AppModal from '@components/common/AppModal.vue';
import AppButton from '@components/common/AppButton.vue';
import AppInput from '@components/common/AppInput.vue';
import type { GatewayConnection } from '@/services/gateway-connections.service';

const props = defineProps<{
  isOpen: boolean;
  connection: GatewayConnection | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();

const { t } = useI18n();

const confirmText = ref('');
const isSubmitting = ref(false);

const expectedText = computed(() => t('gateways.disconnect.confirmValue'));
const isConfirmed = computed(() => confirmText.value === expectedText.value);

watch(() => props.isOpen, (val) => {
  if (val) {
    confirmText.value = '';
    isSubmitting.value = false;
  }
});

const close = () => {
  if (!isSubmitting.value) emit('close');
};

const confirm = async () => {
  if (!isConfirmed.value) return;
  isSubmitting.value = true;
  emit('confirm');
  // the parent handles the actual API call and success logic
};
</script>
