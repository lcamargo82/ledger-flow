import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { customersService } from '../services/customers.service';
import type {
  CustomerListItem,
  PaginatedCustomersMeta,
  CustomerStatusFilter,
  CustomerTypeFilter,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from '../types/customers.types';
import axios from 'axios';

export const useCustomersStore = defineStore('customers', () => {
  // State
  const customers = ref<CustomerListItem[]>([]);
  const selectedCustomer = ref<CustomerListItem | null>(null);
  
  const meta = ref<PaginatedCustomersMeta>({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
  });

  const filters = ref({
    page: 1,
    perPage: 10,
    search: '',
    status: 'all' as CustomerStatusFilter,
    type: 'all' as CustomerTypeFilter,
  });

  const isLoading = ref(false);
  const isLoadingDetails = ref(false);
  const isCreating = ref(false);
  const isUpdating = ref(false);
  const isUpdatingStatus = ref(false);
  
  const error = ref<string | null>(null);

  // Getters
  const hasCustomers = computed(() => customers.value.length > 0);
  const totalCustomers = computed(() => meta.value.total);
  const currentPage = computed(() => meta.value.page);
  const totalPages = computed(() => meta.value.totalPages);

  // Helpers
  const extractErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 409) {
        if (err.response.data?.message?.toLowerCase().includes('email')) {
          return 'customers.error.emailAlreadyExists';
        }
        if (err.response.data?.message?.toLowerCase().includes('document')) {
          return 'customers.error.documentAlreadyExists';
        }
      }
      if (err.response?.status === 404) return 'customers.error.notFound';
      if (err.response?.status === 403) return 'customers.error.forbidden';
    }
    return 'customers.error.default';
  };

  // Actions
  const fetchCustomers = async (forceParams?: typeof filters.value) => {
    isLoading.value = true;
    error.value = null;
    try {
      const activeFilters = forceParams || filters.value;
      const response = await customersService.listCustomers({
        page: activeFilters.page,
        perPage: activeFilters.perPage,
        search: activeFilters.search || undefined,
        status: activeFilters.status !== 'all' ? activeFilters.status : undefined,
        type: activeFilters.type !== 'all' ? activeFilters.type : undefined,
      });
      customers.value = response.data;
      meta.value = response.meta;
    } catch (err) {
      error.value = extractErrorMessage(err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchCustomerById = async (id: string) => {
    isLoadingDetails.value = true;
    error.value = null;
    try {
      const response = await customersService.getCustomerById(id);
      selectedCustomer.value = response.customer;
      return response.customer;
    } catch (err) {
      error.value = extractErrorMessage(err);
      throw err;
    } finally {
      isLoadingDetails.value = false;
    }
  };

  const createCustomer = async (payload: CreateCustomerRequest) => {
    isCreating.value = true;
    error.value = null;
    try {
      const response = await customersService.createCustomer(payload);
      await fetchCustomers();
      return response.customer;
    } catch (err) {
      error.value = extractErrorMessage(err);
      throw err;
    } finally {
      isCreating.value = false;
    }
  };

  const updateCustomer = async (id: string, payload: UpdateCustomerRequest) => {
    isUpdating.value = true;
    error.value = null;
    try {
      const response = await customersService.updateCustomer(id, payload);
      await fetchCustomers();
      return response.customer;
    } catch (err) {
      error.value = extractErrorMessage(err);
      throw err;
    } finally {
      isUpdating.value = false;
    }
  };

  const updateCustomerStatus = async (id: string, active: boolean) => {
    isUpdatingStatus.value = true;
    error.value = null;
    try {
      const response = await customersService.updateCustomerStatus(id, { active });
      await fetchCustomers();
      return response.customer;
    } catch (err) {
      error.value = extractErrorMessage(err);
      throw err;
    } finally {
      isUpdatingStatus.value = false;
    }
  };

  const setPage = (page: number) => {
    filters.value.page = page;
    fetchCustomers();
  };

  const setPerPage = (perPage: number) => {
    filters.value.perPage = perPage;
    filters.value.page = 1;
    fetchCustomers();
  };

  const setSearch = (search: string) => {
    filters.value.search = search;
    filters.value.page = 1;
    fetchCustomers();
  };

  const setStatus = (status: CustomerStatusFilter) => {
    filters.value.status = status;
    filters.value.page = 1;
    fetchCustomers();
  };

  const setType = (type: CustomerTypeFilter) => {
    filters.value.type = type;
    filters.value.page = 1;
    fetchCustomers();
  };

  const resetFilters = () => {
    filters.value = {
      page: 1,
      perPage: 10,
      search: '',
      status: 'all',
      type: 'all',
    };
    fetchCustomers();
  };

  const clearSelectedCustomer = () => {
    selectedCustomer.value = null;
  };

  return {
    // State
    customers,
    selectedCustomer,
    meta,
    filters,
    isLoading,
    isLoadingDetails,
    isCreating,
    isUpdating,
    isUpdatingStatus,
    error,
    // Getters
    hasCustomers,
    totalCustomers,
    currentPage,
    totalPages,
    // Actions
    fetchCustomers,
    fetchCustomerById,
    createCustomer,
    updateCustomer,
    updateCustomerStatus,
    setPage,
    setPerPage,
    setSearch,
    setStatus,
    setType,
    resetFilters,
    clearSelectedCustomer,
  };
});
