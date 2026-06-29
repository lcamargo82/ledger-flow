<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from '../composables/useI18n'
import { usePlatformTenantsStore } from '../stores/platform-tenants.store'

const { t } = useI18n()
const platformTenantsStore = usePlatformTenantsStore()

const searchQuery = ref('')
const selectedStatus = ref('')
const selectedPlan = ref('')

onMounted(() => {
  fetchTenants()
})

const fetchTenants = () => {
  platformTenantsStore.fetchTenants({
    search: searchQuery.value || undefined,
    active: selectedStatus.value === 'active' ? true : selectedStatus.value === 'inactive' ? false : undefined,
    plan: selectedPlan.value ? (selectedPlan.value as any) : undefined,
  })
}

const handleSearch = () => {
  fetchTenants()
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Platform Tenants</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage all customer organizations on LedgerFlow.
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="w-full sm:w-64">
        <label for="search" class="sr-only">Search tenants</label>
        <input
          id="search"
          v-model="searchQuery"
          type="text"
          placeholder="Search tenants..."
          class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
          @keyup.enter="handleSearch"
        />
      </div>
      
      <div class="w-full sm:w-48">
        <select
          v-model="selectedStatus"
          class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
          @change="handleSearch"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div class="w-full sm:w-48">
        <select
          v-model="selectedPlan"
          class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
          @change="handleSearch"
        >
          <option value="">All Plans</option>
          <option value="FREE">Free</option>
          <option value="STARTER">Starter</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="ENTERPRISE">Enterprise</option>
          <option value="CUSTOM">Custom</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div v-if="platformTenantsStore.loading" class="p-8 text-center text-gray-500">
        Loading...
      </div>
      <div v-else-if="platformTenantsStore.error" class="p-8 text-center text-red-500">
        {{ platformTenantsStore.error }}
      </div>
      <div v-else-if="platformTenantsStore.tenants.length === 0" class="p-8 text-center text-gray-500">
        No tenants found.
      </div>
      <table v-else class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:pl-6">Tenant Name</th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Plan</th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Status</th>
            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">Created At</th>
            <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span class="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="tenant in platformTenantsStore.tenants" :key="tenant.id">
            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
              {{ tenant.name }}
              <div class="text-xs text-gray-500">{{ tenant.slug }}</div>
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
              {{ tenant.subscription?.plan || 'N/A' }}
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
              <span v-if="tenant.active" class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Active</span>
              <span v-else class="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">Inactive</span>
            </td>
            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
              {{ formatDate(tenant.createdAt) }}
            </td>
            <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
              <!-- Detail button will be added here in the future -->
              <a href="#" class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">View</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
