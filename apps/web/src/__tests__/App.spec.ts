import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from '../App.vue'
import { useAuthStore } from '../stores/auth.store'

describe('App', () => {
  it('mounts the authenticated shell without bootstrapping loader', async () => {
    setActivePinia(createPinia())
    const authStore = useAuthStore()
    authStore.isBootstrapping = false

    const router = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/', component: { template: '<div>Dashboard</div>' } }],
    })
    router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('Dashboard')
  })
})
