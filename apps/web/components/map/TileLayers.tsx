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
          className="flex items-center gap-1.5 bg-white/95 hover:bg-white text-gray-800 px-3 py-2 rounded-md shadow-md border border-gray-200 backdrop-blur-xs text-xs font-semibold transition-all cursor-pointer"
          title="Change Map Layer"
        >
          <Layers className="w-4 h-4 text-gray-600" />
          <span>Layers</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-200 py-1 z-20 transition-all">
            <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
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
                        ? "bg-orange-50 text-brand font-bold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{provider.name}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-brand" />
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