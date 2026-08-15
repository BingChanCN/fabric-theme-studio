import React, { useEffect, useRef, useState } from 'react'
import { Badge, Modal, Page, PageHeader, Section, ToolbarButton } from '@dsh-do/fabric/ui'
import type { FabricPageProps } from '@dsh-do/fabric/client'
import {
  deriveThemeFromSeed,
  extractColorsFromImageData,
} from '../../color-science.ts'
import {
  calculateContrastRatio,
  evaluateContrastGrade,
  useThemeStudio,
} from '../theme-engine.ts'
import styles from '../styles/studio.module.css'
import type {
  BackgroundEffect,
  EffectSpeed,
  ThemeDefinition,
  ThemeMaterial,
  ThemeWallpaper,
  WallpaperFit,
} from '../../types.ts'

export type TokenStudioProps = FabricPageProps

type HarmonyMode =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'split-complementary'
  | 'monochromatic'

/** Token Studio Component: Interactive theme designer and real-time customizer. */
export const TokenStudio: React.FC<TokenStudioProps> = props => {
  const { activeTheme, activeThemeId, saveCustomTheme, applyCustomThemeDraft, uploadWallpaper } = useThemeStudio()

  const [draft, setDraft] = useState<ThemeDefinition>(() =>
    JSON.parse(JSON.stringify(activeTheme)) as ThemeDefinition,
  )

  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(activeTheme)) as ThemeDefinition)
    // Only resync when the selected theme identity changes. Draft edits keep the same id.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeTheme object updates on every draft keystroke
  }, [activeThemeId])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')

  // Smart Color Science State
  const [seedColor, setSeedColor] = useState('#4176e6')
  const [harmonyMode, setHarmonyMode] = useState<HarmonyMode>('complementary')
  const [paletteMode, setPaletteMode] = useState<'dark' | 'light'>('dark')
  const [extractedColors, setExtractedColors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wallpaperInputRef = useRef<HTMLInputElement>(null)

  const contrastRatio = calculateContrastRatio(
    draft.tokens.background.bgBase,
    draft.tokens.text.textPrimary,
  )
  const contrastGrade = evaluateContrastGrade(contrastRatio)

  const updateToken = (group: keyof typeof draft.tokens, key: string, value: string) => {
    const nextTokens = {
      ...draft.tokens,
      [group]: {
        ...(draft.tokens[group] as unknown as Record<string, string>),
        [key]: value,
      },
    }
    const next: ThemeDefinition = {
      ...draft,
      tokens: nextTokens,
    }
    setDraft(next)
    applyCustomThemeDraft(next)
  }

  const updateMaterial = (key: keyof ThemeMaterial, value: unknown) => {
    const nextMaterial: ThemeMaterial = {
      ...draft.material,
      [key]: value,
    }
    const next: ThemeDefinition = {
      ...draft,
      material: nextMaterial,
    }
    setDraft(next)
    applyCustomThemeDraft(next)
  }

  const updateWallpaper = (key: keyof ThemeWallpaper, value: unknown) => {
    const currentWallpaper: ThemeWallpaper = draft.material?.wallpaper ?? {
      enabled: true,
      dim: 0.65,
      fit: 'cover',
      blur: 0,
    }
    const nextWallpaper: ThemeWallpaper = {
      ...currentWallpaper,
      [key]: value,
    }
    const nextMaterial: ThemeMaterial = {
      ...draft.material,
      wallpaper: nextWallpaper,
    }
    const next: ThemeDefinition = {
      ...draft,
      material: nextMaterial,
    }
    setDraft(next)
    applyCustomThemeDraft(next)
  }

  const handleGenerateSmartPalette = () => {
    const derived = deriveThemeFromSeed(seedColor, {
      mode: paletteMode,
      harmony: harmonyMode,
      name: `${draft.name} (${paletteMode === 'dark' ? 'Dark' : 'Light'})`,
    })

    const newTokens = {
      background: {
        bgBase: derived.tokens['--dsw-alias-bg-base'] ?? '#121218',
        bgElevated: derived.tokens['--dsw-alias-bg-layer-1'] ?? '#1a1a24',
        bgSubtle: derived.tokens['--dsw-alias-bg-layer-2'] ?? '#222230',
        bgSurface: derived.tokens['--dsw-alias-bg-layer-3'] ?? '#2a2a3c',
        bgSunken: derived.tokens['--dsw-color-bg-sunken'] ?? '#0e0e14',
      },
      text: {
        textPrimary: derived.tokens['--dsw-alias-label-primary'] ?? '#ffffff',
        textSecondary: derived.tokens['--dsw-alias-label-secondary'] ?? '#a0a0b0',
        textTertiary: derived.tokens['--dsw-alias-label-tertiary'] ?? '#707080',
        textDisabled: derived.tokens['--dsw-alias-label-caption'] ?? '#505060',
      },
      border: {
        borderBase: derived.tokens['--dsw-alias-border-l2'] ?? 'rgba(255, 255, 255, 0.15)',
        borderSubtle: derived.tokens['--dsw-alias-border-l1'] ?? 'rgba(255, 255, 255, 0.08)',
        borderFocus: derived.tokens['--dsw-alias-brand-primary'] ?? seedColor,
      },
      brand: {
        brandPrimary: derived.tokens['--dsw-alias-brand-primary'] ?? seedColor,
        brandHover: derived.tokens['--dsw-alias-brand-hover'] ?? seedColor,
        brandActive: derived.tokens['--dsw-alias-brand-active'] ?? seedColor,
        brandSurface: derived.tokens['--dsw-alias-brand-subtle'] ?? `${seedColor}33`,
        brandText: derived.tokens['--dsw-alias-brand-primary'] ?? seedColor,
      },
      accent: {
        accentPrimary: derived.tokens['--dsw-alias-brand-primary'] ?? seedColor,
        accentHover: derived.tokens['--dsw-alias-brand-hover'] ?? seedColor,
        accentSurface: `${seedColor}26`,
      },
      status: {
        success: derived.tokens['--dsw-alias-state-success'] ?? '#34d399',
        warning: derived.tokens['--dsw-alias-state-warning'] ?? '#fbbf24',
        error: derived.tokens['--dsw-alias-state-danger'] ?? '#f87171',
        info: derived.tokens['--dsw-alias-state-info'] ?? seedColor,
      },
      shape: draft.tokens.shape,
    }

    const next: ThemeDefinition = {
      ...draft,
      name: derived.name,
      category: paletteMode,
      tokens: newTokens,
    }

    setDraft(next)
    applyCustomThemeDraft(next)
    props.notify(`✨ 已基于种子色「${seedColor}」自动推导出全套和声色彩`, { tone: 'success' })
  }

  const handleImageFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 200
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const colors = extractColorsFromImageData(imgData, 6)
          setExtractedColors(colors)
          if (colors[0]) {
            setSeedColor(colors[0])
          }
          props.notify(`🖼️ 成功从图片提取出 ${colors.length} 个代表色块`, { tone: 'info' })
        }
      }
      if (typeof e.target?.result === 'string') {
        img.src = e.target.result
      }
    }
    reader.readAsDataURL(file)
  }

  const handleWallpaperUpload = async (file: File) => {
    const reader = new FileReader()
    reader.onload = async e => {
      const dataUrl = e.target?.result
      if (typeof dataUrl !== 'string') return

      let targetUrl = dataUrl
      try {
        targetUrl = await uploadWallpaper(dataUrl, draft.id)
      } catch {
        // Keep the data URL so the wallpaper still paints if the host upload fails.
      }

      // Also sample colors for instant theme extraction
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 200
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const colors = extractColorsFromImageData(imgData, 6)
          setExtractedColors(colors)
          if (colors[0]) {
            setSeedColor(colors[0])
          }
        }
      }
      img.src = dataUrl

      const nextWallpaper: ThemeWallpaper = {
        enabled: true,
        url: targetUrl,
        fit: draft.material?.wallpaper?.fit ?? 'cover',
        dim: draft.material?.wallpaper?.dim ?? 0.65,
        blur: draft.material?.wallpaper?.blur ?? 0,
        opacity: draft.material?.wallpaper?.opacity ?? 1,
      }

      const nextMaterial: ThemeMaterial = {
        ...draft.material,
        wallpaper: nextWallpaper,
      }

      const next: ThemeDefinition = {
        ...draft,
        material: nextMaterial,
      }

      setDraft(next)
      applyCustomThemeDraft(next)
      props.notify('🖼️ 聊天背景壁纸已成功上传并应用到当前主题', { tone: 'success' })
    }
    reader.readAsDataURL(file)
  }

  const handleClearWallpaper = () => {
    const nextMaterial: ThemeMaterial = {
      ...draft.material,
      wallpaper: {
        enabled: false,
        url: '',
      },
    }
    const next: ThemeDefinition = {
      ...draft,
      material: nextMaterial,
    }
    setDraft(next)
    applyCustomThemeDraft(next)
    props.notify('已清除背景壁纸，恢复纯色底色', { tone: 'info' })
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

  const currentWallpaper = draft.material?.wallpaper

  return (
    <Page className={styles.studioPage ?? ''}>
      <PageHeader
        title="调色盘 (Token Studio)"
        description="交互式调节 DSH 与 Fabric 语义设计变量、聊天壁纸遮罩、材质质感与智能调色生成"
        actions={
          <div className={styles.headerActions}>
            <ToolbarButton
              label="复制 CSS"
              icon={
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              }
              onClick={handleCopyCss}
            />
            <ToolbarButton
              label="重置微调"
              icon={
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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

      {/* Smart Palette Generator & Image Extractor Section */}
      <Section
        title="✨ 智能和声生成器与图片取色"
        description="选定单色或上传图片，基于 Oklch 色彩和声模型一键推导出保证 WCAG 对比度的全套主题色盘"
      >
        <div className={styles.smartToolsContainer}>
          <div className={styles.smartToolRow}>
            <div className={styles.seedColorBox}>
              <span className={styles.seedLabel}>种子色:</span>
              <input
                type="color"
                className={styles.colorPickerNative}
                value={seedColor}
                onChange={e => setSeedColor(e.target.value)}
              />
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: 'var(--fabric-content-primary)',
                }}
              >
                {seedColor.toUpperCase()}
              </span>
            </div>

            <div className={styles.harmonyPills}>
              {[
                { id: 'complementary', label: '互补和声' },
                { id: 'analogous', label: '类似色' },
                { id: 'triadic', label: '三色系' },
                { id: 'split-complementary', label: '分裂互补' },
                { id: 'monochromatic', label: '单色系' },
              ].map(h => (
                <button
                  key={h.id}
                  type="button"
                  className={`${styles.pillBtn} ${harmonyMode === h.id ? styles.pillBtnActive : ''}`}
                  onClick={() => setHarmonyMode(h.id as HarmonyMode)}
                >
                  {h.label}
                </button>
              ))}
            </div>

            <div className={styles.harmonyPills}>
              <button
                type="button"
                className={`${styles.pillBtn} ${paletteMode === 'dark' ? styles.pillBtnActive : ''}`}
                onClick={() => setPaletteMode('dark')}
              >
                🌙 深色模式
              </button>
              <button
                type="button"
                className={`${styles.pillBtn} ${paletteMode === 'light' ? styles.pillBtnActive : ''}`}
                onClick={() => setPaletteMode('light')}
              >
                ☀️ 浅色模式
              </button>
            </div>

            <button
              type="button"
              className={styles.btnGenerate}
              onClick={handleGenerateSmartPalette}
            >
              <span>✨ 一键推导全套色彩</span>
            </button>
          </div>

          {/* Image Upload & Palette Extraction Dropzone */}
          <div className={styles.imageDropZone}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleImageFile(file)
                }}
              />
              <button
                type="button"
                className={styles.imageUploadBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                🖼️ 上传参考图片/壁纸
              </button>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--fabric-content-secondary)',
                }}
              >
                自动采样图片关键色块并作为调色种子
              </span>
            </div>

            {extractedColors.length > 0 && (
              <div className={styles.extractedSwatches}>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--fabric-content-secondary)',
                  }}
                >
                  提取色板:
                </span>
                {extractedColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    title={`点击使用 ${color} 作为种子色`}
                    className={styles.colorSwatchBtn}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setSeedColor(color)
                      props.notify(`已将种子色设为 ${color}`, { tone: 'info' })
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Materials, Ambient Dynamics & Wallpaper Configuration */}
      <Section
        title="🪟 聊天壁纸、材质质感与动态背景 (Materials & Wallpaper)"
        description="配置聊天背景自定义壁纸、对话遮罩压暗、亚克力毛玻璃与纯 CSS 硬件加速动态背景"
      >
        <div className={styles.materialGrid}>
          {/* Chat Wallpaper Customizer */}
          <div className={styles.materialCard}>
            <div className={styles.materialTitle}>
              <span>🖼️ 聊天背景壁纸与遮罩</span>
              {currentWallpaper?.enabled && currentWallpaper.url && (
                <Badge tone="success">壁纸生效中</Badge>
              )}
            </div>

            <div className={styles.materialControlRow}>
              <span className={styles.materialLabel}>启用背景壁纸</span>
              <input
                type="checkbox"
                className={styles.checkboxInput}
                checked={currentWallpaper?.enabled ?? false}
                onChange={e => updateWallpaper('enabled', e.target.checked)}
              />
            </div>

            <div className={styles.materialControlRow}>
              <span className={styles.materialLabel}>壁纸图片</span>
              <div className={styles.wallpaperActions}>
                <input
                  ref={wallpaperInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) void handleWallpaperUpload(file)
                  }}
                />
                <button
                  type="button"
                  className={styles.wallpaperActionBtn}
                  onClick={() => wallpaperInputRef.current?.click()}
                >
                  📁 上传本地壁纸
                </button>
                {currentWallpaper?.url && (
                  <button
                    type="button"
                    className={styles.wallpaperDangerBtn}
                    onClick={handleClearWallpaper}
                  >
                    🗑️ 清除
                  </button>
                )}
              </div>
            </div>

            {currentWallpaper?.url && (
              <div className={styles.materialControlRow}>
                <span className={styles.materialLabel}>壁纸地址</span>
                <input
                  type="text"
                  className={styles.wallpaperUrlInput}
                  value={currentWallpaper.url}
                  placeholder="https://... 或本地文件路径"
                  onChange={e => updateWallpaper('url', e.target.value)}
                />
              </div>
            )}

            <div className={styles.materialControlRow}>
              <span className={styles.materialLabel}>平铺/适配方式</span>
              <select
                className={styles.selectInput}
                value={currentWallpaper?.fit ?? 'cover'}
                onChange={e => updateWallpaper('fit', e.target.value as WallpaperFit)}
              >
                <option value="cover">等比铺满 (Cover)</option>
                <option value="contain">完整居中 (Contain)</option>
                <option value="tile">阵列平铺 (Tile)</option>
                <option value="center">原始居中 (Center)</option>
              </select>
            </div>

            <div className={styles.materialControlRow}>
              <span className={styles.materialLabel}>
                对话压暗遮罩 ({Math.round((currentWallpaper?.dim ?? 0.65) * 100)}%)
              </span>
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                className={styles.sliderInput}
                value={currentWallpaper?.dim ?? 0.65}
                onChange={e => updateWallpaper('dim', Number.parseFloat(e.target.value))}
              />
            </div>

            <div className={styles.materialControlRow}>
              <span className={styles.materialLabel}>
                背景虚化模糊 ({currentWallpaper?.blur ?? 0}px)
              </span>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                className={styles.sliderInput}
                value={currentWallpaper?.blur ?? 0}
                onChange={e => updateWallpaper('blur', Number.parseInt(e.target.value, 10))}
              />
            </div>

            {currentWallpaper?.url && extractedColors.length > 0 && (
              <div style={{ paddingTop: '4px' }}>
                <button
                  type="button"
                  className={styles.wallpaperActionBtn}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '6px' }}
                  onClick={handleGenerateSmartPalette}
                >
                  ✨ 基于当前壁纸提取色自动生成配套主题
                </button>
              </div>
            )}
          </div>

          {/* Material Textures */}
          <div className={styles.materialCard}>
            <div className={styles.materialTitle}>
              <span>✨ 物理材质与表面光效</span>
            </div>

            <div className={styles.materialControlRow}>
              <span className={styles.materialLabel}>毛玻璃半透明 (Acrylic Glass)</span>
              <input
                type="checkbox"
                className={styles.checkboxInput}
                checked={draft.material?.acrylic ?? false}
                onChange={e => updateMaterial('acrylic', e.target.checked)}
              />
            </div>

            <div className={styles.materialControlRow}>
              <span className={styles.materialLabel}>物理倒角高光 (Chamfer Edge)</span>
              <input
                type="checkbox"
                className={styles.checkboxInput}
                checked={draft.material?.edgeHighlight ?? false}
                onChange={e => updateMaterial('edgeHighlight', e.target.checked)}
              />
            </div>

            <div className={styles.materialControlRow}>
              <span className={styles.materialLabel}>
                胶片微噪点强度 (
                {Math.round((draft.material?.noiseOpacity ?? 0) * 100)}%)
              </span>
              <input
                type="range"
                min="0"
                max="0.08"
                step="0.005"
                className={styles.sliderInput}
                value={draft.material?.noiseOpacity ?? 0}
                onChange={e => updateMaterial('noiseOpacity', Number.parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* Dynamic Ambient Backgrounds */}
          <div className={styles.materialCard}>
            <div className={styles.materialTitle}>
              <span>🌌 动态氛围光效 (纯 CSS 硬件加速)</span>
            </div>

            <div className={styles.materialControlRow}>
              <span className={styles.materialLabel}>动态光效形态</span>
              <select
                className={styles.selectInput}
                value={draft.material?.backgroundEffect ?? 'none'}
                onChange={e =>
                  updateMaterial('backgroundEffect', e.target.value as BackgroundEffect)
                }
              >
                <option value="none">无动态特效 (None)</option>
                <option value="aurora">极光流光 (Aurora Glow)</option>
                <option value="cyber-grid">赛博网格 (Cyber Grid)</option>
                <option value="mesh-gradient">弥散渐变 (Mesh Pulse)</option>
                <option value="spotlight">聚光光晕 (Spotlight)</option>
              </select>
            </div>

            <div className={styles.materialControlRow}>
              <span className={styles.materialLabel}>动画流动速率</span>
              <select
                className={styles.selectInput}
                value={draft.material?.effectSpeed ?? 'normal'}
                onChange={e => updateMaterial('effectSpeed', e.target.value as EffectSpeed)}
              >
                <option value="slow">慢速悠然 (Slow - 30s)</option>
                <option value="normal">标准平缓 (Normal - 20s)</option>
                <option value="fast">灵动快速 (Fast - 10s)</option>
              </select>
            </div>

            <div className={styles.materialControlRow}>
              <span className={styles.materialLabel}>
                光晕强度 ({Math.round((draft.material?.effectIntensity ?? 0.5) * 100)}%)
              </span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                className={styles.sliderInput}
                value={draft.material?.effectIntensity ?? 0.5}
                onChange={e => updateMaterial('effectIntensity', Number.parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Realtime Live Preview Card */}
      <Section
        title="实时预览看板"
        description="微调 Token 会立即在此看板以及整个宿主界面中实时渲染生效"
      >
        <div
          className={styles.previewCard}
          style={{
            backgroundColor: draft.tokens.background.bgElevated,
            borderColor: draft.tokens.border.borderBase,
            borderRadius: draft.tokens.shape.radiusMd,
            boxShadow: draft.material?.edgeHighlight
              ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), var(--fabric-material-shadow)'
              : draft.tokens.shape.shadowMd,
          }}
        >
          <div className={styles.previewCardHeader}>
            <div className={styles.previewCardTitleGroup}>
              <span
                className={styles.previewIndicator}
                style={{ backgroundColor: draft.tokens.brand.brandPrimary }}
              />
              <span className={styles.previewTitle} style={{ color: draft.tokens.text.textPrimary }}>
                {draft.name} (草稿模式)
              </span>
            </div>
            <div className={styles.previewBadges}>
              <Badge
                tone={
                  contrastGrade === 'AAA'
                    ? 'success'
                    : contrastGrade === 'AA'
                      ? 'info'
                      : 'warning'
                }
              >
                WCAG {contrastGrade} ({contrastRatio}:1)
              </Badge>
              <Badge tone="neutral">{draft.category.toUpperCase()}</Badge>
              {draft.material?.wallpaper?.enabled && draft.material.wallpaper.url && (
                <Badge tone="info">🖼️ 自定义壁纸</Badge>
              )}
              {draft.material?.backgroundEffect && draft.material.backgroundEffect !== 'none' && (
                <Badge tone="info">动效: {draft.material.backgroundEffect}</Badge>
              )}
            </div>
          </div>

          <p className={styles.previewDesc} style={{ color: draft.tokens.text.textSecondary }}>
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
              标签 (Tag)
            </span>
          </div>
        </div>
      </Section>

      {/* Token Groups Editor Grid */}
      <Section title="语义 Token 变量微调" description="精确调节基础背景、层级、文字、边框与交互态">
        <div className={styles.editorGrid}>
          {/* Background Surfaces Group */}
          <div className={styles.tokenGroup}>
            <div className={styles.materialTitle}>
              <span>容器与背景 (Background Surfaces)</span>
            </div>

            <div className={styles.tokenRow}>
              <label htmlFor="token-bgBase" className={styles.tokenLabel}>
                --dsw-alias-bg-base (全局底色)
              </label>
              <div className={styles.tokenInputGroup}>
                <input
                  id="token-bgBase"
                  type="text"
                  className={styles.tokenInput}
                  value={draft.tokens.background.bgBase}
                  onChange={e => updateToken('background', 'bgBase', e.target.value)}
                />
                <input
                  type="color"
                  className={styles.colorPickerNative}
                  value={
                    draft.tokens.background.bgBase.startsWith('#')
                      ? draft.tokens.background.bgBase
                      : '#121218'
                  }
                  onChange={e => updateToken('background', 'bgBase', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.tokenRow}>
              <label htmlFor="token-bgElevated" className={styles.tokenLabel}>
                --dsw-alias-bg-layer-1 (一级悬浮/气泡)
              </label>
              <div className={styles.tokenInputGroup}>
                <input
                  id="token-bgElevated"
                  type="text"
                  className={styles.tokenInput}
                  value={draft.tokens.background.bgElevated}
                  onChange={e => updateToken('background', 'bgElevated', e.target.value)}
                />
                <input
                  type="color"
                  className={styles.colorPickerNative}
                  value={
                    draft.tokens.background.bgElevated.startsWith('#')
                      ? draft.tokens.background.bgElevated
                      : '#181824'
                  }
                  onChange={e => updateToken('background', 'bgElevated', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.tokenRow}>
              <label htmlFor="token-bgSubtle" className={styles.tokenLabel}>
                --dsw-alias-bg-layer-2 (次级面板)
              </label>
              <div className={styles.tokenInputGroup}>
                <input
                  id="token-bgSubtle"
                  type="text"
                  className={styles.tokenInput}
                  value={draft.tokens.background.bgSubtle}
                  onChange={e => updateToken('background', 'bgSubtle', e.target.value)}
                />
                <input
                  type="color"
                  className={styles.colorPickerNative}
                  value={
                    draft.tokens.background.bgSubtle.startsWith('#')
                      ? draft.tokens.background.bgSubtle
                      : '#202030'
                  }
                  onChange={e => updateToken('background', 'bgSubtle', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.tokenRow}>
              <label htmlFor="token-bgSurface" className={styles.tokenLabel}>
                --dsw-alias-bg-layer-3 (卡片与输入框)
              </label>
              <div className={styles.tokenInputGroup}>
                <input
                  id="token-bgSurface"
                  type="text"
                  className={styles.tokenInput}
                  value={draft.tokens.background.bgSurface}
                  onChange={e => updateToken('background', 'bgSurface', e.target.value)}
                />
                <input
                  type="color"
                  className={styles.colorPickerNative}
                  value={
                    draft.tokens.background.bgSurface.startsWith('#')
                      ? draft.tokens.background.bgSurface
                      : '#28283c'
                  }
                  onChange={e => updateToken('background', 'bgSurface', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Typography Text Group */}
          <div className={styles.tokenGroup}>
            <div className={styles.materialTitle}>
              <span>文字排版阶梯 (Typography)</span>
            </div>

            <div className={styles.tokenRow}>
              <label htmlFor="token-textPrimary" className={styles.tokenLabel}>
                --dsw-alias-label-primary (主要文本)
              </label>
              <div className={styles.tokenInputGroup}>
                <input
                  id="token-textPrimary"
                  type="text"
                  className={styles.tokenInput}
                  value={draft.tokens.text.textPrimary}
                  onChange={e => updateToken('text', 'textPrimary', e.target.value)}
                />
                <input
                  type="color"
                  className={styles.colorPickerNative}
                  value={
                    draft.tokens.text.textPrimary.startsWith('#')
                      ? draft.tokens.text.textPrimary
                      : '#ffffff'
                  }
                  onChange={e => updateToken('text', 'textPrimary', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.tokenRow}>
              <label htmlFor="token-textSecondary" className={styles.tokenLabel}>
                --dsw-alias-label-secondary (次要说明)
              </label>
              <div className={styles.tokenInputGroup}>
                <input
                  id="token-textSecondary"
                  type="text"
                  className={styles.tokenInput}
                  value={draft.tokens.text.textSecondary}
                  onChange={e => updateToken('text', 'textSecondary', e.target.value)}
                />
                <input
                  type="color"
                  className={styles.colorPickerNative}
                  value={
                    draft.tokens.text.textSecondary.startsWith('#')
                      ? draft.tokens.text.textSecondary
                      : '#a0a0b0'
                  }
                  onChange={e => updateToken('text', 'textSecondary', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.tokenRow}>
              <label htmlFor="token-textTertiary" className={styles.tokenLabel}>
                --dsw-alias-label-tertiary (弱化提示)
              </label>
              <div className={styles.tokenInputGroup}>
                <input
                  id="token-textTertiary"
                  type="text"
                  className={styles.tokenInput}
                  value={draft.tokens.text.textTertiary}
                  onChange={e => updateToken('text', 'textTertiary', e.target.value)}
                />
                <input
                  type="color"
                  className={styles.colorPickerNative}
                  value={
                    draft.tokens.text.textTertiary.startsWith('#')
                      ? draft.tokens.text.textTertiary
                      : '#707080'
                  }
                  onChange={e => updateToken('text', 'textTertiary', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Brand & Accent Group */}
          <div className={styles.tokenGroup}>
            <div className={styles.materialTitle}>
              <span>品牌色与强调 (Brand & Accent)</span>
            </div>

            <div className={styles.tokenRow}>
              <label htmlFor="token-brandPrimary" className={styles.tokenLabel}>
                --dsw-alias-brand-primary (主品牌色)
              </label>
              <div className={styles.tokenInputGroup}>
                <input
                  id="token-brandPrimary"
                  type="text"
                  className={styles.tokenInput}
                  value={draft.tokens.brand.brandPrimary}
                  onChange={e => updateToken('brand', 'brandPrimary', e.target.value)}
                />
                <input
                  type="color"
                  className={styles.colorPickerNative}
                  value={
                    draft.tokens.brand.brandPrimary.startsWith('#')
                      ? draft.tokens.brand.brandPrimary
                      : '#4176e6'
                  }
                  onChange={e => updateToken('brand', 'brandPrimary', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.tokenRow}>
              <label htmlFor="token-brandHover" className={styles.tokenLabel}>
                --dsw-alias-brand-hover (悬停交互)
              </label>
              <div className={styles.tokenInputGroup}>
                <input
                  id="token-brandHover"
                  type="text"
                  className={styles.tokenInput}
                  value={draft.tokens.brand.brandHover}
                  onChange={e => updateToken('brand', 'brandHover', e.target.value)}
                />
                <input
                  type="color"
                  className={styles.colorPickerNative}
                  value={
                    draft.tokens.brand.brandHover.startsWith('#')
                      ? draft.tokens.brand.brandHover
                      : '#528bff'
                  }
                  onChange={e => updateToken('brand', 'brandHover', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.tokenRow}>
              <label htmlFor="token-borderBase" className={styles.tokenLabel}>
                --dsw-alias-border-l2 (基础边框)
              </label>
              <div className={styles.tokenInputGroup}>
                <input
                  id="token-borderBase"
                  type="text"
                  className={styles.tokenInput}
                  value={draft.tokens.border.borderBase}
                  onChange={e => updateToken('border', 'borderBase', e.target.value)}
                />
                <input
                  type="color"
                  className={styles.colorPickerNative}
                  value={
                    draft.tokens.border.borderBase.startsWith('#')
                      ? draft.tokens.border.borderBase
                      : '#333340'
                  }
                  onChange={e => updateToken('border', 'borderBase', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Save Custom Theme Modal Dialog */}
      <Modal
        open={showSaveModal}
        title="保存为自定义主题"
        onClose={() => setShowSaveModal(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className={styles.modalBtnCancel}
              onClick={() => setShowSaveModal(false)}
            >
              取消
            </button>
            <button type="button" className={styles.modalBtnConfirm} onClick={handleSave}>
              确认保存
            </button>
          </div>
        }
      >
        <div className={styles.modalField}>
          <label htmlFor="theme-name-input" className={styles.modalLabel}>
            主题名称
          </label>
          <input
            id="theme-name-input"
            type="text"
            className={styles.modalInput}
            value={saveName}
            placeholder={`${draft.name} (Custom)`}
            onChange={e => setSaveName(e.target.value)}
          />
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--fabric-content-secondary)' }}>
          保存后将持久化存储在 DSH 宿主并同步注册到 Theme Studio 预设库中。
        </p>
      </Modal>
    </Page>
  )
}
