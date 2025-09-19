import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

// Import translation files
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import it from '../locales/it.json';
import pt from '../locales/pt.json';

const LANGUAGE_DETECTOR = {
  type: 'languageDetector' as const,
  async: true,
  detect: (callback: (lng: string) => void) => {
    // Try to get saved language from AsyncStorage
    AsyncStorage.getItem('user-language')
      .then((savedLanguage) => {
        if (savedLanguage) {
          callback(savedLanguage);
          return;
        }
        
        // Fallback to device language
        const locales = getLocales();
        const deviceLanguage = locales[0]?.languageCode || 'en';
        callback(deviceLanguage);
      })
      .catch((error) => {
        console.log('Error reading language from storage', error);
        callback('en'); // Fallback to English
      });
  },
  init: () => {},
  cacheUserLanguage: (lng: string) => {
    AsyncStorage.setItem('user-language', lng)
      .catch((error) => {
        console.log('Error saving language to storage', error);
      });
  },
};

// Initialize i18n
const initI18n = async () => {
  try {
    await i18n
      .use(LANGUAGE_DETECTOR)
      .use(initReactI18next)
      .init({
        compatibilityJSON: 'v3',
        resources: {
          en: {
            translation: en,
          },
          es: {
            translation: es,
          },
          fr: {
            translation: fr,
          },
          de: {
            translation: de,
          },
          it: {
            translation: it,
          },
          pt: {
            translation: pt,
          },
        },
        fallbackLng: 'en',
        debug: __DEV__,
        interpolation: {
          escapeValue: false,
        },
        react: {
          useSuspense: false,
        },
      });
    console.log('i18n initialized successfully');
  } catch (error) {
    console.error('Error initializing i18n:', error);
  }
};

// Initialize immediately
initI18n();

export default i18n;
