<template>
  <div v-if="isOpen" class="lf-modal-backdrop" @click="close">
    <div class="lf-modal" @click.stop>
      <div class="lf-modal-header text-red-600">
        <h3 class="text-lg font-medium text-red-600">{{ t('gateways.disconnect.title') }}</h3>
        <button class="lf-btn-icon" @click="close">
          <div class="i-ph-x"></div>
        </button>
      </div>

      <div class="lf-modal-body">
        <p class="text-sm text-secondary mb-4">
          {{ t('gateways.disconnect.message') }}
        </p>

        <div class="lf-form-group">
          <label class="lf-label">{{ t('gateways.disconnect.confirmLabel') }}</label>
          <input 
            type="text" 
            class="lf-input" 
            v-model="confirmText"
            :placeholder="t('gateways.disconnect.confirmValue')"
          />
        </div>
      </div>

      <div class="lf-modal-footer">
        <button class="lf-btn lf-btn-secondary" @click="close" :disabled="isSubmitting">
          {{ t('common.cancel') }}
        </button>
        <button 
          class="lf-btn lf-btn-danger" 
          @click="confirm" 
          :disabled="isSubmitting || !isConfirmed"
        >
          <span v-if="isSubmitting" class="lf-spinner mr-2"></span>
          {{ t('gateways.actions.disconnect') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from '@/composables/useI18n';
import type { GatewayConnection } from '@/services/gateway-connections.service';

const props = defineProps<{
  isOpen: boolean;
  connection: GatewayConnection | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();

const { t } = useI18n();

const confirmText = ref('');
const isSubmitting = ref(false);

const expectedText = computed(() => t('gateways.disconnect.confirmValue'));
const isConfirmed = computed(() => confirmText.value === expectedText.value);

watch(() => props.isOpen, (val) => {
  if (val) {
    confirmText.value = '';
    isSubmitting.value = false;
  }
});

const close = () => {
  if (!isSubmitting.value) emit('close');
};

const confirm = async () => {
  if (!isConfirmed.value) return;
  isSubmitting.value = true;
  emit('confirm');
  // the parent handles the actual API call and success logic
};
</script>
