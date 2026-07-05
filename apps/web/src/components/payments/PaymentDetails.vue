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
  router.push('/settings/gateway-connections');
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
  <div class="lf-payment-details">
    <!-- Left Column -->
    <div class="lf-payment-details__left">
      <!-- Summary Section -->
      <section class="lf-payment-section">
        <h3 class="lf-payment-section__title">{{ t('payments.details.summary') }}</h3>
        <div class="lf-payment-summary-card">
          <div class="lf-payment-summary-grid">
            <div class="lf-payment-field">
              <h4 class="lf-payment-field__label">{{ t('payments.details.reference') }}</h4>
              <p class="lf-payment-field__value">{{ payment.reference }}</p>
            </div>
            <div class="lf-payment-field">
              <h4 class="lf-payment-field__label">{{ t('payments.details.customer') }}</h4>
              <p class="lf-payment-field__value">{{ payment.customer.name }}</p>
            </div>
            <div class="lf-payment-field">
              <h4 class="lf-payment-field__label">{{ t('payments.details.amount') }}</h4>
              <p class="lf-payment-field__value lf-payment-field__value--large">{{ formatMoneyFromCents(payment.amount, payment.currency, currentLocale) }}</p>
            </div>
            <div class="lf-payment-field">
              <h4 class="lf-payment-field__label">{{ t('payments.details.method') }}</h4>
              <p class="lf-payment-field__value">{{ t(`payments.method.${payment.method}`) }}</p>
            </div>
            <div class="lf-payment-field">
              <h4 class="lf-payment-field__label">{{ t('payments.details.status') }}</h4>
              <AppBadge :variant="statusVariant as any">
                {{ t(`payments.status.${payment.status}`) }}
              </AppBadge>
            </div>
            <div class="lf-payment-field">
              <h4 class="lf-payment-field__label">{{ t('payments.details.description') }}</h4>
              <p class="lf-payment-field__value lf-payment-field__value--muted">{{ payment.description || t('payments.details.notAvailable') }}</p>
            </div>
            <div class="lf-payment-field lf-payment-field--full lf-payment-dates">
              <div class="lf-payment-date">
                <h4 class="lf-payment-field__label">{{ t('payments.details.createdAt') }}</h4>
                <p class="lf-payment-field__value lf-payment-field__value--muted">{{ formatDateTime(payment.createdAt, currentLocale) }}</p>
              </div>
              <div class="lf-payment-date">
                <h4 class="lf-payment-field__label">{{ t('payments.details.updatedAt') }}</h4>
                <p class="lf-payment-field__value lf-payment-field__value--muted">{{ formatDateTime(payment.updatedAt, currentLocale) }}</p>
              </div>
              <div class="lf-payment-date" v-if="payment.canceledAt">
                <h4 class="lf-payment-field__label">{{ t('payments.details.canceledAt') }}</h4>
                <p class="lf-payment-field__value lf-payment-field__value--muted">{{ formatDateTime(payment.canceledAt, currentLocale) }}</p>
              </div>
              <div class="lf-payment-date" v-if="payment.refundedAt">
                <h4 class="lf-payment-field__label">{{ t('payments.details.refundedAt') }}</h4>
                <p class="lf-payment-field__value lf-payment-field__value--muted">{{ formatDateTime(payment.refundedAt, currentLocale) }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- External Processing Section -->
      <section class="lf-payment-section" v-if="payment.externalProcessing && payment.externalProcessing.status !== 'NOT_REQUIRED'">
        <div class="lf-payment-section__header">
          <h3 class="lf-payment-section__title">{{ t('payments.externalProcessing.title') }}</h3>
          <AppButton 
            variant="secondary" 
            size="small" 
            @click="refreshStatus"
          >
            {{ t('payments.actions.refreshPayment') }}
          </AppButton>
        </div>

        <div class="lf-payment-summary-card">
          <div class="lf-payment-processing">
            <div class="lf-payment-processing__info">
              <div class="lf-payment-processing__badge">
                <AppBadge :variant="getIntegrationVariant(payment.externalProcessing.status) as any">
                  {{ t(`payments.externalProcessing.status.${payment.externalProcessing.status}`) }}
                </AppBadge>
              </div>
              <p class="lf-payment-processing__message">
                {{ t(payment.externalProcessing.messageKey) }}
              </p>
            </div>
            
            <div class="lf-payment-processing__actions">
              <AppButton 
                v-if="payment.externalProcessing.retryAvailable"
                variant="primary" 
                size="small"
                :loading="isRetrying"
                @click="handleRetry"
                class="lf-w-full"
              >
                {{ t('payments.actions.retryExternalCharge') }}
              </AppButton>
              <AppButton 
                v-if="payment.externalProcessing.status === 'FAILED' || payment.externalProcessing.status === 'DEAD_LETTERED'"
                variant="secondary" 
                size="small"
                @click="openSettings"
                class="lf-w-full"
              >
                {{ t('payments.actions.openGatewaySettings') }}
              </AppButton>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Right Column -->
    <div class="lf-payment-details__right">
      <!-- Instructions Section -->
      <section class="lf-payment-section" v-if="isAsaasAndPendingOrProcessing">
        <div class="lf-payment-section__header">
          <h3 class="lf-payment-section__title">{{ t('payments.instructions.title') }}</h3>
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

        <div v-if="paymentsStore.isLoadingInstructions" class="lf-payment-loading">
          <span>{{ t('common.loading') }}</span>
        </div>
        <div v-else-if="paymentsStore.paymentInstructions" class="lf-payment-summary-card">
          <!-- PIX -->
          <div v-if="paymentsStore.paymentInstructions.method === 'PIX'" class="lf-payment-pix">
            <div v-if="paymentsStore.paymentInstructions.pixQrCodeBase64" class="lf-payment-pix__qr">
              <img :src="`data:image/jpeg;base64,${paymentsStore.paymentInstructions.pixQrCodeBase64}`" alt="QR Code PIX" />
            </div>
            <div class="lf-payment-pix__copy">
              <p class="lf-payment-pix__label">{{ t('payments.instructions.pixCopyPasteLabel') }}</p>
              <div class="lf-payment-pix__input-group">
                <input 
                  type="text" 
                  readonly 
                  :value="paymentsStore.paymentInstructions.pixCopyPaste" 
                  class="lf-input"
                />
                <AppButton 
                  variant="primary" 
                  @click="copyToClipboard(paymentsStore.paymentInstructions.pixCopyPaste || '')"
                  :disabled="!paymentsStore.paymentInstructions.pixCopyPaste"
                >
                  {{ t('payments.instructions.copyPixCode') }}
                </AppButton>
              </div>
              <div v-if="paymentsStore.paymentInstructions.expiresAt" class="lf-payment-pix__expiry">
                {{ t('payments.instructions.expirationLabel') }}: <span>{{ formatDateTime(paymentsStore.paymentInstructions.expiresAt, currentLocale) }}</span>
              </div>
              <div v-if="paymentsStore.paymentInstructions.isExpired" class="lf-payment-pix__expired">
                {{ t('payments.instructions.expired') }}
              </div>
            </div>
          </div>
          
          <!-- BOLETO -->
          <div v-else-if="paymentsStore.paymentInstructions.method === 'BOLETO'" class="lf-payment-boleto">
            <div>
              <p class="lf-payment-boleto__title">{{ t('payments.instructions.boletoTitle') }}</p>
              <p class="lf-payment-boleto__desc">{{ t('payments.details.bankSlipDescription') }}</p>
            </div>
            <a 
              v-if="paymentsStore.paymentInstructions.bankSlipUrl" 
              :href="paymentsStore.paymentInstructions.bankSlipUrl" 
              target="_blank"
              class="lf-button lf-button--primary lf-w-full"
            >
              {{ t('payments.instructions.openBankSlip') }}
            </a>
            <div v-if="paymentsStore.paymentInstructions.dueDate" class="lf-payment-boleto__due">
              {{ t('payments.instructions.dueDateLabel') }}: <span>{{ formatDateTime(paymentsStore.paymentInstructions.dueDate, currentLocale) }}</span>
            </div>
          </div>
          
          <div v-else class="lf-payment-empty">
            {{ t('payments.instructions.notAvailable') }}
          </div>
        </div>
      </section>

      <!-- Timeline Section -->
      <section class="lf-payment-section">
        <h3 class="lf-payment-section__title">{{ t('payments.details.timeline') }}</h3>
        <div v-if="payment.events.length > 0" class="lf-payment-summary-card">
          <ul class="lf-timeline">
            <li v-for="(event, eventIdx) in payment.events" :key="event.id" class="lf-timeline__item">
              <div v-if="eventIdx !== payment.events.length - 1" class="lf-timeline__line"></div>
              <div class="lf-timeline__marker">
                <div class="lf-timeline__dot"></div>
              </div>
              <div class="lf-timeline__content">
                <p class="lf-timeline__type">{{ getEventTranslation(event.type) }}</p>
                <p v-if="event.previousStatus && event.currentStatus" class="lf-timeline__transition">
                  {{ t(`payments.status.${event.previousStatus}`) }} &rarr; {{ t(`payments.status.${event.currentStatus}`) }}
                </p>
                <time class="lf-timeline__time">{{ formatDateTime(event.createdAt, currentLocale) }}</time>
              </div>
            </li>
          </ul>
        </div>
        <div v-else class="lf-payment-empty lf-payment-summary-card">
          {{ t('payments.details.notAvailable') }}
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.lf-payment-details {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-8);
}

@media (min-width: 768px) {
  .lf-payment-details {
    display: grid;
    grid-template-columns: 7fr 5fr;
    align-items: start;
  }
}

.lf-payment-details__left,
.lf-payment-details__right {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-8);
}

.lf-payment-section__title {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--lf-text-primary);
  margin-top: 0;
  margin-bottom: var(--lf-space-4);
}

.lf-payment-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--lf-space-4);
}

.lf-payment-section__header .lf-payment-section__title {
  margin-bottom: 0;
}

.lf-payment-summary-card {
  background-color: var(--lf-surface-secondary);
  border: 1px solid var(--lf-border-primary);
  border-radius: var(--lf-radius);
  padding: var(--lf-space-6);
}

.lf-payment-summary-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--lf-space-6) var(--lf-space-4);
}

@media (min-width: 640px) {
  .lf-payment-summary-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.lf-payment-field__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--lf-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 var(--lf-space-1) 0;
}

.lf-payment-field__value {
  margin: 0;
  font-size: 0.875rem;
  color: var(--lf-text-primary);
  word-break: break-word;
}

.lf-payment-field__value--large {
  font-size: 1.125rem;
  font-weight: 500;
}

.lf-payment-field__value--muted {
  color: var(--lf-text-secondary);
}

.lf-payment-field--full {
  grid-column: 1 / -1;
  border-top: 1px solid var(--lf-border-primary);
  padding-top: var(--lf-space-4);
  margin-top: var(--lf-space-2);
}

.lf-payment-dates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--lf-space-4);
}

.lf-payment-processing {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-4);
}

@media (min-width: 640px) {
  .lf-payment-processing {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }
}

.lf-payment-processing__info {
  display: flex;
  flex-direction: column;
}

.lf-payment-processing__badge {
  margin-bottom: var(--lf-space-2);
}

.lf-payment-processing__message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--lf-text-secondary);
}

.lf-payment-processing__actions {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-2);
  min-width: 140px;
}

.lf-payment-loading {
  padding: var(--lf-space-4) 0;
  display: flex;
  justify-content: center;
  color: var(--lf-text-muted);
  font-size: 0.875rem;
}

.lf-payment-empty {
  text-align: center;
  padding: var(--lf-space-4) 0;
  color: var(--lf-text-muted);
  font-size: 0.875rem;
  font-style: italic;
}

/* PIX */
.lf-payment-pix {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--lf-space-4);
}

.lf-payment-pix__qr {
  background: white;
  padding: var(--lf-space-3);
  border-radius: var(--lf-radius);
  border: 1px solid var(--lf-border-primary);
  display: inline-block;
}

.lf-payment-pix__qr img {
  width: 10rem;
  height: 10rem;
  object-fit: contain;
}

.lf-payment-pix__copy {
  width: 100%;
  text-align: left;
}

.lf-payment-pix__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--lf-text-primary);
  margin: 0 0 var(--lf-space-2) 0;
}

.lf-payment-pix__input-group {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-2);
  margin-bottom: var(--lf-space-4);
}

.lf-payment-pix__expiry {
  font-size: 0.75rem;
  color: var(--lf-text-muted);
}

.lf-payment-pix__expiry span {
  font-weight: 500;
  color: var(--lf-text-secondary);
}

.lf-payment-pix__expired {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--lf-danger);
  background-color: var(--lf-danger-bg);
  padding: var(--lf-space-2) var(--lf-space-3);
  border-radius: var(--lf-radius);
  margin-top: var(--lf-space-2);
}

/* BOLETO */
.lf-payment-boleto {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-4);
}

.lf-payment-boleto__title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--lf-text-primary);
  margin: 0 0 var(--lf-space-1) 0;
}

.lf-payment-boleto__desc {
  font-size: 0.75rem;
  color: var(--lf-text-muted);
  margin: 0;
}

.lf-payment-boleto__due {
  font-size: 0.75rem;
  color: var(--lf-text-muted);
  padding-top: var(--lf-space-3);
  border-top: 1px solid var(--lf-border-primary);
}

.lf-payment-boleto__due span {
  font-weight: 500;
  color: var(--lf-text-secondary);
}

/* Timeline */
.lf-timeline {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lf-timeline__item {
  position: relative;
  padding-bottom: var(--lf-space-6);
  display: flex;
  gap: var(--lf-space-3);
}

.lf-timeline__item:last-child {
  padding-bottom: 0;
}

.lf-timeline__line {
  position: absolute;
  top: 1rem;
  left: 1rem;
  bottom: -1rem;
  width: 2px;
  background-color: var(--lf-border-primary);
  margin-left: -1px;
}

.lf-timeline__marker {
  position: relative;
  z-index: 1;
}

.lf-timeline__dot {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: var(--lf-surface-primary);
  border: 1px solid var(--lf-border-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lf-timeline__dot::after {
  content: '';
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: var(--lf-text-muted);
}

.lf-timeline__content {
  flex: 1;
  min-width: 0;
  padding-top: 0.25rem;
}

.lf-timeline__type {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--lf-text-primary);
}

.lf-timeline__transition {
  margin: var(--lf-space-1) 0 0 0;
  font-size: 0.75rem;
  color: var(--lf-text-muted);
}

.lf-timeline__time {
  display: block;
  margin-top: var(--lf-space-1);
  font-size: 0.75rem;
  color: var(--lf-text-secondary);
}
</style>

