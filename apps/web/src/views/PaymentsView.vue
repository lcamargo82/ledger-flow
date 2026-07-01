<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from '../composables/useI18n';
import { usePaymentsStore } from '../stores/payments.store';
import { useAuthStore } from '../stores/auth.store';
import { formatDateTime } from '../utils/date-format';
import { formatMoneyFromCents } from '../utils/money-format';
import { useDebounceFn } from '../composables/useDebounce';

import AppPageHeader from '../components/common/AppPageHeader.vue';
import AppCard from '../components/common/AppCard.vue';
import AppInput from '../components/common/AppInput.vue';
import AppSelect from '../components/common/AppSelect.vue';
import AppButton from '../components/common/AppButton.vue';
import AppBadge from '../components/common/AppBadge.vue';
import AppTable from '../components/common/AppTable.vue';
import AppModal from '../components/common/AppModal.vue';
import AppErrorState from '../components/common/AppErrorState.vue';
import AppConfirmDialog from '../components/common/AppConfirmDialog.vue';
import { useToastStore } from '../stores/toast.store';

import PaymentForm from '../components/payments/PaymentForm.vue';
import PaymentDetails from '../components/payments/PaymentDetails.vue';

const { t, currentLocale } = useI18n();
const paymentsStore = usePaymentsStore();
const authStore = useAuthStore();
const toastStore = useToastStore();

const searchInput = ref(paymentsStore.filters.search || '');
const dateFromInput = ref(paymentsStore.filters.dateFrom || '');
const dateToInput = ref(paymentsStore.filters.dateTo || '');

const columns = computed(() => [
  { key: 'reference', label: t('payments.table.reference') },
  { key: 'customer', label: t('payments.table.customer') },
  { key: 'amount', label: t('payments.table.amount') },
  { key: 'method', label: t('payments.table.method') },
  { key: 'status', label: t('payments.table.status') },
  { key: 'integration', label: t('payments.table.integration') },
  { key: 'createdAt', label: t('payments.table.createdAt') },
  { key: 'actions', label: t('payments.table.actions'), align: 'right' as const }
]);

onMounted(() => {
  paymentsStore.fetchPayments();
});

const handleSearch = useDebounceFn(() => {
  paymentsStore.setSearch(searchInput.value);
}, 500);

const handleDateChange = () => {
  paymentsStore.setDateRange(dateFromInput.value, dateToInput.value);
};

const clearFilters = () => {
  searchInput.value = '';
  dateFromInput.value = '';
  dateToInput.value = '';
  paymentsStore.resetFilters();
};

const isCreateModalOpen = ref(false);
const isDetailsModalOpen = ref(false);
const isConfirmCancelOpen = ref(false);
const targetPaymentId = ref<string | null>(null);

const handleNewPayment = () => {
  isCreateModalOpen.value = true;
};

const handleCreatePayment = async (payload: Record<string, unknown>) => {
  try {
    await paymentsStore.createPayment(payload as any);
    isCreateModalOpen.value = false;
    toastStore.success(t('payments.toast.created'));
  } catch {
    // Error state handled in store/view
  }
};

const openPaymentDetails = async (id: string) => {
  await paymentsStore.fetchPaymentById(id);
  if (!paymentsStore.error) {
    isDetailsModalOpen.value = true;
  }
};

const openCancelConfirm = (id: string) => {
  targetPaymentId.value = id;
  isConfirmCancelOpen.value = true;
};

const handleCancelPayment = async () => {
  if (!targetPaymentId.value) return;
  try {
    await paymentsStore.cancelPayment(targetPaymentId.value);
    isConfirmCancelOpen.value = false;
    toastStore.success(t('payments.toast.canceled'));
  } catch {
    // Error state handled in store
  }
};

const statusOptions = computed(() => [
  { value: 'all', label: t('payments.filters.statusAll') },
  { value: 'PENDING', label: t('payments.status.PENDING') },
  { value: 'PROCESSING', label: t('payments.status.PROCESSING') },
  { value: 'APPROVED', label: t('payments.status.APPROVED') },
  { value: 'FAILED', label: t('payments.status.FAILED') },
  { value: 'CANCELED', label: t('payments.status.CANCELED') },
  { value: 'REFUNDED', label: t('payments.status.REFUNDED') },
]);

const methodOptions = computed(() => [
  { value: 'all', label: t('payments.filters.methodAll') },
  { value: 'PIX', label: t('payments.method.PIX') },
  { value: 'BOLETO', label: t('payments.method.BOLETO') },
  { value: 'CARD', label: t('payments.method.CARD') },
  { value: 'BANK_TRANSFER', label: t('payments.method.BANK_TRANSFER') },
  { value: 'OTHER', label: t('payments.method.OTHER') },
]);

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'PENDING': return 'warning';
    case 'PROCESSING': return 'info';
    case 'APPROVED': return 'success';
    case 'FAILED': return 'danger';
    case 'CANCELED': return 'default';
    case 'REFUNDED': return 'default';
    default: return 'default';
  }
};

const getIntegrationVariant = (status: string) => {
  switch (status) {
    case 'NOT_REQUIRED': return 'default';
    case 'NOT_STARTED': return 'default';
    case 'PROCESSING': return 'info';
    case 'RETRY_SCHEDULED': return 'warning';
    case 'SUCCEEDED': return 'success';
    case 'FAILED': return 'danger';
    case 'DEAD_LETTERED': return 'danger';
    default: return 'default';
  }
};

const canCancel = (status: string) => {
  return status === 'PENDING' || status === 'PROCESSING';
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <AppPageHeader 
      :title="t('payments.title')" 
      :description="t('payments.description')"
    >
      <template #actions>
        <AppButton 
          v-if="authStore.checkPermission('payments:create')"
          variant="primary" 
          @click="handleNewPayment"
        >
          {{ t('payments.actions.create') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <!-- Error State for List -->
    <AppErrorState 
      v-if="paymentsStore.error && !paymentsStore.payments.length" 
      :title="t('payments.error.title')" 
      :description="t(paymentsStore.error) || t('payments.error.description')"
      @retry="paymentsStore.fetchPayments()"
    />

    <template v-else>
      <!-- Filters -->
      <AppCard class="mb-6">
        <div class="filters-row">
          <div class="filter-item filter-item--large">
            <AppInput 
              id="search"
              v-model="searchInput"
              :label="t('payments.filters.searchLabel')"
              :placeholder="t('payments.filters.searchPlaceholder')"
              @input="handleSearch"
            />
          </div>
          <div class="filter-item">
            <AppSelect
              id="status"
              v-model="paymentsStore.filters.status"
              :label="t('payments.filters.statusLabel')"
              :options="statusOptions"
              @change="paymentsStore.setStatus(paymentsStore.filters.status as any)"
            />
          </div>
          <div class="filter-item">
            <AppSelect
              id="method"
              v-model="paymentsStore.filters.method"
              :label="t('payments.filters.methodLabel')"
              :options="methodOptions"
              @change="paymentsStore.setMethod(paymentsStore.filters.method as any)"
            />
          </div>
          <div class="filter-item">
            <AppInput 
              id="dateFrom"
              type="date"
              v-model="dateFromInput"
              :label="t('payments.filters.dateFromLabel')"
              @change="handleDateChange"
            />
          </div>
          <div class="filter-item">
            <AppInput 
              id="dateTo"
              type="date"
              v-model="dateToInput"
              :label="t('payments.filters.dateToLabel')"
              @change="handleDateChange"
            />
          </div>
          <div class="filter-item-actions">
            <AppButton variant="secondary" @click="clearFilters">
              {{ t('payments.actions.clearFilters') }}
            </AppButton>
          </div>
        </div>
      </AppCard>

      <!-- Table -->
      <AppTable 
        :columns="columns" 
        :items="paymentsStore.payments" 
        :is-loading="paymentsStore.isLoading"
        :empty-title="t('payments.empty.title')"
        :empty-description="t('payments.empty.description')"
      >
        <template #reference="{ item }">
          <span class="font-medium text-gray-900 dark:text-white">{{ item.reference }}</span>
        </template>
        
        <template #customer="{ item }">
          <span class="text-gray-500 dark:text-gray-400">{{ item.customer.name }}</span>
        </template>

        <template #amount="{ item }">
          <span class="font-medium text-gray-900 dark:text-white">
            {{ formatMoneyFromCents(item.amount, item.currency, currentLocale) }}
          </span>
        </template>

        <template #method="{ item }">
          <span class="text-gray-500 dark:text-gray-400">{{ t(`payments.method.${item.method}`) }}</span>
        </template>

        <template #status="{ item }">
          <AppBadge :variant="getStatusVariant(item.status) as any">
            {{ t(`payments.status.${item.status}`) }}
          </AppBadge>
        </template>

        <template #integration="{ item }">
          <AppBadge v-if="item.externalProcessing" :variant="getIntegrationVariant(item.externalProcessing.status) as any">
            {{ t(`payments.externalProcessing.status.${item.externalProcessing.status}`) }}
          </AppBadge>
          <span v-else class="text-sm text-gray-400">-</span>
        </template>

        <template #createdAt="{ item }">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDateTime(item.createdAt, currentLocale) }}
          </span>
        </template>

        <template #actions="{ item }">
          <div class="flex justify-end gap-2">
            <AppButton 
              v-if="authStore.checkPermission('payments:read')"
              variant="secondary" 
              size="small"
              @click="openPaymentDetails(item.id)"
            >
              {{ t('payments.actions.viewDetails') }}
            </AppButton>
            <AppButton 
              v-if="authStore.checkPermission('payments:cancel') && canCancel(item.status)"
              variant="danger" 
              size="small"
              @click="openCancelConfirm(item.id)"
            >
              {{ t('payments.actions.cancel') }}
            </AppButton>
          </div>
        </template>
      </AppTable>

      <!-- Pagination -->
      <div v-if="paymentsStore.totalPages > 1" class="mt-4 flex items-center justify-between">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          {{ t('payments.pagination.pageOf', { page: paymentsStore.currentPage, totalPages: paymentsStore.totalPages }) }}
        </div>
        <div class="flex gap-2">
          <AppButton 
            variant="secondary" 
            size="small" 
            :disabled="paymentsStore.currentPage <= 1 || paymentsStore.isLoading"
            @click="paymentsStore.setPage(paymentsStore.currentPage - 1)"
          >
            {{ t('payments.pagination.previous') }}
          </AppButton>
          <AppButton 
            variant="secondary" 
            size="small" 
            :disabled="paymentsStore.currentPage >= paymentsStore.totalPages || paymentsStore.isLoading"
            @click="paymentsStore.setPage(paymentsStore.currentPage + 1)"
          >
            {{ t('payments.pagination.next') }}
          </AppButton>
        </div>
      </div>
    </template>

    <!-- Create Modal -->
    <AppModal 
      v-model="isCreateModalOpen" 
      :title="t('payments.form.createTitle')" 
      size="md"
    >
      <div v-if="paymentsStore.error" class="mb-4">
        <div class="p-3 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm rounded-md">
          {{ t(paymentsStore.error) }}
        </div>
      </div>
      <PaymentForm
        :loading="paymentsStore.isCreating"
        @submit="handleCreatePayment"
        @cancel="isCreateModalOpen = false"
      />
    </AppModal>

    <!-- Details Modal -->
    <AppModal 
      v-model="isDetailsModalOpen" 
      :title="t('payments.details.title')" 
      size="lg"
    >
      <div v-if="paymentsStore.isLoadingDetails" class="py-8 flex justify-center">
        <span class="text-gray-500">{{ t('common.loading') }}</span>
      </div>
      <div v-else-if="paymentsStore.selectedPayment">
        <PaymentDetails :payment="paymentsStore.selectedPayment" />
      </div>
    </AppModal>

    <!-- Confirm Cancel -->
    <AppConfirmDialog
      v-model="isConfirmCancelOpen"
      :title="t('payments.confirmCancel.title')"
      :message="t('payments.confirmCancel.message')"
      :confirm-text="t('payments.confirmCancel.confirm')"
      confirm-variant="danger"
      :loading="paymentsStore.isCanceling"
      @confirm="handleCancelPayment"
    />
  </div>
</template>

<style scoped>
.mb-6 {
  margin-bottom: var(--lf-space-6);
}

.filters-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--lf-space-4);
  align-items: flex-end;
}

@media (min-width: 768px) {
  .filters-row {
    flex-wrap: nowrap;
  }
}

.filter-item {
  flex: 1;
  min-width: 150px;
}

.filter-item--large {
  min-width: 200px;
}

.filter-item-actions {
  flex: 0 0 auto;
}
</style>
