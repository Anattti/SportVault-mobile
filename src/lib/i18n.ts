import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import fi from '../i18n/translations/fi.json';
import en from '../i18n/translations/en.json';

const resources = {
  fi: { 
    translation: fi
  },
  en: { 
    translation: en
  },
};

// Get the device's current locale
const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';

// Use Finnish if the device is set to Finnish, otherwise default to English
const defaultLanguage = deviceLocale === 'fi' ? 'fi' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Recommended for React Native to avoid issues with loading states
    },
  });

export default i18n;
