import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Globe,
  Database,
  Cpu,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Sun,
  Moon,
  Laptop,
  Palette,
} from "lucide-react";
import { switchLanguage } from "../i18n";
import { checkDatabase } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import type { ThemeMode } from "../../electron/preload/types";
import { PageHeader } from "../components/common/PageHeader";

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, effectiveTheme, setTheme } = useTheme();
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    message?: string;
  } | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [savedLangNotice, setSavedLangNotice] = useState<boolean>(false);
  const [savedThemeNotice, setSavedThemeNotice] = useState<boolean>(false);

  const testDb = async () => {
    setChecking(true);
    const res = await checkDatabase();
    setDbStatus(res);
    setChecking(false);
  };

  useEffect(() => {
    testDb();
  }, []);

  const handleLangChange = async (lng: "es" | "en") => {
    await switchLanguage(lng);
    setSavedLangNotice(true);
    setTimeout(() => setSavedLangNotice(false), 2500);
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    setSavedThemeNotice(true);
    setTimeout(() => setSavedThemeNotice(false), 2500);
  };

  return (
    <div className="page-content max-w-5xl space-y-7 transition-colors">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.subtitle")}
      />

      {savedThemeNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-sm flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{t("settings.appearance.changedNotification")}</span>
        </div>
      )}

      {savedLangNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-sm flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{t("settings.language.changedNotification")}</span>
        </div>
      )}

      {/* Theme & Appearance Section */}
      <div className="surface-card space-y-4 p-6 transition-colors">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t("settings.appearance.title")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("settings.appearance.description")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Light Mode */}
          <button
            type="button"
            onClick={() => handleThemeChange("light")}
            aria-pressed={theme === "light"}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
              theme === "light"
                ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 ring-2 ring-teal-500/20"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Sun className="w-4 h-4" />
              </div>
              {theme === "light" && (
                <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {t("settings.appearance.light")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("settings.appearance.lightDesc")}
              </p>
            </div>
          </button>

          {/* Dark Mode */}
          <button
            type="button"
            onClick={() => handleThemeChange("dark")}
            aria-pressed={theme === "dark"}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
              theme === "dark"
                ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 ring-2 ring-teal-500/20"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </div>
              {theme === "dark" && (
                <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {t("settings.appearance.dark")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("settings.appearance.darkDesc")}
              </p>
            </div>
          </button>

          {/* System Mode */}
          <button
            type="button"
            onClick={() => handleThemeChange("system")}
            aria-pressed={theme === "system"}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
              theme === "system"
                ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 ring-2 ring-teal-500/20"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <Laptop className="w-4 h-4" />
              </div>
              {theme === "system" && (
                <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                  {t("settings.appearance.system")}
                </p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase font-mono">
                  {effectiveTheme}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t("settings.appearance.systemDesc")}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Language Section */}
      <div className="surface-card space-y-4 p-6 transition-colors">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t("settings.language.title")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("settings.language.description")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <button
            type="button"
            onClick={() => handleLangChange("es")}
            className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
              i18n.language === "es"
                ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 ring-2 ring-teal-500/20"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60"
            }`}
          >
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {t("settings.language.es")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Español (Predeterminado)
              </p>
            </div>
            {i18n.language === "es" && (
              <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleLangChange("en")}
            className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
              i18n.language === "en"
                ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 ring-2 ring-teal-500/20"
                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60"
            }`}
          >
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                {t("settings.language.en")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                English (US)
              </p>
            </div>
            {i18n.language === "en" && (
              <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            )}
          </button>
        </div>
      </div>

      {/* SQLite & Prisma Database Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t("settings.database.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("settings.database.description")}
              </p>
            </div>
          </div>
          <button
            onClick={testDb}
            disabled={checking}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`}
            />
            <span>{t("settings.database.checkButton")}</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
          {dbStatus?.connected ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-slate-700 dark:text-slate-200 font-medium">
                {t("settings.database.connected")}
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                ({dbStatus.message})
              </span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span className="text-red-700 dark:text-red-400 font-medium">
                {t("settings.database.error")}
              </span>
              <span className="text-red-500">
                ({dbStatus?.message || t("settings.database.unavailable")})
              </span>
            </>
          )}
        </div>
      </div>

      {/* System info */}
      <div className="surface-card space-y-4 p-6 transition-colors">
        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t("settings.systemInfo.title")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("settings.systemInfo.description")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 block">
              {t("settings.systemInfo.desktopEngine")}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Electron
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 block">
              {t("settings.systemInfo.frontend")}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              React 18 + Vite
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 block">
              {t("settings.systemInfo.orm")}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Prisma 5.22 + SQLite
            </span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 block">
              {t("settings.systemInfo.internationalization")}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              i18next (ES/EN)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
