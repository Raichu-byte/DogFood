import React from 'react';

/**
 * FloatingHudCard
 * 
 * Recreates the compact, dark, translucent floating HUD cards attached to the visual core
 * from Dogfood_Design_Reference.md.
 */
export default function FloatingHudCard({
  side = 'left', // 'left' | 'right'
  label,
  value,
  subtext,
  progress, // 0 to 100 for progress bar if applicable
  offset = { x: 0, y: 0 },
  badge,
  icon: Icon
}) {
  const isLeft = side === 'left';

  return (
    <div
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`absolute z-20 hud-capsule p-4 sm:p-5 rounded-2xl flex flex-col gap-2 pointer-events-auto select-none ${
        isLeft
          ? 'left-4 sm:left-10 md:left-16 bottom-16 sm:bottom-24 md:bottom-28'
          : 'right-4 sm:right-10 md:right-16 bottom-16 sm:bottom-24 md:bottom-28'
      } min-w-[150px] sm:min-w-[190px] md:min-w-[210px]`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-[#bfa5ff]" />}
          <span className="hud-mono-label font-bold text-[#8b8899]">{label}</span>
        </div>
        {badge && (
          <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-wider rounded bg-[#7a4ee0]/20 text-[#bfa5ff] border border-[#7a4ee0]/30 uppercase">
            {badge}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <div className="text-lg sm:text-2xl font-bold font-sans tracking-tight text-[#f5f4f8]">
          {value}
        </div>
        {subtext && (
          <span className="text-[10px] font-mono text-[#9eea9a] font-medium">
            {subtext}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <div className="w-full bg-[#1c1a26] h-1.5 rounded-full overflow-hidden mt-0.5">
          <div
            className="bg-gradient-to-r from-[#7a4ee0] to-[#bfa5ff] h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
