import React from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  GitCompareArrows,
  Settings,
  Scale,
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
    <aside className="w-64 bg-slate-900 dark:bg-slate-950 text-white flex flex-col shrink-0 border-r border-slate-800 dark:border-slate-800/80 transition-colors">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 dark:border-slate-800/80 space-x-3">
        <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-teal-500/20">
          <Scale className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white block leading-tight">
            Cotizfy
          </span>
          <span className="text-[11px] text-teal-400 font-medium block">
            Desktop Price Matrix
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 dark:hover:bg-slate-900/60"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${isActive ? "text-teal-400" : "text-slate-400"}`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 dark:border-slate-800/80 text-xs text-slate-500">
        <p className="font-medium text-slate-400">Cotizfy Engine</p>
        <p className="text-[11px] mt-0.5">Electron · React · SQLite</p>
      </div>
    </aside>
  );
};
