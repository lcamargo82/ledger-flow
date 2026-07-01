<template>
  <AppEmptyState
    :title="t('gateways.empty.title')"
    :description="t('gateways.empty.description')"
  >
    <template #icon>
      <div class="i-ph-plugs-connected"></div>
    </template>
    <template #action>
      <div class="flex gap-4">
        <AppButton variant="primary" icon="ph-plus" @click="$emit('connectAsaas')">
          {{ t('gateways.asaas.connect') }}
        </AppButton>
        <AppButton variant="secondary" icon="ph-link" @click="$emit('connectMercadoPago')">
          {{ t('gateways.mercadoPago.connect') }}
        </AppButton>
      </div>
    </template>
  </AppEmptyState>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import AppEmptyState from '@components/common/AppEmptyState.vue';
import AppButton from '@components/common/AppButton.vue';

const { t } = useI18n();
defineEmits(['connectAsaas', 'connectMercadoPago']);
</script>


