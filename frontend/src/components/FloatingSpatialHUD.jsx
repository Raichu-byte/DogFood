import React from 'react';

/**
 * FloatingSpatialHUD
 * 
 * Reconstructs the whispering, ultra-compact spatial HUD information markers
 * specified in Sections 11, 12, 13 of Dogfood_Design_Reference.md.
 * 
 * Characteristics:
 * - Ultra-thin low-opacity border: rgba(255, 255, 255, 0.06)
 * - Deep dark translucent backing: rgba(11, 9, 18, 0.65) with backdrop blur
 * - Precision monospace micro-labels & clean sans-serif display numbers
 * - Independent multi-axis spring parallax physics
 */
export default function FloatingSpatialHUD({
  side = 'left', // 'left' | 'right'
  label,
  value,
  subtext,
  progress, // Optional progress indicator (0 - 100)
  offset = { x: 0, y: 0 },
  tilt = { x: 0, y: 0 },
  badge,
  icon: Icon
}) {
  const isLeft = side === 'left';

  return (
    <div
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease, box-shadow 0.3s ease',
      }}
      className={`absolute z-20 p-4 sm:p-5 rounded-2xl flex flex-col gap-2 pointer-events-auto select-none backdrop-blur-xl ${
        isLeft
          ? 'left-4 sm:left-10 md:left-14 lg:left-20 bottom-12 sm:bottom-20 md:bottom-24'
          : 'right-4 sm:right-10 md:right-14 lg:right-20 bottom-12 sm:bottom-20 md:bottom-24'
      } min-w-[150px] sm:min-w-[190px] md:min-w-[210px] bg-[rgba(10,8,16,0.68)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(191,165,255,0.28)] shadow-[0_12px_36px_rgba(0,0,0,0.55)] group`}
    >
      {/* Top micro metadata header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-[#bfa5ff] opacity-80 group-hover:opacity-100 transition-opacity" />}
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8b8899]">
            {label}
          </span>
        </div>
        {badge && (
          <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-wider rounded-full bg-[#7a4ee0]/15 text-[#bfa5ff] border border-[#7a4ee0]/25 uppercase">
            {badge}
          </span>
        )}
      </div>

      {/* Main metric / title */}
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-lg sm:text-2xl font-bold font-sans tracking-tight text-[#f5f4f8]">
          {value}
        </div>
        {subtext && (
          <span className="text-[10px] font-mono text-[#9eea9a] font-medium tracking-wide">
            {subtext}
          </span>
        )}
      </div>

      {/* Micro progress indicator */}
      {progress !== undefined && (
        <div className="w-full bg-[#171422] h-1.5 rounded-full overflow-hidden mt-0.5">
          <div
            className="bg-gradient-to-r from-[#7a4ee0] via-[#9f7aea] to-[#bfa5ff] h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
