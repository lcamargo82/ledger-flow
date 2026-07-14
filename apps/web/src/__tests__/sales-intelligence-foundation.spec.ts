import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SalesIntelligenceView from '../views/SalesIntelligenceView.vue'

describe('sales intelligence foundation', () => {
  it('renders the safe foundation shell without profitability data', () => {
    const wrapper = mount(SalesIntelligenceView)

    expect(wrapper.text()).toContain('Inteligência de vendas')
    expect(wrapper.text()).toContain('Pedido, pagamento, taxa, líquido e estoque')
    expect(wrapper.text()).not.toContain('Lucro')
    expect(wrapper.text()).not.toContain('Margem')
  })
})
