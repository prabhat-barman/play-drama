// ------------------------------
// Design System: "Royal Amethyst"
// Deep obsidian-plum base with vibrant amethyst accents.
// Aesthetic: Minimalism + subtle Glassmorphism, high-end / premium.
//
// Existing token names (brand, background, surface, glass*, text*, divider)
// are preserved so every screen keeps working. New Material-3 style tokens
// (primary, primaryContainer, onPrimary, secondary, tertiary, error, ...)
// are exposed alongside for future components.
// ------------------------------

const primary = '#9b59b6';           // amethyst — key actions & brand
const primaryContainer = '#ebb2ff';  // lighter amethyst — active surfaces
const secondary = '#dabce6';         // soft lavender — secondary info
const tertiary = '#6c3483';          // deep grape — containers / hover
const error = '#ffb4ab';
const errorContainer = '#93000a';

// Nocturnal foundation — enhances saturation of the accent colors.
const bgBase = '#15111d';            // "Obsidian Plum"
const bgLowest = '#100c18';
const bgLow = '#1e1926';
const bgMid = '#221d2a';
const bgHigh = '#2c2835';
const bgHighest = '#373240';

// Semantic text tokens.
const onSurface = '#e8dff1';
const onSurfaceVariant = '#d0c2d1';
const outline = '#998d9a';
const outlineVariant = '#4d434f';

export const colors = {
  // -- Brand aliases (kept for backward compat with existing screens) --
  brand: primary,
  brandText: '#fffbff',

  background: bgBase,
  surface: bgMid,

  // Glassmorphism: semi-transparent lavender tint + soft primary shadow.
  // Depth spec: 1px inner border at 10% lavender, ambient shadow tinted
  // with primary at 10-15%.
  glassBg: 'rgba(219, 188, 230, 0.06)',       // lavender @ 6%
  glassBorder: 'rgba(218, 188, 230, 0.14)',   // lavender @ 14%
  glassShadow: 'rgba(155, 89, 182, 0.18)',    // amethyst @ 18%

  textPrimary: onSurface,
  textMuted: onSurfaceVariant,
  textAccent: primaryContainer,
  placeholder: 'rgba(208, 194, 209, 0.5)',

  divider: 'rgba(155, 89, 182, 0.12)',        // primary @ 12%
  listDivider: 'rgba(155, 89, 182, 0.05)',    // list rows: primary @ 5%

  // -- Material-3 style tokens (Royal Amethyst spec) --
  primary,
  onPrimary: '#500a6c',
  primaryContainer,
  onPrimaryContainer: '#fffbff',
  inversePrimary: '#83439e',

  secondary,
  onSecondary: '#3e2849',
  secondaryContainer: '#584063',
  onSecondaryContainer: '#ccaed8',

  tertiary: '#ecb2ff',
  onTertiary: '#4d1464',
  tertiaryContainer: tertiary,
  onTertiaryContainer: '#fffbff',

  error,
  onError: '#690005',
  errorContainer,
  onErrorContainer: '#ffdad6',

  // Surface tonal ladder (elevation via tone, not shadow).
  surfaceDim: bgBase,
  surfaceBright: '#3c3745',
  surfaceContainerLowest: bgLowest,
  surfaceContainerLow: bgLow,
  surfaceContainer: bgMid,
  surfaceContainerHigh: bgHigh,
  surfaceContainerHighest: bgHighest,
  surfaceVariant: bgHighest,

  onSurface,
  onSurfaceVariant,
  inverseSurface: onSurface,
  inverseOnSurface: '#332e3c',

  outline,
  outlineVariant,
  surfaceTint: primaryContainer,
} as const;

// 8px scale. Kept identical to the previous scale so existing screens
// don't re-flow. Spec's larger increments live at lg/xl/xxl and remain
// available for section-level breathing room.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Shape language: consistently rounded. Standard elements 8px, large
// containers 16-24px. `xl` and `full` are new additions for hero cards
// and pill-shaped chips.
export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// Typography scale — pulled from the Royal Amethyst spec. `fontFamily`
// is left undefined so the app falls back to the system font until the
// Epilogue / Manrope / Space Grotesk families are actually bundled. Size,
// weight, letterSpacing and lineHeight are correct today so a later
// "add fonts" PR only needs to fill in `fontFamily`.
export const typography = {
  displayLg: {
    fontFamily: undefined as string | undefined,
    fontSize: 48,
    fontWeight: '700' as const,
    lineHeight: 56,
    letterSpacing: -1,
  },
  displayLgMobile: {
    fontFamily: undefined as string | undefined,
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  headlineMd: {
    fontFamily: undefined as string | undefined,
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  bodyLg: {
    fontFamily: undefined as string | undefined,
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
  bodyMd: {
    fontFamily: undefined as string | undefined,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  labelSm: {
    fontFamily: undefined as string | undefined,
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.6,
  },

  // -- Legacy tokens (kept for existing screens) --
  logo: {
    fontFamily: undefined as string | undefined,
    fontSize: 32,
    fontWeight: '900' as const,
    letterSpacing: -1.6,
    lineHeight: 38,
  },
  heading: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 1.2,
    lineHeight: 16,
  },
} as const;

// Elevation tokens (used by cards / modals / navbars). Shadows are
// tinted with the primary color at low opacity to create a "glow"
// rather than a black void, per the Depth spec.
export const elevation = {
  card: {
    shadowColor: primary,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 6, // Android
  },
  modal: {
    shadowColor: primary,
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: {width: 0, height: 16},
    elevation: 12,
  },
  // Backdrop blur intensity for modals / floating surfaces. Consumed
  // by any BlurView the app might render.
  blur: {
    modal: 20,
    surface: 12,
  },
} as const;
