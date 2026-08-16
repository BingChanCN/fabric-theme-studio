import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Runtime Package distribution contract', () => {
  const rootDir = resolve(__dirname, '..')
  const hostBundlePath = resolve(rootDir, 'lib/fabric-host.js')
  const clientBundlePath = resolve(rootDir, 'lib/fabric-client.js')
  const contractsBundlePath = resolve(rootDir, 'lib/contracts.js')
  const contractsTypesPath = resolve(rootDir, 'lib/contracts.d.ts')
  const packageJsonPath = resolve(rootDir, 'package.json')

  it('uses the explicit Fabric Runtime manifest without DSH bundle metadata', () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
    expect(pkg.name).toBe('@dsh-do/fabric-theme-studio')
    expect(pkg.version).toBe('1.0.0')
    expect(pkg.fabric).toEqual({
      format: 1,
      api: '^1.0.0',
      host: './lib/fabric-host.js',
      client: './lib/fabric-client.js',
      contracts: './lib/contracts.js',
    })
    expect(pkg.dsh).toBeUndefined()
    expect(pkg.main).toBeUndefined()
    expect(pkg.exports['./contracts']).toMatchObject({
      types: './lib/contracts.d.ts',
      default: './lib/contracts.js',
    })
    expect(pkg.peerDependencies).toBeUndefined()
  })

  it('emits a Host definition instead of a statically mounted Cordis plugin', () => {
    expect(existsSync(hostBundlePath)).toBe(true)
    const hostContent = readFileSync(hostBundlePath, 'utf-8')
    expect(hostContent).toMatch(/export\s*\{[^}]*\bdefault\b[^}]*\}/u)
    expect(hostContent).toContain('defineHostPlugin')
    expect(hostContent).toContain('theme studio document')
    expect(hostContent).not.toContain('mountHostPlugin(')
  })

  it('registers the stable Runtime module id and owned CSS', () => {
    expect(existsSync(clientBundlePath)).toBe(true)
    const clientContent = readFileSync(clientBundlePath, 'utf-8')
    expect(clientContent).toContain('window.__ModuleLoader__.load')
    expect(clientContent).toMatch(/id:\s*"fabric-runtime\/%40dsh-do%2Ffabric-theme-studio"/u)
    expect(clientContent).toContain('data-plugin')
    expect(clientContent).toContain('fabric-runtime/%40dsh-do%2Ffabric-theme-studio')
    expect(clientContent).toMatch(/require\(["']@dsh-do\/fabric["']\)/u)
    expect(clientContent).not.toMatch(/require\(["']@deepseek-ai\//u)
  })

  it('emits the public contract module and declarations', () => {
    expect(existsSync(contractsBundlePath)).toBe(true)
    expect(existsSync(contractsTypesPath)).toBe(true)
    const contracts = readFileSync(contractsBundlePath, 'utf-8')
    expect(contracts).toContain('id: "theme"')
    expect(contracts).toContain('owner: "@dsh-do/fabric-theme-studio"')
    expect(contracts).not.toContain('react')
    expect(contracts).not.toContain('node:')
  })
})
