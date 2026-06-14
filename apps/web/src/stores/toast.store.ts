import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface ToastOptions {
  id?: string | number;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

export interface Toast extends ToastOptions {
  id: string | number;
}

let nextId = 0;

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([]);

  const showToast = (options: ToastOptions) => {
    const id = options.id ?? Date.now() + nextId++;
    const toast: Toast = {
      ...options,
      id,
      type: options.type || 'info',
      duration: options.duration ?? 5000,
    };
    toasts.value.push(toast);
    return id;
  };

  const success = (message: string, title?: string, duration?: number) => showToast({ type: 'success', message, title, duration });
  const error = (message: string, title?: string, duration?: number) => showToast({ type: 'error', message, title, duration });
  const warning = (message: string, title?: string, duration?: number) => showToast({ type: 'warning', message, title, duration });
  const info = (message: string, title?: string, duration?: number) => showToast({ type: 'info', message, title, duration });

  const removeToast = (id: string | number) => {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  };

  const clearToasts = () => {
    toasts.value = [];
  };

  return {
    toasts,
    showToast,
    success,
    error,
    warning,
    info,
    removeToast,
    clearToasts,
  };
});
