import React, { useState, useEffect, useRef } from 'react';

export default function KineticHero({ onExploreClick, onLeaderboardClick }) {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [smoothPos, setSmoothPos] = useState({ x: 0, y: 0 });

  // 60 FPS smooth spring lerp for gentle cursor parallax
  useEffect(() => {
    let animationFrameId;
    const lerpFactor = 0.06;

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

  // Subtle floating parallax offsets
  const px1 = smoothPos.x * 14;
  const py1 = smoothPos.y * 10;
  const px2 = smoothPos.x * 26;
  const py2 = smoothPos.y * 18;
  const px3 = smoothPos.x * 38;
  const py3 = smoothPos.y * 26;

  return (
    <div className="relative w-full border border-[#242326] bg-[#090909] text-[#f1f0ed] overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl">
      {/* Top micro annotations bar */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-[#242326] text-[10px] font-mono tracking-widest text-[#c8c6c3] bg-[#0c0c0e]">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9eea9a] animate-pulse"></span>
          <span>SYSTEM RUNTIME // 100% OFFLINE-FIRST</span>
        </div>
        <div className="hidden sm:flex items-center space-x-4">
          <span>LATENCY: ZERO CLOUD CALLS</span>
          <span>CALIBRATION: Z-SCORE</span>
        </div>
      </div>

      {/* Main Expansive & Clean Motion-Graphics Viewport */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-[480px] sm:h-[560px] md:h-[640px] lg:h-[700px] flex items-center justify-center overflow-hidden bg-[#090909]"
      >
        <svg
          viewBox="0 0 1600 800"
          className="w-full h-full object-cover select-none pointer-events-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Subtle purple glow */}
            <filter id="subtlePurpleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Crisp green glow for the active signal */}
            <filter id="cleanGreenGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. DEEP CONSTRUCTION LINES & DIAGONALS (Subtle Parallax 1) */}
          <g
            id="deep-construction-lines"
            style={{
              transform: `translate(${px1}px, ${py1}px)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            {/* Long clean diagonal guides */}
            <line x1="80" y1="120" x2="1520" y2="680" stroke="#1d1c1f" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="80" y1="680" x2="1520" y2="120" stroke="#1d1c1f" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="800" y1="60" x2="800" y2="740" stroke="#1f1e22" strokeWidth="1" strokeDasharray="2 4" />
          </g>

          {/* 2. LARGE CENTRAL & SECONDARY GEOMETRIC CIRCLES (Parallax 2) */}
          <g
            id="large-geometric-circles"
            style={{
              transform: `translate(${px2}px, ${py2}px)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            {/* Left Secondary System: 2 Concentric Circles */}
            <g className="anim-circle-left">
              <circle cx="340" cy="400" r="160" fill="none" stroke="#2a292d" strokeWidth="1" />
              <circle cx="340" cy="400" r="260" fill="none" stroke="#1d1c1f" strokeWidth="1" strokeDasharray="3 5" />
              <circle cx="340" cy="400" r="70" fill="none" stroke="rgba(169, 139, 232, 0.25)" strokeWidth="1" />
              <circle cx="340" cy="400" r="4" fill="#3a393b" />
            </g>

            {/* Central Dominant System: Large Concentric Rings */}
            <g className="anim-circle-center">
              <circle cx="800" cy="400" r="110" fill="none" stroke="#3a393b" strokeWidth="1" />
              <circle cx="800" cy="400" r="200" fill="none" stroke="rgba(169, 139, 232, 0.35)" strokeWidth="1.2" />
              <circle cx="800" cy="400" r="300" fill="none" stroke="#242326" strokeWidth="1" />
              <circle cx="800" cy="400" r="390" fill="none" stroke="#1a191c" strokeWidth="1" strokeDasharray="4 6" />
            </g>

            {/* Right Secondary System: 2 Concentric Circles */}
            <g className="anim-circle-right">
              <circle cx="1260" cy="400" r="160" fill="none" stroke="#2a292d" strokeWidth="1" />
              <circle cx="1260" cy="400" r="260" fill="none" stroke="#1d1c1f" strokeWidth="1" strokeDasharray="3 5" />
              <circle cx="1260" cy="400" r="70" fill="none" stroke="rgba(169, 139, 232, 0.25)" strokeWidth="1" />
              <circle cx="1260" cy="400" r="4" fill="#3a393b" />
            </g>
          </g>

          {/* 3. SHARP DRAFTING TRIANGLES (3-5 Total) */}
          <g
            id="drafting-triangles"
            style={{
              transform: `translate(${px3 * 0.8}px, ${py3 * 0.8}px)`,
              transition: 'transform 0.12s ease-out',
            }}
          >
            {/* Triangle 1 (Left / Center Bridge) */}
            <g className="anim-triangle-a">
              <polygon
                points="480,240 580,440 380,440"
                fill="none"
                stroke="#5c5960"
                strokeWidth="1"
              />
              <circle cx="480" cy="240" r="2.5" fill="#5c5960" />
              <circle cx="580" cy="440" r="2.5" fill="#5c5960" />
              <circle cx="380" cy="440" r="2.5" fill="#5c5960" />
            </g>

            {/* Triangle 2 (Center Hero Triangle with Subtle Purple Stroke) */}
            <g className="anim-triangle-b">
              <polygon
                points="800,180 940,480 660,480"
                fill="rgba(169, 139, 232, 0.03)"
                stroke="#a98be8"
                strokeWidth="1.5"
                filter="url(#subtlePurpleGlow)"
              />
              <line x1="800" y1="180" x2="800" y2="480" stroke="rgba(169, 139, 232, 0.25)" strokeWidth="1" strokeDasharray="2 3" />
              <circle cx="800" cy="180" r="3.5" fill="#a98be8" />
              <circle cx="940" cy="480" r="3" fill="#a98be8" />
              <circle cx="660" cy="480" r="3" fill="#a98be8" />
            </g>

            {/* Triangle 3 (Center Inverted Drafting Triangle) */}
            <polygon
              points="800,560 980,260 620,260"
              fill="none"
              stroke="#2d2b30"
              strokeWidth="1"
              strokeDasharray="4 6"
            />

            {/* Triangle 4 (Right Accent Triangle) */}
            <g className="anim-triangle-c">
              <polygon
                points="1120,220 1220,420 1020,420"
                fill="none"
                stroke="#5c5960"
                strokeWidth="1"
              />
              <circle cx="1120" cy="220" r="2.5" fill="#5c5960" />
              <circle cx="1220" cy="420" r="2.5" fill="#5c5960" />
              <circle cx="1020" cy="420" r="2.5" fill="#5c5960" />
            </g>
          </g>

          {/* 4. MAIN HORIZONTAL PIPELINE & 5 CLEAN SIGNAL NODES */}
          <g
            id="clean-horizontal-pipeline"
            style={{
              transform: `translate(${px3}px, ${py3}px)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            {/* Single Continuous Horizontal Line */}
            <line x1="120" y1="400" x2="1480" y2="400" stroke="#3a393b" strokeWidth="1.5" />

            {/* Intermediate delicate tick marks */}
            {[260, 420, 580, 720, 880, 1020, 1180, 1340].map((px) => (
              <g key={px}>
                <line x1={px} y1="392" x2={px} y2="408" stroke="#242326" strokeWidth="1" />
                <circle cx={px} cy="400" r="2" fill="#090909" stroke="#3a393b" strokeWidth="0.8" />
              </g>
            ))}

            {/* 5 Main Precision Stage Nodes (Clean & High Contrast) */}
            {[
              { id: '1', x: 200, label: 'INBOUND SUBMISSIONS' },
              { id: '2', x: 500, label: 'CODE VERIFICATION' },
              { id: '3', x: 800, label: 'RUBRIC EVALUATION' },
              { id: '4', x: 1100, label: 'Z-SCORE NORMALIZATION' },
              { id: '5', x: 1400, label: 'AWARD CEREMONY' },
            ].map((node) => (
              <g key={node.id}>
                {/* Vertical node marker guide */}
                <line x1={node.x} y1="365" x2={node.x} y2="435" stroke="#3a393b" strokeWidth="1" />

                {/* Outer housing ring */}
                <circle cx={node.x} cy="400" r="26" fill="#090909" stroke="#3a393b" strokeWidth="1.2" />

                {/* Inner ring */}
                <circle cx={node.x} cy="400" r="16" fill="#090909" stroke="#5c5960" strokeWidth="1" />

                {/* White Center Pivot */}
                <circle cx={node.x} cy="400" r="5.5" fill="#f1f0ed" />

                {/* Sub-node micro dots */}
                <circle cx={node.x} cy="374" r="2" fill="#a98be8" />
                <circle cx={node.x} cy="426" r="2" fill="#a98be8" />

                {/* Technical Label Below */}
                <text
                  x={node.x}
                  y="470"
                  textAnchor="middle"
                  fill="#c8c6c3"
                  fontSize="11"
                  fontFamily="'IBM Plex Mono', monospace"
                  letterSpacing="0.08em"
                  className="uppercase font-semibold"
                >
                  {node.label}
                </text>
              </g>
            ))}
          </g>

          {/* 5. SINGLE ACTIVE GREEN SIGNAL POINT (19.33s Smooth Linear Glide) */}
          <g
            id="single-green-signal"
            style={{
              transform: `translate(${px3}px, ${py3}px)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <g transform="translate(200, 400)" className="anim-signal-clean">
              {/* Outer soft aura */}
              <circle cx="0" cy="0" r="22" fill="rgba(158, 234, 154, 0.14)" />
              {/* Mid ring */}
              <circle cx="0" cy="0" r="12" fill="none" stroke="#9eea9a" strokeWidth="1.2" opacity="0.85" />
              {/* Active focal core */}
              <circle cx="0" cy="0" r="5" fill="#9eea9a" filter="url(#cleanGreenGlow)" />
            </g>
          </g>
        </svg>
      </div>

      {/* Bottom Editorial Zone: Large Headline & Lavender CTA */}
      <div className="border-t border-[#242326] p-8 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-8 bg-[#0a0a0a]">
        {/* Left Headline */}
        <div className="space-y-3 max-w-2xl">
          <p className="text-xs font-mono text-[#a98be8] tracking-widest font-semibold uppercase">
            OFFLINE-FIRST TOURNAMENT ENGINE
          </p>
          <h1 className="editorial-headline text-4xl sm:text-5xl md:text-6xl text-[#f1f0ed]">
            SEE WHAT MOVES<br />
            YOUR CODE FORWARD
          </h1>
          <p className="text-xs sm:text-sm font-mono text-[#c8c6c3] leading-relaxed pt-2">
            Build resilient offline architectures, undergo multi-judge rubric calibration, and compete for verified championship prize pools.
          </p>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={onExploreClick}
            className="px-8 py-4 rounded-none bg-[#bca1ee] hover:bg-[#caaefc] text-[#161218] font-mono font-bold text-xs tracking-wider transition duration-200 uppercase flex items-center justify-center space-x-2"
          >
            <span>EXPLORE GALLERY ↗</span>
          </button>
          <button
            onClick={onLeaderboardClick}
            className="px-6 py-4 rounded-none bg-transparent hover:bg-[#151418] text-[#f1f0ed] border border-[#3a393b] hover:border-[#a98be8] font-mono text-xs tracking-wider transition uppercase flex items-center justify-center space-x-2"
          >
            <span>LEADERBOARD</span>
          </button>
        </div>
      </div>
    </div>
  );
}
