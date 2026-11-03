import React, { useEffect, useRef, useState } from 'react';
import { Menu, X, LogOut, PanelLeftClose, PanelLeftOpen, UserRound } from 'lucide-react';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.webp`;

// Shared responsive shell used by both the Admin and Waiter dashboards.
// Navigation items come from role-specific config passed in via `navItems`.
export const AppShell = ({ navItems, activeId, onNavigate, roleLabel, userName, userEmail, onSignOut, badges = {}, children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const drawerRef = useRef(null);
  const profileRef = useRef(null);
  const profileBtnRef = useRef(null);

  const initial = (userName || userEmail || '?').trim().charAt(0).toUpperCase();

  // Close drawer on Escape; lock body scroll while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    drawerRef.current?.querySelector('button')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        menuBtnRef.current?.focus();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = drawerRef.current?.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && (document.activeElement === first || !drawerRef.current.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !drawerRef.current.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
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
    <nav aria-label={`${roleLabel} navigation`} className="flex-1 overflow-y-auto p-3 space-y-1">
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
            className={`w-full min-h-11 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              active ? 'bg-primary-foreground/15 text-primary-foreground font-semibold shadow-inner' : 'text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground'
            } ${compact ? 'justify-center' : ''}`}
          >
            <span className="relative shrink-0">
              <Icon className="w-5 h-5" />
              {compact && count > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" />}
            </span>
            {!compact && <span className="truncate">{item.label}</span>}
            {!compact && count > 0 && (
              <span className="ml-auto min-w-5 text-center px-1.5 py-0.5 rounded-full bg-accent text-primary-foreground text-[10px] font-bold">
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
    <div className={`flex items-center gap-3 min-h-20 px-4 border-b border-primary-foreground/15 ${compact ? 'justify-center' : ''}`}>
      <img src={LOGO_SRC} alt="MLA Desi Dhaba" className="w-10 h-10 rounded-full object-cover shrink-0 border border-primary-foreground/20" />
      {!compact && (
        <div className="leading-tight min-w-0">
          <div className="text-sm font-semibold text-primary-foreground truncate">MLA Desi Dhaba</div>
          <div className="text-[10px] uppercase tracking-wider text-accent-soft font-semibold">{roleLabel} workspace</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-primary border-r border-primary-hover sticky top-0 h-dvh transition-[width] duration-300 ease-out ${
          collapsed ? 'w-18' : 'w-64'
        }`}
      >
        <Brand compact={collapsed} />
        <NavList compact={collapsed} onPick={(item) => onNavigate(item)} />
        <div className="p-3 border-t border-primary-foreground/15">
          <div className={`mb-2 flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 text-primary-foreground ${collapsed ? 'justify-center' : ''}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-foreground/15 text-sm font-semibold" aria-hidden="true">
              {initial}
            </span>
            {!collapsed && (
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-semibold">{userName || 'Account'}</span>
                <span className="block truncate text-xs text-primary-foreground/70">{userEmail || roleLabel}</span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onSignOut}
            title="Logout"
            className={`w-full min-h-11 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-in fade-in" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 left-0 w-72 max-w-[88vw] bg-primary border-r border-primary-hover flex flex-col shadow-lg animate-in slide-in-from-left duration-200"
          >
            <div className="flex items-center justify-between pr-2">
              <div className="flex-1 min-w-0"><Brand /></div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="min-w-11 min-h-11 grid place-items-center rounded-lg text-primary-foreground/75 hover:bg-primary-foreground/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
            <div className="p-3 border-t border-primary-foreground/15">
              <button
                type="button"
                onClick={onSignOut}
                className="w-full min-h-11 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 min-h-16 bg-surface/95 backdrop-blur border-b border-border flex items-center gap-1.5 px-2 sm:gap-2 sm:px-6">
          <button
            ref={menuBtnRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className="lg:hidden min-w-11 min-h-11 grid place-items-center -ml-1 rounded-xl text-primary hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className="hidden lg:inline-flex min-w-11 min-h-11 items-center justify-center -ml-1 rounded-xl text-muted-foreground hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          {/* <h1></h1> */}

          {/* Mobile header brand (sidebar is hidden on mobile) */}
          <div className="flex items-center gap-2 min-w-0 flex-1 lg:hidden">
            <img src={LOGO_SRC} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-border" />
            <span className="text-sm font-bold text-primary truncate">MLA Desi Dhaba</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5 min-w-0 shrink-0 sm:gap-2">
            
            <span className="max-w-20 sm:max-w-none truncate text-[10px] uppercase tracking-wider font-bold text-primary bg-primary-soft px-2 sm:px-3 py-1.5 rounded-full">
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
                className="w-11 h-11 shrink-0 rounded-full bg-primary-soft border border-border text-primary text-sm font-semibold flex items-center justify-center hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {initial}
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-1rem)] bg-surface border border-border rounded-xl shadow-md overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex gap-2 items-center"><UserRound className="w-4 h-4 text-primary shrink-0" /><div className="text-sm font-semibold truncate">{userName}</div></div>
                    {userEmail && <div className="text-xs text-muted-foreground truncate pl-6">{userEmail}</div>}
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      onSignOut();
                    }}
                    className="w-full min-h-11 flex items-center gap-2.5 px-4 py-3 text-sm text-danger-foreground hover:bg-danger-soft focus:outline-none focus-visible:bg-danger-soft"
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