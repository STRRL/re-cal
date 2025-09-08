"use client"

import React, { useCallback, useEffect, useMemo, useRef } from "react"
import { cn } from "@/lib/utils"

type Option = { label: string; value: string | number }

export type WheelPickerProps = {
  options: Option[]
  selectedIndex: number
  onChange: (index: number) => void
  itemHeight?: number
  visibleCount?: number // should be odd for a centered band
  className?: string
}

export function WheelPicker({
  options,
  selectedIndex,
  onChange,
  itemHeight = 36,
  visibleCount = 5,
  className,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const padding = useMemo(() => Math.floor(visibleCount / 2) * itemHeight, [visibleCount, itemHeight])
  const height = useMemo(() => visibleCount * itemHeight, [visibleCount, itemHeight])

  // Align scroll to the selected item when value changes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const top = selectedIndex * itemHeight
    if (Math.abs(el.scrollTop - top) > 1) {
      el.scrollTo({ top, behavior: "smooth" })
    }
  }, [selectedIndex, itemHeight])

  // Snap on scroll end and notify change
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    // Debounce - run after small delay
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      const index = Math.round(el.scrollTop / itemHeight)
      const clamped = Math.max(0, Math.min(options.length - 1, index))
      const targetTop = clamped * itemHeight
      el.scrollTo({ top: targetTop, behavior: "smooth" })
      if (clamped !== selectedIndex) onChange(clamped)
    }, 80)
  }, [itemHeight, onChange, options.length, selectedIndex])

  return (
    <div
      className={cn("relative select-none", className)}
      style={{ height }}
    >
      {/* selection highlight band */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-gray-50/80 shadow-sm"
        style={{ height: itemHeight }}
      />

      {/* fade masks */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 h-1/3 bg-gradient-to-b from-white to-transparent" />
      <div className="pointer-events-none absolute left-0 right-0 bottom-0 h-1/3 bg-gradient-to-t from-white to-transparent" />

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          paddingTop: padding,
          paddingBottom: padding,
          scrollSnapType: "y mandatory",
        }}
      >
        <ul className="m-0 p-0 list-none">
          {options.map((opt, idx) => (
            <li
              key={String(opt.value)}
              className={cn(
                "flex items-center justify-center text-base",
                idx === selectedIndex ? "text-gray-900" : "text-gray-400"
              )}
              style={{ height: itemHeight, scrollSnapAlign: "center", scrollSnapStop: "always" } as React.CSSProperties}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default WheelPicker

