// Centralized theme tokens for colors, spacing, radii, and shadows
export const colors = {
  primary: '#8CCF44',
  primaryDark: '#7AB83D',
  primaryDeep: '#6BA136',
  secondary: '#F3A220',
  tertiary: '#1AAFF3',
  lightGreen: '#C1F99B',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: 'rgba(140, 207, 68, 0.10)',
  overlay: 'rgba(0,0,0,0.6)',
  success: '#8CCF44',
  danger: '#EF4444',
  info: '#1AAFF3',
  disabled: '#D1D5DB',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 28,
    elevation: 12,
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
};
