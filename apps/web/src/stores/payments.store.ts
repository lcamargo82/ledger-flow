import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { paymentsService } from '../services/payments.service';
import type {
  PaymentListItem,
  PaymentDetails,
  PaginatedPaymentsMeta,
  PaymentStatus,
  PaymentMethod,
  CreatePaymentRequest,
  PaymentInstructions,
} from '../types/payments.types';
import axios from 'axios';
import { createIdempotencyKey } from '../utils/idempotency';

export const usePaymentsStore = defineStore('payments', () => {
  // State
  const payments = ref<PaymentListItem[]>([]);
  const selectedPayment = ref<PaymentDetails | null>(null);
  const paymentInstructions = ref<PaymentInstructions | null>(null);

  const meta = ref<PaginatedPaymentsMeta>({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
  });

  const filters = ref({
    page: 1,
    perPage: 10,
    search: '',
    status: 'all' as PaymentStatus | 'all',
    method: 'all' as PaymentMethod | 'all',
    customerId: '',
    dateFrom: '',
    dateTo: '',
  });

  const isLoading = ref(false);
  const isLoadingDetails = ref(false);
  const isLoadingInstructions = ref(false);
  const isCreating = ref(false);
  const isCanceling = ref(false);

  const error = ref<string | null>(null);

  // Getters
  const hasPayments = computed(() => payments.value.length > 0);
  const totalPayments = computed(() => meta.value.total);
  const currentPage = computed(() => meta.value.page);
  const totalPages = computed(() => meta.value.totalPages);

  // Helpers
  const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 400) {
        if (err.response.data?.message?.toLowerCase().includes('customer')) {
          return 'payments.error.customerRequired';
        }
        if (err.response.data?.message?.toLowerCase().includes('amount')) {
          return 'payments.error.amountInvalid';
        }
        return 'payments.error.createFailed';
      }
      if (err.response?.status === 403) return 'payments.error.forbidden';
      if (err.response?.status === 404) {
        if (err.response.data?.message?.toLowerCase().includes('gateway configuration')) {
          return 'payments.error.gatewayNotFound';
        }
        return 'payments.error.notFound';
      }
      if (err.response?.status === 409) return 'payments.error.invalidStatus';
    }
    return 'payments.error.default';
  };

  // Actions
  const fetchPayments = async (forceParams?: typeof filters.value) => {
    isLoading.value = true;
    error.value = null;
    try {
      const activeFilters = forceParams || filters.value;
      const response = await paymentsService.listPayments({
        page: activeFilters.page,
        perPage: activeFilters.perPage,
        search: activeFilters.search || undefined,
        status: activeFilters.status !== 'all' ? activeFilters.status : undefined,
        method: activeFilters.method !== 'all' ? activeFilters.method : undefined,
        customerId: activeFilters.customerId || undefined,
        dateFrom: activeFilters.dateFrom || undefined,
        dateTo: activeFilters.dateTo || undefined,
      });
      payments.value = response.data;
      meta.value = response.meta;
    } catch (err) {
      error.value = extractErrorMessage(err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchPaymentById = async (id: string) => {
    isLoadingDetails.value = true;
    error.value = null;
    try {
      const response = await paymentsService.getPaymentById(id);
      selectedPayment.value = response.payment;
      return response.payment;
    } catch (err) {
      error.value = extractErrorMessage(err);
      throw err;
    } finally {
      isLoadingDetails.value = false;
    }
  };

  const fetchPaymentInstructions = async (id: string) => {
    isLoadingInstructions.value = true;
    error.value = null;
    try {
      const response = await paymentsService.getPaymentInstructions(id);
      paymentInstructions.value = response.instructions;
      return response.instructions;
    } catch (err) {
      error.value = extractErrorMessage(err);
      throw err;
    } finally {
      isLoadingInstructions.value = false;
    }
  };

  const createPayment = async (payload: CreatePaymentRequest) => {
    isCreating.value = true;
    error.value = null;
    try {
      const idempotencyKey = createIdempotencyKey();
      const response = await paymentsService.createPayment(payload, idempotencyKey);
      await fetchPayments();
      return response.payment;
    } catch (err) {
      error.value = extractErrorMessage(err);
      throw err;
    } finally {
      isCreating.value = false;
    }
  };

  const cancelPayment = async (id: string) => {
    isCanceling.value = true;
    error.value = null;
    try {
      const response = await paymentsService.cancelPayment(id);
      await fetchPayments();
      if (selectedPayment.value && selectedPayment.value.id === id) {
        await fetchPaymentById(id);
      }
      return response.payment;
    } catch (err) {
      error.value = extractErrorMessage(err);
      throw err;
    } finally {
      isCanceling.value = false;
    }
  };

  const retryExternalCharge = async (id: string) => {
    error.value = null;
    try {
      const response = await paymentsService.retryExternalCharge(id);
      if (selectedPayment.value && selectedPayment.value.id === id) {
        selectedPayment.value = response.payment;
      }
      return response.payment;
    } catch (err) {
      error.value = extractErrorMessage(err);
      throw err;
    }
  };

  const setPage = (page: number) => {
    filters.value.page = page;
    fetchPayments();
  };

  const setPerPage = (perPage: number) => {
    filters.value.perPage = perPage;
    filters.value.page = 1;
    fetchPayments();
  };

  const setSearch = (search: string) => {
    filters.value.search = search;
    filters.value.page = 1;
    fetchPayments();
  };

  const setStatus = (status: PaymentStatus | 'all') => {
    filters.value.status = status;
    filters.value.page = 1;
    fetchPayments();
  };

  const setMethod = (method: PaymentMethod | 'all') => {
    filters.value.method = method;
    filters.value.page = 1;
    fetchPayments();
  };

  const setCustomerId = (customerId: string) => {
    filters.value.customerId = customerId;
    filters.value.page = 1;
    fetchPayments();
  };

  const setDateRange = (dateFrom: string, dateTo: string) => {
    filters.value.dateFrom = dateFrom;
    filters.value.dateTo = dateTo;
    filters.value.page = 1;
    fetchPayments();
  };

  const resetFilters = () => {
    filters.value = {
      page: 1,
      perPage: 10,
      search: '',
      status: 'all',
      method: 'all',
      customerId: '',
      dateFrom: '',
      dateTo: '',
    };
    fetchPayments();
  };

  const clearSelectedPayment = () => {
    selectedPayment.value = null;
    paymentInstructions.value = null;
  };

  const clearPaymentInstructions = () => {
    paymentInstructions.value = null;
  };

  return {
    // State
    payments,
    selectedPayment,
    paymentInstructions,
    meta,
    filters,
    isLoading,
    isLoadingDetails,
    isLoadingInstructions,
    isCreating,
    isCanceling,
    error,
    // Getters
    hasPayments,
    totalPayments,
    currentPage,
    totalPages,
    // Actions
    fetchPayments,
    fetchPaymentById,
    fetchPaymentInstructions,
    createPayment,
    cancelPayment,
    retryExternalCharge,
    setPage,
    setPerPage,
    setSearch,
    setStatus,
    setMethod,
    setCustomerId,
    setDateRange,
    resetFilters,
    clearSelectedPayment,
    clearPaymentInstructions,
  };
});
