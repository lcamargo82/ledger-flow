<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '../../composables/useI18n';
import type { PaymentDetails } from '../../types/payments.types';
import { formatDateTime } from '../../utils/date-format';
import { formatMoneyFromCents } from '../../utils/money-format';
import AppBadge from '../common/AppBadge.vue';
import AppButton from '../common/AppButton.vue';
import { usePaymentsStore } from '../../stores/payments.store';
import { useToastStore } from '../../stores/toast.store';

const props = defineProps<{
  payment: PaymentDetails;
}>();

const { t, currentLocale } = useI18n();
const paymentsStore = usePaymentsStore();
const toastStore = useToastStore();

const isAsaasAndPendingOrProcessing = computed(() => {
  return props.payment.provider === 'ASAAS' && 
         (props.payment.status === 'PENDING' || props.payment.status === 'PROCESSING') &&
         (props.payment.method === 'PIX' || props.payment.method === 'BOLETO');
});

onMounted(async () => {
  if (isAsaasAndPendingOrProcessing.value) {
    await paymentsStore.fetchPaymentInstructions(props.payment.id);
  }
});

onUnmounted(() => {
  paymentsStore.clearPaymentInstructions();
});

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toastStore.success(t('payments.instructions.pixCodeCopied'));
  } catch (err) {
    toastStore.error(t('payments.details.copyError'));
  }
};

const refreshInstructions = async () => {
  await paymentsStore.fetchPaymentInstructions(props.payment.id);
};


const statusVariant = computed(() => {
  switch (props.payment.status) {
    case 'PENDING': return 'warning';
    case 'PROCESSING': return 'info';
    case 'APPROVED': return 'success';
    case 'FAILED': return 'danger';
    case 'CANCELED': return 'default'; // neutral/danger descreet
    case 'REFUNDED': return 'default'; // neutral/info
    default: return 'default';
  }
});

const getEventTranslation = (type: string) => {
  switch (type) {
    case 'payment.created': return t('payments.events.paymentCreated');
    case 'payment.canceled': return t('payments.events.paymentCanceled');
    case 'payment.refund_requested': return t('payments.events.paymentRefundRequested');
    case 'payment.refunded': return t('payments.events.paymentRefunded');
    case 'payment.provider_retry_requested': return t('payments.events.providerRetryRequested');
    default: return t('payments.events.generic');
  }
};

const router = useRouter();
const isRetrying = ref(false);

const handleRetry = async () => {
  if (!props.payment.id) return;
  isRetrying.value = true;
  try {
    await paymentsStore.retryExternalCharge(props.payment.id);
    toastStore.success(t('payments.retry.success'));
    await refreshStatus();
  } catch (err: any) {
    // Error is typically handled in the store/interceptor, but we can catch to reset loading
  } finally {
    isRetrying.value = false;
  }
};

const openSettings = () => {
  router.push('/platform/gateway-connections'); // Ou o caminho correto para tenant gateways se existir
};

const refreshStatus = async () => {
  await paymentsStore.fetchPaymentById(props.payment.id);
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
</script>

<template>
  <div class="space-y-8">
    <!-- Summary Section -->
    <section>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ t('payments.details.summary') }}</h3>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.reference') }}</h4>
          <p class="text-gray-900 dark:text-white font-medium">{{ payment.reference }}</p>
        </div>
        <div>
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.customer') }}</h4>
          <p class="text-gray-900 dark:text-white">{{ payment.customer.name }}</p>
        </div>
        <div>
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.amount') }}</h4>
          <p class="text-gray-900 dark:text-white font-medium">{{ formatMoneyFromCents(payment.amount, payment.currency, currentLocale) }}</p>
        </div>
        <div>
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.method') }}</h4>
          <p class="text-gray-900 dark:text-white">{{ t(`payments.method.${payment.method}`) }}</p>
        </div>
        <div>
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.status') }}</h4>
          <AppBadge :variant="statusVariant as any">
            {{ t(`payments.status.${payment.status}`) }}
          </AppBadge>
        </div>
        <div>
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.description') }}</h4>
          <p class="text-gray-900 dark:text-white text-sm break-words">{{ payment.description || t('payments.details.notAvailable') }}</p>
        </div>
        <div>
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.createdAt') }}</h4>
          <p class="text-gray-900 dark:text-white text-sm">{{ formatDateTime(payment.createdAt, currentLocale) }}</p>
        </div>
        <div>
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.updatedAt') }}</h4>
          <p class="text-gray-900 dark:text-white text-sm">{{ formatDateTime(payment.updatedAt, currentLocale) }}</p>
        </div>
        <div v-if="payment.canceledAt">
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.canceledAt') }}</h4>
          <p class="text-gray-900 dark:text-white text-sm">{{ formatDateTime(payment.canceledAt, currentLocale) }}</p>
        </div>
        <div v-if="payment.refundedAt">
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.refundedAt') }}</h4>
          <p class="text-gray-900 dark:text-white text-sm">{{ formatDateTime(payment.refundedAt, currentLocale) }}</p>
        </div>
      </div>
    </section>

    <!-- External Processing Section -->
    <section v-if="payment.externalProcessing && payment.externalProcessing.status !== 'NOT_REQUIRED'">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ t('payments.externalProcessing.title') }}</h3>
        <AppButton 
          variant="secondary" 
          size="small" 
          @click="refreshStatus"
        >
          {{ t('payments.actions.refreshPayment') }}
        </AppButton>
      </div>

      <div class="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-gray-100 dark:border-gray-700">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <AppBadge :variant="getIntegrationVariant(payment.externalProcessing.status) as any">
                {{ t(`payments.externalProcessing.status.${payment.externalProcessing.status}`) }}
              </AppBadge>
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300">
              {{ t(payment.externalProcessing.messageKey) }}
            </p>
          </div>
          
          <div class="flex flex-col gap-2 min-w-[140px]">
            <AppButton 
              v-if="payment.externalProcessing.retryAvailable"
              variant="primary" 
              size="small"
              :loading="isRetrying"
              @click="handleRetry"
            >
              {{ t('payments.actions.retryExternalCharge') }}
            </AppButton>
            <AppButton 
              v-if="payment.externalProcessing.status === 'FAILED' || payment.externalProcessing.status === 'DEAD_LETTERED'"
              variant="secondary" 
              size="small"
              @click="openSettings"
            >
              {{ t('payments.actions.openGatewaySettings') }}
            </AppButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Instructions Section -->
    <section v-if="isAsaasAndPendingOrProcessing">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white">{{ t('payments.instructions.title') }}</h3>
        <AppButton 
          v-if="paymentsStore.paymentInstructions?.canRefresh" 
          variant="secondary" 
          size="small" 
          :loading="paymentsStore.isLoadingInstructions"
          @click="refreshInstructions"
        >
          {{ t('payments.instructions.refresh') }}
        </AppButton>
      </div>

      <div v-if="paymentsStore.isLoadingInstructions" class="py-4 flex justify-center">
        <span class="text-sm text-gray-500">{{ t('common.loading') }}</span>
      </div>
      <div v-else-if="paymentsStore.paymentInstructions" class="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-gray-100 dark:border-gray-700">
        <!-- PIX -->
        <div v-if="paymentsStore.paymentInstructions.method === 'PIX'" class="flex flex-col md:flex-row items-center gap-8">
          <div v-if="paymentsStore.paymentInstructions.pixQrCodeBase64" class="flex-shrink-0 bg-white p-2 rounded-xl shadow-sm">
            <img :src="`data:image/jpeg;base64,${paymentsStore.paymentInstructions.pixQrCodeBase64}`" alt="QR Code PIX" class="w-48 h-48" />
          </div>
          <div class="flex-1 w-full space-y-4">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">{{ t('payments.instructions.pixCopyPasteLabel') }}</p>
              <div class="flex gap-2">
                <input 
                  type="text" 
                  readonly 
                  :value="paymentsStore.paymentInstructions.pixCopyPaste" 
                  class="flex-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-white px-3 py-2"
                />
                <AppButton 
                  variant="primary" 
                  @click="copyToClipboard(paymentsStore.paymentInstructions.pixCopyPaste || '')"
                  :disabled="!paymentsStore.paymentInstructions.pixCopyPaste"
                >
                  {{ t('payments.instructions.copyPixCode') }}
                </AppButton>
              </div>
            </div>
            <div v-if="paymentsStore.paymentInstructions.expiresAt" class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('payments.instructions.expirationLabel') }}: <span class="font-medium">{{ formatDateTime(paymentsStore.paymentInstructions.expiresAt, currentLocale) }}</span>
            </div>
            <div v-if="paymentsStore.paymentInstructions.isExpired" class="text-sm text-red-600 dark:text-red-400 font-medium">
              {{ t('payments.instructions.expired') }}
            </div>
          </div>
        </div>
        
        <!-- BOLETO -->
        <div v-else-if="paymentsStore.paymentInstructions.method === 'BOLETO'" class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ t('payments.instructions.boletoTitle') }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('payments.details.bankSlipDescription') }}</p>
            </div>
            <a 
              v-if="paymentsStore.paymentInstructions.bankSlipUrl" 
              :href="paymentsStore.paymentInstructions.bankSlipUrl" 
              target="_blank"
              class="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto"
            >
              {{ t('payments.instructions.openBankSlip') }}
            </a>
          </div>
          <div v-if="paymentsStore.paymentInstructions.dueDate" class="text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
            {{ t('payments.instructions.dueDateLabel') }}: <span class="font-medium">{{ formatDateTime(paymentsStore.paymentInstructions.dueDate, currentLocale) }}</span>
          </div>
        </div>
        
        <div v-else class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('payments.instructions.notAvailable') }}
        </div>
      </div>
    </section>

    <!-- Timeline Section -->
    <section>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ t('payments.details.timeline') }}</h3>
      <div v-if="payment.events.length > 0" class="flow-root">
        <ul role="list" class="-mb-8">
          <li v-for="(event, eventIdx) in payment.events" :key="event.id">
            <div class="relative pb-8">
              <span v-if="eventIdx !== payment.events.length - 1" class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
              <div class="relative flex space-x-3">
                <div>
                  <span class="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center ring-8 ring-white dark:ring-gray-900">
                    <svg class="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p class="text-sm text-gray-900 dark:text-white font-medium">
                      {{ getEventTranslation(event.type) }}
                    </p>
                    <p v-if="event.previousStatus && event.currentStatus" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {{ t(`payments.status.${event.previousStatus}`) }} &rarr; {{ t(`payments.status.${event.currentStatus}`) }}
                    </p>
                  </div>
                  <div class="whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                    <time :datetime="event.createdAt">{{ formatDateTime(event.createdAt, currentLocale) }}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <div v-else class="text-sm text-gray-500 dark:text-gray-400 italic">
        {{ t('payments.details.notAvailable') }}
      </div>
    </section>
  </div>
</template>
