<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useI18n } from '../../composables/useI18n'
import AppInput from '../common/AppInput.vue'
import AppSelect from '../common/AppSelect.vue'
import AppButton from '../common/AppButton.vue'
import type { CreateProductRequest, ProductListItem, ProductType, UpdateProductRequest } from '../../types/catalog.types'

const props = defineProps<{
  mode: 'create' | 'edit'
  product?: ProductListItem | null
  parentOptions?: ProductListItem[]
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: CreateProductRequest | UpdateProductRequest]
  cancel: []
}>()

const { t } = useI18n()

const form = reactive({
  type: (props.product?.type || 'SIMPLE') as ProductType,
  parentProductId: props.product?.parentProductId || '',
  name: props.product?.name || '',
  description: props.product?.description || '',
  brand: props.product?.brand || '',
  category: props.product?.category || '',
  sku: props.product?.sku?.skuDisplay || '',
  averageCost: props.product?.sku ? String(props.product.sku.averageCost) : '0',
  unitOfMeasure: props.product?.sku?.unitOfMeasure || 'UN',
  currency: props.product?.sku?.currency || 'BRL',
  barcode: props.product?.sku?.barcode || '',
  costChangeReason: '',
})

const isParent = computed(() => form.type === 'PARENT')
const isVariant = computed(() => form.type === 'VARIANT')
const requiresSku = computed(() => form.type === 'SIMPLE' || form.type === 'VARIANT')
const canEditSku = computed(() => props.mode === 'create')

const typeOptions = computed(() => [
  { value: 'SIMPLE', label: t('catalog.type.SIMPLE') },
  { value: 'PARENT', label: t('catalog.type.PARENT') },
  { value: 'VARIANT', label: t('catalog.type.VARIANT') },
])

const parentOptions = computed(() => [
  { value: '', label: t('catalog.form.parentPlaceholder') },
  ...(props.parentOptions || [])
    .filter(product => product.type === 'PARENT' && product.status === 'ACTIVE')
    .map(product => ({ value: product.id, label: product.name })),
])

const submit = () => {
  const basePayload = {
    name: form.name,
    description: form.description || undefined,
    brand: form.brand || undefined,
    category: form.category || undefined,
  }

  const skuPayload = requiresSku.value
    ? {
        sku: form.sku.trim().toUpperCase(),
        averageCost: Number(form.averageCost),
        unitOfMeasure: form.unitOfMeasure.trim().toUpperCase(),
        currency: form.currency.trim().toUpperCase(),
        barcode: form.barcode || undefined,
      }
    : undefined

  if (props.mode === 'create') {
    emit('submit', {
      ...basePayload,
      type: form.type,
      parentProductId: isVariant.value ? form.parentProductId : undefined,
      sku: skuPayload,
    })
    return
  }

  emit('submit', {
    ...basePayload,
    sku: skuPayload,
    costChangeReason: form.costChangeReason || undefined,
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AppSelect
        v-if="mode === 'create'"
        id="product-type"
        v-model="form.type"
        :label="t('catalog.form.typeLabel')"
        :options="typeOptions"
      />
      <AppSelect
        v-if="mode === 'create' && isVariant"
        id="parent-product"
        v-model="form.parentProductId"
        :label="t('catalog.form.parentLabel')"
        :options="parentOptions"
      />
      <AppInput
        id="product-name"
        v-model="form.name"
        :label="t('catalog.form.nameLabel')"
        :placeholder="t('catalog.form.namePlaceholder')"
      />
      <AppInput
        id="product-brand"
        v-model="form.brand"
        :label="t('catalog.form.brandLabel')"
        :placeholder="t('catalog.form.brandPlaceholder')"
      />
      <AppInput
        id="product-category"
        v-model="form.category"
        :label="t('catalog.form.categoryLabel')"
        :placeholder="t('catalog.form.categoryPlaceholder')"
      />
    </div>

    <AppInput
      id="product-description"
      v-model="form.description"
      :label="t('catalog.form.descriptionLabel')"
      :placeholder="t('catalog.form.descriptionPlaceholder')"
    />

    <div v-if="requiresSku" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AppInput
        id="product-sku"
        v-model="form.sku"
        :label="t('catalog.form.skuLabel')"
        :placeholder="t('catalog.form.skuPlaceholder')"
        :disabled="!canEditSku"
      />
      <AppInput
        id="product-cost"
        v-model="form.averageCost"
        type="number"
        step="0.0001"
        min="0"
        :label="t('catalog.form.averageCostLabel')"
      />
      <AppInput
        id="product-uom"
        v-model="form.unitOfMeasure"
        :label="t('catalog.form.unitOfMeasureLabel')"
      />
      <AppInput
        id="product-currency"
        v-model="form.currency"
        :label="t('catalog.form.currencyLabel')"
      />
      <AppInput
        id="product-barcode"
        v-model="form.barcode"
        :label="t('catalog.form.barcodeLabel')"
      />
      <AppInput
        v-if="mode === 'edit'"
        id="product-cost-reason"
        v-model="form.costChangeReason"
        :label="t('catalog.form.costChangeReasonLabel')"
        :placeholder="t('catalog.form.costChangeReasonPlaceholder')"
      />
    </div>

    <p v-if="isParent" class="text-sm text-gray-500 dark:text-gray-400">
      {{ t('catalog.form.parentSkuNotice') }}
    </p>

    <div class="flex justify-end gap-3 pt-4">
      <AppButton type="button" variant="secondary" @click="emit('cancel')">
        {{ t('common.cancel') }}
      </AppButton>
      <AppButton type="submit" variant="primary" :loading="loading">
        {{ mode === 'create' ? t('catalog.actions.create') : t('catalog.actions.save') }}
      </AppButton>
    </div>
  </form>
</template>
