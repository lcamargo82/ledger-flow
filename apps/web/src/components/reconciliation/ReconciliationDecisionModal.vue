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
} from '../../types/reconciliation.types'

const props = defineProps<{
  modelValue: boolean
  reconciliationCase: ReconciliationCase | null
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

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      form.action = 'COMMENT'
      form.paymentId = ''
      form.reasonCode = ''
      form.comment = ''
    }
  },
)

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
      </div>

      <AppInput
        v-if="requiresPayment"
        v-model="form.paymentId"
        name="paymentId"
        :label="t('reconciliation.decisionModal.paymentId')"
        required
      />

      <AppInput
        v-model="form.reasonCode"
        name="reasonCode"
        :label="t('reconciliation.decisionModal.reasonCode')"
        required
      />

      <div class="lf-field-group">
        <label class="lf-label" for="reconciliation-decision-comment">
          {{ t('reconciliation.decisionModal.comment') }}
        </label>
        <textarea
          id="reconciliation-decision-comment"
          v-model="form.comment"
          class="lf-input lf-textarea"
          name="comment"
          rows="4"
        />
      </div>

      <div v-if="reconciliationCase" class="lf-decision-context">
        <span>{{ reconciliationCase.id }}</span>
        <strong>{{ reconciliationCase.status }}</strong>
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

.lf-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--lf-space-3);
}
</style>
