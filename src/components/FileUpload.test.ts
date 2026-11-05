import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FileUpload from './FileUpload.vue'

const file = new File(['a,b\n1,2'], 'data.csv', { type: 'text/csv' })

describe('FileUpload', () => {
  it('emits select when a file is chosen', async () => {
    const wrapper = mount(FileUpload)
    const input = wrapper.find('input[type=file]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    expect(wrapper.emitted('select')?.[0]).toEqual([file])
  })

  it('emits select when a file is dropped', async () => {
    const wrapper = mount(FileUpload)
    await wrapper.find('[data-testid=dropzone]').trigger('drop', { dataTransfer: { files: [file] } })
    expect(wrapper.emitted('select')?.[0]).toEqual([file])
  })

  it('does not emit when no file is chosen', async () => {
    const wrapper = mount(FileUpload)
    const input = wrapper.find('input[type=file]')
    Object.defineProperty(input.element, 'files', { value: [] })
    await input.trigger('change')
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
