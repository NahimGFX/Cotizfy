import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./locales/es.json";
import en from "./locales/en.json";

const STORAGE_KEY = "cotizfy_language";

const resources = {
  es: { translation: es },
  en: { translation: en },
};

// Retrieve stored preference or default to Spanish ('es')
const savedLanguage =
  typeof window !== "undefined"
    ? localStorage.getItem(STORAGE_KEY) || "es"
    : "es";

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: "es",
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

// Sync with backend SQLite if running inside Electron
if (typeof window !== "undefined" && window.api?.getAppLanguage) {
  window.api
    .getAppLanguage()
    .then((lang) => {
      if (lang && (lang === "es" || lang === "en") && lang !== i18n.language) {
        i18n.changeLanguage(lang);
        localStorage.setItem(STORAGE_KEY, lang);
      }
    })
    .catch(() => {
      // Ignore fallback
    });
}

export const switchLanguage = async (language: "es" | "en"): Promise<void> => {
  await i18n.changeLanguage(language);
  localStorage.setItem(STORAGE_KEY, language);

  if (typeof window !== "undefined" && window.api?.setAppLanguage) {
    try {
      await window.api.setAppLanguage(language);
    } catch (e) {
      console.warn("Could not persist language to SQLite:", e);
    }
  }
};

export default i18n;
