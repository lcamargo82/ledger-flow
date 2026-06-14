import { defineStore } from 'pinia';
import { ref } from 'vue';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  confirmLoadingText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  loading: boolean;
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;
}

export const useConfirmDialogStore = defineStore('confirmDialog', () => {
  const state = ref<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: undefined,
    cancelText: undefined,
    confirmVariant: 'primary',
    loading: false,
    onConfirm: null,
    onCancel: null,
  });

  const open = (options: Omit<ConfirmDialogState, 'isOpen' | 'loading'>) => {
    state.value = {
      ...state.value,
      ...options,
      isOpen: true,
      loading: false,
    };
  };

  const close = () => {
    state.value.isOpen = false;
    state.value.loading = false;
    setTimeout(() => {
      // Reset after animation
      state.value.onConfirm = null;
      state.value.onCancel = null;
    }, 300);
  };

  const confirm = async () => {
    if (state.value.onConfirm) {
      state.value.loading = true;
      try {
        await state.value.onConfirm();
      } finally {
        // Only close if it's still open (in case onConfirm already closed it)
        if (state.value.isOpen) {
          close();
        }
      }
    } else {
      close();
    }
  };

  const cancel = () => {
    if (state.value.onCancel) {
      state.value.onCancel();
    }
    close();
  };

  return {
    state,
    open,
    close,
    confirm,
    cancel,
  };
});
