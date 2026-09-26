import React, { useState, useEffect } from 'react';

export default function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'offline' }));
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-[#f3f4f6] flex flex-col justify-between p-8 font-sans selection:bg-[#ff5500]/30 selection:text-white">
      <header className="flex justify-between items-center border-b border-[#222733] pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#ff5500] flex items-center justify-center font-black text-black">
            D
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">DOGFOOD 2026</h1>
            <p className="text-xs text-neutral-400 font-mono">BUILD • BREAK • SHIP • BITE</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#111318] text-neutral-300 border border-[#222733]">
            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${health?.status === 'ok' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            API: {health?.status === 'ok' ? 'CONNECTED' : 'STANDBY'}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto my-auto text-center py-20">
        <div className="inline-block px-3 py-1 mb-6 text-xs font-mono text-[#ff5500] bg-[#ff5500]/10 border border-[#ff5500]/20 rounded-full">
          PHASE 1 ENVIRONMENT BASELINE ACTIVE
        </div>
        <h2 className="text-5xl sm:text-7xl font-black tracking-tight mb-6">
          THE PLAYGROUND <br />FOR BUILDERS.
        </h2>
        <p className="text-lg text-neutral-400 max-w-xl mx-auto leading-relaxed mb-10">
          Open-source, self-hostable hackathon management platform with mathematical judging normalization and defensible role isolation.
        </p>
      </main>

      <footer className="border-t border-[#222733] pt-6 flex justify-between items-center text-xs font-mono text-neutral-500">
        <span>DOGFOOD 2026 PLATFORM</span>
        <span>SELF-HOSTED • OFFLINE FIRST</span>
      </footer>
    </div>
  );
}
