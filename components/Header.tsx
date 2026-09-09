"use client"

import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {useLang} from '@/context/LanguageContext';
import {trackNavClick, trackMobileMenuOpened, trackLanguageToggled} from '@/utils/analytics';

type NavSection = 'experiment' | 'shortcut';
type NavChild = {href: string; label: string; section: NavSection; icon?: string; wip?: boolean};
type NavItem = {href: string; label: string; children?: NavChild[]};

// Filhos de "Projetos": `section: 'experiment'` são as áreas construídas dentro
// do próprio site; `section: 'shortcut'` é o atalho de volta para o accordion de
// clientes na própria página /projects. A partição é por esse campo, nunca por
// índice — um 4º experimento não deve virar "atalho" só por ser o 4º item.
const navLinks: Record<'pt' | 'en', NavItem[]> = {
  pt: [
    {href: '/', label: 'Início'},
    {href: '/about', label: 'Sobre'},
    {
      href: '/projects',
      label: 'Projetos',
      children: [
        {href: '/app', label: 'Aplicativos', section: 'experiment', icon: '🧪'},
        {href: '/livros', label: 'Livros', section: 'experiment', icon: '📚'},
        {href: '/ingress', label: 'Ingress', section: 'experiment', icon: '🛰️', wip: true},
        {href: '/projects', label: 'Trabalho com clientes', section: 'shortcut'},
      ],
    },
  ],
  en: [
    {href: '/', label: 'Home'},
    {href: '/about', label: 'About'},
    {
      href: '/projects',
      label: 'Projects',
      children: [
        {href: '/app', label: 'Apps', section: 'experiment', icon: '🧪'},
        {href: '/livros', label: 'Books', section: 'experiment', icon: '📚'},
        {href: '/ingress', label: 'Ingress', section: 'experiment', icon: '🛰️', wip: true},
        {href: '/projects', label: 'Client work', section: 'shortcut'},
      ],
    },
  ],
};

// "Projetos" acende quando a pessoa está em qualquer área que vive sob ele —
// derivado dos hrefs dos filhos para não repetir a lista.
const PROJETOS_PREFIXOS = [
  ...new Set((navLinks.pt.find((i) => i.children)?.children ?? []).map((c) => c.href)),
];
const isProjetosActive = (pathname: string) =>
  PROJETOS_PREFIXOS.some((pre) => pathname === pre || pathname.startsWith(pre + '/'));

const isChildActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + '/');

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const {lang, toggle} = useLang();
  const links = navLinks[lang];
  const experimentsLabel = lang === 'pt' ? 'Experimentos' : 'Experiments';
  const wipLabel = lang === 'pt' ? 'em construção' : 'work in progress';

  // O evento leva o idioma de DESTINO, não o atual: é o que a pessoa quis ver.
  const trocarIdioma = () => {
    trackLanguageToggled(lang === 'pt' ? 'en' : 'pt');
    toggle();
  };

  // Fecha o dropdown ao clicar/focar fora ou apertar Esc. Só monta os listeners
  // enquanto ele está aberto.
  useEffect(() => {
    if (!isDropdownOpen) return;
    const aoClicarFora = (e: MouseEvent | FocusEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('focusin', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('focusin', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [isDropdownOpen]);

  // Fecha o dropdown a cada navegação.
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [pathname]);

  if (pathname.startsWith('/casamento') || pathname.startsWith('/w/') || pathname.startsWith('/q/') || pathname.startsWith('/ingress')) return null;

  const linkClasses = (ativo: boolean) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      ativo
        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
    }`;

  const childClasses = (ativo: boolean) =>
    `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
      ativo
        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
    }`;

  const WipBadge = () => (
    <span className="ml-2 font-mono text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded px-1 py-px">
      {wipLabel}
    </span>
  );

  const experiments = (children: NavChild[]) => children.filter((c) => c.section === 'experiment');
  const shortcuts = (children: NavChild[]) => children.filter((c) => c.section === 'shortcut');

  return (
    <header className="sticky top-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          <Link href="/" className="font-bold text-gray-900 dark:text-white tracking-tight">
            Luiz Casara
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map((item) => {
              if (!item.children) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => trackNavClick(item.href, 'header')}
                    className={linkClasses(pathname === item.href)}
                  >
                    {item.label}
                  </Link>
                );
              }

              // "Projetos": o texto é um link normal; a setinha é um botão que
              // abre/fecha o menu sem navegar — assim quem está no touch (ou só
              // clica) também alcança /app, /livros e /ingress, não só no hover.
              return (
                <div
                  key={item.href}
                  ref={dropdownRef}
                  className="relative flex items-center"
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <Link
                    href={item.href}
                    onClick={() => trackNavClick(item.href, 'header')}
                    className={linkClasses(isProjetosActive(pathname))}
                  >
                    {item.label}
                  </Link>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isDropdownOpen}
                    aria-label={lang === 'pt' ? 'Abrir menu de projetos' : 'Open projects menu'}
                    onClick={() => setIsDropdownOpen((v) => !v)}
                    className="-ml-1 p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <svg
                      className={`h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isDropdownOpen && (
                    // `pt-2` num wrapper transparente, e NÃO `mt-1` no painel: a
                    // margem criava uma faixa de alguns pixels que não pertence
                    // nem ao gatilho nem ao painel — passar o mouse devagar por
                    // ela disparava o `onMouseLeave` e fechava tudo.
                    <div role="menu" className="absolute right-0 top-full w-60 pt-2">
                      <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg p-1.5">
                        <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                          {experimentsLabel}
                        </p>
                        {experiments(item.children).map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            role="menuitem"
                            onClick={() => {
                              trackNavClick(child.href, 'header');
                              setIsDropdownOpen(false);
                            }}
                            className={childClasses(isChildActive(pathname, child.href))}
                          >
                            <span aria-hidden="true">{child.icon}</span>
                            <span>{child.label}</span>
                            {child.wip && <WipBadge />}
                          </Link>
                        ))}

                        <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />

                        {shortcuts(item.children).map((child) => (
                          <Link
                            key={`tail-${child.href}`}
                            href={child.href}
                            role="menuitem"
                            onClick={() => {
                              trackNavClick(child.href, 'header');
                              setIsDropdownOpen(false);
                            }}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <span aria-hidden="true">→</span>
                            <span>{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={trocarIdioma}
              className="ml-3 flex items-center gap-1 font-mono text-xs font-semibold px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              title={lang === 'pt' ? 'Switch to English' : 'Mudar para Português'}
            >
              <span className={lang === 'pt' ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}>PT</span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className={lang === 'en' ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}>EN</span>
            </button>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={trocarIdioma}
              className="flex items-center gap-1 font-mono text-xs font-semibold px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700"
            >
              <span className={lang === 'pt' ? 'text-green-500' : 'text-gray-400'}>PT</span>
              <span className="text-gray-300">|</span>
              <span className={lang === 'en' ? 'text-green-500' : 'text-gray-400'}>EN</span>
            </button>
            <button
              onClick={() => {
                // Só a abertura vira evento: fechar é o mesmo botão, e contaria
                // duas vezes a mesma visita ao menu.
                if (!isMobileMenuOpen) trackMobileMenuOpened();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-2 border-t border-gray-100 dark:border-gray-800/60">
            {links.map((item) => {
              const fecharERegistrar = (href: string) => {
                trackNavClick(href, 'menu_mobile');
                setIsMobileMenuOpen(false);
              };

              if (!item.children) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => fecharERegistrar(item.href)}
                    className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => fecharERegistrar(item.href)}
                    className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isProjetosActive(pathname)
                        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    {item.label}
                  </Link>

                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {experimentsLabel}
                  </p>
                  {experiments(item.children).map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => fecharERegistrar(child.href)}
                      className={`flex items-center gap-2.5 pl-6 pr-3 py-2 rounded-md text-sm transition-colors ${
                        isChildActive(pathname, child.href)
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <span aria-hidden="true">{child.icon}</span>
                      <span>{child.label}</span>
                      {child.wip && <WipBadge />}
                    </Link>
                  ))}

                  <div className="mx-3 my-1.5 h-px bg-gray-100 dark:bg-gray-800" />
                  {shortcuts(item.children).map((child) => (
                    <Link
                      key={`tail-${child.href}`}
                      href={child.href}
                      onClick={() => fecharERegistrar(child.href)}
                      className="flex items-center gap-2 pl-6 pr-3 py-2 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <span aria-hidden="true">→</span>
                      <span>{child.label}</span>
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
