"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Toggles a `.dark` class on <html> (see the `@custom-variant dark` rule in
 * globals.css) and persists the choice in localStorage. Defaults to dark —
 * PAMPA's ERP identity — rather than following the OS preference.
 */
function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="pampa-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export { ThemeProvider };
