import React, { useEffect, useRef, useState } from 'react';
import { Menu, X, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.webp`;

// Shared responsive shell used by both the Admin and Waiter dashboards.
// Navigation items come from role-specific config passed in via `navItems`.
export const AppShell = ({ navItems, activeId, onNavigate, roleLabel, userName, userEmail, onSignOut, badges = {}, children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const profileRef = useRef(null);
  const profileBtnRef = useRef(null);

  const initial = (userName || userEmail || '?').trim().charAt(0).toUpperCase();

  // Close drawer on Escape; lock body scroll while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        menuBtnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Profile menu: close on outside click / Escape.
  useEffect(() => {
    if (!profileOpen) return undefined;
    const onDown = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        profileBtnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  const visible = navItems.filter((i) => !(i.hideWhenZero && !badges[i.badge]));

  const NavList = ({ compact, onPick }) => (
    <nav aria-label={`${roleLabel} navigation`} className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {visible.map((item) => {
        const Icon = item.icon;
        const active = item.id === activeId;
        const count = item.badge ? badges[item.badge] : 0;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item)}
            aria-current={active ? 'page' : undefined}
            title={compact ? item.label : undefined}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2570C] ${
              active ? 'bg-[#FDF3EA] text-[#C2570C] font-semibold' : 'text-[#4A433E] hover:bg-[#F3F0EB]'
            } ${compact ? 'justify-center' : ''}`}
          >
            <span className="relative shrink-0">
              <Icon className="w-[18px] h-[18px]" />
              {compact && count > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#C2570C]" />}
            </span>
            {!compact && <span className="truncate">{item.label}</span>}
            {!compact && count > 0 && (
              <span className="ml-auto min-w-5 text-center px-1.5 py-0.5 rounded-full bg-[#C2570C] text-white text-[10px] font-bold">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  // Sidebar / drawer brand block: logo image instead of the old icon
  const Brand = ({ compact }) => (
    <div className={`flex items-center gap-2.5 h-14 px-3 border-b border-[#E8E4DE] ${compact ? 'justify-center' : ''}`}>
      <img src={LOGO_SRC} alt="MLA Desi Dhaba" className="w-9 h-9 rounded-full object-cover shrink-0 border border-[#E8E4DE]" />
      {!compact && (
        <div className="leading-tight min-w-0">
          <div className="text-sm font-semibold text-[#2B2623] truncate">MLA Desi Dhaba</div>
          <div className="text-[10px] uppercase tracking-wider text-[#C2570C] font-semibold">{roleLabel}</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#2B2623] flex">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-white border-r border-[#E8E4DE] sticky top-0 h-screen transition-[width] duration-150 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <Brand compact={collapsed} />
        <NavList compact={collapsed} onPick={(item) => onNavigate(item)} />
        <div className="p-2 border-t border-[#E8E4DE]">
          <button
            type="button"
            onClick={onSignOut}
            title="Logout"
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#4A433E] hover:bg-[#F3F0EB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2570C] ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 w-64 max-w-[85vw] bg-white border-r border-[#E8E4DE] flex flex-col"
          >
            <div className="flex items-center justify-between pr-2">
              <div className="flex-1 min-w-0"><Brand /></div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-lg text-[#6B635C] hover:bg-[#F3F0EB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2570C]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavList
              onPick={(item) => {
                setDrawerOpen(false);
                onNavigate(item);
              }}
            />
            <div className="p-2 border-t border-[#E8E4DE]">
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#4A433E] hover:bg-[#F3F0EB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2570C]"
              >
                <LogOut className="w-[18px] h-[18px]" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 h-14 bg-white border-b border-[#E8E4DE] flex items-center gap-2 px-3 sm:px-4">
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className="lg:hidden p-2 -ml-1 rounded-lg text-[#2B2623] hover:bg-[#F3F0EB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2570C]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className="hidden lg:inline-flex p-2 -ml-1 rounded-lg text-[#6B635C] hover:bg-[#F3F0EB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2570C]"
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          {/* <h1></h1> */}

          {/* Mobile header brand (sidebar is hidden on mobile) */}
          <div className="flex items-center gap-2 min-w-0 lg:hidden">
            <img src={LOGO_SRC} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#E8E4DE]" />
            <span className="text-sm font-semibold truncate">MLA Desi Dhaba</span>
          </div>

          <div className="ml-auto flex items-center gap-2 min-w-0">
            
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#C2570C] bg-[#FDF3EA] px-2 py-0.5 rounded-md">
              {roleLabel}
            </span>

            {/* Profile circle: click to show Logout */}
            <div className="relative" ref={profileRef}>
              <button
                ref={profileBtnRef}
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                className="w-9 h-9 rounded-full bg-[#FDF3EA] border border-[#F0DCC8] text-[#C2570C] text-sm font-semibold flex items-center justify-center hover:bg-[#FBE8D6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2570C]"
              >
                {initial}
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-1.5rem)] bg-white border border-[#E8E4DE] rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-[#E8E4DE]">
                    <div className="text-sm font-semibold truncate">{userName}</div>
                    {userEmail && <div className="text-xs text-[#6B635C] truncate">{userEmail}</div>}
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-700 hover:bg-red-50 focus:outline-none focus-visible:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};