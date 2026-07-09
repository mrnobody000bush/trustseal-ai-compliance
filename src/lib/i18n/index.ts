import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ru from "./ru.json";

let initialized = false;

export function initI18n() {
  if (initialized) return i18n;
  initialized = true;
  i18n
    .use(initReactI18next)
    .init({
      resources: { en: { translation: en }, ru: { translation: ru } },
      lng: "en",
      fallbackLng: "en",
      supportedLngs: ["en", "ru"],
      interpolation: { escapeValue: false },
    });
  return i18n;
}

// Initialize immediately so SSR and client both have translations.
initI18n();

export default i18n;
