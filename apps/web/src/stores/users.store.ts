import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usersService } from '../services/users.service'
import { getHttpErrorMessage } from '../utils/http-error'
import { useToastStore } from './toast.store'
import { useI18n } from '../composables/useI18n'
import type { 
  UserListItem, 
  PaginatedMeta, 
  ListUsersParams,
  CreateUserRequest,
  UpdateUserRequest
} from '../types/users.types'

export const useUsersStore = defineStore('users', () => {
  const users = ref<UserListItem[]>([])
  const selectedUser = ref<UserListItem | null>(null)
  const meta = ref<PaginatedMeta>({ page: 1, perPage: 10, total: 0, totalPages: 0 })
  const filters = ref<ListUsersParams>({
    page: 1,
    perPage: 10,
    search: '',
    status: 'all',
    role: ''
  })
  const isLoading = ref(false)
  const isLoadingDetails = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  const mutationError = ref<string | null>(null)

  const hasUsers = computed(() => users.value.length > 0)
  const totalUsers = computed(() => meta.value.total)
  const currentPage = computed(() => meta.value.page)
  const totalPages = computed(() => meta.value.totalPages)

  async function fetchUsers(params?: Partial<ListUsersParams>) {
    isLoading.value = true
    error.value = null
    
    if (params) {
      filters.value = { ...filters.value, ...params }
    }

    // Clean up empty params
    const activeParams: ListUsersParams = {
      page: filters.value.page,
      perPage: filters.value.perPage
    }
    
    if (filters.value.search) activeParams.search = filters.value.search
    if (filters.value.status && filters.value.status !== 'all') activeParams.status = filters.value.status
    if (filters.value.role) activeParams.role = filters.value.role

    try {
      const response = await usersService.listUsers(activeParams)
      users.value = response.data
      meta.value = response.meta
    } catch (err) {
      error.value = getHttpErrorMessage(err)
      users.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchUserById(id: string) {
    isLoadingDetails.value = true
    error.value = null
    
    try {
      const response = await usersService.getUserById(id)
      selectedUser.value = response.user
    } catch (err) {
      error.value = getHttpErrorMessage(err)
      selectedUser.value = null
    } finally {
      isLoadingDetails.value = false
    }
  }

  async function createUser(payload: CreateUserRequest) {
    isSaving.value = true
    mutationError.value = null
    
    const toast = useToastStore()
    const { t } = useI18n()
    
    try {
      await usersService.createUser(payload)
      toast.success(t('users.toast.created'))
      fetchUsers()
    } catch (err) {
      mutationError.value = getHttpErrorMessage(err, 'users.errors.createFailed')
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function updateUser(id: string, payload: UpdateUserRequest) {
    isSaving.value = true
    mutationError.value = null
    
    const toast = useToastStore()
    const { t } = useI18n()
    
    try {
      await usersService.updateUser(id, payload)
      toast.success(t('users.toast.updated'))
      fetchUsers()
    } catch (err) {
      mutationError.value = getHttpErrorMessage(err, 'users.errors.updateFailed')
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function updateUserStatus(id: string, active: boolean) {
    isSaving.value = true
    mutationError.value = null
    
    const toast = useToastStore()
    const { t } = useI18n()
    
    try {
      await usersService.updateUserStatus(id, { active })
      const messageKey = active ? 'users.toast.activated' : 'users.toast.deactivated'
      toast.success(t(messageKey))
      fetchUsers()
    } catch (err) {
      mutationError.value = getHttpErrorMessage(err, 'users.errors.statusFailed')
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function updateUserRoles(id: string, roleKeys: string[]) {
    isSaving.value = true
    mutationError.value = null
    
    const toast = useToastStore()
    const { t } = useI18n()
    
    try {
      await usersService.updateUserRoles(id, { roleKeys })
      toast.success(t('users.toast.rolesUpdated'))
      fetchUsers()
    } catch (err) {
      mutationError.value = getHttpErrorMessage(err, 'users.errors.rolesFailed')
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function setPage(page: number) {
    filters.value.page = page
    fetchUsers()
  }

  function setPerPage(perPage: number) {
    filters.value.perPage = perPage
    filters.value.page = 1 // Reset to first page
    fetchUsers()
  }

  function setSearch(search: string) {
    filters.value.search = search
    filters.value.page = 1
    fetchUsers()
  }

  function setStatus(status: 'active' | 'inactive' | 'all') {
    filters.value.status = status
    filters.value.page = 1
    fetchUsers()
  }

  function setRole(role: string) {
    filters.value.role = role
    filters.value.page = 1
    fetchUsers()
  }

  function clearSelectedUser() {
    selectedUser.value = null
  }

  function resetFilters() {
    filters.value = {
      page: 1,
      perPage: 10,
      search: '',
      status: 'all',
      role: ''
    }
    fetchUsers()
  }

  return {
    users,
    selectedUser,
    meta,
    filters,
    isLoading,
    isLoadingDetails,
    isSaving,
    error,
    mutationError,
    hasUsers,
    totalUsers,
    currentPage,
    totalPages,
    fetchUsers,
    fetchUserById,
    createUser,
    updateUser,
    updateUserStatus,
    updateUserRoles,
    setPage,
    setPerPage,
    setSearch,
    setStatus,
    setRole,
    clearSelectedUser,
    resetFilters
  }
})
