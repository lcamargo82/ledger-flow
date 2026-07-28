/* oxlint-disable vitest/require-mock-type-parameters */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GatewayConnectionsView from '../views/settings/GatewayConnectionsView.vue'
import { GatewayConnectionsService, type GatewayConnection } from '../services/gateway-connections.service'

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()

vi.mock('../stores/toast.store', () => ({
  useToastStore: () => ({ success: toastSuccess, error: toastError }),
}))

vi.mock('../services/gateway-connections.service', () => ({
  GatewayConnectionsService: {
    listConnections: vi.fn(),
    updateStatus: vi.fn(),
    getMercadoPagoAuthUrl: vi.fn(),
  },
}))

const activeConnection: GatewayConnection = {
  id: 'gateway-1',
  provider: 'ASAAS',
  environment: 'SANDBOX',
  status: 'ACTIVE',
  priority: 1,
  displayName: 'Asaas Sandbox',
  supportedMethods: ['PIX'],
  healthStatus: 'HEALTHY',
  credentialsConfigured: true,
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
}

describe('GatewayConnectionsView status actions', () => {
  afterEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('deactivates a payment integration after confirming the pause action', async () => {
    vi.mocked(GatewayConnectionsService.listConnections).mockResolvedValue([activeConnection])
    vi.mocked(GatewayConnectionsService.updateStatus).mockResolvedValue({
      ...activeConnection,
      status: 'INACTIVE',
    })

    mount(GatewayConnectionsView, { attachTo: document.body })
    await flushPromises()

    const pauseButton = document.body.querySelector<HTMLButtonElement>(
      'button[title="Desativar conexão"]',
    )
    expect(pauseButton).not.toBeNull()

    pauseButton!.click()
    await flushPromises()

    const confirmButton = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Desativar conexão',
    )
    expect(confirmButton).toBeDefined()

    confirmButton!.click()
    await flushPromises()

    expect(GatewayConnectionsService.updateStatus).toHaveBeenCalledWith('gateway-1', {
      status: 'INACTIVE',
    })
    expect(GatewayConnectionsService.listConnections).toHaveBeenCalledTimes(2)
    expect(toastSuccess).toHaveBeenCalledWith('Status da conexão alterado.')
  })
})
