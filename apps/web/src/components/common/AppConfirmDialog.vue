<template>
  <AppModal
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="title"
    :prevent-close="loading"
  >
    <p class="lf-confirm-message">{{ message }}</p>
    
    <template #footer>
      <AppButton
        variant="secondary"
        @click="handleCancel"
        :disabled="loading"
      >
        {{ cancelText || t('common.cancel') }}
      </AppButton>
      <AppButton
        :variant="confirmVariant"
        @click="handleConfirm"
        :loading="loading"
      >
        {{ confirmText || t('common.confirm') }}
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';
import AppModal from './AppModal.vue';
import AppButton from './AppButton.vue';

interface Props {
  modelValue: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
  confirmVariant: 'primary',
  loading: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('update:modelValue', false);
  emit('cancel');
};
</script>

<style scoped>
.lf-confirm-message {
  margin: 0;
  color: var(--lf-text-secondary);
  line-height: 1.6;
}
</style>
