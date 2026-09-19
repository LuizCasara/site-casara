"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "pt" | "en";

const LanguageContext = createContext<{ lang: Lang; toggle: () => void; setLang: (lang: Lang) => void }>({
  lang: "pt",
  toggle: () => {},
  setLang: () => {},
});

// `initialLang` só existe para o `/ingress`, que abre em EN (ver
// `components/ingress/IngressLanguageProvider.tsx`); o resto do site segue "pt".
export function LanguageProvider({ children, initialLang = "pt" }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  return (
    <LanguageContext.Provider value={{ lang, toggle: () => setLang(l => l === "pt" ? "en" : "pt"), setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
