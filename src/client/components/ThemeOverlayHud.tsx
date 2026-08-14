import { useState } from 'react'
import type { FabricOverlayProps } from 'fabric/client'
import { Badge } from 'fabric/ui'
import { calculateContrastRatio, evaluateContrastGrade, useThemeStudio } from '../theme-engine.ts'
import styles from '../styles/hud.module.css'

export function ThemeOverlayHud(props: FabricOverlayProps) {
  const { activeTheme, presets, setActiveTheme } = useThemeStudio()
  const [isExpanded, setIsExpanded] = useState(false)

  const contrastRatio = calculateContrastRatio(
    activeTheme.tokens.background.bgBase,
    activeTheme.tokens.text.textPrimary,
  )
  const contrastGrade = evaluateContrastGrade(contrastRatio)

  const handleSelectTheme = (themeId: string, name: string) => {
    setActiveTheme(themeId)
    props.notify(`HUD 快速应用：「${name}」`, { tone: 'success', timeoutMs: 2500 })
  }

  const handleOpenWorkbench = () => {
    setIsExpanded(false)
    props.openFabric('theme-gallery')
  }

  return (
    <div className={styles.hudWrapper}>
      {isExpanded ? (
        <div
          className={styles.hudCard}
          style={{
            backgroundColor: activeTheme.tokens.background.bgElevated,
            borderColor: activeTheme.tokens.border.borderBase,
            boxShadow: activeTheme.tokens.shape.shadowLg,
          }}
        >
          <div className={styles.hudHeader}>
            <div className={styles.hudTitleGroup}>
              <span
                className={styles.hudIndicator}
                style={{ backgroundColor: activeTheme.tokens.brand.brandPrimary }}
              />
              <span className={styles.hudTitle} style={{ color: activeTheme.tokens.text.textPrimary }}>
                快速调色 HUD
              </span>
            </div>
            <button
              type="button"
              className={styles.hudCloseBtn}
              style={{ color: activeTheme.tokens.text.textTertiary }}
              onClick={() => setIsExpanded(false)}
            >
              ✕
            </button>
          </div>

          <div className={styles.hudStatusRow}>
            <span style={{ color: activeTheme.tokens.text.textSecondary, fontSize: '12px' }}>
              当前: {activeTheme.name}
            </span>
            <Badge tone={contrastGrade === 'AAA' ? 'success' : contrastGrade === 'AA' ? 'info' : 'warning'}>
              {contrastGrade} ({contrastRatio}:1)
            </Badge>
          </div>

          <div className={styles.presetList}>
            {presets.slice(0, 6).map(preset => {
              const isCurrent = preset.id === activeTheme.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`${styles.presetItem} ${isCurrent ? styles.presetItemActive : ''}`}
                  style={{
                    backgroundColor: isCurrent ? preset.tokens.brand.brandSurface : preset.tokens.background.bgSurface,
                    borderColor: isCurrent ? preset.tokens.brand.brandPrimary : preset.tokens.border.borderSubtle,
                  }}
                  onClick={() => handleSelectTheme(preset.id, preset.name)}
                >
                  <span
                    className={styles.itemDot}
                    style={{ backgroundColor: preset.tokens.brand.brandPrimary }}
                  />
                  <span
                    className={styles.itemName}
                    style={{ color: isCurrent ? preset.tokens.brand.brandText : preset.tokens.text.textPrimary }}
                  >
                    {preset.name}
                  </span>
                  {isCurrent && <span className={styles.itemCheck}>✓</span>}
                </button>
              )
            })}
          </div>

          <div className={styles.hudFooter}>
            <button
              type="button"
              className={styles.btnOpenStudio}
              style={{
                backgroundColor: activeTheme.tokens.brand.brandPrimary,
                color: '#ffffff',
              }}
              onClick={handleOpenWorkbench}
            >
              打开主题工坊与微调 →
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.hudPill}
          style={{
            backgroundColor: activeTheme.tokens.background.bgElevated,
            borderColor: activeTheme.tokens.brand.brandPrimary,
            boxShadow: activeTheme.tokens.shape.shadowMd,
          }}
          onClick={() => setIsExpanded(true)}
          title="点击打开主题快速浮层 HUD"
        >
          <span
            className={styles.hudDot}
            style={{
              backgroundColor: activeTheme.tokens.brand.brandPrimary,
              boxShadow: `0 0 6px ${activeTheme.tokens.brand.brandPrimary}`,
            }}
          />
          <span className={styles.hudPillText} style={{ color: activeTheme.tokens.text.textPrimary }}>
            {activeTheme.name}
          </span>
        </button>
      )}
    </div>
  )
}
