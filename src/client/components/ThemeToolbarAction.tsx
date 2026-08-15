import { useState } from 'react'
import type { FabricPageActionProps } from '@dsh-do/fabric/client'
import { ToolbarButton } from '@dsh-do/fabric/ui'
import { useThemeStudio } from '../theme-engine.ts'

export function ThemeToolbarAction(props: FabricPageActionProps) {
  const { activeTheme, allThemes, setActiveTheme } = useThemeStudio()
  const [openDropdown, setOpenDropdown] = useState(false)

  const handleCycleTheme = () => {
    const currentIndex = allThemes.findIndex(t => t.id === activeTheme.id)
    const nextIndex = (currentIndex + 1) % allThemes.length
    const nextTheme = allThemes[nextIndex]
    if (nextTheme) {
      setActiveTheme(nextTheme.id)
      props.notify(`已切换主题至「${nextTheme.name}」`, { tone: 'info', timeoutMs: 2000 })
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <ToolbarButton
        label={`主题: ${activeTheme.name}`}
        icon={
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: activeTheme.tokens.brand.brandPrimary,
              boxShadow: `0 0 4px ${activeTheme.tokens.brand.brandPrimary}`,
            }}
          />
        }
        onClick={handleCycleTheme}
      />
    </div>
  )
}
