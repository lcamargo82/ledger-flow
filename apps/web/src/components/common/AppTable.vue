<script setup lang="ts" generic="T extends Record<string, any>">
import { computed } from 'vue'
import { useI18n } from '../../composables/useI18n'
import AppLoading from './AppLoading.vue'
import AppEmptyState from './AppEmptyState.vue'

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
}>()

const { t } = useI18n()

const isEmpty = computed(() => !props.items || props.items.length === 0)
</script>

<template>
  <div class="app-table-wrapper w-full border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-800 dark:text-gray-300">
          <tr>
            <th 
              v-for="col in columns" 
              :key="col.key" 
              scope="col" 
              class="px-6 py-3 font-medium tracking-wider"
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
          <tr v-if="isLoading" class="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
            <td :colspan="columns.length" class="px-6 py-12 text-center">
              <AppLoading :text="t('common.loading')" />
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-else-if="isEmpty" class="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
            <td :colspan="columns.length" class="px-6 py-12 text-center">
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
              class="bg-white dark:bg-gray-900 border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td 
                v-for="col in columns" 
                :key="`${index}-${col.key}`" 
                class="px-6 py-4"
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
  </div>
</template>
