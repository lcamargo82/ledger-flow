<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AppInput from '@/components/ui/AppInput.vue';
import AppButton from '@/components/ui/AppButton.vue';

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
    <AppInput v-model="props.modelValue.tenantId" :label="t('platform.async.filters.tenant')" class="flex-1" />
    <AppInput v-model="props.modelValue.status" :label="t('platform.async.filters.status')" class="flex-1" />
    <AppInput v-model="props.modelValue.eventType" :label="t('platform.async.filters.eventType')" class="flex-1" />
    <AppButton @click="applyFilters" variant="primary">{{ t('platform.async.filters.apply') }}</AppButton>
  </div>
</template>
