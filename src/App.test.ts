import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { sampleFile } from './test/samples'
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
    expect(wrapper.findAll('thead tr:first-child th').map((t) => t.text())).toEqual(['name', 'age'])
  })

  it('shows a clear error for a non-CSV file', async () => {
    const wrapper = await upload(new File(['x'], 'photo.png', { type: 'image/png' }))
    expect(wrapper.get('[role=alert]').text()).toContain('is not a supported file')
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
    expect(empty.text()).toContain('Upload a CSV, Excel or JSON file to explore it')

    const wrapper = await upload(new File(['a\n1\n'], 'ok.csv', { type: 'text/csv' }))
    expect(wrapper.get('[data-testid=dropzone]').classes()).toContain('compact')
    expect(wrapper.get('main').classes()).toContain('loaded')
    expect(wrapper.text()).not.toContain('Upload a CSV, Excel or JSON file to explore it')
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

  it('lets the user filter, sort and see statistics after uploading', async () => {
    const csv = 'city,sales\nMadrid,10\nLeon,30\nVigo,20\n'
    const wrapper = await upload(new File([csv], 'sales.csv', { type: 'text/csv' }))
    await wrapper.findAll('button.sort')[1]!.trigger('click')
    expect(wrapper.findAll('tbody tr').map((r) => r.findAll('td')[0]!.text())).toEqual(['Madrid', 'Vigo', 'Leon'])
    await wrapper.get('input[aria-label="Minimum sales"]').setValue('15')
    expect(wrapper.get('[data-testid=rows]').text()).toBe('2 of 3 rows')
    await wrapper.findAll('[role=tab]')[1]!.trigger('click')
    expect(wrapper.get('[data-testid=stats-basis]').text()).toContain('2 of 3 rows')
  })

  describe('other formats', () => {
    const waitForTable = (wrapper: ReturnType<typeof mount>) =>
      vi.waitFor(() => expect(wrapper.find('table').exists()).toBe(true), { timeout: 5000 })

    it('previews a JSON file', async () => {
      const wrapper = await upload(sampleFile('sales.json'))
      expect(wrapper.get('h2').text()).toBe('sales.json')
      expect(wrapper.get('[data-testid=rows]').text()).toBe('250 rows')
      expect(wrapper.get('[data-testid=columns]').text()).toBe('11 columns')
    })

    it('previews an Excel file and keeps CSV and Excel results consistent', async () => {
      const wrapper = mount(App)
      await wrapper.get('[data-testid=dropzone]').trigger('drop', { dataTransfer: { files: [sampleFile('sales.xlsx')] } })
      await waitForTable(wrapper)
      expect(wrapper.get('h2').text()).toBe('sales.xlsx')
      expect(wrapper.get('[data-testid=rows]').text()).toBe('250 rows')
      expect(wrapper.get('[data-testid=columns]').text()).toBe('11 columns')
      expect(wrapper.find('label.sheet').exists()).toBe(false) // single sheet: no picker
    })

    it('lets the user switch sheets of a workbook, and starts the new sheet fresh', async () => {
      const wrapper = mount(App)
      await wrapper.get('[data-testid=dropzone]').trigger('drop', { dataTransfer: { files: [sampleFile('multi-sheet.xlsx')] } })
      await waitForTable(wrapper)
      expect(wrapper.get('[data-testid=rows]').text()).toBe('30 rows')
      await wrapper.get('input[type=search]').setValue('north')
      expect(wrapper.get('[data-testid=rows]').text()).not.toBe('30 rows')
      await wrapper.get('label.sheet select').setValue('Targets')
      await vi.waitFor(() => expect(wrapper.get('[data-testid=columns]').text()).toBe('3 columns'), { timeout: 5000 })
      expect(wrapper.get('[data-testid=rows]').text()).toBe('5 rows') // filters were reset
      expect((wrapper.get('input[type=search]').element as HTMLInputElement).value).toBe('')
    })

    it('keeps the current data when the chosen sheet is empty, and explains why', async () => {
      const wrapper = mount(App)
      await wrapper.get('[data-testid=dropzone]').trigger('drop', { dataTransfer: { files: [sampleFile('multi-sheet.xlsx')] } })
      await waitForTable(wrapper)
      await wrapper.get('label.sheet select').setValue('Empty')
      await vi.waitFor(() => expect(wrapper.find('[role=alert]').exists()).toBe(true), { timeout: 5000 })
      expect(wrapper.get('[role=alert]').text()).toContain('The sheet "Empty" is empty.')
      expect(wrapper.get('[data-testid=rows]').text()).toBe('30 rows')
    })

    it('explains legacy .xls, corrupt workbooks and invalid JSON', async () => {
      const xls = await upload(sampleFile('legacy.xls'))
      expect(xls.get('[role=alert]').text()).toContain('.xls')
      const json = await upload(sampleFile('invalid.json'))
      expect(json.get('[role=alert]').text()).toContain('not valid JSON')
      const bad = mount(App)
      await bad.get('[data-testid=dropzone]').trigger('drop', { dataTransfer: { files: [sampleFile('corrupt.xlsx')] } })
      await vi.waitFor(() => expect(bad.find('[role=alert]').exists()).toBe(true), { timeout: 5000 })
      expect(bad.get('[role=alert]').text()).toContain('Excel workbook')
      expect(bad.find('table').exists()).toBe(false)
    })
  })
})
