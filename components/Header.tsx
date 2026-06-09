"use client"

import Link from 'next/link';
import {useState} from 'react';
import {usePathname} from 'next/navigation';
import {useLang} from '@/context/LanguageContext';

const navLinks = {
  pt: [
    {href: '/', label: 'Início'},
    {href: '/about', label: 'Sobre'},
    {href: '/projects', label: 'Projetos'},
    {href: '/app', label: 'Aplicativos'},
  ],
  en: [
    {href: '/', label: 'Home'},
    {href: '/about', label: 'About'},
    {href: '/projects', label: 'Projects'},
    {href: '/app', label: 'Apps'},
  ],
};

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const {lang, toggle} = useLang();
  const links = navLinks[lang];

  return (
    <header className="sticky top-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          <Link href="/" className="font-bold text-gray-900 dark:text-white tracking-tight">
            Luiz Casara
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {links.map(({href, label}) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                {label}
              </Link>
            ))}

            <button
              onClick={toggle}
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
              onClick={toggle}
              className="flex items-center gap-1 font-mono text-xs font-semibold px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700"
            >
              <span className={lang === 'pt' ? 'text-green-500' : 'text-gray-400'}>PT</span>
              <span className="text-gray-300">|</span>
              <span className={lang === 'en' ? 'text-green-500' : 'text-gray-400'}>EN</span>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
            {links.map(({href, label}) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
