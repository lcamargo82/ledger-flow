import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

import AuthLayout from '../layouts/AuthLayout.vue'
import AppLayout from '../layouts/AppLayout.vue'

import LoginView from '../views/LoginView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import DashboardView from '../views/DashboardView.vue'
import UsersView from '../views/UsersView.vue'
import RolesView from '../views/RolesView.vue'
import PermissionsView from '../views/PermissionsView.vue'
import TenantSettingsView from '../views/TenantSettingsView.vue'
import CustomersView from '../views/CustomersView.vue'
import PaymentsView from '../views/PaymentsView.vue'
import ForbiddenView from '../views/ForbiddenView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import PlatformTenantsView from '../views/PlatformTenantsView.vue'
import InventoryFoundationView from '../views/InventoryFoundationView.vue'
import CatalogProductsView from '../views/CatalogProductsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        layout: AuthLayout,
        public: true,
      },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordView,
      meta: {
        layout: AuthLayout,
        public: true,
      },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('../views/ResetPasswordView.vue'),
      meta: {
        layout: AuthLayout,
        public: true,
      },
    },
    {
      path: '/accept-invitation',
      name: 'accept-invitation',
      component: () => import('../views/AcceptTenantInvitationView.vue'),
      meta: {
        layout: AuthLayout,
        public: true,
      },
    },
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: {
        layout: AppLayout,
        requiresAuth: true,
      },
    },
    {
      path: '/users',
      name: 'users',
      component: UsersView,
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        permissions: ['users:read'],
      },
    },
    {
      path: '/roles',
      name: 'roles',
      component: RolesView,
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        permissions: ['roles:manage'],
      },
    },
    {
      path: '/permissions',
      name: 'permissions',
      component: PermissionsView,
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        permissions: ['permissions:read'],
      },
    },
    {
      path: '/settings/tenant',
      name: 'tenant-settings',
      component: TenantSettingsView,
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        permissions: ['tenant:update'],
      },
    },
    {
      path: '/settings/gateway-connections',
      name: 'gateway-connections',
      component: () => import('../views/settings/GatewayConnectionsView.vue'),
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        permissions: ['gateways:read'],
      },
    },
    {
      path: '/customers',
      name: 'customers',
      component: CustomersView,
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        permissions: ['customers:read'],
      },
    },
    {
      path: '/payments',
      name: 'payments',
      component: PaymentsView,
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        permissions: ['payments:read'],
      },
    },
    {
      path: '/catalog/products',
      name: 'catalog-products',
      component: CatalogProductsView,
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        permissions: ['catalog:read'],
        capabilities: ['catalog.manage'],
      },
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: InventoryFoundationView,
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        permissions: ['inventory:read'],
        capabilities: ['inventory.manage'],
      },
    },
    {
      path: '/inventory/warehouses',
      name: 'inventory-warehouses',
      component: InventoryFoundationView,
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        permissions: ['inventory:read'],
        capabilities: ['inventory.manage'],
      },
    },
    {
      path: '/inventory/movements',
      name: 'inventory-movements',
      component: InventoryFoundationView,
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        permissions: ['inventory:read'],
        capabilities: ['inventory.manage'],
      },
    },
    {
      path: '/forbidden',
      name: 'forbidden',
      component: ForbiddenView,
      meta: {
        layout: AppLayout,
        requiresAuth: true,
      },
    },
    {
      path: '/platform/tenants',
      name: 'platform-tenants',
      component: PlatformTenantsView,
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        platformAdminOnly: true,
        permissions: ['platform:tenants:read'],
      },
    },
    {
      path: '/platform/tenants/:id',
      name: 'platform-tenant-details',
      component: () => import('../views/PlatformTenantDetailsView.vue'),
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        platformAdminOnly: true,
        permissions: ['platform:tenants:read'],
      },
    },
    {
      path: '/platform/audit',
      name: 'platform-audit',
      component: () => import('../views/PlatformAuditView.vue'),
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        platformAdminOnly: true,
        permissions: ['platform:audit:read'],
      },
    },
    {
      path: '/platform/gateway-connections',
      name: 'platform-gateway-connections',
      component: () => import('../views/platform/PlatformGatewayConnectionsView.vue'),
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        platformAdminOnly: true,
        permissions: ['platform:gateways:read'],
      },
    },
    {
      path: '/platform/async-jobs',
      name: 'platform-async-jobs',
      component: () => import('../views/PlatformAsyncOperationsView.vue'),
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        platformAdminOnly: true,
        permissions: ['platform:async:read'],
      },
    },
    {
      path: '/dev/ui-kit',
      name: 'ui-kit',
      component: () => import('../views/UIKitView.vue'),
      meta: {
        requiresAuth: false,
        layout: AppLayout,
      },
      beforeEnter: (to, from, next) => {
        if (import.meta.env.DEV) {
          next()
        } else {
          next('/not-found')
        }
      },
    },
    {
      path: '/platform/tenants/:id',
      name: 'platform-tenant-details',
      component: () => import('../views/PlatformTenantDetailsView.vue'),
      meta: {
        layout: AppLayout,
        requiresAuth: true,
        platformAdminOnly: true,
        permissions: ['platform:tenants:overview:read'],
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
      meta: {
        // Can be either, let the guard decide layout or we just default to AppLayout if auth
        public: true,
      },
    },
  ],
})

let bootstrapDone = false

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // Bootstrap on first navigation
  if (!bootstrapDone) {
    await authStore.bootstrap()
    bootstrapDone = true
  }

  const isAuth = authStore.isAuthenticated
  const requiresAuth = to.meta.requiresAuth

  if (requiresAuth && !isAuth) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  if (to.path === '/login' && isAuth) {
    return next({ path: '/dashboard' })
  }

  // Check custom permissions if meta.permissions exists
  if (to.meta.permissions) {
    const requiredPerms = to.meta.permissions as string[]
    if (!authStore.checkAllPermissions(requiredPerms)) {
      return next({ path: '/forbidden' })
    }
  }

  if (to.meta.capabilities) {
    const requiredCapabilities = to.meta.capabilities as string[]
    if (!authStore.checkAllCapabilities(requiredCapabilities)) {
      return next({ path: '/forbidden' })
    }
  }

  if (to.meta.platformAdminOnly && !authStore.user?.isPlatformAdmin) {
    return next({ path: '/forbidden' })
  }

  next()
})

export default router
