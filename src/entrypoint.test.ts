import { describe, expect, it } from 'vitest'
import indexHtml from '../index.html?raw'
import launcher from '../start-gym-assistant.cmd?raw'
import packageJson from '../package.json'

describe('application entry point', () => {
  it('provides a discoverable Windows launcher that opens the today route', () => {
    expect(launcher).toContain('cd /d "%~dp0"')
    expect(launcher).toContain('call npm start')
    expect(packageJson.scripts.start).toBe('vite --host 127.0.0.1 --open /today')
  })

  it('explains the correct entry point when index.html is opened directly', () => {
    expect(indexHtml).toContain("window.location.protocol === 'file:'")
    expect(indexHtml).toContain('start-gym-assistant.cmd')
  })
})
