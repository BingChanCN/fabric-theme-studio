import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Build Contract & Distribution Artifacts', () => {
  const rootDir = resolve(__dirname, '..')
  const hostBundlePath = resolve(rootDir, 'lib/index.js')
  const clientBundlePath = resolve(rootDir, 'lib/client.js')
  const packageJsonPath = resolve(rootDir, 'package.json')
  const patchYmlPath = resolve(rootDir, 'cordis.patch.yml')

  it('verifies package.json configuration', () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
    expect(pkg.name).toBe('@dsh-do/fabric-theme-studio')
    expect(pkg.version).toBe('0.6.0')
    expect(pkg.main).toBe('lib/index.js')
    expect(pkg.exports['.']).toBe('./lib/index.js')
    expect(pkg.exports['./client']).toBe('./lib/client.js')
    expect(pkg.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(pkg.dsh?.client?.inject).toContain('fabric')
    expect(pkg.peerDependencies?.['@dsh-do/fabric']).toBe('^0.4.0')
  })

  it('verifies cordis.patch.yml consistency', () => {
    const patchContent = readFileSync(patchYmlPath, 'utf-8')
    expect(patchContent).toContain('fabric-theme-studio')
  })

  it('verifies host bundle exists and exports apply function', () => {
    expect(existsSync(hostBundlePath)).toBe(true)
    const hostContent = readFileSync(hostBundlePath, 'utf-8')
    expect(hostContent).toMatch(/export\s*\{[^}]*\bapply\b[^}]*\}/)
    expect(hostContent).toContain('/api/theme-studio/state')
  })

  it('verifies client bundle adheres to DSH ModuleLoader contract and Phase 3 contributions', () => {
    expect(existsSync(clientBundlePath)).toBe(true)
    const clientContent = readFileSync(clientBundlePath, 'utf-8')

    // Must be wrapped in DSH ModuleLoader
    expect(clientContent).toContain('window.__ModuleLoader__.load')
    expect(clientContent).toContain('"fabric-theme-studio"')

    // Must inline CSS with unique data-plugin attribute
    expect(clientContent).toContain('data-plugin')
    expect(clientContent).toContain('gallery.module.css')

    // Must register mod and config contributions
    expect(clientContent).toContain('registerConfig')
    expect(clientContent).toMatch(/kind:\s*["']mod["']/)

    // Must register IMC capabilities and Phase 3 commands
    expect(clientContent).toContain('registerCapability')
    expect(clientContent).toContain('"theme-studio-api"')
    expect(clientContent).toMatch(/kind:\s*["']command["']/)
    expect(clientContent).toContain('theme-studio.open-gallery')
    expect(clientContent).toContain('Mod+Shift+T')
    expect(clientContent).toContain('Mod+Alt+T')

    // Must not bundle or require runtime fabric/client directly
    expect(clientContent).not.toMatch(/require\(["']fabric["']\)/)
    expect(clientContent).not.toMatch(/require\(["']fabric\/client["']\)/)
    expect(clientContent).not.toMatch(/require\(["']@dsh-do\/fabric["']\)/)
    expect(clientContent).not.toMatch(/require\(["']@dsh-do\/fabric\/client["']\)/)
  })
})
