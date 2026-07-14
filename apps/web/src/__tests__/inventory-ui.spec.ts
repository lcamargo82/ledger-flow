import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ptBR from '../locales/pt-BR.json'
import enUS from '../locales/en-US.json'
import { inventoryService } from '../services/inventory.service'
import { useInventoryStore } from '../stores/inventory.store'
import { validateWarehouseForm } from '../utils/inventory-validation'

vi.mock('../services/inventory.service', () => ({
  inventoryService: {
    createWarehouse: vi.fn<typeof inventoryService.createWarehouse>(),
  },
}))

describe('inventory UI translations', () => {
  it('defines warehouse, balance, reservation and adjustment labels', () => {
    expect(ptBR.inventory.tabs.warehouses).toBe('Warehouses')
    expect(ptBR.inventory.actions.adjust).toBe('Registrar ajuste')
    expect(ptBR.inventory.tabs.reservations).toBe('Reservas')
    expect(ptBR.inventory.actions.consumeReservation).toBe('Consumir reserva')
    expect(enUS.inventory.tabs.balances).toBe('Balances')
    expect(enUS.inventory.tabs.reservations).toBe('Reservations')
    expect(enUS.inventory.form.reasonCodeLabel).toBe('Reason')
  })

  it('defines translated warehouse validation feedback', () => {
    expect(ptBR.inventory.form.validation.codeLength).toBe(
      'O código deve ter entre 2 e 20 caracteres.',
    )
    expect(ptBR.inventory.form.validation.nameMinLength).toBe(
      'O nome deve ter pelo menos 2 caracteres.',
    )
    expect(enUS.inventory.form.validation.codeLength).toBe(
      'Code must be between 2 and 20 characters.',
    )
    expect(enUS.inventory.form.validation.nameMinLength).toBe(
      'Name must be at least 2 characters.',
    )
  })
})

describe('warehouse form validation', () => {
  it('returns field errors for values rejected by the API', () => {
    expect(validateWarehouseForm({ code: ' A ', name: ' ' })).toEqual({
      code: 'inventory.form.validation.codeLength',
      name: 'inventory.form.validation.nameMinLength',
    })
  })

  it('accepts trimmed values that meet the API constraints', () => {
    expect(validateWarehouseForm({ code: ' MAIN ', name: ' Main warehouse ' })).toEqual({})
  })
})

describe('warehouse creation errors', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('does not replace the inventory page with a global error', async () => {
    vi.mocked(inventoryService.createWarehouse).mockRejectedValue(new Error('invalid warehouse'))
    const store = useInventoryStore()

    await expect(store.createWarehouse({ code: 'A', name: '' })).rejects.toThrow(
      'invalid warehouse',
    )

    expect(store.error).toBeNull()
  })
})
