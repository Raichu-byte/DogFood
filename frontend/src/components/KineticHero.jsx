import React, { useState, useEffect, useRef } from 'react';

export default function KineticHero({ onExploreClick, onLeaderboardClick }) {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [smoothPos, setSmoothPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredStage, setHoveredStage] = useState(null);
  const [rotationAngle, setRotationAngle] = useState(0);

  const stages = [
    {
      id: '1',
      code: '01',
      label: 'INBOUND INGESTION',
      subtext: 'SHA-256 Commit Integrity & Offline Sync',
      x: 220,
      y: 450,
      metric: '0.0ms LATENCY',
    },
    {
      id: '2',
      code: '02',
      label: 'CODE VERIFICATION',
      subtext: 'Deterministic Sandboxed Test Runner',
      x: 510,
      y: 450,
      metric: '100% ISOLATED',
    },
    {
      id: '3',
      code: '03',
      label: 'RUBRIC EVALUATION',
      subtext: 'Multi-Judge Criteria Weighted Matrix',
      x: 800,
      y: 450,
      metric: 'NEXUS CORE',
    },
    {
      id: '4',
      code: '04',
      label: 'Z-SCORE CALIBRATION',
      subtext: 'Statistical Normalization & Bias Removal',
      x: 1090,
      y: 450,
      metric: 'μ=0.0 σ=1.0',
    },
    {
      id: '5',
      code: '05',
      label: 'CHAMPIONSHIP APEX',
      subtext: 'Escrow Allocation & Winner Showcase',
      x: 1380,
      y: 450,
      metric: 'IMMUTABLE',
    },
  ];

  // 60 FPS smooth spring / lerp mouse tracking
  useEffect(() => {
    let animationFrameId;
    const lerpFactor = 0.07;

    const animate = () => {
      setSmoothPos((prev) => ({
        x: prev.x + (mousePos.x - prev.x) * lerpFactor,
        y: prev.y + (mousePos.y - prev.y) * lerpFactor,
      }));
      setRotationAngle((prev) => (prev + 0.15) % 360);
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

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
    setHoveredStage(null);
  };

  // Parallax offsets for grand multi-plane depth
  const bgOffsetX = smoothPos.x * 16;
  const bgOffsetY = smoothPos.y * 10;
  const midOffsetX = smoothPos.x * 32;
  const midOffsetY = smoothPos.y * 22;
  const fgOffsetX = smoothPos.x * 50;
  const fgOffsetY = smoothPos.y * 34;

  const cursorSvgX = Math.round(800 + smoothPos.x * 700);
  const cursorSvgY = Math.round(450 + smoothPos.y * 380);
  const cursorAngle = Math.round(
    (Math.atan2(smoothPos.y, smoothPos.x) * 180) / Math.PI + 180
  );

  return (
    <div className="relative w-full border border-[#242326] bg-[#090909] text-[#f1f0ed] overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl">
      {/* Top micro telemetry bar */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-[#242326] text-[10px] font-mono tracking-widest text-[#c8c6c3] bg-[#0c0c0e]">
        <div className="flex items-center space-x-3">
          <span className="w-2 h-2 rounded-full bg-[#9eea9a] animate-pulse"></span>
          <span className="font-bold text-[#f1f0ed]">NEXERA KINETIC TOPOLOGY // HIGH-PRECISION MOTION SYSTEM</span>
          <span className="text-[#3a393b]">|</span>
          <span className="hidden md:inline text-neutral-400">CURSOR REACTIVE 60FPS</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-[#a98be8]">VECTOR: {cursorAngle}°</span>
          <span className="hidden sm:inline text-neutral-400">TELEMETRY: [{cursorSvgX}, {cursorSvgY}]</span>
          <span className="text-[#9eea9a]">CALIBRATED: Z-SCORE</span>
        </div>
      </div>

      {/* Main Expansive Kinetic Geometric Artwork Viewport (Large Hero Proportion) */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-[580px] sm:h-[680px] md:h-[780px] lg:h-[840px] flex items-center justify-center overflow-hidden cursor-crosshair bg-[#070708]"
      >
        <svg
          viewBox="0 0 1600 900"
          className="w-full h-full object-cover select-none pointer-events-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Architectural Grid Pattern */}
            <pattern id="grandGrid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#141316" strokeWidth="0.75" />
              <circle cx="80" cy="80" r="1.2" fill="#242326" />
            </pattern>

            {/* Deep Radial Glow Filter */}
            <radialGradient id="deepCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a98be8" stopOpacity="0.12" />
              <stop offset="40%" stopColor="#a98be8" stopOpacity="0.04" />
              <stop offset="85%" stopColor="#070708" stopOpacity="0" />
            </radialGradient>

            {/* Neon Green Filter for Signals */}
            <filter id="neonGreenGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Neon Purple Filter for Core Geometries */}
            <filter id="neonPurpleGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* LAYER 0: BASE BLUEPRINT GRID & RADIAL AURA */}
          <rect width="1600" height="900" fill="url(#grandGrid)" />
          <rect width="1600" height="900" fill="url(#deepCenterGlow)" />

          {/* LAYER 1: DEEP BLUEPRINT RADIAL CONDUITS & AZIMUTH RING (Parallax 1) */}
          <g
            id="grand-azimuth-and-rays"
            style={{
              transform: `translate(${bgOffsetX}px, ${bgOffsetY}px)`,
              transition: 'transform 0.18s ease-out',
            }}
          >
            {/* Horizon and Vertical Main Central Axes */}
            <line x1="40" y1="450" x2="1560" y2="450" stroke="#1d1c20" strokeWidth="1.5" />
            <line x1="800" y1="40" x2="800" y2="860" stroke="#1d1c20" strokeWidth="1.5" />

            {/* Upper and Lower Reference Boundary Conduits */}
            <line x1="100" y1="180" x2="1500" y2="180" stroke="#171619" strokeWidth="1" strokeDasharray="4 8" />
            <line x1="100" y1="720" x2="1500" y2="720" stroke="#171619" strokeWidth="1" strokeDasharray="4 8" />

            {/* Diagonal Corner Construction Rays */}
            <line x1="0" y1="0" x2="1600" y2="900" stroke="#141316" strokeWidth="1" strokeDasharray="6 10" />
            <line x1="0" y1="900" x2="1600" y2="0" stroke="#141316" strokeWidth="1" strokeDasharray="6 10" />

            {/* 360-Degree Azimuth Radial Rays */}
            {[15, 30, 45, 60, 75, 105, 120, 135, 150, 165, 195, 210, 225, 240, 255, 285, 300, 315, 330, 345].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const x2 = 800 + Math.cos(rad) * 620;
              const y2 = 450 + Math.sin(rad) * 620;
              return (
                <line
                  key={deg}
                  x1="800"
                  y1="450"
                  x2={x2}
                  y2={y2}
                  stroke="#151417"
                  strokeWidth="0.8"
                />
              );
            })}

            {/* Outer Giant Azimuth Ring with Degree Markings */}
            <circle cx="800" cy="450" r="420" fill="none" stroke="#242326" strokeWidth="1.2" strokeDasharray="4 6" />
            <circle cx="800" cy="450" r="430" fill="none" stroke="#171619" strokeWidth="0.8" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const tx = 800 + Math.cos(rad) * 445;
              const ty = 450 + Math.sin(rad) * 445;
              return (
                <text
                  key={deg}
                  x={tx}
                  y={ty + 3}
                  textAnchor="middle"
                  fill="#3a393b"
                  fontSize="8"
                  fontFamily="'IBM Plex Mono', monospace"
                >
                  {String(deg).padStart(3, '0')}°
                </text>
              );
            })}
          </g>

          {/* LAYER 2: EXPANSIVE KINETIC CONCENTRIC RINGS & CELESTIAL ORBITS (Parallax 2) */}
          <g
            id="grand-concentric-circles"
            style={{
              transform: `translate(${midOffsetX}px, ${midOffsetY}px)`,
              transition: 'transform 0.15s ease-out',
            }}
          >
            {/* Center Stage Harmonic Giant Orbit (Engine Core) */}
            <g className="anim-circle-center">
              <circle cx="800" cy="450" r="140" fill="none" stroke="#2c2a30" strokeWidth="1" />
              <circle cx="800" cy="450" r="230" fill="none" stroke="rgba(169, 139, 232, 0.30)" strokeWidth="1.5" strokeDasharray="8 8" />
              <circle cx="800" cy="450" r="330" fill="none" stroke="#242326" strokeWidth="1" />
              <circle cx="800" cy="450" r="440" fill="none" stroke="#1a191d" strokeWidth="1" strokeDasharray="4 8" />
              <circle cx="800" cy="450" r="560" fill="none" stroke="#131215" strokeWidth="0.8" />
              <circle cx="800" cy="450" r="690" fill="none" stroke="#100f12" strokeWidth="0.8" strokeDasharray="2 6" />
            </g>

            {/* Left Sector Rotating Harmonic Circle */}
            <g className="anim-circle-left">
              <circle cx="360" cy="450" r="190" fill="none" stroke="#2c2a30" strokeWidth="1" />
              <circle cx="360" cy="450" r="290" fill="none" stroke="rgba(169, 139, 232, 0.22)" strokeWidth="1.2" strokeDasharray="4 6" />
              <circle cx="360" cy="450" r="95" fill="none" stroke="#242326" strokeWidth="1" />
              <circle cx="360" cy="450" r="6" fill="#3a393b" />
            </g>

            {/* Right Sector Rotating Harmonic Circle */}
            <g className="anim-circle-right">
              <circle cx="1240" cy="450" r="190" fill="none" stroke="#2c2a30" strokeWidth="1" />
              <circle cx="1240" cy="450" r="290" fill="none" stroke="rgba(169, 139, 232, 0.22)" strokeWidth="1.2" strokeDasharray="4 6" />
              <circle cx="1240" cy="450" r="95" fill="none" stroke="#242326" strokeWidth="1" />
              <circle cx="1240" cy="450" r="6" fill="#3a393b" />
            </g>

            {/* Orbiting Satellite Dots on Concentric Rings */}
            <g style={{ transform: `rotate(${rotationAngle}deg)`, transformOrigin: '800px 450px' }}>
              <circle cx="800" cy="220" r="3.5" fill="#a98be8" filter="url(#neonPurpleGlow)" />
              <circle cx="800" cy="680" r="3.5" fill="#a98be8" filter="url(#neonPurpleGlow)" />
              <circle cx="1030" cy="450" r="2.5" fill="#9eea9a" />
              <circle cx="570" cy="450" r="2.5" fill="#9eea9a" />
            </g>

            <g style={{ transform: `rotate(${-rotationAngle * 0.7}deg)`, transformOrigin: '800px 450px' }}>
              <circle cx="1130" cy="450" r="3" fill="#5c5960" />
              <circle cx="470" cy="450" r="3" fill="#5c5960" />
              <circle cx="800" cy="120" r="2" fill="#c8c6c3" />
            </g>
          </g>

          {/* LAYER 3: MONUMENTAL STRUCTURAL PRISMS & DRAFTING TRIANGLES */}
          <g
            id="grand-geometric-prisms"
            style={{
              transform: `translate(${fgOffsetX * 0.75}px, ${fgOffsetY * 0.75}px)`,
              transition: 'transform 0.12s ease-out',
            }}
          >
            {/* Grand Equilateral Golden-Ratio Centerpiece Triangle */}
            <g className="anim-triangle-b">
              <polygon
                points="800,210 980,560 620,560"
                fill="rgba(169, 139, 232, 0.05)"
                stroke="#a98be8"
                strokeWidth="2"
                filter="url(#neonPurpleGlow)"
              />
              <line x1="800" y1="210" x2="800" y2="560" stroke="rgba(169, 139, 232, 0.4)" strokeWidth="1.2" strokeDasharray="4 4" />
              <circle cx="800" cy="210" r="5" fill="#a98be8" />
              <circle cx="980" cy="560" r="4" fill="#a98be8" />
              <circle cx="620" cy="560" r="4" fill="#a98be8" />
              <circle cx="800" cy="443" r="3" fill="#9eea9a" filter="url(#neonGreenGlow)" />
            </g>

            {/* Inverted Structural Secondary Drafting Triangle */}
            <g className="anim-triangle-a">
              <polygon
                points="800,690 1060,270 540,270"
                fill="none"
                stroke="#3a393b"
                strokeWidth="1.2"
                strokeDasharray="4 6"
              />
              <circle cx="800" cy="690" r="3" fill="#3a393b" />
              <circle cx="1060" cy="270" r="3" fill="#3a393b" />
              <circle cx="540" cy="270" r="3" fill="#3a393b" />
            </g>

            {/* Stage 1: Ingestion Diamond Structural Matrix */}
            <polygon
              points="220,330 300,450 220,570 140,450"
              fill="none"
              stroke="#3a393b"
              strokeWidth="1.2"
            />
            <line x1="140" y1="450" x2="300" y2="450" stroke="#242326" strokeWidth="1" />
            <line x1="220" y1="330" x2="220" y2="570" stroke="#242326" strokeWidth="1" />

            {/* Stage 2: Code Verification Hexagonal Lattice */}
            <polygon
              points="510,320 585,385 585,515 510,580 435,515 435,385"
              fill="none"
              stroke="rgba(169, 139, 232, 0.40)"
              strokeWidth="1.2"
            />
            <circle cx="510" cy="320" r="3" fill="#a98be8" />
            <circle cx="510" cy="580" r="3" fill="#a98be8" />

            {/* Stage 4: Statistical Normalization Octagonal Lattice */}
            <polygon
              points="1090,320 1165,365 1165,535 1090,580 1015,535 1015,365"
              fill="none"
              stroke="#3a393b"
              strokeWidth="1.2"
            />

            {/* Stage 5: Championship Apex Crown Starburst */}
            <g className="anim-triangle-c">
              <polygon
                points="1380,310 1470,450 1380,590 1290,450"
                fill="rgba(158, 234, 154, 0.04)"
                stroke="#9eea9a"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              <circle cx="1380" cy="310" r="3.5" fill="#9eea9a" />
              <circle cx="1380" cy="590" r="3.5" fill="#9eea9a" />
            </g>
          </g>

          {/* LAYER 4: GRAND HORIZONTAL PIPELINE & 5 PROMINENT STAGE MILESTONES */}
          <g
            id="grand-pipeline-and-nodes"
            style={{
              transform: `translate(${fgOffsetX}px, ${fgOffsetY}px)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            {/* Heavy Backbone Conduit Line */}
            <line x1="80" y1="450" x2="1520" y2="450" stroke="#3a393b" strokeWidth="2.5" />
            <line x1="80" y1="450" x2="1520" y2="450" stroke="rgba(169, 139, 232, 0.45)" strokeWidth="1.5" strokeDasharray="10 14" />

            {/* Precision Micro Intermediate Stepper Nodes */}
            {[290, 360, 430, 580, 650, 720, 880, 950, 1020, 1170, 1240, 1310].map((px) => (
              <g key={px}>
                <line x1={px} y1="440" x2={px} y2="460" stroke="#3a393b" strokeWidth="1.2" />
                <circle cx={px} cy="450" r="2.5" fill="#090909" stroke="#5c5960" strokeWidth="1" />
              </g>
            ))}

            {/* 5 Expansive Prominent Milestone Nodes */}
            {stages.map((stage) => {
              const isTargetHovered = hoveredStage?.id === stage.id;
              const isCenterNode = stage.id === '3';
              const outerRadius = isCenterNode ? (isTargetHovered ? 64 : 54) : (isTargetHovered ? 52 : 42);
              const innerRadius = isCenterNode ? 32 : 24;

              return (
                <g
                  key={stage.id}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredStage(stage)}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  {/* Vertical Crosshair Guide Beam */}
                  <line
                    x1={stage.x}
                    y1="340"
                    x2={stage.x}
                    y2="560"
                    stroke={isTargetHovered ? '#a98be8' : '#3a393b'}
                    strokeWidth={isTargetHovered ? '2' : '1.2'}
                    strokeDasharray={isTargetHovered ? 'none' : '3 5'}
                    className="transition-colors duration-200"
                  />

                  {/* Outer Pulsing Kinetic Ring */}
                  <circle
                    cx={stage.x}
                    cy={stage.y}
                    r={outerRadius}
                    fill="#090909"
                    stroke={isTargetHovered ? '#a98be8' : isCenterNode ? '#5c5960' : '#2d2b30'}
                    strokeWidth={isTargetHovered ? 2.5 : 1.5}
                    className="transition-all duration-300"
                  />

                  {/* Mid Housing Ring */}
                  <circle
                    cx={stage.x}
                    cy={stage.y}
                    r={innerRadius}
                    fill="#0d0d10"
                    stroke={isTargetHovered ? '#bca1ee' : isCenterNode ? '#a98be8' : '#3a393b'}
                    strokeWidth={1.5}
                    className="transition-all duration-200"
                  />

                  {/* Core High-Contrast White / Green Beacon */}
                  <circle
                    cx={stage.x}
                    cy={stage.y}
                    r={isCenterNode ? 9 : 7}
                    fill={isTargetHovered ? '#9eea9a' : '#f1f0ed'}
                    filter={isTargetHovered || isCenterNode ? 'url(#greenNeonGlow)' : undefined}
                    className="transition-colors duration-200"
                  />

                  {/* Orbiting Phase Satellite Nodes */}
                  <circle cx={stage.x} cy={stage.y - (outerRadius + 8)} r="2.5" fill="#a98be8" />
                  <circle cx={stage.x} cy={stage.y + (outerRadius + 8)} r="2.5" fill="#a98be8" />

                  {/* Numeric Milestone Badge Above Node */}
                  <rect
                    x={stage.x - 22}
                    y="350"
                    width="44"
                    height="22"
                    fill="#0c0c0e"
                    stroke={isTargetHovered ? '#a98be8' : '#242326'}
                    strokeWidth="1.2"
                    className="transition-colors"
                  />
                  <text
                    x={stage.x}
                    y="365"
                    textAnchor="middle"
                    fill={isTargetHovered ? '#a98be8' : '#c8c6c3'}
                    fontSize="11"
                    fontFamily="'IBM Plex Mono', monospace"
                    fontWeight="bold"
                    letterSpacing="0.1em"
                  >
                    {stage.code}
                  </text>

                  {/* Primary Stage Headline Below Node */}
                  <text
                    x={stage.x}
                    y="590"
                    textAnchor="middle"
                    fill={isTargetHovered ? '#f1f0ed' : '#f1f0ed'}
                    fontSize="13"
                    fontWeight="bold"
                    fontFamily="'IBM Plex Mono', monospace"
                    letterSpacing="0.08em"
                    className="transition-colors uppercase"
                  >
                    {stage.label}
                  </text>

                  {/* Secondary Technical Detail Subtext */}
                  <text
                    x={stage.x}
                    y="612"
                    textAnchor="middle"
                    fill={isTargetHovered ? '#a98be8' : '#6e6c73'}
                    fontSize="10"
                    fontFamily="'IBM Plex Mono', monospace"
                    letterSpacing="0.04em"
                    className="transition-colors"
                  >
                    {stage.subtext}
                  </text>

                  {/* Telemetry Metric Pill */}
                  <rect
                    x={stage.x - 48}
                    y="628"
                    width="96"
                    height="18"
                    fill="#111014"
                    stroke="#1f1e24"
                    strokeWidth="1"
                  />
                  <text
                    x={stage.x}
                    y="640"
                    textAnchor="middle"
                    fill="#9eea9a"
                    fontSize="9"
                    fontFamily="'IBM Plex Mono', monospace"
                    fontWeight="bold"
                    letterSpacing="0.05em"
                  >
                    {stage.metric}
                  </text>
                </g>
              );
            })}
          </g>

          {/* LAYER 5: CONTINUOUS ACTIVE GREEN SIGNAL RUNNER (19.33s Journey Across 1600 Canvas) */}
          <g
            id="grand-green-signal-runner"
            style={{
              transform: `translate(${fgOffsetX}px, ${fgOffsetY}px)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <g transform="translate(220, 450)" className="anim-signal-point-grand">
              {/* Grand Outer Green Aura */}
              <circle cx="0" cy="0" r="32" fill="rgba(158, 234, 154, 0.14)" />
              {/* Mid Pulse Ring */}
              <circle cx="0" cy="0" r="18" fill="none" stroke="#9eea9a" strokeWidth="1.5" opacity="0.9" />
              {/* Solid High-Intensity Beacon Core */}
              <circle cx="0" cy="0" r="7.5" fill="#9eea9a" filter="url(#neonGreenGlow)" />
            </g>
          </g>

          {/* LAYER 6: INTERACTIVE CURSOR DYNAMIC RETICLE & TELEMETRY HUD */}
          {isHovered && (
            <g
              id="interactive-grand-cursor"
              style={{
                transform: `translate(${cursorSvgX}px, ${cursorSvgY}px)`,
                transition: 'transform 0.04s linear',
              }}
              className="pointer-events-none"
            >
              {/* Outer Scanning Reticle Aura */}
              <circle cx="0" cy="0" r="38" fill="rgba(169, 139, 232, 0.08)" />
              <circle cx="0" cy="0" r="22" fill="none" stroke="#a98be8" strokeWidth="1" strokeDasharray="3 4" />
              
              {/* High-Precision Crosshair Lines */}
              <line x1="-48" y1="0" x2="-10" y2="0" stroke="#a98be8" strokeWidth="1.2" />
              <line x1="10" y1="0" x2="48" y2="0" stroke="#a98be8" strokeWidth="1.2" />
              <line x1="0" y1="-48" x2="0" y2="-10" stroke="#a98be8" strokeWidth="1.2" />
              <line x1="0" y1="10" x2="0" y2="48" stroke="#a98be8" strokeWidth="1.2" />

              {/* Active Green Tracking Pivot */}
              <circle cx="0" cy="0" r="4" fill="#9eea9a" filter="url(#neonGreenGlow)" />

              {/* Cursor Float Telemetry HUD Badge */}
              <g transform="translate(54, -36)">
                <rect width="160" height="52" fill="#090909" stroke="#3a393b" strokeWidth="1.2" />
                <rect x="0" y="0" width="4" height="52" fill="#a98be8" />
                <text x="12" y="18" fill="#f1f0ed" fontSize="10" fontFamily="'IBM Plex Mono', monospace" fontWeight="bold">
                  PRECISION TARGET
                </text>
                <text x="12" y="34" fill="#9eea9a" fontSize="9" fontFamily="'IBM Plex Mono', monospace">
                  X:{cursorSvgX} | Y:{cursorSvgY}
                </text>
                <text x="12" y="46" fill="#a98be8" fontSize="8" fontFamily="'IBM Plex Mono', monospace">
                  VECTOR: {cursorAngle}° | 60FPS
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
