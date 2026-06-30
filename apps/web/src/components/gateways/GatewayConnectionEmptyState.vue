<template>
  <AppEmptyState
    :title="t('gateways.empty.title')"
    :description="t('gateways.empty.description')"
  >
    <template #icon>
      <div class="i-ph-plugs-connected"></div>
    </template>
    <template #action>
      <AppButton variant="primary" icon="ph-plus" @click="$emit('connect')">
        {{ t('gateways.asaas.connect') }}
      </AppButton>
    </template>
  </AppEmptyState>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import AppEmptyState from '@components/common/AppEmptyState.vue';
import AppButton from '@components/common/AppButton.vue';

const { t } = useI18n();
defineEmits(['connect']);
</script>


