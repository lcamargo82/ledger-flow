<template>
  <section class="inventory-advanced-foundation">
    <AppPageHeader
      :title="t(`${translationKey}.title`)"
      :description="t(`${translationKey}.description`)"
    />

    <AppCard>
      <template #header>
        <div class="inventory-advanced-foundation__heading">
          <AppBadge variant="info" :label="t('inventory.advanced.foundationStatus')" />
          <h2>{{ t('inventory.advanced.contractsReady') }}</h2>
        </div>
      </template>

      <p>{{ t('inventory.advanced.foundationOnly') }}</p>
      <ul>
        <li>{{ t('inventory.advanced.capabilityProtected') }}</li>
        <li>{{ t('inventory.advanced.reasonCodesReady') }}</li>
        <li>{{ t('inventory.advanced.ledgerPreserved') }}</li>
      </ul>
    </AppCard>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppBadge from '../components/common/AppBadge.vue'
import AppCard from '../components/common/AppCard.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import { useI18n } from '../composables/useI18n'

const route = useRoute()
const { t } = useI18n()
const translationKey = computed(() =>
  route.name === 'inventory-transfers'
    ? 'inventory.advanced.transfers'
    : 'inventory.advanced.cycleCounts',
)
</script>

<style scoped>
.inventory-advanced-foundation {
  max-width: 72rem;
}

.inventory-advanced-foundation__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--lf-space-3);
}

.inventory-advanced-foundation__heading h2,
.inventory-advanced-foundation p {
  margin: 0;
}

.inventory-advanced-foundation ul {
  margin: var(--lf-space-4) 0 0;
  padding-inline-start: var(--lf-space-6);
  color: var(--lf-text-secondary);
}
</style>
