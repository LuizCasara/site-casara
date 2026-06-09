"use client"

import { usePathname } from 'next/navigation';

const Footer = () => {
  const pathname = usePathname();
  if (pathname.startsWith('/casamento')) return null;

  return (
    <footer className="border-t border-gray-100 dark:border-gray-800/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">

          <div>
            <p className="font-bold text-gray-900 dark:text-white mb-0.5">Luiz Casara</p>
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Tech Lead · Senior Full-Stack Engineer
            </p>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center max-w-sm">
            &quot;Yesterday I was clever, so I wanted to change the world.
            Today I am wise, so I am changing myself.&quot;
          </p>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} Luiz Casara
          </p>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
