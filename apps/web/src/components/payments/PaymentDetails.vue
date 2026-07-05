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
  <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
    <!-- Left Column -->
    <div class="md:col-span-7 space-y-8">
      <!-- Summary Section -->
      <section>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ t('payments.details.summary') }}</h3>
        <div class="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-xl border border-gray-100 dark:border-gray-700/50">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.reference') }}</h4>
              <p class="text-gray-900 dark:text-white font-medium break-words">{{ payment.reference }}</p>
            </div>
            <div>
              <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.customer') }}</h4>
              <p class="text-gray-900 dark:text-white">{{ payment.customer.name }}</p>
            </div>
            <div>
              <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.amount') }}</h4>
              <p class="text-gray-900 dark:text-white font-medium text-lg">{{ formatMoneyFromCents(payment.amount, payment.currency, currentLocale) }}</p>
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
            <div class="sm:col-span-2 grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-gray-200 dark:border-gray-700/50">
              <div>
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.createdAt') }}</h4>
                <p class="text-gray-700 dark:text-gray-300 text-sm">{{ formatDateTime(payment.createdAt, currentLocale) }}</p>
              </div>
              <div>
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.updatedAt') }}</h4>
                <p class="text-gray-700 dark:text-gray-300 text-sm">{{ formatDateTime(payment.updatedAt, currentLocale) }}</p>
              </div>
              <div v-if="payment.canceledAt">
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.canceledAt') }}</h4>
                <p class="text-gray-700 dark:text-gray-300 text-sm">{{ formatDateTime(payment.canceledAt, currentLocale) }}</p>
              </div>
              <div v-if="payment.refundedAt">
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{{ t('payments.details.refundedAt') }}</h4>
                <p class="text-gray-700 dark:text-gray-300 text-sm">{{ formatDateTime(payment.refundedAt, currentLocale) }}</p>
              </div>
            </div>
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

        <div class="bg-white dark:bg-gray-800/80 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <AppBadge :variant="getIntegrationVariant(payment.externalProcessing.status) as any">
                  {{ t(`payments.externalProcessing.status.${payment.externalProcessing.status}`) }}
                </AppBadge>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">
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
    </div>

    <!-- Right Column -->
    <div class="md:col-span-5 space-y-8">
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
        <div v-else-if="paymentsStore.paymentInstructions" class="bg-gray-50 dark:bg-gray-800/30 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50">
          <!-- PIX -->
          <div v-if="paymentsStore.paymentInstructions.method === 'PIX'" class="flex flex-col items-center text-center gap-4">
            <div v-if="paymentsStore.paymentInstructions.pixQrCodeBase64" class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 inline-block">
              <img :src="`data:image/jpeg;base64,${paymentsStore.paymentInstructions.pixQrCodeBase64}`" alt="QR Code PIX" class="w-40 h-40 object-contain mx-auto" />
            </div>
            <div class="w-full text-left space-y-4">
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white mb-2">{{ t('payments.instructions.pixCopyPasteLabel') }}</p>
                <div class="flex flex-col gap-2">
                  <input 
                    type="text" 
                    readonly 
                    :value="paymentsStore.paymentInstructions.pixCopyPaste" 
                    class="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs focus:border-primary-500 focus:ring-primary-500 text-gray-900 dark:text-white px-3 py-2"
                  />
                  <AppButton 
                    variant="primary" 
                    class="w-full justify-center"
                    @click="copyToClipboard(paymentsStore.paymentInstructions.pixCopyPaste || '')"
                    :disabled="!paymentsStore.paymentInstructions.pixCopyPaste"
                  >
                    {{ t('payments.instructions.copyPixCode') }}
                  </AppButton>
                </div>
              </div>
              <div v-if="paymentsStore.paymentInstructions.expiresAt" class="text-xs text-gray-500 dark:text-gray-400">
                {{ t('payments.instructions.expirationLabel') }}: <span class="font-medium">{{ formatDateTime(paymentsStore.paymentInstructions.expiresAt, currentLocale) }}</span>
              </div>
              <div v-if="paymentsStore.paymentInstructions.isExpired" class="text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 py-2 px-3 rounded">
                {{ t('payments.instructions.expired') }}
              </div>
            </div>
          </div>
          
          <!-- BOLETO -->
          <div v-else-if="paymentsStore.paymentInstructions.method === 'BOLETO'" class="space-y-4">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">{{ t('payments.instructions.boletoTitle') }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('payments.details.bankSlipDescription') }}</p>
            </div>
            <a 
              v-if="paymentsStore.paymentInstructions.bankSlipUrl" 
              :href="paymentsStore.paymentInstructions.bankSlipUrl" 
              target="_blank"
              class="flex w-full items-center justify-center rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
            >
              {{ t('payments.instructions.openBankSlip') }}
            </a>
            <div v-if="paymentsStore.paymentInstructions.dueDate" class="text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700/50">
              {{ t('payments.instructions.dueDateLabel') }}: <span class="font-medium">{{ formatDateTime(paymentsStore.paymentInstructions.dueDate, currentLocale) }}</span>
            </div>
          </div>
          
          <div v-else class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            {{ t('payments.instructions.notAvailable') }}
          </div>
        </div>
      </section>

      <!-- Timeline Section -->
      <section>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ t('payments.details.timeline') }}</h3>
        <div v-if="payment.events.length > 0" class="bg-gray-50 dark:bg-gray-800/30 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50">
          <div class="flow-root">
            <ul role="list" class="-mb-6">
              <li v-for="(event, eventIdx) in payment.events" :key="event.id">
                <div class="relative pb-6">
                  <span v-if="eventIdx !== payment.events.length - 1" class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true"></span>
                  <div class="relative flex space-x-3">
                    <div>
                      <span class="h-8 w-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center ring-4 ring-gray-50 dark:ring-gray-800/30">
                        <div class="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                      </span>
                    </div>
                    <div class="flex min-w-0 flex-1 flex-col pt-1">
                      <p class="text-sm text-gray-900 dark:text-white font-medium">
                        {{ getEventTranslation(event.type) }}
                      </p>
                      <p v-if="event.previousStatus && event.currentStatus" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {{ t(`payments.status.${event.previousStatus}`) }} &rarr; {{ t(`payments.status.${event.currentStatus}`) }}
                      </p>
                      <time :datetime="event.createdAt" class="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {{ formatDateTime(event.createdAt, currentLocale) }}
                      </time>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div v-else class="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
          {{ t('payments.details.notAvailable') }}
        </div>
      </section>
    </div>
  </div>
</template>
