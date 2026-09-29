import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trophy, ArrowRight, Layers } from 'lucide-react';
import SculpturalLivingCore from './SculpturalLivingCore';
import FloatingSpatialHUD from './FloatingSpatialHUD';

/**
 * ReferenceHero
 * 
 * Recreates the complete, unified, cinematic hero environment specified in
 * Dogfood_Design_Reference.md.
 * 
 * Spatial Hierarchy:
 * - Layer 0: Deep near-black canvas with environmental violet radiance
 * - Layer 1: Sculptural Living Core dominating middle & lower half
 * - Layer 2: Floating Spatial HUDs with differential optical depth
 * - Layer 3: Editorial display headline, 1-line description, and white pill CTA
 */
export default function ReferenceHero({
  onExploreClick,
  onLeaderboardClick,
  projectCount = 128,
  judgingProgress = 96,
}) {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [smoothPos, setSmoothPos] = useState({ x: 0, y: 0 });

  // 60 FPS smooth spring physics for natural spatial inertia
  useEffect(() => {
    let animationFrameId;
    const lerpFactor = 0.045;

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

  // Differential parallax depth offsets
  const coreOffset = { x: smoothPos.x * 14, y: smoothPos.y * 10 };
  const leftCardOffset = { x: smoothPos.x * 22, y: smoothPos.y * 15 };
  const rightCardOffset = { x: smoothPos.x * -18, y: smoothPos.y * 13 };
  const cardTilt = { x: smoothPos.y * -4, y: smoothPos.x * 6 };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full border border-[rgba(255,255,255,0.06)] bg-[#070609] text-[#f5f4f8] overflow-hidden rounded-[28px] sm:rounded-[36px] shadow-[0_24px_80px_rgba(0,0,0,0.8)]"
      style={{
        perspective: '1200px',
      }}
    >
      {/* Environmental Atmospheric Violet Glow */}
      <div 
        className="absolute inset-0 pointer-events-none select-none transition-transform duration-700 ease-out"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 85% 60% at ${50 + smoothPos.x * 5}% ${70 + smoothPos.y * 4}%, rgba(53, 28, 104, 0.35), transparent 70%),
            radial-gradient(ellipse 65% 45% at ${50 + smoothPos.x * 8}% ${85 + smoothPos.y * 6}%, rgba(122, 78, 224, 0.22), transparent 60%)
          `
        }}
      />

      {/* Main Unified Viewport */}
      <div className="relative w-full h-[540px] sm:h-[640px] md:h-[720px] lg:h-[760px] flex flex-col items-center justify-between pt-14 sm:pt-20 pb-10 overflow-hidden px-4 sm:px-6">
        
        {/* Upper Editorial Content: Micro-label, Display Headline, Description, Pill CTA */}
        <div 
          className="relative z-30 flex flex-col items-center text-center max-w-3xl space-y-4 sm:space-y-6"
          style={{
            transform: `translate3d(${smoothPos.x * 6}px, ${smoothPos.y * 4}px, 0px)`,
            transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          
          {/* Micro Pill Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#110f1a]/80 border border-[rgba(191,165,255,0.18)] text-[10px] font-mono tracking-widest text-[#bfa5ff] backdrop-blur-md">
            <Sparkles className="w-3 h-3 text-[#bfa5ff]" />
            <span>NEXERA TOURNAMENT PROTOCOL</span>
          </div>

          {/* Large Centered Display Headline (Section 5 of Reference) */}
          <h1 className="hero-display-headline text-5xl sm:text-7xl md:text-8xl lg:text-[96px] text-[#f5f4f8] tracking-[-0.04em] leading-[0.92] select-none">
            BUILD. BREAK. SHIP.
          </h1>

          {/* Small Supporting Paragraph (Section 6 of Reference) */}
          <p className="text-xs sm:text-sm text-[#9a98a6] max-w-md mx-auto leading-relaxed font-sans px-2">
            Build, submit, judge and ship hackathons through one open, offline-first tournament platform.
          </p>

          {/* Pill CTA Button (Section 7 of Reference) */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={onExploreClick}
              className="pill-cta px-7 sm:px-9 py-3 sm:py-3.5 text-xs sm:text-sm flex items-center space-x-2 cursor-pointer font-sans font-semibold tracking-tight"
            >
              <span>Explore Projects</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {onLeaderboardClick && (
              <button
                onClick={onLeaderboardClick}
                className="px-6 sm:px-7 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-medium text-[#c5c3d0] hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(191,165,255,0.35)] bg-[rgba(15,13,22,0.55)] backdrop-blur-md transition-all"
              >
                Leaderboard
              </button>
            )}
          </div>
        </div>

        {/* Lower Dominant Visual: Sculptural Living Core (Sections 8, 9, 10 of Reference) */}
        <div className="absolute inset-x-0 bottom-0 top-[20%] sm:top-[16%] pointer-events-none select-none z-10 flex items-end justify-center">
          <SculpturalLivingCore mouseOffset={coreOffset} />
        </div>

        {/* Floating Spatial HUDs (Sections 11, 12, 13 of Reference) */}
        <FloatingSpatialHUD
          side="left"
          label="PROJECTS"
          value={`${projectCount} SHIPPED`}
          subtext="+100% VERIFIED"
          badge="LIVE"
          icon={Layers}
          offset={leftCardOffset}
          tilt={cardTilt}
        />

        <FloatingSpatialHUD
          side="right"
          label="JUDGING"
          value={`${judgingProgress}%`}
          subtext="NORMALIZED"
          badge="CONSENSUS"
          progress={judgingProgress}
          icon={Trophy}
          offset={rightCardOffset}
          tilt={{ x: cardTilt.x, y: -cardTilt.y }}
        />
      </div>
    </div>
  );
}
