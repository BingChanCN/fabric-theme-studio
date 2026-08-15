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
    expect(pkg.version).toBe('0.7.1')
    expect(pkg.main).toBe('lib/index.js')
    expect(pkg.exports['.']).toBe('./lib/index.js')
    expect(pkg.exports['./client']).toBe('./lib/client.js')
    expect(pkg.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(pkg.dsh?.client?.inject).toEqual(['@dsh-do/fabric'])
    expect(pkg.dsh?.client?.inject).not.toContain('fabric')
    expect(pkg.peerDependencies?.['@dsh-do/fabric']).toBe('^0.5.0')
  })

  it('verifies cordis.patch.yml consistency', () => {
    const patchContent = readFileSync(patchYmlPath, 'utf-8')
    expect(patchContent).toContain('fabric-theme-studio')
  })

  it('verifies host bundle exists and exports apply function', () => {
    expect(existsSync(hostBundlePath)).toBe(true)
    const hostContent = readFileSync(hostBundlePath, 'utf-8')
    expect(hostContent).toMatch(/export\s*\{[^}]*\bapply\b[^}]*\}/)
    expect(hostContent).toContain('theme-studio')
    expect(hostContent).toContain('state')
    expect(hostContent).toContain('active-set')
  })

  it('verifies client bundle uses the singleton Fabric ABI and scoped public setup', () => {
    expect(existsSync(clientBundlePath)).toBe(true)
    const clientContent = readFileSync(clientBundlePath, 'utf-8')

    // Must register as the package name. DSH looks up factories by pkg.name;
    // an unscoped leftover id loads the script but never lands in the table.
    expect(clientContent).toContain('window.__ModuleLoader__.load')
    expect(clientContent).toMatch(/window\.__ModuleLoader__\.load\(\{\s*id:\s*"@dsh-do\/fabric-theme-studio"/)

    // Must inline CSS with unique data-plugin attribute
    expect(clientContent).toContain('data-plugin')
    expect(clientContent).toContain('gallery.module.css')

    // Contributions are registered through the Fabric plugin scope.
    expect(clientContent).toContain('defineClientPlugin')
    expect(clientContent).toContain('"theme-studio-api"')
    expect(clientContent).toContain('"open-gallery"')
    expect(clientContent).toContain('Mod+Shift+T')
    expect(clientContent).toContain('Mod+Alt+T')

    // The singleton runtime is the only Fabric runtime dependency.
    expect(clientContent).toMatch(/require\(["']@dsh-do\/fabric["']\)/)
    expect(clientContent).not.toMatch(/require\(["']@dsh-do\/fabric\/client["']\)/)
    expect(clientContent).not.toContain('registerConfig')
    expect(clientContent).not.toContain('registerCapability')
  })
})
