import { useState } from 'react'
import type { FabricSettingsProps } from 'fabric/client'
import type { JsonValue } from 'fabric/sdk'
import { Badge, Section, useFabricConfig } from 'fabric/ui'
import type { ThemeDefinition } from '../../types.ts'
import { useThemeStudio } from '../theme-engine.ts'
import styles from '../styles/settings.module.css'

export interface ThemeStudioConfigValues {
  readonly [key: string]: JsonValue
  defaultTheme?: string
  autoFollowSystem?: boolean
  hudEnabled?: boolean
  transitionSpeed?: number
}

export function ThemeSettings(props: FabricSettingsProps) {
  const {
    activeTheme,
    customThemes,
    saveCustomTheme,
    resetAll,
  } = useThemeStudio()
  const config = useFabricConfig<ThemeStudioConfigValues>('fabric-theme-studio')
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

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

  const handleReset = () => {
    resetAll()
    config.reset()
    props.notify('已重置所有主题与自定义配置', { tone: 'warning' })
  }

  return (
    <div className={styles.settingsContainer}>
      <Section
        title="Theme Studio 资产与高级管理"
        description="管理已保存的自定义主题库、导入导出完整设计资产"
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
            <Badge tone={config.status === 'ready' ? 'success' : config.status === 'saving' ? 'info' : 'neutral'}>
              {config.status === 'ready' ? '已同步 (Synced)' : config.status === 'saving' ? '保存中...' : '本地缓存'}
            </Badge>
            {config.dirty && <Badge tone="warning">有未保存改动</Badge>}
          </div>
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

        {/* Export JSON */}
        <div className={styles.settingRow}>
          <div className={styles.settingLabelGroup}>
            <span className={styles.settingTitle}>导出主题资产 (JSON)</span>
            <span className={styles.settingDesc}>将当前主题与所有自定义主题打包导出</span>
          </div>
          <button type="button" className={styles.btnSecondary} onClick={handleExportAll}>
            复制主题 JSON 到剪贴板
          </button>
        </div>

        {/* Import JSON */}
        <div className={styles.importBlock}>
          <span className={styles.settingTitle}>导入外部主题 JSON</span>
          <textarea
            className={styles.importTextarea}
            placeholder="在此粘贴包含 ThemeDefinition 的 JSON 代码..."
            value={importJson}
            onChange={e => setImportJson(e.target.value)}
            rows={4}
          />
          {importError && <span className={styles.errorHint}>{importError}</span>}
          <div className={styles.importActions}>
            <button
              type="button"
              disabled={importJson.trim() === ''}
              className={styles.btnPrimary}
              onClick={handleImport}
            >
              导入并应用
            </button>
            <button type="button" className={styles.btnDanger} onClick={handleReset}>
              清空自定义主题并重置
            </button>
          </div>
        </div>
      </Section>
    </div>
  )
}
