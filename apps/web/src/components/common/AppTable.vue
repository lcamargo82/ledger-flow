<script setup lang="ts" generic="T extends Record<string, any>">
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'
import AppLoading from './AppLoading.vue'
import AppEmptyState from './AppEmptyState.vue'
import AppPagination from './AppPagination.vue'

interface Column {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}

const props = defineProps<{
  columns: Column[]
  items: T[]
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  pagination?: {
    page: number
    totalPages: number
    total?: number
    perPage?: number
  }
}>()

const emit = defineEmits<{
  (e: 'update:page', page: number): void
}>()

const { t } = useI18n()

const isEmpty = computed(() => !props.items || props.items.length === 0)
</script>

<template>
  <div class="lf-table-wrapper">
    <div class="lf-table-scroll">
      <table class="lf-table">
        <thead class="lf-table-head">
          <tr>
            <th 
              v-for="col in columns" 
              :key="col.key" 
              scope="col" 
              class="lf-table-th"
              :class="{
                'text-left': !col.align || col.align === 'left',
                'text-center': col.align === 'center',
                'text-right': col.align === 'right'
              }"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading State -->
          <tr v-if="isLoading" class="lf-table-row">
            <td :colspan="columns.length" class="lf-table-td text-center" style="padding-top: 3rem; padding-bottom: 3rem;">
              <AppLoading :text="t('common.loading')" />
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-else-if="isEmpty" class="lf-table-row">
            <td :colspan="columns.length" class="lf-table-td text-center" style="padding-top: 3rem; padding-bottom: 3rem;">
              <AppEmptyState 
                :title="emptyTitle || t('common.noData')" 
                :description="emptyDescription" 
              />
            </td>
          </tr>

          <!-- Data Rows -->
          <template v-else>
            <tr 
              v-for="(item, index) in items" 
              :key="index"
              class="lf-table-row"
            >
              <td 
                v-for="col in columns" 
                :key="`${index}-${col.key}`" 
                class="lf-table-td"
                :class="{
                  'text-left': !col.align || col.align === 'left',
                  'text-center': col.align === 'center',
                  'text-right': col.align === 'right'
                }"
              >
                <!-- Named slot for specific column -->
                <slot :name="col.key" :item="item" :value="item[col.key]">
                  <!-- Default rendering -->
                  {{ item[col.key] !== undefined && item[col.key] !== null ? item[col.key] : '-' }}
                </slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <AppPagination
      v-if="pagination"
      :page="pagination.page"
      :total-pages="pagination.totalPages"
      :total="pagination.total"
      :per-page="pagination.perPage"
      @update:page="emit('update:page', $event)"
    />
  </div>
</template>
