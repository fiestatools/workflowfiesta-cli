/**
 * WorkflowFiesta CLI theme constants.
 *
 * Primary brand color: Orange (#F3610C)
 */

/** Primary brand orange color (hex). */
export const BRAND_ORANGE = '#F3610C';

/** RGB values for the brand orange. */
export const BRAND_ORANGE_RGB = { r: 243, g: 97, b: 12 };

/** Subtle dark background color (hex). */
export const SUBTLE_BG = '#1c1c1e';

/**
 * Hex color palette for use with <span fg={color}> and <text fg={color}>.
 * These work with @opentui's style system without ANSI escape codes.
 */
export const themeColors = {
  // Brand
  primary: '#F3610C',
  primaryDim: '#A84008',
  
  // Semantic
  success: '#32CD32',
  warning: '#FFD700', 
  error: '#FF4444',
  info: '#00BFFF',
  
  // Text
  text: '#FFFFFF',
  textMuted: '#888888',
  textSubtle: '#666666',
  
  // Accents
  user: '#00CED1',
  assistant: '#F3610C',
  system: '#FFD700',
  tool: '#DA70D6',
  
  // Backgrounds
  bg: '#000000',
  bgSubtle: '#1c1c1e',
  border: '#333333',
} as const;

/** ANSI escape codes for terminal colors (legacy - prefer themeColors). */
export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright foreground colors
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
} as const;

/**
 * Get 24-bit true color ANSI code for foreground.
 */
export function rgb(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Get 24-bit true color ANSI code for background.
 */
export function bgRgb(r: number, g: number, b: number): string {
  return `\x1b[48;2;${r};${g};${b}m`;
}

/**
 * Get the brand orange as an ANSI foreground color.
 */
export function brandOrange(): string {
  return rgb(BRAND_ORANGE_RGB.r, BRAND_ORANGE_RGB.g, BRAND_ORANGE_RGB.b);
}

/**
 * Get the brand orange as an ANSI background color.
 */
export function brandOrangeBg(): string {
  return bgRgb(BRAND_ORANGE_RGB.r, BRAND_ORANGE_RGB.g, BRAND_ORANGE_RGB.b);
}

/**
 * Semantic color helpers for consistent styling (legacy ANSI - prefer themeColors).
 */
export const colors = {
  /** Primary brand color - orange. */
  primary: brandOrange(),
  /** Success/positive state - green. */
  success: ANSI.green,
  /** Warning state - yellow. */
  warning: ANSI.yellow,
  /** Error/danger state - red. */
  error: ANSI.red,
  /** Muted/secondary text. */
  muted: ANSI.dim,
  /** User message accent. */
  user: ANSI.cyan,
  /** Assistant message accent. */
  assistant: brandOrange(),
  /** Tool/action accent. */
  tool: ANSI.magenta,
  /** Reset all formatting. */
  reset: ANSI.reset,
} as const;

/**
 * Style a string with brand orange color.
 */
export function orange(text: string): string {
  return `${brandOrange()}${text}${ANSI.reset}`;
}

/**
 * Style a string as muted/dim text.
 */
export function muted(text: string): string {
  return `${ANSI.dim}${text}${ANSI.reset}`;
}

/**
 * Style a string as bold.
 */
export function bold(text: string): string {
  return `${ANSI.bold}${text}${ANSI.reset}`;
}

/**
 * Style a string as success (green).
 */
export function success(text: string): string {
  return `${ANSI.green}${text}${ANSI.reset}`;
}

/**
 * Style a string as error (red).
 */
export function error(text: string): string {
  return `${ANSI.red}${text}${ANSI.reset}`;
}

/**
 * Style a string as warning (yellow).
 */
export function warning(text: string): string {
  return `${ANSI.yellow}${text}${ANSI.reset}`;
}
