<script setup lang="ts">
import { useI18n } from '../composables/useI18n'
import AppEmptyState from '../components/common/AppEmptyState.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'

const { t } = useI18n()
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      :title="t('reconciliation.title')"
      :description="t('reconciliation.description')"
    />

    <AppEmptyState
      :title="t('reconciliation.empty.title')"
      :description="t('reconciliation.empty.description')"
    />
  </div>
</template>
