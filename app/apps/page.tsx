"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

// App categories and their respective apps
const appCategories = [
  {
    id: "math",
    title: "Ferramentas Matemáticas e de Cálculo",
    apps: [
      {
        id: "rule-of-three",
        title: "Calculadora de Regra de Três",
        description: "Calcule proporções automaticamente com esta calculadora interativa.",
        icon: "/window.svg", // Real icon
        path: "math/rule-of-three"
      },
      {
        id: "compound-interest",
        title: "Calculadora de Juros Compostos",
        description: "Calcule juros compostos com base em capital inicial, taxa e tempo.",
        icon: "/globe.svg", // Real icon
        path: "math/compound-interest"
      },
      {
        id: "percentage",
        title: "Calculadora de Porcentagem Avançada",
        description: "Calcule porcentagens simples, aumentos, reduções e mais.",
        icon: "/vercel.svg", // Real icon
        path: "math/percentage"
      }
    ]
  },
  {
    id: "conversion",
    title: "Ferramentas de Conversão",
    apps: [
      {
        id: "kitchen-units",
        title: "Conversor de Unidades de Cozinha",
        description: "Converta medidas comuns em receitas com base em ingredientes específicos.",
        icon: "/next.svg", // Real icon
        path: "conversion/kitchen-units"
      },
      {
        id: "currency",
        title: "Conversor de Moedas com Histórico",
        description: "Converta moedas em tempo real e veja gráficos de variação recente.",
        icon: "/globe.svg", // Real icon
        path: "conversion/currency"
      },
      {
        id: "file-size",
        title: "Conversor de Arquivos Simples",
        description: "Converta tamanhos de arquivo e estime tempo de download.",
        icon: "/file.svg", // Real icon
        path: "conversion/file-size"
      },
      {
        id: "number-systems",
        title: "Conversor de Sistemas Numéricos",
        description: "Converta entre decimal, binário, hexadecimal e octal.",
        icon: "/window.svg", // Real icon
        path: "conversion/number-systems"
      }
    ]
  },
  {
    id: "personalization",
    title: "Ferramentas de Personalização",
    apps: [
      {
        id: "qr-code",
        title: "Gerador de QR Code Personalizado",
        description: "Crie QR codes para links, contatos ou texto, com opções de cores e logotipos.",
        icon: "/vercel.svg", // Real icon
        path: "personalization/qr-code"
      },
      {
        id: "image-to-svg",
        title: "Conversão de PNG/JPG para SVG",
        description: "Envie um arquivo que será processado e convertido para SVG.",
        icon: "/next.svg", // Real icon
        path: "personalization/image-to-svg"
      }
    ]
  }
];

// Modal component for apps
const AppModal = ({ app, isOpen, onClose }) => {
  if (!isOpen) return null;

  // Dynamic import of app components
  const [AppComponent, setAppComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle Escape key press to close modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // Add event listener when modal is open
    window.addEventListener("keydown", handleEscKey);

    // Clean up event listener when modal is closed
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [onClose]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const loadComponent = async () => {
      try {
        // Import the appropriate component based on the app path
        let Component;

        // Math apps
        if (app.path === "math/rule-of-three") {
          const module = await import('@/apps/math/rule-of-three');
          Component = module.default;
        } 
        else if (app.path === "math/compound-interest") {
          const module = await import('@/apps/math/compound-interest');
          Component = module.default;
        }
        else if (app.path === "math/percentage") {
          const module = await import('@/apps/math/percentage');
          Component = module.default;
        }

        // Conversion apps
        else if (app.path === "conversion/kitchen-units") {
          const module = await import('@/apps/conversion/kitchen-units');
          Component = module.default;
        }
        else if (app.path === "conversion/currency") {
          const module = await import('@/apps/conversion/currency');
          Component = module.default;
        }
        else if (app.path === "conversion/file-size") {
          const module = await import('@/apps/conversion/file-size');
          Component = module.default;
        }
        else if (app.path === "conversion/number-systems") {
          const module = await import('@/apps/conversion/number-systems');
          Component = module.default;
        }

        // Personalization apps
        else if (app.path === "personalization/qr-code") {
          const module = await import('@/apps/personalization/qr-code');
          Component = module.default;
        }
        else if (app.path === "personalization/image-to-svg") {
          const module = await import('@/apps/personalization/image-to-svg');
          Component = module.default;
        }
        else {
          throw new Error(`App component not found for path: ${app.path}`);
        }

        setAppComponent(() => Component);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading app component:", err);
        setError(`Erro ao carregar o aplicativo: ${err.message}`);
        setIsLoading(false);
      }
    };

    loadComponent();
  }, [app.path]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{app.title}</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Carregando aplicativo...
                </p>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                </div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
                {error}
              </div>
            ) : AppComponent ? (
              <AppComponent />
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                Aplicativo não encontrado.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AppsPage() {
  const [selectedApp, setSelectedApp] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openAppModal = (app) => {
    setSelectedApp(app);
    setIsModalOpen(true);
  };

  const closeAppModal = () => {
    setIsModalOpen(false);
    // Reset selected app after modal animation completes
    setTimeout(() => setSelectedApp(null), 300);
  };

  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Mini Aplicativos</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Uma coleção de ferramentas úteis para ajudar em tarefas do dia a dia.
          Clique em qualquer card para abrir o aplicativo.
        </p>
      </div>

      {/* App Categories */}
      <div className="space-y-16">
        {appCategories.map((category) => (
          <section key={category.id} className="space-y-6">
            <h2 className="text-2xl font-bold">{category.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.apps.map((app) => (
                <div 
                  key={app.id}
                  className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => openAppModal(app)}
                >
                  <div className="h-32 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                    <div className="w-16 h-16 flex items-center justify-center">
                      <Image
                        src={app.icon}
                        alt={app.title}
                        width={48}
                        height={48}
                        className="dark:invert"
                      />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{app.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{app.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* App Modal */}
      {selectedApp && (
        <AppModal 
          app={selectedApp} 
          isOpen={isModalOpen} 
          onClose={closeAppModal} 
        />
      )}
    </div>
  );
}
