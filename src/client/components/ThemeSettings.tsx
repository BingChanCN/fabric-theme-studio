import { useState } from 'react'
import type { FabricSettingsProps } from 'fabric/client'
import { Badge, Section } from 'fabric/ui'
import type { ThemeDefinition } from '../../types.ts'
import { useThemeStudio } from '../theme-engine.ts'
import styles from '../styles/settings.module.css'

export function ThemeSettings(props: FabricSettingsProps) {
  const {
    activeTheme,
    allThemes,
    customThemes,
    autoFollowSystem,
    setAutoFollowSystem,
    setActiveTheme,
    saveCustomTheme,
    resetAll,
  } = useThemeStudio()
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  const handleSelectDefault = (id: string) => {
    setActiveTheme(id)
    props.notify('默认主题设置已更新', { tone: 'success' })
  }

  const handleToggleAutoFollow = (enabled: boolean) => {
    setAutoFollowSystem(enabled)
    props.notify(
      enabled ? '已启用系统外观自动跟随（暗色/亮色自动切换）' : '已停用系统外观自动跟随',
      { tone: 'info' },
    )
  }

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
    props.notify('已重置所有主题与自定义配置', { tone: 'warning' })
  }

  return (
    <div className={styles.settingsContainer}>
      <Section title="主题偏好设置 (Theme Studio Settings)" description="配置 Fabric Theme Studio 默认主题与导入导出">
        {/* Auto Follow System Preference */}
        <div className={styles.settingRow}>
          <div className={styles.settingLabelGroup}>
            <span className={styles.settingTitle}>跟随操作系统深浅色模式</span>
            <span className={styles.settingDesc}>
              基于 Fabric Theme Bridge 自动监听 OS prefers-color-scheme，在深浅色间自动流转
            </span>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
            <input
              type="checkbox"
              checked={autoFollowSystem}
              onChange={e => handleToggleAutoFollow(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--dsw-alias-brand-primary)' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--dsw-alias-label-primary)' }}>
              {autoFollowSystem ? '已开启' : '已关闭'}
            </span>
          </label>
        </div>

        {/* Default Startup Theme */}
        <div className={styles.settingRow}>
          <div className={styles.settingLabelGroup}>
            <span className={styles.settingTitle}>默认启动主题</span>
            <span className={styles.settingDesc}>选择 DSH 启动时自动载入的色彩配置</span>
          </div>
          <select
            className={styles.settingSelect}
            value={activeTheme.id}
            disabled={autoFollowSystem}
            onChange={e => handleSelectDefault(e.target.value)}
          >
            {allThemes.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isBuiltin ? '(官方内置)' : '(自定义)'}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Themes Counter */}
        <div className={styles.settingRow}>
          <div className={styles.settingLabelGroup}>
            <span className={styles.settingTitle}>自定义主题数量</span>
            <span className={styles.settingDesc}>当前在本地与服务端已保存的个性化主题</span>
          </div>
          <div className={styles.badgeRow}>
            <Badge tone="info">{customThemes.length} 套自定义主题</Badge>
            <button
              type="button"
              className={styles.btnLink}
              onClick={() => props.openFabric('theme-studio')}
            >
              前往创建 →
            </button>
          </div>
        </div>

        {/* Export JSON */}
        <div className={styles.settingRow}>
          <div className={styles.settingLabelGroup}>
            <span className={styles.settingTitle}>导出主题数据</span>
            <span className={styles.settingDesc}>将当前主题与自定义主题导出为 JSON</span>
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
