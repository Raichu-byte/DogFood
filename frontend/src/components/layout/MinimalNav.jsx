import React from 'react';
import { Bell, LogIn, LogOut, User, Sparkles, Send, Trophy } from 'lucide-react';

/**
 * MinimalNav
 * 
 * Minimal, lightweight editorial top navigation specified in Section 15 of Dogfood_Design_Reference.md.
 */
export default function MinimalNav({
  activeTab,
  setActiveTab,
  currentUser,
  token,
  unreadCount,
  onOpenAuth,
  onLogout,
  onToggleNotificationDrawer,
  onOpenSubmitModal
}) {
  const navTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'gallery', label: 'Projects' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'announcements', label: 'Broadcasts' },
    { id: 'hackers', label: 'Builders' },
    { id: 'mentors', label: 'Mentors' },
    { id: 'activity', label: 'Feed' },
    { id: 'judging', label: 'Judging' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#070609]/90 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)] px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Left: Clean Brand Wordmark */}
        <div
          onClick={() => setActiveTab('overview')}
          className="cursor-pointer flex items-center space-x-2.5 group select-none"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#bfa5ff] shadow-[0_0_10px_#7a4ee0]"></div>
          <span className="font-sans font-bold text-sm tracking-widest text-[#f5f4f8] group-hover:text-[#bfa5ff] transition-colors">
            DOGFOOD
          </span>
          <span className="hidden sm:inline-block text-[9px] font-mono tracking-widest px-2 py-0.5 rounded-full bg-[#13111b] border border-[rgba(191,165,255,0.2)] text-[#bfa5ff]">
            2026
          </span>
        </div>

        {/* Center: Minimal Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 bg-[#0c0b12] border border-[rgba(255,255,255,0.07)] p-1 rounded-full text-xs font-sans">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-full transition-all duration-200 font-medium select-none ${
                  isActive
                    ? 'bg-[#1e1a2c] text-[#f5f4f8] border border-[rgba(191,165,255,0.3)] shadow-sm'
                    : 'text-[#8b8899] hover:text-[#c5c3d0]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions & User Capsule */}
        <div className="flex items-center space-x-3 text-xs font-sans">
          
          {/* In-App Notification Bell with Unread Badge */}
          {token && (
            <button
              onClick={onToggleNotificationDrawer}
              className="relative p-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[#0c0b12] hover:border-[rgba(191,165,255,0.3)] text-[#c5c3d0] hover:text-white transition-all"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#7a4ee0] text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-lg animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* User Auth Capsule / Login Pill */}
          {token && currentUser ? (
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#13111b] border border-[rgba(255,255,255,0.08)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9eea9a]"></span>
                <span className="font-medium text-[#f5f4f8] text-xs">{currentUser.name || currentUser.email}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1e1a2c] text-[#bfa5ff]">
                  {currentUser.role}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="p-2 rounded-full border border-[rgba(255,255,255,0.08)] bg-[#0c0b12] hover:border-red-500/40 text-[#8b8899] hover:text-red-400 transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="pill-cta px-4 sm:px-5 py-2 text-xs flex items-center space-x-1.5 font-semibold"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Horizontal Navigation Tabs Bar */}
      <div className="flex md:hidden overflow-x-auto space-x-2 pt-3 pb-1 border-t border-[rgba(255,255,255,0.04)] mt-3">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium transition ${
                isActive
                  ? 'bg-[#1e1a2c] text-[#f5f4f8] border border-[rgba(191,165,255,0.3)]'
                  : 'text-[#8b8899] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
