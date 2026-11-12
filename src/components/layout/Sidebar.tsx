import React from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  GitCompareArrows,
  Settings,
  Scale,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
}) => {
  const { t } = useTranslation();

  const navItems = [
    { id: "dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { id: "projects", label: t("nav.projects"), icon: FolderKanban },
    { id: "suppliers", label: t("nav.suppliers"), icon: Users },
    { id: "compare", label: t("nav.compare"), icon: GitCompareArrows },
    { id: "settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <aside className="app-sidebar flex w-[236px] shrink-0 flex-col border-r border-slate-200 bg-white text-slate-900 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Brand */}
      <div className="app-sidebar-brand flex h-[72px] items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-900/15 dark:bg-teal-500 dark:text-slate-950">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <span className="block text-base font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
            Cotizfy
          </span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            {t("app.tagline")}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav
        aria-label={t("nav.workspace")}
        className="flex-1 space-y-1 px-3 py-5"
      >
        <p className="app-sidebar-label mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {t("nav.workspace", { defaultValue: "Workspace" })}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
              className={`app-nav-item group relative mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-[11px] text-left text-[13px] font-medium transition-all duration-150 focus-visible:outline-teal-500 ${
                isActive
                  ? "bg-teal-50 text-teal-800 shadow-sm dark:bg-teal-950/60 dark:text-teal-300"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-teal-700 dark:text-teal-300" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"}`}
              />
              <span className="app-nav-label flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="app-nav-chevron h-4 w-4 text-teal-700 dark:text-teal-300" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="app-sidebar-footer border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900">
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
            Cotizfy Desktop
          </p>
          <p className="mt-1 text-[10px] text-slate-400">Electron · SQLite</p>
        </div>
      </div>
    </aside>
  );
};
