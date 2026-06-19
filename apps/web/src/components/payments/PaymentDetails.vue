<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../composables/useI18n';
import type { PaymentDetails } from '../../types/payments.types';
import { formatDateTime } from '../../utils/date-format';
import { formatMoneyFromCents } from '../../utils/money-format';
import AppBadge from '../common/AppBadge.vue';

const props = defineProps<{
  payment: PaymentDetails;
}>();

const { t, currentLocale } = useI18n();

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
    default: return t('payments.events.generic');
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
