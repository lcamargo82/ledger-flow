import { defineStore } from 'pinia';
import { ref } from 'vue';
import { rolesService } from '../services/roles.service';
import { useToastStore } from './toast.store';
import type { RoleListItem } from '../types/admin.types';

export const useRolesStore = defineStore('roles', () => {
  const roles = ref<RoleListItem[]>([]);
  const selectedRole = ref<RoleListItem | null>(null);
  const isLoading = ref(false);
  const isLoadingDetails = ref(false);
  const error = ref<string | null>(null);
  const toast = useToastStore();

  async function fetchRoles() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await rolesService.listRoles();
      roles.value = response.data;
    } catch (err) {
      error.value = 'roles.errors.loadFailed';
      toast.error('roles.errors.loadFailed');
      console.error(err);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchRoleById(id: string) {
    isLoadingDetails.value = true;
    error.value = null;
    selectedRole.value = null;
    try {
      const role = await rolesService.getRoleById(id);
      selectedRole.value = role;
    } catch (err) {
      error.value = 'roles.errors.loadDetailsFailed';
      toast.error('roles.errors.loadDetailsFailed');
      console.error(err);
    } finally {
      isLoadingDetails.value = false;
    }
  }

  function clearSelectedRole() {
    selectedRole.value = null;
  }

  return {
    roles,
    selectedRole,
    isLoading,
    isLoadingDetails,
    error,
    fetchRoles,
    fetchRoleById,
    clearSelectedRole,
  };
});
