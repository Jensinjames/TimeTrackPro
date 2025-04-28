/**
 * Color utilities for generating and manipulating color schemes
 * This module handles color generation for category visualization
 */

/**
 * Convert hex color to RGB components
 */
export function hexToRGB(hex: string): { r: number; g: number; b: number } {
  // Remove the # if present
  hex = hex.replace('#', '');
  
  // Handle short format (#RGB)
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // Parse the hex values to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}

/**
 * Convert RGB components to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  // Ensure values are in the valid range (0-255)
  r = Math.max(0, Math.min(255, Math.round(r)));
  g = Math.max(0, Math.min(255, Math.round(g)));
  b = Math.max(0, Math.min(255, Math.round(b)));
  
  // Convert to hex and ensure 2 characters
  const hexR = r.toString(16).padStart(2, '0');
  const hexG = g.toString(16).padStart(2, '0');
  const hexB = b.toString(16).padStart(2, '0');
  
  return `#${hexR}${hexG}${hexB}`;
}

/**
 * Lighten a color by a given percentage
 * @param hex The hex color to lighten
 * @param percent The percentage to lighten (0-100)
 */
export function lightenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRGB(hex);
  
  // Calculate the lightened values
  const factor = percent / 100;
  const newR = r + (255 - r) * factor;
  const newG = g + (255 - g) * factor;
  const newB = b + (255 - b) * factor;
  
  return rgbToHex(newR, newG, newB);
}

/**
 * Darken a color by a given percentage
 * @param hex The hex color to darken
 * @param percent The percentage to darken (0-100)
 */
export function darkenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRGB(hex);
  
  // Calculate the darkened values
  const factor = percent / 100;
  const newR = r * (1 - factor);
  const newG = g * (1 - factor);
  const newB = b * (1 - factor);
  
  return rgbToHex(newR, newG, newB);
}

/**
 * Generate a color scheme based on a primary color
 * @param primaryColor The main color in hex format
 * @returns An object with primary, secondary, and tertiary colors
 */
export function generateColorScheme(primaryColor: string): { 
  primary: string; 
  secondary: string; 
  tertiary: string; 
} {
  // Ensure the primary color is valid
  if (!primaryColor || !primaryColor.startsWith('#')) {
    primaryColor = '#3B82F6'; // Default to blue if invalid
  }
  
  // Generate secondary color (slightly lighter)
  const secondary = lightenColor(primaryColor, 15);
  
  // Generate tertiary color (even lighter)
  const tertiary = lightenColor(primaryColor, 30);
  
  return {
    primary: primaryColor,
    secondary,
    tertiary
  };
}

/**
 * Adjust algorithm for color balance
 * Creates a balanced color palette that ensures good contrast between variants
 * @param primaryColor The main color in hex format
 */
export function generateBalancedColorScheme(primaryColor: string): { 
  primary: string; 
  secondary: string; 
  tertiary: string; 
} {
  // Ensure the primary color is valid
  if (!primaryColor || !primaryColor.startsWith('#')) {
    primaryColor = '#3B82F6'; // Default to blue if invalid
  }
  
  // Get RGB components
  const { r, g, b } = hexToRGB(primaryColor);
  
  // Calculate luminance to determine if color is light or dark
  // Using the formula: 0.299*R + 0.587*G + 0.114*B
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  let secondary: string;
  let tertiary: string;
  
  if (luminance > 0.7) {
    // For light colors, create darker variants for better contrast
    secondary = darkenColor(primaryColor, 15);
    tertiary = darkenColor(primaryColor, 5);
  } else if (luminance < 0.3) {
    // For dark colors, create lighter variants
    secondary = lightenColor(primaryColor, 25);
    tertiary = lightenColor(primaryColor, 40);
  } else {
    // For medium luminance colors, create a balanced palette
    secondary = lightenColor(primaryColor, 20);
    tertiary = lightenColor(primaryColor, 35);
  }
  
  return {
    primary: primaryColor,
    secondary,
    tertiary
  };
}

/**
 * Get the most appropriate icon color (black or white) based on background color
 * @param backgroundColor The background color in hex format
 * @returns "#000000" for dark text or "#FFFFFF" for light text
 */
export function getContrastingTextColor(backgroundColor: string): string {
  const { r, g, b } = hexToRGB(backgroundColor);
  
  // Calculate luminance - using the same formula as above
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}