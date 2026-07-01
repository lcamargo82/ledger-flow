<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import AppInput from '@/components/common/AppInput.vue';
import AppButton from '@/components/common/AppButton.vue';

const props = defineProps<{
  modelValue: { tenantId: string; status: string; eventType: string; }
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: any): void;
  (e: 'filter'): void;
}>();

const { t } = useI18n();

const applyFilters = () => {
  emit('filter');
};
</script>

<template>
  <div class="flex gap-4 items-end bg-surface border border-divider p-4 rounded-lg">
    <AppInput :model-value="props.modelValue.tenantId" @update:model-value="emit('update:modelValue', { ...props.modelValue, tenantId: $event as string })" :label="t('platform.async.filters.tenant')" class="flex-1" />
    <AppInput :model-value="props.modelValue.status" @update:model-value="emit('update:modelValue', { ...props.modelValue, status: $event as string })" :label="t('platform.async.filters.status')" class="flex-1" />
    <AppInput :model-value="props.modelValue.eventType" @update:model-value="emit('update:modelValue', { ...props.modelValue, eventType: $event as string })" :label="t('platform.async.filters.eventType')" class="flex-1" />
    <AppButton @click="applyFilters" variant="primary">{{ t('platform.async.filters.apply') }}</AppButton>
  </div>
</template>
