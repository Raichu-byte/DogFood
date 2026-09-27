import React from 'react';

export default function KineticHero({ onExploreClick, onLeaderboardClick }) {
  const stages = [
    { id: '1', label: 'INBOUND SUBMISSIONS', x: 160 },
    { id: '2', label: 'CODE VERIFICATION', x: 380 },
    { id: '3', label: 'RUBRIC EVALUATION', x: 600 },
    { id: '4', label: 'Z-SCORE NORMALIZATION', x: 820 },
    { id: '5', label: 'AWARD CEREMONY', x: 1040 },
  ];

  return (
    <div className="relative w-full border border-[#242326] bg-[#090909] text-[#f1f0ed] overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl">
      {/* Top micro annotations */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-[#242326] text-[10px] font-mono tracking-widest text-[#c8c6c3]">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9eea9a] animate-pulse"></span>
          <span>SYSTEM RUNTIME // 100% OFFLINE-FIRST</span>
        </div>
        <div className="hidden sm:flex items-center space-x-4">
          <span>LATENCY: ZERO CLOUD CALLS</span>
          <span>CALIBRATION: Z-SCORE</span>
        </div>
      </div>

      {/* Main Kinetic Geometric Artwork Viewport */}
      <div className="relative w-full h-[360px] sm:h-[420px] md:h-[500px] flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 1200 600"
          className="w-full h-full object-cover select-none pointer-events-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Soft purple gradient for accent lines */}
            <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a98be8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a98be8" stopOpacity="0.05" />
            </linearGradient>
            {/* Subtle green glow filter */}
            <filter id="greenGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. BACKGROUND GEOMETRY & DIAGONAL LINES */}
          <g id="background-geometry" className="anim-diag-line">
            <line x1="0" y1="120" x2="1200" y2="480" stroke="#242326" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="0" y1="480" x2="1200" y2="120" stroke="#242326" strokeWidth="1" strokeDasharray="4 6" />
            <line x1="200" y1="0" x2="600" y2="600" stroke="#1d1c1f" strokeWidth="1" />
            <line x1="1000" y1="0" x2="600" y2="600" stroke="#1d1c1f" strokeWidth="1" />
            <line x1="600" y1="0" x2="600" y2="600" stroke="#242326" strokeWidth="1" strokeDasharray="2 4" />
          </g>

          {/* 2. LARGE EXPANDING CIRCLES (Animated Phase Layers) */}
          <g id="large-circles">
            {/* Left circular geometry cluster */}
            <g className="anim-circle-left">
              <circle cx="280" cy="280" r="140" fill="none" stroke="#3a393b" strokeWidth="1" />
              <circle cx="280" cy="280" r="220" fill="none" stroke="#242326" strokeWidth="1" strokeDasharray="2 4" />
              <circle cx="280" cy="280" r="80" fill="none" stroke="rgba(169, 139, 232, 0.35)" strokeWidth="1" />
              <circle cx="280" cy="280" r="4" fill="#3a393b" />
            </g>

            {/* Center concentric circular geometry */}
            <g className="anim-circle-center">
              <circle cx="600" cy="280" r="90" fill="none" stroke="#3a393b" strokeWidth="1" />
              <circle cx="600" cy="280" r="170" fill="none" stroke="rgba(169, 139, 232, 0.40)" strokeWidth="1" />
              <circle cx="600" cy="280" r="260" fill="none" stroke="#242326" strokeWidth="1" />
              <circle cx="600" cy="280" r="330" fill="none" stroke="#1d1c1f" strokeWidth="1" strokeDasharray="3 6" />
            </g>

            {/* Right circular arc geometry */}
            <g className="anim-circle-right">
              <circle cx="920" cy="280" r="130" fill="none" stroke="#3a393b" strokeWidth="1" />
              <circle cx="920" cy="280" r="210" fill="none" stroke="rgba(169, 139, 232, 0.25)" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="920" cy="280" r="310" fill="none" stroke="#242326" strokeWidth="1" />
            </g>
          </g>

          {/* 3. OUTLINED CONSTRUCTION TRIANGLES (Key Identity Elements) */}
          <g id="triangles">
            {/* Triangle 1: Left / Center interaction */}
            <g className="anim-triangle-a">
              <polygon
                points="380,180 460,320 300,320"
                fill="none"
                stroke="#5c5960"
                strokeWidth="1"
              />
              <circle cx="380" cy="180" r="2" fill="#5c5960" />
              <circle cx="460" cy="320" r="2" fill="#5c5960" />
              <circle cx="300" cy="320" r="2" fill="#5c5960" />
            </g>

            {/* Triangle 2: Center / Right intersection */}
            <g className="anim-triangle-b">
              <polygon
                points="680,190 770,350 590,350"
                fill="none"
                stroke="rgba(169, 139, 232, 0.45)"
                strokeWidth="1"
              />
              <line x1="680" y1="190" x2="680" y2="350" stroke="rgba(169, 139, 232, 0.2)" strokeWidth="1" strokeDasharray="2 3" />
            </g>

            {/* Triangle 3: Upright right accent */}
            <g className="anim-triangle-c">
              <polygon
                points="820,150 910,290 730,290"
                fill="none"
                stroke="#5c5960"
                strokeWidth="1"
              />
            </g>
          </g>

          {/* 4. HORIZONTAL PIPELINE BASELINE & STAGE NODES */}
          <g id="pipeline">
            {/* Continuous horizontal baseline */}
            <line x1="60" y1="300" x2="1140" y2="300" stroke="#3a393b" strokeWidth="1" />

            {/* Small intermediate hollow points */}
            {[235, 310, 455, 530, 675, 750, 895, 970].map((px) => (
              <g key={px}>
                <circle cx={px} cy="300" r="3" fill="#090909" stroke="#5c5960" strokeWidth="1" />
                <line x1={px} y1="290" x2={px} y2="310" stroke="#242326" strokeWidth="1" />
              </g>
            ))}

            {/* Main Stage Circular Nodes */}
            {stages.map((stage) => (
              <g key={stage.id}>
                {/* Vertical node guide */}
                <line x1={stage.x} y1="270" x2={stage.x} y2="330" stroke="#3a393b" strokeWidth="1" />

                {/* Concentric node rings */}
                <circle cx={stage.x} cy="300" r="22" fill="#090909" stroke="#3a393b" strokeWidth="1" />
                <circle cx={stage.x} cy="300" r="14" fill="#090909" stroke="#5c5960" strokeWidth="1" />
                <circle cx={stage.x} cy="300" r="5" fill="#f1f0ed" />

                {/* Sub-node orbiting points */}
                <circle cx={stage.x} cy="278" r="2" fill="#a98be8" />
                <circle cx={stage.x} cy="322" r="2" fill="#a98be8" />

                {/* Technical Stage Label */}
                <text
                  x={stage.x}
                  y="360"
                  textAnchor="middle"
                  fill="#c8c6c3"
                  fontSize="10"
                  fontFamily="'IBM Plex Mono', monospace"
                  letterSpacing="0.08em"
                >
                  {stage.label}
                </text>
              </g>
            ))}
          </g>

          {/* 5. ACTIVE GREEN SIGNAL TRAVELLER (19.33s Journey) */}
          <g id="signal-points">
            <g transform="translate(160, 300)" className="anim-signal-point">
              {/* Outer soft green aura */}
              <circle cx="0" cy="0" r="16" fill="rgba(158, 234, 154, 0.15)" />
              {/* Mid green ring */}
              <circle cx="0" cy="0" r="9" fill="none" stroke="#9eea9a" strokeWidth="1" opacity="0.8" />
              {/* Solid active focal core */}
              <circle cx="0" cy="0" r="4.5" fill="#9eea9a" filter="url(#greenGlow)" />
            </g>
          </g>
        </svg>
      </div>

      {/* Bottom Editorial Zone: Large Headline & Lavender CTA */}
      <div className="border-t border-[#242326] p-8 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-8 bg-[#0a0a0a]">
        {/* Left Headline */}
        <div className="space-y-3 max-w-2xl">
          <p className="text-xs font-mono text-[#a98be8] tracking-widest font-semibold">
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
