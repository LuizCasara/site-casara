"use client"

import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {useLang} from '@/context/LanguageContext';
import {trackNavClick, trackMobileMenuOpened, trackLanguageToggled} from '@/utils/analytics';

type NavChild = {href: string; label: string; icon?: string; wip?: boolean};
type NavItem = {href: string; label: string; children?: NavChild[]};

// Os filhos de "Projetos": os três primeiros são "Experimentos" (áreas
// construídas dentro do próprio site), o último é um atalho de volta para o
// accordion de clientes na própria página /projects.
const navLinks: Record<'pt' | 'en', NavItem[]> = {
  pt: [
    {href: '/', label: 'Início'},
    {href: '/about', label: 'Sobre'},
    {
      href: '/projects',
      label: 'Projetos',
      children: [
        {href: '/app', label: 'Aplicativos', icon: '🧪'},
        {href: '/livros', label: 'Livros', icon: '📚'},
        {href: '/ingress', label: 'Ingress', icon: '🛰️', wip: true},
        {href: '/projects', label: 'Trabalho com clientes'},
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
        {href: '/app', label: 'Apps', icon: '🧪'},
        {href: '/livros', label: 'Books', icon: '📚'},
        {href: '/ingress', label: 'Ingress', icon: '🛰️', wip: true},
        {href: '/projects', label: 'Client work'},
      ],
    },
  ],
};

// "Projetos" acende quando a pessoa está em qualquer área que agora vive sob ele.
const PROJETOS_PREFIXOS = ['/projects', '/app', '/livros', '/ingress'];
const isProjetosActive = (pathname: string) =>
  PROJETOS_PREFIXOS.some((pre) => pathname === pre || pathname.startsWith(pre + '/'));

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

  const WipBadge = () => (
    <span className="ml-2 font-mono text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded px-1 py-px">
      {wipLabel}
    </span>
  );

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

              // "Projetos": link normal + dropdown no hover/foco.
              return (
                <div
                  key={item.href}
                  ref={dropdownRef}
                  className="relative"
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  <Link
                    href={item.href}
                    onClick={() => trackNavClick(item.href, 'header')}
                    onFocus={() => setIsDropdownOpen(true)}
                    aria-haspopup="menu"
                    aria-expanded={isDropdownOpen}
                    className={`${linkClasses(isProjetosActive(pathname))} inline-flex items-center gap-1`}
                  >
                    {item.label}
                    <svg
                      className={`h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Link>

                  {isDropdownOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-1 w-60 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-lg p-1.5"
                    >
                      <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                        {experimentsLabel}
                      </p>
                      {item.children!.slice(0, 3).map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          role="menuitem"
                          onClick={() => {
                            trackNavClick(child.href, 'header');
                            setIsDropdownOpen(false);
                          }}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                            pathname === child.href || pathname.startsWith(child.href + '/')
                              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <span aria-hidden="true">{child.icon}</span>
                          <span>{child.label}</span>
                          {child.wip && <WipBadge />}
                        </Link>
                      ))}

                      <div className="my-1 h-px bg-gray-100 dark:bg-gray-800" />

                      {item.children!.slice(3).map((child) => (
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
                  {item.children.slice(0, 3).map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => fecharERegistrar(child.href)}
                      className={`flex items-center gap-2.5 pl-6 pr-3 py-2 rounded-md text-sm transition-colors ${
                        pathname === child.href || pathname.startsWith(child.href + '/')
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
                  {item.children.slice(3).map((child) => (
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
