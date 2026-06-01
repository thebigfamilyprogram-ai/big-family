/**
 * Generates a URL-safe username from a display name.
 * "Valentina Torres Ospino" → "valentina-torres-ospino"
 */
export function generateUsername(displayName: string): string {
  return displayName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 30)
}
