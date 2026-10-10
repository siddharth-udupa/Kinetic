'use client'

import { useState } from "react"
import { tileProviders, type TileProviderId } from "@repo/maps"
import { Layers } from "lucide-react"

type TileLayersProps = {
  isChangeable: boolean
  currentProviderId: TileProviderId
  onSelectProvider: (id: TileProviderId) => void
}

export function TileLayers({ isChangeable, currentProviderId, onSelectProvider }: TileLayersProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isChangeable) return null

  const providers = Object.values(tileProviders)

  return (
    <div className="absolute top-3 right-3 z-10">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 bg-surface/95 hover:bg-surface text-ink px-3 py-2 rounded-md shadow-md border border-line backdrop-blur-xs text-xs font-semibold transition-all cursor-pointer"
          title="Change Map Layer"
        >
          <Layers className="w-4 h-4 text-ink-secondary" />
          <span>Layers</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-surface/95 backdrop-blur-md rounded-lg shadow-xl border border-line py-1 z-20 transition-all">
            <div className="px-3 py-1.5 text-[11px] font-bold text-ink-disabled uppercase tracking-wider border-b border-line-muted">
              Map Layers
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {providers.map((provider) => {
                const isSelected = provider.id === currentProviderId
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => {
                      onSelectProvider(provider.id as TileProviderId)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-accent-soft text-accent-text font-bold"
                        : "text-ink hover:bg-surface-muted-hover"
                    }`}
                  >
                    <span>{provider.name}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-accent" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}