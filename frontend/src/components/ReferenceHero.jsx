import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trophy, ArrowRight, Layers } from 'lucide-react';
import FluidLivingCore from './FluidLivingCore';
import FloatingHudCard from './FloatingHudCard';

/**
 * ReferenceHero
 * 
 * Implements the hero composition directly specified in Dogfood_Design_Reference.md.
 * Hierarchy:
 * 1. Minimal top status line
 * 2. Large centered headline ("BUILD. BREAK. SHIP.")
 * 3. Short centered supporting text
 * 4. High-contrast white pill CTA
 * 5. Large abstract organic living core visual occupying lower half
 * 6. Two floating HUD metric cards (Left: Projects shipped, Right: Judging progress)
 * 7. 60 FPS spring-lerped mouse parallax depth
 */
export default function ReferenceHero({
  onExploreClick,
  onLeaderboardClick,
  projectCount = 128,
  judgingProgress = 96,
  eventStatus = 'ACTIVE'
}) {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [smoothPos, setSmoothPos] = useState({ x: 0, y: 0 });

  // 60 FPS smooth spring lerp for multi-layer depth
  useEffect(() => {
    let animationFrameId;
    const lerpFactor = 0.05;

    const animate = () => {
      setSmoothPos((prev) => ({
        x: prev.x + (mousePos.x - prev.x) * lerpFactor,
        y: prev.y + (mousePos.y - prev.y) * lerpFactor,
      }));
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [mousePos]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setMousePos({ x: nx, y: ny });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  // Parallax offsets for different layers
  const coreOffset = { x: smoothPos.x * 12, y: smoothPos.y * 8 };
  const leftCardOffset = { x: smoothPos.x * 24, y: smoothPos.y * 16 };
  const rightCardOffset = { x: smoothPos.x * -20, y: smoothPos.y * 14 };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full border border-[rgba(255,255,255,0.08)] bg-[#070609] text-[#f5f4f8] overflow-hidden rounded-3xl shadow-2xl ambient-glow-container"
    >
      {/* Top minimal status bar */}
      <div className="flex justify-between items-center px-6 sm:px-8 py-3.5 border-b border-[rgba(255,255,255,0.06)] text-[10px] font-mono tracking-widest text-[#8b8899]">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9eea9a] animate-pulse"></span>
          <span>DOGFOOD 2026 // OFFLINE-FIRST PLATFORM</span>
        </div>
        <div className="hidden sm:flex items-center space-x-6">
          <span>EVENT: {eventStatus}</span>
          <span>SCORING: Z-SCORE NORMALIZED</span>
        </div>
      </div>

      {/* Main Hero Viewport */}
      <div className="relative w-full h-[520px] sm:h-[620px] md:h-[700px] lg:h-[740px] flex flex-col items-center justify-between pt-12 sm:pt-16 pb-8 overflow-hidden px-4">
        
        {/* Upper Content: Headline, Description, and Pill CTA */}
        <div className="relative z-30 flex flex-col items-center text-center max-w-3xl space-y-4 sm:space-y-5">
          
          {/* Micro Pill Badge */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#13111b] border border-[rgba(191,165,255,0.2)] text-[10px] font-mono tracking-wider text-[#bfa5ff]">
            <Sparkles className="w-3 h-3 text-[#bfa5ff]" />
            <span>NEXERA HACKATHON PROTOCOL</span>
          </div>

          {/* Large Centered Headline (Section 5 of Reference) */}
          <h1 className="hero-display-headline text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-[#f5f4f8] leading-[0.96] max-w-2xl sm:max-w-3xl">
            BUILD. BREAK. SHIP.
          </h1>

          {/* Small Supporting Paragraph (Section 6 of Reference) */}
          <p className="text-xs sm:text-sm text-[#9a98a6] max-w-md mx-auto leading-relaxed font-sans px-2">
            Build, submit, judge and ship hackathons through one unified offline-first tournament platform.
          </p>

          {/* Pill CTA Button (Section 7 of Reference) */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={onExploreClick}
              className="pill-cta px-6 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm flex items-center space-x-2 cursor-pointer font-sans"
            >
              <span>Explore Projects</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {onLeaderboardClick && (
              <button
                onClick={onLeaderboardClick}
                className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs font-semibold text-[#c5c3d0] hover:text-white border border-[rgba(255,255,255,0.1)] hover:border-[rgba(191,165,255,0.4)] bg-[rgba(19,17,27,0.6)] backdrop-blur-sm transition-all"
              >
                Leaderboard
              </button>
            )}
          </div>
        </div>

        {/* Lower Visual Area: Fluid Living Core (Section 8 & 9 of Reference) */}
        <div className="absolute inset-x-0 bottom-0 top-[25%] sm:top-[20%] pointer-events-none select-none z-10 flex items-end justify-center">
          <FluidLivingCore mouseOffset={coreOffset} />
        </div>

        {/* Floating HUD Cards (Section 11, 12, 13 of Reference) */}
        <FloatingHudCard
          side="left"
          label="PROJECTS"
          value={`${projectCount} SHIPPED`}
          subtext="+100% VERIFIED"
          badge="LIVE"
          icon={Layers}
          offset={leftCardOffset}
        />

        <FloatingHudCard
          side="right"
          label="JUDGING"
          value={`${judgingProgress}%`}
          subtext="NORMALIZED"
          badge="CONSENSUS"
          progress={judgingProgress}
          icon={Trophy}
          offset={rightCardOffset}
        />
      </div>
    </div>
  );
}
