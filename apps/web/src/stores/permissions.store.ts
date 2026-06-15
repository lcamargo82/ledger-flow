import { defineStore } from 'pinia';
import { ref } from 'vue';
import { permissionsService } from '../services/permissions.service';
import { useToastStore } from './toast.store';
import type { PermissionListItem } from '../types/admin.types';

export const usePermissionsStore = defineStore('permissions', () => {
  const permissions = ref<PermissionListItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const toast = useToastStore();

  async function fetchPermissions() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await permissionsService.listPermissions();
      permissions.value = response.data;
    } catch (err) {
      error.value = 'permissions.errors.loadFailed';
      toast.error('permissions.errors.loadFailed');
      console.error(err);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    permissions,
    isLoading,
    error,
    fetchPermissions,
  };
});
