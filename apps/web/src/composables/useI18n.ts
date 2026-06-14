import { ref, computed } from 'vue';
import ptBR from '../locales/pt-BR.json';
import enUS from '../locales/en-US.json';

type Locale = 'pt-BR' | 'en-US';

const dictionaries: Record<Locale, any> = {
  'pt-BR': ptBR,
  'en-US': enUS,
};

const STORAGE_KEY = 'ledgerflow.locale';

// Initialize state
const currentLocale = ref<Locale>('pt-BR');

// Load initial from localStorage
const storedLocale = localStorage.getItem(STORAGE_KEY) as Locale;
if (storedLocale && dictionaries[storedLocale]) {
  currentLocale.value = storedLocale;
}

export function useI18n() {
  const getLocale = () => currentLocale.value;
  
  const setLocale = (locale: Locale) => {
    if (dictionaries[locale]) {
      currentLocale.value = locale;
      localStorage.setItem(STORAGE_KEY, locale);
    }
  };

  const availableLocales = computed(() => Object.keys(dictionaries) as Locale[]);

  // Function to resolve dot.notation keys
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result = dictionaries[currentLocale.value];

    for (const k of keys) {
      if (result === undefined || result === null) {
        break;
      }
      result = result[k];
    }

    // Fallback to pt-BR if key not found in en-US
    if (result === undefined && currentLocale.value !== 'pt-BR') {
      let fallbackResult = dictionaries['pt-BR'];
      for (const k of keys) {
        if (fallbackResult === undefined || fallbackResult === null) {
          break;
        }
        fallbackResult = fallbackResult[k];
      }
      result = fallbackResult;
    }

    if (result === undefined) {
      return key; // return the key itself if no translation is found
    }

    let translatedString = String(result);

    // Replace params if provided
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translatedString = translatedString.replace(new RegExp(`{${paramKey}}`, 'g'), String(value));
      });
    }

    return translatedString;
  };

  return {
    t,
    getLocale,
    setLocale,
    availableLocales,
    currentLocale, // Exposed for reactivity in components like LanguageSwitcher
  };
}
