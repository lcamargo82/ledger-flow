<script setup lang="ts">
import { useI18n } from '../composables/useI18n'
import AppBadge from '../components/common/AppBadge.vue'
import AppCard from '../components/common/AppCard.vue'
import AppEmptyState from '../components/common/AppEmptyState.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'

const { t } = useI18n()
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      :eyebrow="t('salesIntelligence.foundation.eyebrow')"
      :title="t('salesIntelligence.title')"
      :description="t('salesIntelligence.description')"
    />

    <AppCard>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-medium text-[var(--lf-text-primary)]">
            {{ t('salesIntelligence.foundation.scope') }}
          </p>
          <p class="mt-1 text-sm text-[var(--lf-text-secondary)]">
            {{ t('salesIntelligence.foundation.provenance') }}
          </p>
        </div>
        <AppBadge variant="info">
          {{ t('salesIntelligence.foundation.status') }}
        </AppBadge>
      </div>
    </AppCard>

    <AppEmptyState
      :title="t('salesIntelligence.empty.title')"
      :description="t('salesIntelligence.empty.description')"
    />
  </div>
</template>
