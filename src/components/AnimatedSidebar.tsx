import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LayoutGrid,
  LogIn,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react';
import type { AppView, User as PlatformUser } from '../types';

interface AnimatedSidebarProps {
  currentView: AppView;
  currentUser: PlatformUser | null;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  onOpenAuth: (mode?: 'login' | 'signup' | 'parent') => void;
}

const COLLAPSED_KEY = 'motafalsifa_sidebar_collapsed';

export const AnimatedSidebar: React.FC<AnimatedSidebarProps> = ({
  currentView,
  currentUser,
  onNavigate,
  onLogout,
  onOpenAuth,
}) => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      // Ignore storage errors.
    }
    document.documentElement.style.setProperty('--motafalsifa-sidebar-width', collapsed ? '76px' : '268px');
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [currentView]);

  useEffect(() => {
    const openSidebar = () => setMobileOpen(true);
    window.addEventListener('open-motafalsifa-sidebar', openSidebar);
    return () => window.removeEventListener('open-motafalsifa-sidebar', openSidebar);
  }, []);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'hos098sam@gmail.com';

  const items: Array<{ id: AppView; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'الرئيسية', icon: <LayoutGrid className="h-5 w-5 shrink-0" /> },
    { id: 'courses', label: 'الكورسات', icon: <BookOpen className="h-5 w-5 shrink-0" /> },
    ...(currentUser ? [{ id: 'my_courses' as AppView, label: 'كورساتي الحالية', icon: <GraduationCap className="h-5 w-5 shrink-0" /> }] : []),
    { id: 'forum', label: 'ملتقى الطلاب', icon: <Users className="h-5 w-5 shrink-0" /> },
    ...(currentUser ? [{ id: 'my_account' as AppView, label: 'حسابي', icon: <User className="h-5 w-5 shrink-0" /> }] : []),
    { id: 'competitions', label: 'المسابقات والجوائز', icon: <Trophy className="h-5 w-5 shrink-0" /> },
    ...(currentUser?.role === 'parent' ? [{ id: 'parent_portal' as AppView, label: 'بوابة ولي الأمر', icon: <Users className="h-5 w-5 shrink-0" /> }] : []),
    ...(currentUser?.role === 'teacher' ? [{ id: 'teacher_dashboard' as AppView, label: 'لوحة المعلم', icon: <Settings className="h-5 w-5 shrink-0" /> }] : []),
    ...(isAdmin ? [{ id: 'admin' as AppView, label: 'لوحة الكنترول', icon: <ShieldCheck className="h-5 w-5 shrink-0" /> }] : []),
  ];

  const navigate = (view: AppView) => {
    onNavigate(view);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sidebarContent = (isMobile = false) => {
    const compact = !isMobile && collapsed;
    return (
      <div className="flex h-full flex-col overflow-y-auto px-3 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
        <div className="flex flex-1 flex-col gap-5">
          <div className={`flex items-center ${compact ? 'justify-center' : 'justify-center px-1'}`}>
            {!compact && (
              <button type="button" onClick={() => navigate('home')} className="flex w-full items-center justify-center text-white transition-opacity hover:opacity-90 dark:text-[#151515]">
                <img src="/logo.png" alt="شعار منصة المتفلسفة" className="h-16 w-auto max-w-full rounded-xl object-contain shadow-md" />
              </button>
            )}
            {compact && <img src="/logo.png" alt="شعار منصة المتفلسفة" className="h-10 w-12 rounded-xl object-contain shadow-md" />}
          </div>

          {isMobile && (
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="إغلاق القائمة" className="flex w-full items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/15 dark:bg-neutral-100 dark:text-[#151515] dark:hover:bg-neutral-200">
              <span>إغلاق القائمة</span>
              <X className="h-4 w-4" />
            </button>
          )}

          {!isMobile && (
            <div className={`flex items-center ${compact ? 'justify-center' : 'justify-between px-2'}`}>
              {!compact && <span className="text-xs font-bold text-white/75 dark:text-neutral-600">تصغير النافذة</span>}
              <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={compact ? 'توسيع القائمة الجانبية' : 'تصغير النافذة'} title={compact ? 'توسيع القائمة الجانبية' : 'تصغير النافذة'} className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${compact ? 'bg-white text-slate-900 shadow-md dark:bg-[#151515] dark:text-white' : 'bg-white/15 text-white hover:bg-white/25 dark:bg-neutral-100 dark:text-[#151515] dark:hover:bg-neutral-200'}`}>
                {compact ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          )}

          <nav className="space-y-1.5" aria-label="القائمة الجانبية">
            {items.map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  title={item.label}
                  className={`flex h-11 w-full items-center rounded-xl text-right text-sm font-bold transition-all ${compact ? 'justify-center px-0' : 'gap-3 px-3.5'} ${active ? 'bg-white text-indigo-700 shadow-sm dark:bg-[#E31B23] dark:text-white' : 'text-white/85 hover:bg-white/10 hover:text-white dark:text-neutral-700 dark:hover:bg-neutral-100 dark:hover:text-[#151515]'}`}
                >
                  {item.icon}
                  {!compact && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3 dark:border-neutral-200">
          {currentUser ? (
            <button type="button" onClick={onLogout} title="تسجيل الخروج" className={`flex h-10 w-full items-center rounded-xl text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white dark:text-neutral-700 dark:hover:bg-neutral-100 dark:hover:text-[#E31B23] ${compact ? 'justify-center px-0' : 'gap-3 px-3.5'}`}>
              <LogOut className="h-4 w-4 shrink-0" />
              {!compact && <span>تسجيل الخروج</span>}
            </button>
          ) : (
            <button type="button" onClick={() => { onOpenAuth('login'); setMobileOpen(false); }} className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-xs font-black text-white transition hover:bg-indigo-700 ${compact ? 'px-0' : 'px-3.5'}`}>
              <LogIn className="h-4 w-4 shrink-0" />
              {!compact && <span>تسجيل الدخول</span>}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <aside className={`fixed right-0 top-0 z-[9997] hidden h-screen flex-col overflow-hidden border-l border-neutral-800 bg-[#151515] text-white shadow-2xl transition-[width] duration-300 dark:border-neutral-200 dark:bg-[#FFFFFF] dark:text-[#151515] md:flex ${collapsed ? 'w-[76px]' : 'w-[268px]'}`} dir="rtl">
        {sidebarContent(false)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[10001] flex bg-slate-950/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="h-full w-[min(86vw,320px)] bg-slate-950 text-white shadow-2xl dark:bg-[#FFFFFF] dark:text-[#151515]" onClick={(event) => event.stopPropagation()} dir="rtl">
            {sidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
