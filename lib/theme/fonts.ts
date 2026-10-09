// Popular Google Fonts offered in the theme editor's font picker. Any other
// Google Font still works by typing its exact name.

export type FontGroup = { key: "sans" | "geometric" | "rounded" | "serif"; fonts: string[] };

export const FONT_GROUPS: FontGroup[] = [
  {
    key: "sans",
    fonts: [
      "Inter",
      "Roboto",
      "Open Sans",
      "Lato",
      "Noto Sans",
      "Source Sans 3",
      "IBM Plex Sans",
      "Work Sans",
      "Archivo",
      "Karla",
      "Mulish",
    ],
  },
  {
    key: "geometric",
    fonts: ["Poppins", "Montserrat", "DM Sans", "Manrope", "Plus Jakarta Sans", "Outfit", "Figtree", "Raleway", "Rubik"],
  },
  { key: "rounded", fonts: ["Nunito", "Quicksand", "Varela Round", "Comfortaa"] },
  {
    key: "serif",
    fonts: ["Playfair Display", "Merriweather", "Lora", "Libre Baskerville", "Source Serif 4", "EB Garamond", "Fraunces", "DM Serif Display", "Noto Serif"],
  },
];

export const POPULAR_FONTS = FONT_GROUPS.flatMap((g) => g.fonts);

/**
 * One stylesheet for previewing every listed font, limited to the glyphs in
 * their own names so it stays a few kilobytes.
 */
export function fontPreviewHref(): string {
  const families = POPULAR_FONTS.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}`).join("&");
  const glyphs = [...new Set(POPULAR_FONTS.join(""))].join("");
  return `https://fonts.googleapis.com/css2?${families}&text=${encodeURIComponent(glyphs)}&display=swap`;
}
