import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppPagination from '../components/common/AppPagination.vue'

describe('AppPagination navigation', () => {
  it('jumps to the first and last page through shared controls', async () => {
    const wrapper = mount(AppPagination, {
      props: { page: 4, totalPages: 12, total: 120, perPage: 10 },
    })

    await wrapper.get('[data-testid="pagination-first"]').trigger('click')
    await wrapper.get('[data-testid="pagination-last"]').trigger('click')

    expect(wrapper.emitted('update:page')).toEqual([[1], [12]])
  })

  it('disables boundary controls on the first and last page', async () => {
    const wrapper = mount(AppPagination, {
      props: { page: 1, totalPages: 3 },
    })

    expect(wrapper.get('[data-testid="pagination-first"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="pagination-previous"]').attributes('disabled')).toBeDefined()

    await wrapper.setProps({ page: 3 })

    expect(wrapper.get('[data-testid="pagination-next"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="pagination-last"]').attributes('disabled')).toBeDefined()
  })
})
