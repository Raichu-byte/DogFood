import React, { useState, useEffect, useRef } from 'react';

export default function KineticHero({ onExploreClick, onLeaderboardClick }) {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [smoothPos, setSmoothPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredStage, setHoveredStage] = useState(null);

  const stages = [
    {
      id: '1',
      code: '01',
      label: 'INBOUND INGESTION',
      subtext: 'Offline Git & SHA-256 Hash',
      x: 180,
      y: 320,
    },
    {
      id: '2',
      code: '02',
      label: 'CODE VERIFICATION',
      subtext: 'Deterministic Test Run',
      x: 440,
      y: 320,
    },
    {
      id: '3',
      code: '03',
      label: 'RUBRIC EVALUATION',
      subtext: 'Multi-Judge Criteria Weights',
      x: 720,
      y: 320,
    },
    {
      id: '4',
      code: '04',
      label: 'Z-SCORE CALIBRATION',
      subtext: 'Statistical Bias Mitigation',
      x: 1000,
      y: 320,
    },
    {
      id: '5',
      code: '05',
      label: 'CHAMPIONSHIP APEX',
      subtext: 'Escrow Prize Allocation',
      x: 1260,
      y: 320,
    },
  ];

  // Smooth lerp mouse tracking
  useEffect(() => {
    let animationFrameId;
    const lerpFactor = 0.08;

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
    // Normalize coordinates from -1 to 1 relative to center
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setMousePos({ x: nx, y: ny });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
    setHoveredStage(null);
  };

  // Calculate parallax offsets
  const bgOffsetX = smoothPos.x * 12;
  const bgOffsetY = smoothPos.y * 8;
  const midOffsetX = smoothPos.x * 26;
  const midOffsetY = smoothPos.y * 18;
  const fgOffsetX = smoothPos.x * 40;
  const fgOffsetY = smoothPos.y * 28;

  // Real-time telemetry values based on mouse position
  const cursorSvgX = Math.round(720 + smoothPos.x * 600);
  const cursorSvgY = Math.round(320 + smoothPos.y * 250);
  const vectorAngle = Math.round(
    (Math.atan2(smoothPos.y, smoothPos.x) * 180) / Math.PI + 180
  );

  return (
    <div className="relative w-full border border-[#242326] bg-[#090909] text-[#f1f0ed] overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl">
      {/* Top micro telemetry bar */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-[#242326] text-[10px] font-mono tracking-widest text-[#c8c6c3] bg-[#0c0c0e]">
        <div className="flex items-center space-x-3">
          <span className="w-2 h-2 rounded-full bg-[#9eea9a] animate-pulse"></span>
          <span className="font-bold text-[#f1f0ed]">KINETIC BLUEPRINT // PARALLAX TOPOLOGY</span>
          <span className="text-[#3a393b]">|</span>
          <span className="hidden md:inline text-neutral-400">CURSOR INTERACTIVE // 60 FPS</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-[#a98be8]">VECTOR: {vectorAngle}°</span>
          <span className="hidden sm:inline text-neutral-400">COORDS: [{cursorSvgX}, {cursorSvgY}]</span>
          <span className="text-[#9eea9a]">100% OFFLINE</span>
        </div>
      </div>

      {/* Main Expansive Kinetic Geometric Artwork Viewport */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-[460px] sm:h-[540px] md:h-[620px] lg:h-[660px] flex items-center justify-center overflow-hidden cursor-crosshair bg-radial-gradient"
      >
        <svg
          viewBox="0 0 1440 640"
          className="w-full h-full object-cover select-none pointer-events-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="archGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#161518" strokeWidth="0.8" />
              <circle cx="60" cy="60" r="1" fill="#242326" />
            </pattern>

            {/* Radial Radar Mask */}
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a98be8" stopOpacity="0.08" />
              <stop offset="60%" stopColor="#a98be8" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#090909" stopOpacity="0" />
            </radialGradient>

            {/* Glowing filter for green signal */}
            <filter id="greenNeonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glowing filter for purple accent */}
            <filter id="purpleNeonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* LAYER 0: BACKGROUND GRID & RADIAL AURA */}
          <rect width="1440" height="640" fill="url(#archGrid)" />
          <rect width="1440" height="640" fill="url(#centerGlow)" />

          {/* LAYER 1: DEEP BACKGROUND ARCHITECTURAL LINES (Parallax Layer 1) */}
          <g
            id="layer-deep-bg"
            style={{
              transform: `translate(${bgOffsetX}px, ${bgOffsetY}px)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            {/* Main Horizon Baseline */}
            <line x1="40" y1="320" x2="1400" y2="320" stroke="#242326" strokeWidth="1.5" />
            
            {/* Upper and Lower Boundary Guide Tracks */}
            <line x1="80" y1="140" x2="1360" y2="140" stroke="#1b1a1d" strokeWidth="1" strokeDasharray="3 6" />
            <line x1="80" y1="500" x2="1360" y2="500" stroke="#1b1a1d" strokeWidth="1" strokeDasharray="3 6" />

            {/* Diagonal Construction Angles */}
            <line x1="0" y1="80" x2="1440" y2="560" stroke="#19181b" strokeWidth="1" strokeDasharray="4 8" />
            <line x1="0" y1="560" x2="1440" y2="80" stroke="#19181b" strokeWidth="1" strokeDasharray="4 8" />
            <line x1="720" y1="0" x2="720" y2="640" stroke="#1f1e22" strokeWidth="1" strokeDasharray="2 4" />
            
            {/* Harmonic Center Radial Rays */}
            {[30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const x2 = 720 + Math.cos(rad) * 450;
              const y2 = 320 + Math.sin(rad) * 450;
              return (
                <line
                  key={deg}
                  x1="720"
                  y1="320"
                  x2={x2}
                  y2={y2}
                  stroke="#161518"
                  strokeWidth="0.8"
                />
              );
            })}
          </g>

          {/* LAYER 2: EXPANDED RADIAL RINGS & CONCENTRIC HARMONICS (Parallax Layer 2) */}
          <g
            id="layer-concentric-circles"
            style={{
              transform: `translate(${midOffsetX}px, ${midOffsetY}px)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            {/* Center Stage Harmonic Giant Orbit */}
            <g className="anim-circle-center">
              <circle cx="720" cy="320" r="110" fill="none" stroke="#2d2b30" strokeWidth="1" />
              <circle cx="720" cy="320" r="180" fill="none" stroke="rgba(169, 139, 232, 0.25)" strokeWidth="1.2" strokeDasharray="6 6" />
              <circle cx="720" cy="320" r="260" fill="none" stroke="#242326" strokeWidth="1" />
              <circle cx="720" cy="320" r="340" fill="none" stroke="#1a191c" strokeWidth="1" strokeDasharray="4 8" />
              <circle cx="720" cy="320" r="420" fill="none" stroke="#151417" strokeWidth="1" />
            </g>

            {/* Left Sector Orbitals */}
            <g className="anim-circle-left">
              <circle cx="310" cy="320" r="140" fill="none" stroke="#2d2b30" strokeWidth="1" />
              <circle cx="310" cy="320" r="230" fill="none" stroke="rgba(169, 139, 232, 0.20)" strokeWidth="1" strokeDasharray="3 5" />
              <circle cx="310" cy="320" r="70" fill="none" stroke="#242326" strokeWidth="1" />
            </g>

            {/* Right Sector Orbitals */}
            <g className="anim-circle-right">
              <circle cx="1130" cy="320" r="140" fill="none" stroke="#2d2b30" strokeWidth="1" />
              <circle cx="1130" cy="320" r="230" fill="none" stroke="rgba(169, 139, 232, 0.20)" strokeWidth="1" strokeDasharray="3 5" />
              <circle cx="1130" cy="320" r="70" fill="none" stroke="#242326" strokeWidth="1" />
            </g>
          </g>

          {/* LAYER 3: ORGANIZED GEOMETRIC PRISMS & STRUCTURAL TRIANGLES */}
          <g
            id="layer-geometric-prisms"
            style={{
              transform: `translate(${fgOffsetX * 0.7}px, ${fgOffsetY * 0.7}px)`,
              transition: 'transform 0.12s ease-out',
            }}
          >
            {/* Stage 1: Ingestion Diamond Matrix */}
            <polygon
              points="180,240 240,320 180,400 120,320"
              fill="none"
              stroke="#3a393b"
              strokeWidth="1"
            />

            {/* Stage 2: Verification Hexagon Framework */}
            <polygon
              points="440,230 495,275 495,365 440,410 385,365 385,275"
              fill="none"
              stroke="rgba(169, 139, 232, 0.35)"
              strokeWidth="1"
            />
            <circle cx="440" cy="230" r="2.5" fill="#a98be8" />
            <circle cx="440" cy="410" r="2.5" fill="#a98be8" />

            {/* Stage 3 (Center): Grand Rubric Prism Triangle (Golden Proportion) */}
            <g className="anim-triangle-b">
              <polygon
                points="720,160 840,380 600,380"
                fill="rgba(169, 139, 232, 0.04)"
                stroke="#a98be8"
                strokeWidth="1.5"
                filter="url(#purpleNeonGlow)"
              />
              <line x1="720" y1="160" x2="720" y2="380" stroke="rgba(169, 139, 232, 0.3)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="720" cy="160" r="4" fill="#a98be8" />
              <circle cx="840" cy="380" r="3" fill="#a98be8" />
              <circle cx="600" cy="380" r="3" fill="#a98be8" />
            </g>

            {/* Stage 4: Calibration Dual Octagonal Rings */}
            <g className="anim-triangle-a">
              <polygon
                points="1000,225 1065,260 1065,380 1000,415 935,380 935,260"
                fill="none"
                stroke="#3a393b"
                strokeWidth="1"
              />
            </g>

            {/* Stage 5: Apex Crown Starburst */}
            <g className="anim-triangle-c">
              <polygon
                points="1260,220 1330,320 1260,420 1190,320"
                fill="rgba(158, 234, 154, 0.03)"
                stroke="#9eea9a"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
            </g>
          </g>

          {/* LAYER 4: PIPELINE CONDUITS & 5 MAIN STAGES (Foreground Interactive) */}
          <g
            id="layer-pipeline-nodes"
            style={{
              transform: `translate(${fgOffsetX}px, ${fgOffsetY}px)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            {/* Primary High-Gloss Signal Conduit */}
            <line x1="100" y1="320" x2="1340" y2="320" stroke="#3a393b" strokeWidth="2" />
            <line x1="100" y1="320" x2="1340" y2="320" stroke="rgba(169, 139, 232, 0.3)" strokeWidth="1" strokeDasharray="8 12" />

            {/* Intermediate Micro Stepper Ticks */}
            {[260, 310, 360, 520, 570, 620, 800, 850, 900, 1080, 1130, 1180].map((px) => (
              <g key={px}>
                <line x1={px} y1="312" x2={px} y2="328" stroke="#3a393b" strokeWidth="1" />
                <circle cx={px} cy="320" r="2" fill="#121115" stroke="#5c5960" strokeWidth="0.8" />
              </g>
            ))}

            {/* 5 Prominent Organized Stage Milestones */}
            {stages.map((stage) => {
              const isTargetHovered = hoveredStage?.id === stage.id;
              return (
                <g
                  key={stage.id}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredStage(stage)}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  {/* Vertical Crosshair Guide */}
                  <line
                    x1={stage.x}
                    y1="250"
                    x2={stage.x}
                    y2="390"
                    stroke={isTargetHovered ? '#a98be8' : '#3a393b'}
                    strokeWidth={isTargetHovered ? '1.5' : '1'}
                    strokeDasharray={isTargetHovered ? 'none' : '2 4'}
                    className="transition-colors duration-200"
                  />

                  {/* Outer Orbiting Hover Ring */}
                  <circle
                    cx={stage.x}
                    cy={stage.y}
                    r={isTargetHovered ? 40 : 32}
                    fill="#090909"
                    stroke={isTargetHovered ? '#a98be8' : '#2d2b30'}
                    strokeWidth={isTargetHovered ? 2 : 1.2}
                    className="transition-all duration-300"
                  />

                  {/* Inner Node Ring */}
                  <circle
                    cx={stage.x}
                    cy={stage.y}
                    r="20"
                    fill="#0d0d10"
                    stroke={isTargetHovered ? '#bca1ee' : '#3a393b'}
                    strokeWidth="1"
                    className="transition-all duration-200"
                  />

                  {/* Core High-Contrast White/Green Pivot */}
                  <circle
                    cx={stage.x}
                    cy={stage.y}
                    r="6.5"
                    fill={isTargetHovered ? '#9eea9a' : '#f1f0ed'}
                    filter={isTargetHovered ? 'url(#greenNeonGlow)' : undefined}
                    className="transition-colors duration-200"
                  />

                  {/* Orbiting Micro Phase Dots */}
                  <circle cx={stage.x} cy={stage.y - 32} r="2" fill="#a98be8" />
                  <circle cx={stage.x} cy={stage.y + 32} r="2" fill="#a98be8" />

                  {/* Numeric Badge Above Node */}
                  <rect
                    x={stage.x - 18}
                    y="255"
                    width="36"
                    height="18"
                    fill="#0c0c0e"
                    stroke={isTargetHovered ? '#a98be8' : '#242326'}
                    strokeWidth="1"
                    className="transition-colors"
                  />
                  <text
                    x={stage.x}
                    y="268"
                    textAnchor="middle"
                    fill={isTargetHovered ? '#a98be8' : '#c8c6c3'}
                    fontSize="9"
                    fontFamily="'IBM Plex Mono', monospace"
                    fontWeight="bold"
                    letterSpacing="0.1em"
                  >
                    {stage.code}
                  </text>

                  {/* Primary Stage Label Below Node */}
                  <text
                    x={stage.x}
                    y="420"
                    textAnchor="middle"
                    fill={isTargetHovered ? '#f1f0ed' : '#c8c6c3'}
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="'IBM Plex Mono', monospace"
                    letterSpacing="0.08em"
                    className="transition-colors uppercase"
                  >
                    {stage.label}
                  </text>

                  {/* Secondary Technical Microtext */}
                  <text
                    x={stage.x}
                    y="438"
                    textAnchor="middle"
                    fill="#5c5960"
                    fontSize="9"
                    fontFamily="'IBM Plex Mono', monospace"
                    letterSpacing="0.04em"
                  >
                    {stage.subtext}
                  </text>
                </g>
              );
            })}
          </g>

          {/* LAYER 5: CONTINUOUS GREEN SIGNAL TRAVELLER */}
          <g
            id="layer-green-signal"
            style={{
              transform: `translate(${fgOffsetX}px, ${fgOffsetY}px)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <g transform="translate(180, 320)" className="anim-signal-point">
              {/* Outer soft green aura */}
              <circle cx="0" cy="0" r="24" fill="rgba(158, 234, 154, 0.12)" />
              {/* Mid pulse ring */}
              <circle cx="0" cy="0" r="14" fill="none" stroke="#9eea9a" strokeWidth="1.2" opacity="0.9" />
              {/* Solid focal beacon */}
              <circle cx="0" cy="0" r="6" fill="#9eea9a" filter="url(#greenNeonGlow)" />
            </g>
          </g>

          {/* LAYER 6: INTERACTIVE CURSOR TRACKER & DYNAMIC RETICLE */}
          {isHovered && (
            <g
              id="interactive-cursor-reticle"
              style={{
                transform: `translate(${cursorSvgX}px, ${cursorSvgY}px)`,
                transition: 'transform 0.04s linear',
              }}
              className="pointer-events-none"
            >
              {/* Magnetic Aura */}
              <circle cx="0" cy="0" r="28" fill="rgba(169, 139, 232, 0.08)" />
              <circle cx="0" cy="0" r="16" fill="none" stroke="#a98be8" strokeWidth="0.8" strokeDasharray="2 3" />
              
              {/* Precision Crosshair Lines */}
              <line x1="-36" y1="0" x2="-8" y2="0" stroke="#a98be8" strokeWidth="1" />
              <line x1="8" y1="0" x2="36" y2="0" stroke="#a98be8" strokeWidth="1" />
              <line x1="0" y1="-36" x2="0" y2="-8" stroke="#a98be8" strokeWidth="1" />
              <line x1="0" y1="8" x2="0" y2="36" stroke="#a98be8" strokeWidth="1" />

              {/* Center Tracking Point */}
              <circle cx="0" cy="0" r="3" fill="#9eea9a" filter="url(#greenNeonGlow)" />

              {/* Cursor Float Telemetry Pill */}
              <g transform="translate(42, -28)">
                <rect width="130" height="42" fill="#090909" stroke="#3a393b" strokeWidth="1" />
                <rect x="0" y="0" width="3" height="42" fill="#a98be8" />
                <text x="10" y="16" fill="#f1f0ed" fontSize="9" fontFamily="'IBM Plex Mono', monospace" fontWeight="bold">
                  FOCUS: TARGET LOCK
                </text>
                <text x="10" y="32" fill="#9eea9a" fontSize="8" fontFamily="'IBM Plex Mono', monospace">
                  X:{cursorSvgX} | Y:{cursorSvgY}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Editorial Zone: Large Headline & Lavender CTA */}
      <div className="border-t border-[#242326] p-8 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-8 bg-[#0a0a0a]">
        {/* Left Headline */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-none bg-[#a98be8]"></span>
            <p className="text-xs font-mono text-[#a98be8] tracking-widest font-semibold uppercase">
              OFFLINE-FIRST TOURNAMENT ENGINE // ZERO LATENCY
            </p>
          </div>
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
