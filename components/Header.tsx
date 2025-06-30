"use client"

import Link from 'next/link';
import { useState } from 'react';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Site Name */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold">
              Luiz Casara
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-foreground hover:text-gray-500 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
              Home
            </Link>
            <Link href="/about" className="text-foreground hover:text-gray-500 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
              About
            </Link>
            <Link href="/projects" className="text-foreground hover:text-gray-500 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
              Projects
            </Link>
            <Link href="/app" className="text-foreground hover:text-gray-500 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
              Apps
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu (controlled by state) */}
        <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link href="/" className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-gray-100 dark:hover:bg-gray-800">
              Home
            </Link>
            <Link href="/projects" className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-gray-100 dark:hover:bg-gray-800">
              Projects
            </Link>
            <Link href="/app" className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-gray-100 dark:hover:bg-gray-800">
              Apps
            </Link>
            <Link href="/about" className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-gray-100 dark:hover:bg-gray-800">
              About
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
