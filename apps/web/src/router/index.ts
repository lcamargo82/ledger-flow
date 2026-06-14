import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

import AuthLayout from '../layouts/AuthLayout.vue'
import AppLayout from '../layouts/AppLayout.vue'

import LoginView from '../views/LoginView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import DashboardView from '../views/DashboardView.vue'
import ForbiddenView from '../views/ForbiddenView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        layout: AuthLayout,
        public: true
      }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordView,
      meta: {
        layout: AuthLayout,
        public: true
      }
    },
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: {
        layout: AppLayout,
        requiresAuth: true
      }
    },
    {
      path: '/forbidden',
      name: 'forbidden',
      component: ForbiddenView,
      meta: {
        layout: AppLayout,
        requiresAuth: true
      }
    },
    {
      path: '/dev/ui-kit',
      name: 'ui-kit',
      component: () => import('../views/UIKitView.vue'),
      meta: {
        requiresAuth: false,
        layout: AppLayout
      },
      beforeEnter: (to, from, next) => {
        if (import.meta.env.DEV) {
          next()
        } else {
          next('/not-found')
        }
      }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
      meta: {
        // Can be either, let the guard decide layout or we just default to AppLayout if auth
        public: true
      }
    }
  ]
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
  const isPublic = to.meta.public

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

  next()
})

export default router
