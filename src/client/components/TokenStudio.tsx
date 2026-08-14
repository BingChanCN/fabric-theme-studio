import { useEffect, useState } from 'react'
import type { FabricPageProps } from 'fabric/client'
import { Badge, Modal, Page, PageHeader, Popover, Section, ToolbarButton } from 'fabric/ui'
import type { ThemeCategory, ThemeDefinition, ThemeTokens } from '../../types.ts'
import { calculateContrastRatio, evaluateContrastGrade, useThemeStudio } from '../theme-engine.ts'
import styles from '../styles/studio.module.css'

export function TokenStudio(props: FabricPageProps) {
  const { activeTheme, saveCustomTheme, applyCustomThemeDraft, resetAll } = useThemeStudio()
  const [draft, setDraft] = useState<ThemeDefinition>(() => JSON.parse(JSON.stringify(activeTheme)))
  const [saveName, setSaveName] = useState<string>('')
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false)

  // Sync draft when active theme changes from outside
  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(activeTheme)))
  }, [activeTheme.id])

  const contrastRatio = calculateContrastRatio(draft.tokens.background.bgBase, draft.tokens.text.textPrimary)
  const contrastGrade = evaluateContrastGrade(contrastRatio)

  const updateToken = <K extends keyof ThemeTokens>(group: K, key: keyof ThemeTokens[K], value: string) => {
    setDraft(prev => {
      const next: ThemeDefinition = {
        ...prev,
        tokens: {
          ...prev.tokens,
          [group]: {
            ...prev.tokens[group],
            [key]: value,
          },
        },
      }
      applyCustomThemeDraft(next)
      return next
    })
  }

  const handleSave = () => {
    const finalName = saveName.trim() === '' ? `${draft.name} (Custom)` : saveName.trim()
    const id = `custom-${Date.now()}`
    const themeToSave: ThemeDefinition = {
      ...draft,
      id,
      name: finalName,
      isBuiltin: false,
      author: 'User',
      description: `基于 ${draft.name} 定制的个性化主题`,
      contrastRating: contrastGrade,
    }
    saveCustomTheme(themeToSave)
    setShowSaveModal(false)
    setSaveName('')
    props.notify(`自定义主题「${finalName}」已成功保存并应用`, { tone: 'success' })
  }

  const handleCopyCss = () => {
    const cssVars = Object.entries(draft.tokens.background)
      .map(([k, v]) => `  --dsw-alias-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`)
      .concat(
        Object.entries(draft.tokens.text).map(
          ([k, v]) => `  --dsw-alias-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`,
        ),
      )
      .concat(
        Object.entries(draft.tokens.brand).map(
          ([k, v]) => `  --dsw-alias-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`,
        ),
      )
      .concat(
        Object.entries(draft.tokens.status).map(
          ([k, v]) => `  --dsw-alias-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`,
        ),
      )
      .join('\n')

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(`:root, body {\n${cssVars}\n}`)
      props.notify('CSS 变量已复制到剪贴板', { tone: 'info' })
    }
  }

  const handleResetDraft = () => {
    const original = JSON.parse(JSON.stringify(activeTheme)) as ThemeDefinition
    setDraft(original)
    applyCustomThemeDraft(original)
    props.notify('已重置当前未保存的微调', { tone: 'info' })
  }

  return (
    <Page className={styles.studioPage ?? ''}>
      <PageHeader
        title="调色盘 (Token Studio)"
        description="交互式调节 DSH 与 Fabric 语义设计变量，实时观察全局渲染变化"
        actions={
          <div className={styles.headerActions}>
            <ToolbarButton
              label="复制 CSS"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              }
              onClick={handleCopyCss}
            />
            <ToolbarButton
              label="重置微调"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              }
              onClick={handleResetDraft}
            />
            <button
              type="button"
              className={styles.btnSavePrimary}
              onClick={() => setShowSaveModal(true)}
            >
              另存为新主题
            </button>
          </div>
        }
      />

      {/* Realtime Live Preview Card */}
      <Section title="实时预览看板" description="微调 Token 会立即在此看板以及整个宿主界面中实时渲染生效">
        <div
          className={styles.previewCard}
          style={{
            backgroundColor: draft.tokens.background.bgElevated,
            borderColor: draft.tokens.border.borderBase,
            borderRadius: draft.tokens.shape.radiusMd,
            boxShadow: draft.tokens.shape.shadowMd,
          }}
        >
          <div className={styles.previewCardHeader}>
            <div className={styles.previewCardTitleGroup}>
              <span
                className={styles.previewIndicator}
                style={{ backgroundColor: draft.tokens.brand.brandPrimary }}
              />
              <span
                className={styles.previewTitle}
                style={{ color: draft.tokens.text.textPrimary }}
              >
                {draft.name} (草稿模式)
              </span>
            </div>
            <div className={styles.previewBadges}>
              <Badge tone={contrastGrade === 'AAA' ? 'success' : contrastGrade === 'AA' ? 'info' : 'warning'}>
                WCAG {contrastGrade} ({contrastRatio}:1)
              </Badge>
              <Badge tone="neutral">{draft.category.toUpperCase()}</Badge>
            </div>
          </div>

          <p
            className={styles.previewDesc}
            style={{ color: draft.tokens.text.textSecondary }}
          >
            {draft.description}
          </p>

          <div className={styles.previewControls}>
            <button
              type="button"
              className={styles.previewBtnPrimary}
              style={{
                backgroundColor: draft.tokens.brand.brandPrimary,
                borderRadius: draft.tokens.shape.radiusSm,
                color: '#ffffff',
              }}
            >
              主按钮 (Primary)
            </button>
            <button
              type="button"
              className={styles.previewBtnSurface}
              style={{
                backgroundColor: draft.tokens.brand.brandSurface,
                color: draft.tokens.brand.brandText,
                borderColor: draft.tokens.brand.brandPrimary,
                borderRadius: draft.tokens.shape.radiusSm,
              }}
            >
              浅色强调 (Surface)
            </button>
            <span
              className={styles.previewTag}
              style={{
                backgroundColor: draft.tokens.background.bgSubtle,
                color: draft.tokens.text.textTertiary,
                borderRadius: draft.tokens.shape.radiusSm,
              }}
            >
              Subtle Tag
            </span>
          </div>
        </div>
      </Section>

      {/* Token Groups Editor Grid */}
      <div className={styles.editorGrid}>
        {/* Background Group */}
        <Section title="背景与层级 (Backgrounds)" description="控制窗口、卡片、侧边栏及深陷容器底色">
          <div className={styles.tokenGroup}>
            <TokenInput
              label="bgBase (应用主背景)"
              value={draft.tokens.background.bgBase}
              onChange={v => updateToken('background', 'bgBase', v)}
            />
            <TokenInput
              label="bgElevated (卡片/弹窗抬升)"
              value={draft.tokens.background.bgElevated}
              onChange={v => updateToken('background', 'bgElevated', v)}
            />
            <TokenInput
              label="bgSubtle (次级容器背景)"
              value={draft.tokens.background.bgSubtle}
              onChange={v => updateToken('background', 'bgSubtle', v)}
            />
            <TokenInput
              label="bgSurface (悬浮激活背景)"
              value={draft.tokens.background.bgSurface}
              onChange={v => updateToken('background', 'bgSurface', v)}
            />
            <TokenInput
              label="bgSunken (输入框/凹陷底色)"
              value={draft.tokens.background.bgSunken}
              onChange={v => updateToken('background', 'bgSunken', v)}
            />
          </div>
        </Section>

        {/* Text Group */}
        <Section title="文字阶梯 (Typography)" description="各级文字层级的颜色与明暗对比">
          <div className={styles.tokenGroup}>
            <TokenInput
              label="textPrimary (主要文本)"
              value={draft.tokens.text.textPrimary}
              onChange={v => updateToken('text', 'textPrimary', v)}
            />
            <TokenInput
              label="textSecondary (次要副标题)"
              value={draft.tokens.text.textSecondary}
              onChange={v => updateToken('text', 'textSecondary', v)}
            />
            <TokenInput
              label="textTertiary (弱化说明文字)"
              value={draft.tokens.text.textTertiary}
              onChange={v => updateToken('text', 'textTertiary', v)}
            />
            <TokenInput
              label="textDisabled (禁用状态文字)"
              value={draft.tokens.text.textDisabled}
              onChange={v => updateToken('text', 'textDisabled', v)}
            />
          </div>
        </Section>

        {/* Brand Group */}
        <Section title="品牌与焦点色 (Brand & Focus)" description="主交互控件、高亮标识及光标选中色">
          <div className={styles.tokenGroup}>
            <TokenInput
              label="brandPrimary (品牌主色)"
              value={draft.tokens.brand.brandPrimary}
              onChange={v => updateToken('brand', 'brandPrimary', v)}
            />
            <TokenInput
              label="brandHover (主色悬停态)"
              value={draft.tokens.brand.brandHover}
              onChange={v => updateToken('brand', 'brandHover', v)}
            />
            <TokenInput
              label="brandActive (主色激活态)"
              value={draft.tokens.brand.brandActive}
              onChange={v => updateToken('brand', 'brandActive', v)}
            />
            <TokenInput
              label="brandSurface (浅色强调表面)"
              value={draft.tokens.brand.brandSurface}
              onChange={v => updateToken('brand', 'brandSurface', v)}
            />
            <TokenInput
              label="brandText (强调文本色)"
              value={draft.tokens.brand.brandText}
              onChange={v => updateToken('brand', 'brandText', v)}
            />
          </div>
        </Section>

        {/* Border & Status Group */}
        <Section title="边框与状态色 (Borders & Status)" description="分割线与语义状态反馈色">
          <div className={styles.tokenGroup}>
            <TokenInput
              label="borderBase (标准边框)"
              value={draft.tokens.border.borderBase}
              onChange={v => updateToken('border', 'borderBase', v)}
            />
            <TokenInput
              label="borderSubtle (微弱分割线)"
              value={draft.tokens.border.borderSubtle}
              onChange={v => updateToken('border', 'borderSubtle', v)}
            />
            <TokenInput
              label="borderFocus (聚焦边框)"
              value={draft.tokens.border.borderFocus}
              onChange={v => updateToken('border', 'borderFocus', v)}
            />
            <TokenInput
              label="status.success (成功绿)"
              value={draft.tokens.status.success}
              onChange={v => updateToken('status', 'success', v)}
            />
            <TokenInput
              label="status.warning (警告橙)"
              value={draft.tokens.status.warning}
              onChange={v => updateToken('status', 'warning', v)}
            />
            <TokenInput
              label="status.error (危险红)"
              value={draft.tokens.status.error}
              onChange={v => updateToken('status', 'error', v)}
            />
          </div>
        </Section>
      </div>

      {/* Modal using Fabric v0.2.0 Modal primitive */}
      <Modal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="另存为自定义主题"
        description="将当前微调的所有 Token 打包存入本地库，可随时在画廊中切换使用"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className={styles.modalBtnCancel}
              onClick={() => setShowSaveModal(false)}
            >
              取消
            </button>
            <button
              type="button"
              className={styles.modalBtnConfirm}
              onClick={handleSave}
            >
              确认保存
            </button>
          </div>
        }
      >
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>主题名称</label>
          <input
            type="text"
            placeholder="输入自定义主题名称..."
            className={styles.modalInput}
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            autoFocus
          />
        </div>
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>当前基线主题</label>
          <div style={{ color: 'var(--dsw-alias-label-secondary)', fontSize: '13px' }}>
            {draft.name} ({draft.category})
          </div>
        </div>
      </Modal>
    </Page>
  )
}

function TokenInput(props: { label: string; value: string; onChange: (val: string) => void }) {
  return (
    <div className={styles.tokenRow}>
      <label className={styles.tokenLabel}>{props.label}</label>
      <div className={styles.tokenInputGroup}>
        <input
          type="text"
          className={styles.tokenInput}
          value={props.value}
          onChange={e => props.onChange(e.target.value)}
        />
        <input
          type="color"
          className={styles.colorPickerNative}
          title="选择颜色"
          value={parseRgbToHex(props.value)}
          onChange={e => props.onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

function parseRgbToHex(color: string): string {
  const trimmed = color.trim().toLowerCase()
  if (trimmed.startsWith('#')) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
    }
    if (trimmed.length === 7) return trimmed
  }
  const match = trimmed.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (match) {
    const r = Number.parseInt(match[1]!, 10).toString(16).padStart(2, '0')
    const g = Number.parseInt(match[2]!, 10).toString(16).padStart(2, '0')
    const b = Number.parseInt(match[3]!, 10).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }
  return '#000000'
}
