<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'
import AppButton from './AppButton.vue'

const props = defineProps<{
  page: number
  totalPages: number
  total?: number
  perPage?: number
}>()

const emit = defineEmits<{
  (e: 'update:page', page: number): void
}>()

const { t } = useI18n()

const canGoPrev = computed(() => props.page > 1)
const canGoNext = computed(() => props.page < props.totalPages)

const firstPage = () => {
  if (canGoPrev.value) emit('update:page', 1)
}

const prevPage = () => {
  if (canGoPrev.value) emit('update:page', props.page - 1)
}

const nextPage = () => {
  if (canGoNext.value) emit('update:page', props.page + 1)
}

const lastPage = () => {
  if (canGoNext.value) emit('update:page', props.totalPages)
}
</script>

<template>
  <div class="lf-pagination" v-if="totalPages > 1 || total !== undefined">
    <div class="lf-pagination__info">
      <span v-if="total !== undefined" class="text-sm text-[var(--lf-text-secondary)]">
        {{ t('common.pagination.total', { total }) }}
      </span>
    </div>

    <div class="lf-pagination__controls" v-if="totalPages > 1">
      <AppButton
        variant="secondary"
        size="small"
        icon-only
        :disabled="!canGoPrev"
        :aria-label="t('common.pagination.first')"
        data-testid="pagination-first"
        @click="firstPage"
      >
        <template #icon>
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">first_page</span>
        </template>
      </AppButton>
      <AppButton
        variant="secondary"
        size="small"
        icon-only
        :disabled="!canGoPrev"
        :aria-label="t('common.pagination.previous')"
        data-testid="pagination-previous"
        @click="prevPage"
      >
        <template #icon>
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_left</span>
        </template>
      </AppButton>
      <span class="lf-pagination__page-text text-sm text-[var(--lf-text-secondary)]">
        {{ t('common.pagination.pageOf', { page, totalPages }) }}
      </span>
      <AppButton
        variant="secondary"
        size="small"
        icon-only
        :disabled="!canGoNext"
        :aria-label="t('common.pagination.next')"
        data-testid="pagination-next"
        @click="nextPage"
      >
        <template #icon>
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true"
            >chevron_right</span
          >
        </template>
      </AppButton>
      <AppButton
        variant="secondary"
        size="small"
        icon-only
        :disabled="!canGoNext"
        :aria-label="t('common.pagination.last')"
        data-testid="pagination-last"
        @click="lastPage"
      >
        <template #icon>
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">last_page</span>
        </template>
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.lf-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--lf-spacing-4) var(--lf-spacing-6);
  border-top: 1px solid var(--lf-border-color);
}

.lf-pagination__controls {
  display: flex;
  align-items: center;
  gap: var(--lf-spacing-2);
}

.lf-pagination__page-text {
  font-variant-numeric: tabular-nums;
  min-width: 5rem;
  text-align: center;
}

@media (max-width: 640px) {
  .lf-pagination {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--lf-spacing-3);
    padding-inline: var(--lf-spacing-4);
  }

  .lf-pagination__controls {
    justify-content: space-between;
    width: 100%;
  }
}
</style>
