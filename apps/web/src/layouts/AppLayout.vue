<template>
  <div class="lf-layout-app" :class="{ 'lf-layout-app--collapsed': isCollapsed }">
    <!-- Sidebar -->
    <aside
      class="lf-sidebar"
      :class="{ 'lf-sidebar--collapsed': isCollapsed }"
      aria-label="Sidebar"
    >
      <button
        class="lf-sidebar-toggle"
        @click="toggleSidebar"
        :aria-label="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <span class="material-symbols-outlined">{{
          isCollapsed ? 'chevron_right' : 'chevron_left'
        }}</span>
      </button>

      <div class="lf-sidebar__brand">
        <img
          v-if="!isCollapsed"
          :src="brandAssets.logoDark"
          alt="LedgerFlow Logo"
          class="lf-sidebar-logo"
        />
        <img v-else :src="brandAssets.appIcon" alt="LF Icon" class="lf-sidebar-logo-icon-img" />
      </div>
      <nav class="lf-sidebar__nav">
        <!-- Dashboard -->
        <router-link to="/dashboard" class="lf-nav-item" active-class="lf-nav-item--active">
          <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
            >dashboard</span
          >
          <span class="text" v-show="!isCollapsed">{{ t('nav.dashboard') }}</span>
        </router-link>

        <!-- Group: Operations -->
        <div class="lf-sidebar-group">
          <button
            v-if="!isCollapsed"
            @click="toggleGroup('operations')"
            class="lf-sidebar-group-header"
          >
            <span>{{ t('nav.groups.operations') }}</span>
            <span class="material-symbols-outlined lf-sidebar-group-icon">{{ expandedGroups.operations ? 'expand_less' : 'expand_more' }}</span>
          </button>
          
          <div v-show="expandedGroups.operations || isCollapsed" class="lf-sidebar-group-content">
            <router-link
              v-if="authStore.checkAllPermissions(['payments:read'])"
              to="/payments"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >payments</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.payments') }}</span>
            </router-link>
            <router-link
              v-if="
                authStore.checkAllPermissions(['orders:read']) &&
                authStore.checkAllCapabilities(['orders.manage'])
              "
              to="/orders"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >receipt_long</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.orders') }}</span>
            </router-link>
            <router-link
              v-if="authStore.checkAllPermissions(['customers:read'])"
              to="/customers"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >person</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.customers') }}</span>
            </router-link>
            <router-link
              v-if="
                authStore.checkAllPermissions(['channels:read']) &&
                authStore.checkAllCapabilities(['channels.connect'])
              "
              to="/channels"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >storefront</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.channels') }}</span>
            </router-link>
            <router-link
              v-if="
                authStore.checkAllPermissions(['reconciliation:read']) &&
                authStore.checkAllCapabilities(['reconciliation.read'])
              "
              to="/reconciliation"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >account_tree</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.reconciliation') }}</span>
            </router-link>
          </div>
        </div>

        <!-- Group: Catalog & Inventory -->
        <div v-if="(authStore.checkAllPermissions(['catalog:read']) && authStore.checkAllCapabilities(['catalog.manage'])) || (authStore.checkAllPermissions(['inventory:read']) && authStore.checkAllCapabilities(['inventory.manage']))" class="lf-sidebar-group">
          <button
            v-if="!isCollapsed"
            @click="toggleGroup('catalogAndInventory')"
            class="lf-sidebar-group-header"
          >
            <span>{{ t('nav.groups.catalogAndInventory') }}</span>
            <span class="material-symbols-outlined lf-sidebar-group-icon">{{ expandedGroups.catalogAndInventory ? 'expand_less' : 'expand_more' }}</span>
          </button>
          <div v-show="expandedGroups.catalogAndInventory || isCollapsed" class="lf-sidebar-group-content">
            <router-link
              v-if="
                authStore.checkAllPermissions(['catalog:read']) &&
                authStore.checkAllCapabilities(['catalog.manage'])
              "
              to="/catalog/products"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >category</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.catalog') }}</span>
            </router-link>
            <router-link
              v-if="
                authStore.checkAllPermissions(['inventory:read']) &&
                authStore.checkAllCapabilities(['inventory.manage'])
              "
              to="/inventory"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >inventory_2</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.inventory') }}</span>
            </router-link>
          </div>
        </div>

        <!-- Group: Analytics -->
        <div v-if="(authStore.checkAllPermissions(['financial-intelligence:read']) && authStore.checkAllCapabilities(['financial.analytics.read'])) || authStore.checkAllPermissions(['reports:export'])" class="lf-sidebar-group">
          <button
            v-if="!isCollapsed"
            @click="toggleGroup('analytics')"
            class="lf-sidebar-group-header"
          >
            <span>{{ t('nav.groups.analytics') }}</span>
            <span class="material-symbols-outlined lf-sidebar-group-icon">{{ expandedGroups.analytics ? 'expand_less' : 'expand_more' }}</span>
          </button>
          <div v-show="expandedGroups.analytics || isCollapsed" class="lf-sidebar-group-content">
            <router-link
              v-if="
                authStore.checkAllPermissions(['financial-intelligence:read']) &&
                authStore.checkAllCapabilities(['financial.analytics.read'])
              "
              to="/analytics"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >analytics</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.analytics') }}</span>
            </router-link>
            <router-link
              v-if="authStore.checkAllPermissions(['reports:export'])"
              to="/exports"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >file_download</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.reports') }}</span>
            </router-link>
          </div>
        </div>

        <!-- Group: Settings -->
        <div v-if="authStore.checkAllPermissions(['users:read']) || authStore.checkAllPermissions(['roles:manage']) || authStore.checkAllPermissions(['permissions:read']) || authStore.checkAllPermissions(['tenant:update']) || authStore.checkAllPermissions(['gateways:read'])" class="lf-sidebar-group">
          <button
            v-if="!isCollapsed"
            @click="toggleGroup('settings')"
            class="lf-sidebar-group-header"
          >
            <span>{{ t('nav.groups.settings') }}</span>
            <span class="material-symbols-outlined lf-sidebar-group-icon">{{ expandedGroups.settings ? 'expand_less' : 'expand_more' }}</span>
          </button>
          <div v-show="expandedGroups.settings || isCollapsed" class="lf-sidebar-group-content">
            <router-link
              v-if="authStore.checkAllPermissions(['users:read'])"
              to="/users"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >group</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.users') }}</span>
            </router-link>
            <router-link
              v-if="authStore.checkAllPermissions(['roles:manage'])"
              to="/roles"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >verified_user</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.roles') }}</span>
            </router-link>
            <router-link
              v-if="authStore.checkAllPermissions(['permissions:read'])"
              to="/permissions"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >key</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.permissions') }}</span>
            </router-link>
            <router-link
              v-if="authStore.checkAllPermissions(['tenant:update'])"
              to="/settings/tenant"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >account_balance</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.tenantSettings') }}</span>
            </router-link>
            <router-link
              v-if="authStore.checkAllPermissions(['gateways:read'])"
              to="/settings/gateway-connections"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >account_balance_wallet</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('nav.gatewayConnections') }}</span>
            </router-link>
          </div>
        </div>

        <!-- Platform Admin Menu -->
        <div
          v-if="authStore.user?.isPlatformAdmin"
          class="lf-sidebar-group--bordered"
        >
          <button
            v-if="!isCollapsed"
            @click="toggleGroup('platform')"
            class="lf-sidebar-group-header"
          >
            <span>{{ t('nav.groups.platform') }}</span>
            <span class="material-symbols-outlined lf-sidebar-group-icon">{{ expandedGroups.platform ? 'expand_less' : 'expand_more' }}</span>
          </button>
          
          <div v-show="expandedGroups.platform || isCollapsed" class="lf-sidebar-group-content">
            <router-link
              to="/platform/tenants"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >domain</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('platform.sidebar.tenants') }}</span>
            </router-link>
            <router-link
              to="/platform/gateway-connections"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >settings_input_component</span
              >
              <span class="text" v-show="!isCollapsed">{{
                t('platform.sidebar.gatewayConnections')
              }}</span>
            </router-link>
            <router-link
              v-if="authStore.checkAllPermissions(['platform:audit:read'])"
              to="/platform/audit"
              class="lf-nav-item"
              active-class="lf-nav-item--active"
            >
              <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
                >history</span
              >
              <span class="text" v-show="!isCollapsed">{{ t('platform.sidebar.audit') }}</span>
            </router-link>
          </div>
        </div>
      </nav>

      <div class="lf-sidebar__footer">
        <LanguageSwitcher v-show="!isCollapsed" />
        <div class="lf-sidebar__user" :class="{ 'lf-sidebar__user--collapsed': isCollapsed }">
          <div class="lf-sidebar__avatar">{{ authStore.userName.charAt(0).toUpperCase() }}</div>
          <div class="lf-sidebar__user-info" v-show="!isCollapsed">
            <span class="lf-sidebar__user-name">{{ authStore.userName }}</span>
            <span class="lf-sidebar__user-email">{{ authStore.userEmail }}</span>
          </div>
        </div>
        <button
          class="lf-sidebar__logout"
          @click="handleLogout"
          :aria-label="t('common.logout')"
          :class="{ 'lf-sidebar__logout--collapsed': isCollapsed }"
        >
          <span class="material-symbols-outlined icon" style="font-variation-settings: 'FILL' 0"
            >logout</span
          >
          <span class="text" v-show="!isCollapsed">{{ t('common.logout') }}</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="lf-layout-app__main">
      <!-- Page Content -->
      <div class="lf-layout-app__content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { useConfirmDialogStore } from '../stores/confirm-dialog.store'
import { useI18n } from '../composables/useI18n'
import { brandAssets } from '../config/brand'
import AppButton from '../components/common/AppButton.vue'
import LanguageSwitcher from '../components/common/LanguageSwitcher.vue'

const isCollapsed = ref(false)

const expandedGroups = reactive({
  operations: true,
  catalogAndInventory: true,
  analytics: false,
  settings: false,
  platform: false,
})

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const toggleGroup = (group: keyof typeof expandedGroups) => {
  if (!isCollapsed.value) {
    expandedGroups[group] = !expandedGroups[group]
  }
}

const authStore = useAuthStore()
const confirmDialogStore = useConfirmDialogStore()
const router = useRouter()
const { t } = useI18n()

const handleLogout = () => {
  confirmDialogStore.open({
    title: t('modal.confirmLogoutTitle'),
    message: t('modal.confirmLogoutMessage'),
    confirmText: t('common.logout'),
    confirmLoadingText: t('common.loggingOut'),
    cancelText: t('common.cancel'),
    confirmVariant: 'danger',
    onConfirm: async () => {
      await authStore.logout()
      router.push('/login')
    },
    onCancel: null,
  })
}
</script>

<style scoped>
.lf-sidebar-logo {
  max-width: 180px;
  height: auto;
}
</style>
