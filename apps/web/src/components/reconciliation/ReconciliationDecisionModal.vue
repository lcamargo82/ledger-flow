<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import AppButton from '../common/AppButton.vue'
import AppInput from '../common/AppInput.vue'
import AppModal from '../common/AppModal.vue'
import { useI18n } from '../../composables/useI18n'
import type {
  CreateReconciliationDecisionPayload,
  ReconciliationCase,
  ReconciliationDecisionAction,
  ReconciliationReasonCode,
  ReconciliationTimeline,
} from '../../types/reconciliation.types'

const props = defineProps<{
  modelValue: boolean
  reconciliationCase: ReconciliationCase | null
  timeline?: ReconciliationTimeline | null
  reasonCodes?: ReconciliationReasonCode[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'submit', payload: CreateReconciliationDecisionPayload): void
}>()

const { t } = useI18n()

const form = reactive({
  action: 'COMMENT' as ReconciliationDecisionAction,
  paymentId: '',
  reasonCode: '',
  comment: '',
})

const requiresPayment = computed(() => form.action === 'MANUAL_MATCH')
const actionReasonCodes = computed(() =>
  (props.reasonCodes ?? []).filter((reasonCode) => reasonCode.action === form.action),
)
const selectedReasonCode = computed(() =>
  actionReasonCodes.value.find((reasonCode) => reasonCode.code === form.reasonCode),
)
const requiresComment = computed(() => Boolean(selectedReasonCode.value?.requiresComment))
const actionImpactKey = computed(() => `reconciliation.decisionModal.impact.${form.action}`)

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      form.action = 'COMMENT'
      form.paymentId = ''
      form.reasonCode = actionReasonCodes.value[0]?.code ?? ''
      form.comment = ''
    }
  },
)

watch(
  () => form.action,
  () => {
    form.reasonCode = actionReasonCodes.value[0]?.code ?? ''
  },
)

watch(actionReasonCodes, (codes) => {
  if (!form.reasonCode && codes[0]) {
    form.reasonCode = codes[0].code
  }
})

const close = () => emit('update:modelValue', false)

const submit = () => {
  emit('submit', {
    action: form.action,
    reasonCode: form.reasonCode.trim(),
    paymentId: form.paymentId.trim() || undefined,
    comment: form.comment.trim() || undefined,
  })
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    :title="t('reconciliation.decisionModal.title')"
    :prevent-close="loading"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="lf-reconciliation-decision-form" @submit.prevent="submit">
      <div v-if="reconciliationCase" class="lf-decision-context">
        <span>{{ reconciliationCase.id }}</span>
        <strong>{{ reconciliationCase.status }}</strong>
      </div>

      <section v-if="timeline" class="lf-fine-mesh-panel">
        <div>
          <h3>{{ t('reconciliation.fineMesh.evidence') }}</h3>
          <dl class="lf-evidence-grid">
            <div>
              <dt>{{ t('reconciliation.fineMesh.providerPayment') }}</dt>
              <dd>{{ timeline.evidence.settlementEvent.providerPaymentId || '-' }}</dd>
            </div>
            <div>
              <dt>{{ t('reconciliation.fineMesh.netAmount') }}</dt>
              <dd>{{ timeline.evidence.settlementEvent.netAmountMinor || '-' }}</dd>
            </div>
            <div>
              <dt>{{ t('reconciliation.fineMesh.order') }}</dt>
              <dd>{{ timeline.evidence.order?.orderNumber || '-' }}</dd>
            </div>
            <div>
              <dt>{{ t('reconciliation.fineMesh.payment') }}</dt>
              <dd>{{ timeline.evidence.payment?.reference || timeline.evidence.payment?.id || '-' }}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h3>{{ t('reconciliation.fineMesh.timeline') }}</h3>
          <ol class="lf-timeline">
            <li v-for="event in timeline.events" :key="`${event.type}-${event.occurredAt}`">
              <span>{{ t(`reconciliation.timeline.${event.type}`) }}</span>
              <small v-if="event.decision">
                {{ t(`reconciliation.actions.${event.decision.action}`) }} ·
                {{ t(`reconciliation.reasonCodes.${event.decision.reasonCode}`) }}
              </small>
            </li>
          </ol>
        </div>
      </section>

      <div class="lf-field-group">
        <label class="lf-label" for="reconciliation-decision-action">
          {{ t('reconciliation.decisionModal.action') }}
        </label>
        <select
          id="reconciliation-decision-action"
          v-model="form.action"
          class="lf-input"
          name="action"
        >
          <option value="COMMENT">{{ t('reconciliation.actions.COMMENT') }}</option>
          <option value="MANUAL_MATCH">{{ t('reconciliation.actions.MANUAL_MATCH') }}</option>
          <option value="RESOLVE_EXCEPTION">
            {{ t('reconciliation.actions.RESOLVE_EXCEPTION') }}
          </option>
          <option value="IGNORE">{{ t('reconciliation.actions.IGNORE') }}</option>
          <option value="REOPEN">{{ t('reconciliation.actions.REOPEN') }}</option>
        </select>
        <p class="lf-decision-impact">
          {{ t(actionImpactKey) }}
        </p>
      </div>

      <AppInput
        v-if="requiresPayment"
        v-model="form.paymentId"
        name="paymentId"
        :label="t('reconciliation.decisionModal.paymentId')"
        required
      />

      <div class="lf-field-group">
        <label class="lf-label" for="reconciliation-decision-reason">
          {{ t('reconciliation.decisionModal.reasonCode') }}
        </label>
        <select
          id="reconciliation-decision-reason"
          v-model="form.reasonCode"
          class="lf-input"
          name="reasonCode"
          required
        >
          <option
            v-for="reasonCode in actionReasonCodes"
            :key="reasonCode.code"
            :value="reasonCode.code"
          >
            {{ t(reasonCode.labelKey) }}
          </option>
        </select>
      </div>

      <div class="lf-field-group">
        <label class="lf-label" for="reconciliation-decision-comment">
          {{
            requiresComment
              ? t('reconciliation.decisionModal.commentRequired')
              : t('reconciliation.decisionModal.comment')
          }}
        </label>
        <textarea
          id="reconciliation-decision-comment"
          v-model="form.comment"
          class="lf-input lf-textarea"
          name="comment"
          rows="4"
          :required="requiresComment"
        />
      </div>

      <div class="lf-modal-actions">
        <AppButton type="button" variant="secondary" :disabled="loading" @click="close">
          {{ t('common.cancel') }}
        </AppButton>
        <AppButton type="submit" :loading="loading">
          {{ t('reconciliation.decisionModal.submit') }}
        </AppButton>
      </div>
    </form>
  </AppModal>
</template>

<style scoped>
.lf-reconciliation-decision-form {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-4);
}

.lf-field-group {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-2);
}

.lf-decision-impact {
  margin: 0;
  color: var(--lf-text-muted);
  font-size: 0.8125rem;
}

.lf-textarea {
  min-height: 96px;
  resize: vertical;
}

.lf-decision-context {
  display: flex;
  justify-content: space-between;
  gap: var(--lf-space-3);
  padding: var(--lf-space-3);
  border: 1px solid var(--lf-border-primary);
  border-radius: var(--lf-radius);
  color: var(--lf-text-muted);
  font-size: 0.875rem;
}

.lf-fine-mesh-panel {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-4);
  padding: var(--lf-space-4);
  border: 1px solid var(--lf-border-primary);
  border-radius: var(--lf-radius);
  background: var(--lf-surface-muted);
}

.lf-fine-mesh-panel h3 {
  margin: 0 0 var(--lf-space-3);
  color: var(--lf-text-primary);
  font-size: 0.875rem;
}

.lf-evidence-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--lf-space-3);
}

.lf-evidence-grid dt {
  color: var(--lf-text-muted);
  font-size: 0.75rem;
}

.lf-evidence-grid dd {
  margin: 0;
  color: var(--lf-text-primary);
  font-size: 0.875rem;
}

.lf-timeline {
  display: flex;
  flex-direction: column;
  gap: var(--lf-space-2);
  margin: 0;
  padding-left: var(--lf-space-4);
}

.lf-timeline li {
  color: var(--lf-text-primary);
}

.lf-timeline small {
  display: block;
  color: var(--lf-text-muted);
}

.lf-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--lf-space-3);
}
</style>
