<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from '../composables/useI18n'
import { useAuthStore } from '../stores/auth.store'
import { useChannelsStore } from '../stores/channels.store'
import { formatDateTime } from '../utils/date-format'
import type { ChannelWebhookStatus } from '../types/channels.types'
import AppBadge from '../components/common/AppBadge.vue'
import AppButton from '../components/common/AppButton.vue'
import AppCard from '../components/common/AppCard.vue'
import AppErrorState from '../components/common/AppErrorState.vue'
import AppInput from '../components/common/AppInput.vue'
import AppModal from '../components/common/AppModal.vue'
import AppPageHeader from '../components/common/AppPageHeader.vue'
import AppSelect from '../components/common/AppSelect.vue'
import AppTable from '../components/common/AppTable.vue'

const { t, currentLocale } = useI18n()
const authStore = useAuthStore()
const channelsStore = useChannelsStore()

const activeTab = ref<'integrations' | 'inbox'>('integrations')
const isCreateModalOpen = ref(false)

const integrationForm = reactive({
  provider: 'MOCK' as const,
  name: '',
  webhookSecret: '',
})

const integrationColumns = computed(() => [
  { key: 'provider', label: t('channels.table.provider') },
  { key: 'name', label: t('channels.table.name') },
  { key: 'status', label: t('channels.table.status') },
  { key: 'createdAt', label: t('channels.table.createdAt') },
])

const inboxColumns = computed(() => [
  { key: 'receivedAt', label: t('channels.table.receivedAt') },
  { key: 'provider', label: t('channels.table.provider') },
  { key: 'eventType', label: t('channels.table.eventType') },
  { key: 'providerEventId', label: t('channels.table.providerEventId') },
  { key: 'status', label: t('channels.table.status') },
  { key: 'summary', label: t('channels.table.summary') },
])

const statusOptions = computed(() => [
  { value: '', label: t('channels.filters.statusAll') },
  { value: 'RECEIVED', label: t('channels.webhookStatus.RECEIVED') },
  { value: 'DUPLICATE', label: t('channels.webhookStatus.DUPLICATE') },
  { value: 'INVALID', label: t('channels.webhookStatus.INVALID') },
  { value: 'DLQ', label: t('channels.webhookStatus.DLQ') },
])

onMounted(() => {
  channelsStore.fetchChannels()
})

const createIntegration = async () => {
  await channelsStore.createIntegration({
    provider: integrationForm.provider,
    name: integrationForm.name,
    webhookSecret: integrationForm.webhookSecret,
  })
  integrationForm.name = ''
  integrationForm.webhookSecret = ''
  isCreateModalOpen.value = false
}

const webhookStatusVariant = (status: ChannelWebhookStatus) => {
  if (status === 'RECEIVED') return 'success'
  if (status === 'INVALID' || status === 'DLQ') return 'danger'
  return 'warning'
}
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader :title="t('channels.title')" :description="t('channels.description')">
      <template #actions>
        <AppButton
          v-if="authStore.checkAllPermissions(['channels:manage'])"
          variant="primary"
          @click="isCreateModalOpen = true"
        >
          {{ t('channels.actions.createIntegration') }}
        </AppButton>
      </template>
    </AppPageHeader>

    <AppErrorState
      v-if="channelsStore.error"
      :title="t('channels.errors.title')"
      :description="t(channelsStore.error)"
      @retry="channelsStore.fetchChannels()"
    />

    <template v-else>
      <AppCard>
        <div class="flex flex-wrap gap-2">
          <AppButton
            :variant="activeTab === 'integrations' ? 'primary' : 'secondary'"
            @click="activeTab = 'integrations'"
          >
            {{ t('channels.tabs.integrations') }}
          </AppButton>
          <AppButton
            :variant="activeTab === 'inbox' ? 'primary' : 'secondary'"
            @click="activeTab = 'inbox'"
          >
            {{ t('channels.tabs.inbox') }}
          </AppButton>
        </div>
      </AppCard>

      <AppTable
        v-if="activeTab === 'integrations'"
        :columns="integrationColumns"
        :items="channelsStore.integrations"
        :is-loading="channelsStore.isLoading"
        :empty-title="t('channels.empty.integrationsTitle')"
        :empty-description="t('channels.empty.integrationsDescription')"
      >
        <template #provider="{ item }">
          <AppBadge variant="info">{{ t(`channels.provider.${item.provider}`) }}</AppBadge>
        </template>
        <template #status="{ item }">
          <AppBadge :variant="item.status === 'ACTIVE' ? 'success' : 'default'">
            {{ t(`channels.integrationStatus.${item.status}`) }}
          </AppBadge>
        </template>
        <template #createdAt="{ item }">
          {{ formatDateTime(item.createdAt, currentLocale) }}
        </template>
      </AppTable>

      <div v-if="activeTab === 'inbox'" class="space-y-4">
        <AppCard>
          <AppSelect
            id="channel-inbox-status"
            :model-value="channelsStore.filters.status || ''"
            :label="t('channels.filters.statusLabel')"
            :options="statusOptions"
            @update:model-value="
              channelsStore.setInboxStatus(
                ($event || undefined) as ChannelWebhookStatus | undefined,
              )
            "
          />
        </AppCard>

        <AppTable
          :columns="inboxColumns"
          :items="channelsStore.inboxEvents"
          :is-loading="channelsStore.isLoading"
          :empty-title="t('channels.empty.inboxTitle')"
          :empty-description="t('channels.empty.inboxDescription')"
        >
          <template #receivedAt="{ item }">
            {{ formatDateTime(item.receivedAt, currentLocale) }}
          </template>
          <template #provider="{ item }">
            {{ t(`channels.provider.${item.provider}`) }}
          </template>
          <template #status="{ item }">
            <AppBadge :variant="webhookStatusVariant(item.status)">
              {{ t(`channels.webhookStatus.${item.status}`) }}
            </AppBadge>
          </template>
          <template #summary="{ item }">
            <span class="font-mono text-xs">{{ JSON.stringify(item.payloadSummary || {}) }}</span>
          </template>
        </AppTable>
      </div>
    </template>

    <AppModal v-model="isCreateModalOpen" :title="t('channels.form.integrationTitle')" size="md">
      <form class="space-y-4" @submit.prevent="createIntegration">
        <AppSelect
          id="channel-provider"
          v-model="integrationForm.provider"
          :label="t('channels.form.providerLabel')"
          :options="[{ value: 'MOCK', label: t('channels.provider.MOCK') }]"
        />
        <AppInput
          id="channel-name"
          v-model="integrationForm.name"
          :label="t('channels.form.nameLabel')"
        />
        <AppInput
          id="channel-secret"
          v-model="integrationForm.webhookSecret"
          :label="t('channels.form.webhookSecretLabel')"
        />
        <div class="flex justify-end gap-2">
          <AppButton type="button" variant="secondary" @click="isCreateModalOpen = false">
            {{ t('common.cancel') }}
          </AppButton>
          <AppButton type="submit" variant="primary" :loading="channelsStore.isMutating">
            {{ t('channels.actions.createIntegration') }}
          </AppButton>
        </div>
      </form>
    </AppModal>
  </div>
</template>
