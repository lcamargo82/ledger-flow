<template>
  <AppConfirmDialog
    :model-value="isOpen"
    @update:model-value="(val) => !val && $emit('close')"
    :title="isActivating ? t('gateways.actions.activate') : t('gateways.deactivate.title')"
    :message="isActivating ? `Tem certeza que deseja ativar a conexão ${connection?.displayName || connection?.provider}?` : t('gateways.deactivate.message')"
    :confirm-variant="isActivating ? 'primary' : 'danger'"
    @confirm="submit"
    @cancel="$emit('close')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/composables/useI18n';
import AppConfirmDialog from '@components/common/AppConfirmDialog.vue';
import type { GatewayConnection } from '@/services/gateway-connections.service';

const { t } = useI18n();

const props = defineProps<{
  isOpen: boolean;
  connection: GatewayConnection | null;
  action: 'activate' | 'deactivate';
}>();

const emit = defineEmits(['close', 'confirm']);

const isActivating = computed(() => props.action === 'activate');

const submit = () => {
  emit('confirm');
};
</script>


