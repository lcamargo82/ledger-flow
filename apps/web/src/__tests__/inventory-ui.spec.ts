import { describe, expect, it } from 'vitest'
import ptBR from '../locales/pt-BR.json'
import enUS from '../locales/en-US.json'

describe('inventory UI translations', () => {
  it('defines warehouse, balance and adjustment labels', () => {
    expect(ptBR.inventory.tabs.warehouses).toBe('Warehouses')
    expect(ptBR.inventory.actions.adjust).toBe('Registrar ajuste')
    expect(enUS.inventory.tabs.balances).toBe('Balances')
    expect(enUS.inventory.form.reasonCodeLabel).toBe('Reason')
  })
})
