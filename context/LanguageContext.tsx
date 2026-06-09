"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "pt" | "en";

const LanguageContext = createContext<{ lang: Lang; toggle: () => void }>({
  lang: "pt",
  toggle: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("pt");
  return (
    <LanguageContext.Provider value={{ lang, toggle: () => setLang(l => l === "pt" ? "en" : "pt") }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
