import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Database, ShieldCheck, Sun, Moon, Laptop } from "lucide-react";
import { LanguageSelector } from "../common/LanguageSelector";
import { checkDatabase, api } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

interface HeaderProps {
  currentTab: string;
}

export const Header: React.FC<HeaderProps> = ({ currentTab }) => {
  const { t } = useTranslation();
  const { theme, effectiveTheme, setTheme } = useTheme();
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [appVersion, setAppVersion] = useState<string>("1.0.0");

  useEffect(() => {
    checkDatabase().then((res) => {
      setDbConnected(res.connected);
    });

    api.getAppVersion().then((ver) => {
      if (ver) setAppVersion(ver);
    });
  }, []);

  const cycleTheme = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  return (
    <header className="app-header flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex">
          <span>Cotizfy</span>
          <span aria-hidden="true">/</span>
        </div>
        <h1 className="truncate text-sm font-semibold text-slate-800 dark:text-white">
          {t(`nav.${currentTab}`)}
        </h1>
        <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:inline-flex">
          v{appVersion}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Quick Theme Cycle Button */}
        <button
          type="button"
          onClick={cycleTheme}
          aria-label={`${t("settings.appearance.title")}: ${t(`settings.appearance.${theme}`)}`}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          title={`${t(`settings.appearance.${theme}`)} · ${effectiveTheme}`}
        >
          {theme === "light" && <Sun className="w-3.5 h-3.5 text-amber-500" />}
          {theme === "dark" && <Moon className="w-3.5 h-3.5 text-indigo-400" />}
          {theme === "system" && (
            <Laptop className="w-3.5 h-3.5 text-teal-500" />
          )}
          <span className="hidden capitalize sm:inline">
            {t(`settings.appearance.${theme}`)}
          </span>
        </button>

        {/* Database Status indicator */}
        <div
          className="header-status hidden h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium dark:border-slate-800 dark:bg-slate-900 sm:flex"
          title={dbConnected ? t("app.connected") : t("app.disconnected")}
          aria-label={`${t("settings.database.title")}: ${dbConnected === true ? t("app.connected") : dbConnected === false ? t("app.disconnected") : t("common.loading")}`}
        >
          <Database className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="text-slate-600 dark:text-slate-300">SQLite</span>
          <span
            className={`w-2 h-2 rounded-full ${
              dbConnected === true
                ? "bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900"
                : dbConnected === false
                  ? "bg-red-500 ring-2 ring-red-200 dark:ring-red-900"
                  : "bg-amber-400"
            }`}
          />
        </div>

        {/* Security badge */}
        <div className="header-security hidden h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 lg:flex">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>IPC Sandbox</span>
        </div>

        {/* Global Language Selector */}
        <LanguageSelector />
      </div>
    </header>
  );
};
