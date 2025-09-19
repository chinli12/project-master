# Multi-Language (i18n) Support Documentation

## Overview

Your GeoTeller app now supports multiple languages using `react-i18next`. The system includes:
- Automatic device language detection
- Language persistence across app sessions
- Easy language switching via UI component
- Fallback to English if translation is missing

## Current Supported Languages

- **English (en)** - Default/fallback language
- **Spanish (es)** - Full translation support

## How to Use Translations in Components

### 1. Import the useTranslation hook
```tsx
import { useTranslation } from 'react-i18next';
```

### 2. Use the hook in your component
```tsx
export default function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <Text>{t('badges.title')}</Text>
  );
}
```

### 3. Translation key examples
```tsx
// Simple translation
{t('badges.title')} // "Badges" or "Insignias"

// Translation with fallback
{t('common.complete', 'Complete')} // Uses fallback if key missing

// Nested translation keys
{t('badges.rarity.legendary')} // "Legendary" or "Legendaria"

// Dynamic translation keys
{t(`badges.rarity.${rarityType}`)} // Dynamic based on variable
```

## Adding the Language Switcher

Import and use the `LanguageSwitcher` component:

```tsx
import LanguageSwitcher from '@/components/LanguageSwitcher';

// Full switcher with text
<LanguageSwitcher />

// Icon only
<LanguageSwitcher showText={false} />

// Custom styling
<LanguageSwitcher 
  showText={true} 
  iconSize={24} 
  textStyle={{ color: '#333' }} 
/>
```

## File Structure

```
lib/
  i18n.ts                 # i18n configuration
locales/
  en.json                 # English translations
  es.json                 # Spanish translations
components/
  LanguageSwitcher.tsx    # Language switching UI
```

## Translation File Structure

Each language file follows this structure:

```json
{
  "badges": {
    "title": "Badges",
    "earnedBadges": "Earned Badges",
    "rarity": {
      "common": "Common",
      "rare": "Rare",
      "epic": "Epic",
      "legendary": "Legendary"
    }
  },
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "save": "Save"
  }
}
```

## Adding a New Language

### 1. Create translation file
Create a new file in `/locales/` (e.g., `fr.json` for French):

```json
{
  "badges": {
    "title": "Badges",
    "earnedBadges": "Badges Gagnés",
    // ... other translations
  }
}
```

### 2. Update i18n configuration
In `lib/i18n.ts`, add the new language:

```typescript
import fr from '../locales/fr.json';

// Add to resources
resources: {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr }, // Add new language
},
```

### 3. Update LanguageSwitcher
In `components/LanguageSwitcher.tsx`, add to the languages array:

```typescript
const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' }, // Add new language
];
```

### 4. Update translation files
Add the new language to the `languages` section in all translation files:

```json
{
  "languages": {
    "en": "English",
    "es": "Español",
    "fr": "Français"
  }
}
```

## Best Practices

### 1. Organize translation keys logically
```json
{
  "screens": {
    "badges": { "title": "Badges" },
    "profile": { "title": "Profile" }
  },
  "components": {
    "buttons": { "save": "Save", "cancel": "Cancel" }
  },
  "common": {
    "loading": "Loading...",
    "error": "Error"
  }
}
```

### 2. Use meaningful key names
```tsx
// Good
{t('badges.noEarnedBadges')}

// Avoid
{t('text1')}
```

### 3. Provide fallbacks for safety
```tsx
{t('some.key', 'Default text if missing')}
```

### 4. Handle pluralization (if needed)
```json
{
  "items": {
    "badge_one": "{{count}} badge",
    "badge_other": "{{count}} badges"
  }
}
```

```tsx
{t('items.badge', { count: badgeCount })}
```

## Current Implementation

The badges screen (`app/badges.tsx`) has been updated to demonstrate i18n usage:
- Header title uses `t('badges.title')`
- Stats labels use appropriate translation keys
- Rarity badges use `t('badges.rarity.{type}')`
- Loading text uses `t('common.loading')`
- Language switcher in header for easy access

## Language Detection & Persistence

- **Auto-detection**: Uses device language on first launch
- **Persistence**: Saves user's choice to AsyncStorage
- **Fallback**: Defaults to English if device language not supported
- **Real-time switching**: Changes apply immediately without app restart

## Troubleshooting

### Translation not showing
1. Check if the key exists in the translation file
2. Verify the translation file is imported in `i18n.ts`
3. Ensure the component uses `useTranslation()` hook

### Language not persisting
1. Check AsyncStorage permissions
2. Verify `cacheUserLanguage` function in `i18n.ts`

### New language not appearing
1. Confirm language added to `LanguageSwitcher.tsx`
2. Check translation file is imported in `i18n.ts`
3. Verify language code matches between files
