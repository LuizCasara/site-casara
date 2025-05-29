import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        {/* Quotes */}
        <div className="mb-6">
          <p className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-6">
            1% better every day
          </p>
          <p className="text-md text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself."
          </p>
        </div>

        {/* Bio Link */}
        <div className="mb-8">
          <a 
            href="https://bio.site/luizcasara" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-green-500 hover:text-green-600 dark:hover:text-green-400 font-medium"
          >
            bio.site/luizcasara
          </a>
        </div>

        {/* Copyright */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} Luiz Casara. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
