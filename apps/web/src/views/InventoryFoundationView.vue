<template>
  <div class="lf-page">
    <AppPageHeader
      :title="t('inventory.title')"
      :description="t('inventory.description')"
    />

    <AppEmptyState
      :title="t('inventory.emptyTitle')"
      :description="t('inventory.emptyDescription')"
      icon
    />
  </div>
</template>

<script setup lang="ts">
import AppEmptyState from '../components/common/AppEmptyState.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()
</script>
