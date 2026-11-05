import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import App from './App.vue'

async function upload(file: File) {
  const wrapper = mount(App)
  await wrapper.get('[data-testid=dropzone]').trigger('drop', { dataTransfer: { files: [file] } })
  await flushPromises()
  return wrapper
}

describe('App', () => {
  it('renders the app title', () => {
    expect(mount(App).get('h1').text()).toBe('Data Explorer')
  })

  it('previews a valid CSV', async () => {
    const wrapper = await upload(new File(['name,age\nAna,30\n'], 'people.csv', { type: 'text/csv' }))
    expect(wrapper.find('[role=alert]').exists()).toBe(false)
    expect(wrapper.get('h2').text()).toBe('people.csv')
    expect(wrapper.get('[data-testid=rows]').text()).toBe('1 row')
    expect(wrapper.get('[data-testid=columns]').text()).toBe('2 columns')
    expect(wrapper.findAll('th').map((t) => t.text())).toEqual(['name', 'age'])
  })

  it('shows a clear error for a non-CSV file', async () => {
    const wrapper = await upload(new File(['x'], 'photo.png', { type: 'image/png' }))
    expect(wrapper.get('[role=alert]').text()).toContain('not a CSV file')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('shows a clear error for an empty CSV', async () => {
    const wrapper = await upload(new File([''], 'empty.csv', { type: 'text/csv' }))
    expect(wrapper.get('[role=alert]').text()).toMatch(/empty/i)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('clears the previous preview when a later file is invalid', async () => {
    const wrapper = await upload(new File(['a\n1\n'], 'ok.csv', { type: 'text/csv' }))
    expect(wrapper.find('table').exists()).toBe(true)
    await wrapper.get('[data-testid=dropzone]').trigger('drop', {
      dataTransfer: { files: [new File([''], 'bad.csv', { type: 'text/csv' })] },
    })
    await flushPromises()
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.find('[role=alert]').exists()).toBe(true)
  })

  it('shows the privacy message and file size in the preview', async () => {
    const wrapper = await upload(new File(['a\n1\n'], 'ok.csv', { type: 'text/csv' }))
    expect(wrapper.text()).toContain('Your data stays in your browser')
    expect(wrapper.get('[data-testid=size]').text()).toBe('4 B')
  })

  it('titles the error banner', async () => {
    const wrapper = await upload(new File([''], 'empty.csv', { type: 'text/csv' }))
    expect(wrapper.get('[role=alert]').text()).toContain("We couldn't open this file")
  })

  it('shrinks the upload zone and hides the intro once data is loaded', async () => {
    const empty = mount(App)
    expect(empty.get('[data-testid=dropzone]').classes()).not.toContain('compact')
    expect(empty.text()).toContain('Upload a CSV file to explore it')

    const wrapper = await upload(new File(['a\n1\n'], 'ok.csv', { type: 'text/csv' }))
    expect(wrapper.get('[data-testid=dropzone]').classes()).toContain('compact')
    expect(wrapper.get('main').classes()).toContain('loaded')
    expect(wrapper.text()).not.toContain('Upload a CSV file to explore it')
  })

  it('has exactly one scroll area for the data', async () => {
    const wrapper = await upload(new File(['a\n1\n'], 'ok.csv', { type: 'text/csv' }))
    expect(wrapper.findAll('[role=region]')).toHaveLength(1)
  })

  it('has a theme toggle that switches the theme', async () => {
    const wrapper = mount(App)
    await wrapper.get('button[aria-label^="Switch to"]').trigger('click')
    expect(document.documentElement.dataset.theme).toBe('dark')
    await wrapper.get('button[aria-label^="Switch to"]').trigger('click')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
