"use client";

import {useState} from 'react';
import {FaCoffee} from 'react-icons/fa';

const AppFooter = ({pixKey = "cdb7e499-8263-4c43-9838-324585dbeea6"}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <footer className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 text-center">
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <FaCoffee className="mr-2 text-amber-600" />
            <span className="text-sm">
              Se isso te ajudou de alguma forma, e quiser comprar um café para o dev :D
            </span>
          </div>
          
          <button
            onClick={copyToClipboard}
            className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            {copied ? "Chave PIX copiada!" : "Copiar chave PIX"}
          </button>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;