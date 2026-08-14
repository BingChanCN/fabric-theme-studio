import { useState } from 'react'
import type { FabricSettingsProps } from 'fabric/client'
import type { JsonValue } from 'fabric/sdk'
import { Badge, Section, useFabricConfig } from 'fabric/ui'
import type { ThemeDefinition } from '../../types.ts'
import { convertVSCodeTheme, parseVSCodeThemeJson } from '../../vscode-importer.ts'
import { useThemeStudio } from '../theme-engine.ts'
import styles from '../styles/settings.module.css'

export interface ThemeStudioConfigValues {
  readonly [key: string]: JsonValue
  defaultTheme?: string
  autoFollowSystem?: boolean
  hudEnabled?: boolean
  transitionSpeed?: number
  dynamicEffectsEnabled?: boolean
}

export function ThemeSettings(props: FabricSettingsProps) {
  const {
    activeTheme,
    customThemes,
    saveCustomTheme,
    resetAll,
    dynamicEffectsEnabled,
    setDynamicEffectsEnabled,
  } = useThemeStudio()
  const config = useFabricConfig<ThemeStudioConfigValues>('fabric-theme-studio')

  // Theme Studio JSON import
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  // VSCode Theme Import
  const [vscodeJson, setVscodeJson] = useState('')
  const [vscodeThemeName, setVscodeThemeName] = useState('')
  const [vscodeError, setVscodeError] = useState<string | null>(null)

  const handleExportAll = () => {
    const data = JSON.stringify(customThemes.length > 0 ? customThemes : [activeTheme], null, 2)
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(data)
      props.notify('主题 JSON 数据已复制到剪贴板', { tone: 'info' })
    }
  }

  const handleImport = () => {
    setImportError(null)
    try {
      const parsed = JSON.parse(importJson) as ThemeDefinition | ThemeDefinition[]
      const list = Array.isArray(parsed) ? parsed : [parsed]
      let count = 0
      for (const item of list) {
        if (typeof item.id === 'string' && typeof item.name === 'string' && item.tokens) {
          saveCustomTheme(item)
          count++
        }
      }
      if (count > 0) {
        setImportJson('')
        props.notify(`成功导入 ${count} 套主题配置`, { tone: 'success' })
      } else {
        setImportError('未找到有效的主题对象格式')
      }
    } catch {
      setImportError('JSON 格式解析失败，请检查输入')
    }
  }

  const handleImportVSCodeTheme = () => {
    setVscodeError(null)
    try {
      const raw = parseVSCodeThemeJson(vscodeJson)
      const res = convertVSCodeTheme(raw, vscodeThemeName)
      if (res.success && res.theme) {
        saveCustomTheme(res.theme as unknown as ThemeDefinition)
        setVscodeJson('')
        setVscodeThemeName('')
        props.notify(`🎉 成功将 VSCode 主题「${res.theme.name}」转换为 DSH 设计系统并应用`, {
          tone: 'success',
        })
      } else {
        setVscodeError(res.error ?? 'VSCode 主题解析转换失败')
      }
    } catch (err) {
      setVscodeError(err instanceof Error ? err.message : 'JSON 格式解析失败，请检查输入')
    }
  }

  const handleReset = () => {
    resetAll()
    config.reset()
    props.notify('已重置所有主题与自定义配置', { tone: 'warning' })
  }

  return (
    <div className={styles.settingsContainer}>
      <Section
        title="Theme Studio 资产与高级管理"
        description="管理已保存的自定义主题库、导入外部生态主题资产与全局材质特效"
      >
        {/* Host Persistence Status */}
        <div className={styles.settingRow}>
          <div className={styles.settingLabelGroup}>
            <span className={styles.settingTitle}>Fabric 配置中心持久化状态</span>
            <span className={styles.settingDesc}>
              Schema 配置由 Fabric 自动通过 Host /fabric/config 持久化
            </span>
          </div>
          <div className={styles.badgeRow}>
            <Badge
              tone={
                config.status === 'ready'
                  ? 'success'
                  : config.status === 'saving'
                    ? 'info'
                    : 'neutral'
              }
            >
              {config.status === 'ready'
                ? '已同步 (Synced)'
                : config.status === 'saving'
                  ? '保存中...'
                  : '本地缓存'}
            </Badge>
            {config.dirty && <Badge tone="warning">有未保存改动</Badge>}
          </div>
        </div>

        {/* Global Dynamic Ambient Effects Toggle */}
        <div className={styles.settingRow}>
          <div className={styles.settingLabelGroup}>
            <span className={styles.settingTitle}>纯 CSS 硬件加速动态背景</span>
            <span className={styles.settingDesc}>
              启用极光、赛博网格与弥散渐变等低功耗 GPU 背景特效 (自动响应系统的减弱动画偏好)
            </span>
          </div>
          <input
            type="checkbox"
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            checked={dynamicEffectsEnabled}
            onChange={e => {
              setDynamicEffectsEnabled(e.target.checked)
              props.notify(e.target.checked ? '已开启全局动态背景' : '已关闭全局动态背景', {
                tone: 'info',
              })
            }}
          />
        </div>

        {/* Custom Themes Counter */}
        <div className={styles.settingRow}>
          <div className={styles.settingLabelGroup}>
            <span className={styles.settingTitle}>自定义主题资产</span>
            <span className={styles.settingDesc}>当前在本地与服务端已保存的个性化主题</span>
          </div>
          <div className={styles.badgeRow}>
            <Badge tone="info">{customThemes.length} 套自定义主题</Badge>
            <button
              type="button"
              className={styles.btnLink}
              onClick={() => props.openFabric('theme-studio')}
            >
              前往调色盘微调 →
            </button>
          </div>
        </div>

        {/* VSCode Theme Importer Card */}
        <div className={styles.importBlock}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className={styles.settingTitle}>📥 VSCode 主题一键映射转换</span>
            <Badge tone="info">生态互通</Badge>
          </div>
          <span className={styles.settingDesc}>
            粘贴 VSCode 主题文件的 JSON (如 One Dark, Ayu, Dracula 的 theme.json)，自动映射为 DSH
            语义 Token
          </span>

          <input
            type="text"
            placeholder="自定义导入后的主题名称 (选填，留空使用 VSCode 原始名称)"
            className={styles.importTextarea}
            style={{ height: '36px', resize: 'none' }}
            value={vscodeThemeName}
            onChange={e => setVscodeThemeName(e.target.value)}
          />

          <textarea
            className={styles.importTextarea}
            rows={5}
            placeholder='粘贴 VSCode 主题 JSON 内容 (支持带注释的 JSONC)...'
            value={vscodeJson}
            onChange={e => {
              setVscodeJson(e.target.value)
              setVscodeError(null)
            }}
          />
          {vscodeError && <div className={styles.errorHint}>⚠️ {vscodeError}</div>}
          <div className={styles.importActions}>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={vscodeJson.trim() === ''}
              onClick={handleImportVSCodeTheme}
            >
              ✨ 一键解析并导入 VSCode 主题
            </button>
          </div>
        </div>

        {/* Export Native Theme JSON */}
        <div className={styles.settingRow}>
          <div className={styles.settingLabelGroup}>
            <span className={styles.settingTitle}>导出原生主题资产 (JSON)</span>
            <span className={styles.settingDesc}>将当前主题与所有自定义主题打包导出</span>
          </div>
          <button type="button" className={styles.btnSecondary} onClick={handleExportAll}>
            复制主题 JSON 到剪贴板
          </button>
        </div>

        {/* Import Native Theme JSON */}
        <div className={styles.importBlock}>
          <span className={styles.settingTitle}>导入外部原生主题 JSON</span>
          <textarea
            className={styles.importTextarea}
            rows={4}
            placeholder="粘贴 Theme Studio 导出的主题 JSON 对象或数组..."
            value={importJson}
            onChange={e => {
              setImportJson(e.target.value)
              setImportError(null)
            }}
          />
          {importError && <div className={styles.errorHint}>⚠️ {importError}</div>}
          <div className={styles.importActions}>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={importJson.trim() === ''}
              onClick={handleImport}
            >
              解析并导入主题
            </button>
          </div>
        </div>

        {/* Reset All */}
        <div className={styles.settingRow}>
          <div className={styles.settingLabelGroup}>
            <span className={styles.settingTitle}>重置全部主题与配置</span>
            <span className={styles.settingDesc}>
              清除所有自定义主题并恢复至 DeepSeek Classic 官方默认
            </span>
          </div>
          <button type="button" className={styles.btnDanger} onClick={handleReset}>
            重置为初始状态
          </button>
        </div>
      </Section>
    </div>
  )
}
