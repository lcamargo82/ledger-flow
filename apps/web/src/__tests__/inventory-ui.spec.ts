import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ptBR from '../locales/pt-BR.json'
import enUS from '../locales/en-US.json'
import { inventoryService } from '../services/inventory.service'
import { useInventoryStore } from '../stores/inventory.store'
import { validateWarehouseForm } from '../utils/inventory-validation'
import inventoryFoundationSource from '../views/InventoryFoundationView.vue?raw'
import inventoryTransfersSource from '../views/InventoryTransfersView.vue?raw'
import inventoryCycleCountsSource from '../views/InventoryCycleCountsView.vue?raw'

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

describe('inventory list identities', () => {
  it('uses readable product, SKU and warehouse fields instead of UUID columns', () => {
    expect(inventoryFoundationSource).toContain("{ key: 'product'")
    expect(inventoryFoundationSource).toContain('item.sku.skuDisplay')
    expect(inventoryFoundationSource).toContain('item.warehouse.name')
    expect(inventoryFoundationSource).not.toContain("{ key: 'skuId', label")
    expect(inventoryFoundationSource).not.toContain("{ key: 'warehouseId', label")

    expect(inventoryTransfersSource).toContain("{ key: 'sourceWarehouse'")
    expect(inventoryTransfersSource).toContain('transferItem.sku.product.name')
    expect(inventoryTransfersSource).not.toContain('#sourceWarehouseId')

    expect(inventoryCycleCountsSource).toContain("{ key: 'warehouse'")
    expect(inventoryCycleCountsSource).toContain('item.sku.skuDisplay')
    expect(inventoryCycleCountsSource).not.toContain('#warehouseId')
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
