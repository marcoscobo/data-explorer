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

  it('highlights the zone while dragging over it', async () => {
    const wrapper = mount(FileUpload)
    const zone = wrapper.get('[data-testid=dropzone]')
    await zone.trigger('dragover')
    expect(zone.classes()).toContain('dragging')
    await zone.trigger('dragleave')
    expect(zone.classes()).not.toContain('dragging')
  })

  it('is large by default and compact when asked', () => {
    const full = mount(FileUpload)
    expect(full.get('[data-testid=dropzone]').classes()).not.toContain('compact')
    expect(full.text()).toContain('Drop your file here')
    const small = mount(FileUpload, { props: { compact: true } })
    expect(small.get('[data-testid=dropzone]').classes()).toContain('compact')
    expect(small.text()).toContain('Drop another file here')
  })

  it('accepts CSV, Excel and JSON files in the picker', () => {
    const accept = mount(FileUpload).get('input[type=file]').attributes('accept')!
    for (const ext of ['.csv', '.xlsx', '.json']) expect(accept).toContain(ext)
    expect(mount(FileUpload).text()).toMatch(/CSV, Excel or JSON/)
  })
})
