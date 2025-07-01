"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
// import AppFooter from "@/components/AppFooter";

// Import the app categories data
const appCategories = [
    {
        id: "desenvolvimento-pessoal",
        title: "Desenvolvimento Pessoal",
        apps: [
            {
                id: "descubra-seu-temperamento",
                title: "Descubra seu Temperamento",
                description: "Descubra qual dos quatro temperamentos humanos é predominante em você.",
                path: "desenvolvimento-pessoal/descubra-seu-temperamento"
            }
        ]
    },
    {
        id: "math",
        title: "Ferramentas Matemáticas e de Cálculo",
        apps: [
            {
                id: "rule-of-three",
                title: "Calculadora de Regra de Três",
                description: "Calcule proporções automaticamente com esta calculadora interativa.",
                path: "math/rule-of-three"
            },
            {
                id: "compound-interest",
                title: "Calculadora de Juros Compostos",
                description: "Calcule juros compostos com base em capital inicial, taxa e tempo.",
                path: "math/compound-interest"
            },
            {
                id: "percentage",
                title: "Calculadora de Porcentagem Avançada",
                description: "Calcule porcentagens simples, aumentos, reduções e mais.",
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
                path: "conversion/kitchen-units"
            },
            {
                id: "currency",
                title: "Conversor de Moedas",
                description: "Converta moedas em tempo real.",
                path: "conversion/currency"
            },
            {
                id: "bitcoin",
                title: "Conversor de Bitcoin",
                description: "Converta Bitcoin para dólar, real e outras moedas em tempo real.",
                path: "conversion/bitcoin"
            },
            {
                id: "file-size",
                title: "Conversor de Arquivos Simples",
                description: "Converta tamanhos de arquivo e estime tempo de download.",
                path: "conversion/file-size"
            },
            {
                id: "number-systems",
                title: "Conversor de Sistemas Numéricos",
                description: "Converta entre decimal, binário, hexadecimal e octal.",
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
                path: "personalization/qr-code"
            },
            {
                id: "image-to-svg",
                title: "Conversão de PNG/JPG para SVG",
                description: "Envie um arquivo que será processado e convertido para SVG.",
                path: "personalization/image-to-svg"
            }
        ]
    }
];

// Flatten the apps array for easier lookup
const allApps = appCategories.flatMap(category => 
    category.apps.map(app => ({
        ...app,
        categoryId: category.id,
        categoryTitle: category.title
    }))
);

export default function AppPage() {
    const params = useParams();
    const appName = params.app_name;

    const [AppComponent, setAppComponent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [appInfo, setAppInfo] = useState(null);

    useEffect(() => {
        // Find the app info based on the app_name parameter
        const foundApp = allApps.find(app => app.id === appName);
        setAppInfo(foundApp);

        if (!foundApp) {
            setError("Aplicativo não encontrado");
            setIsLoading(false);
            return;
        }

        const loadComponent = async () => {
            try {
                // Import the appropriate component based on the app path
                let Component;

                // Math apps
                if (foundApp.path === "math/rule-of-three") {
                    const importedModule = await import('@/apps/math/rule-of-three');
                    Component = importedModule.default;
                } else if (foundApp.path === "math/compound-interest") {
                    const importedModule = await import('@/apps/math/compound-interest');
                    Component = importedModule.default;
                } else if (foundApp.path === "math/percentage") {
                    const importedModule = await import('@/apps/math/percentage');
                    Component = importedModule.default;
                }

                // Conversion apps
                else if (foundApp.path === "conversion/kitchen-units") {
                    const importedModule = await import('@/apps/conversion/kitchen-units');
                    Component = importedModule.default;
                } else if (foundApp.path === "conversion/currency") {
                    const importedModule = await import('@/apps/conversion/currency');
                    Component = importedModule.default;
                } else if (foundApp.path === "conversion/bitcoin") {
                    const importedModule = await import('@/apps/conversion/bitcoin');
                    Component = importedModule.default;
                } else if (foundApp.path === "conversion/file-size") {
                    const importedModule = await import('@/apps/conversion/file-size');
                    Component = importedModule.default;
                } else if (foundApp.path === "conversion/number-systems") {
                    const importedModule = await import('@/apps/conversion/number-systems');
                    Component = importedModule.default;
                }

                // Personalization apps
                else if (foundApp.path === "personalization/qr-code") {
                    const importedModule = await import('@/apps/personalization/qr-code');
                    Component = importedModule.default;
                } else if (foundApp.path === "personalization/image-to-svg") {
                    const importedModule = await import('@/apps/personalization/image-to-svg');
                    Component = importedModule.default;
                } 

                // Desenvolvimento Pessoal apps
                else if (foundApp.path === "desenvolvimento-pessoal/descubra-seu-temperamento") {
                    const importedModule = await import('@/apps/desenvolvimento-pessoal/descubra-seu-temperamento');
                    Component = importedModule.default;
                } else {
                    throw new Error(`App component not found for path: ${foundApp.path}`);
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
    }, [appName]);

    return (
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Back button and app title */}
                <div className="flex items-center mb-6">
                    <Link href="/app" className="text-blue-500 hover:text-blue-700 flex items-center">
                        <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Voltar para Apps
                    </Link>
                </div>

                {appInfo && (
                    <h1 className="text-3xl font-bold mb-6">{appInfo.title}</h1>
                )}

                {/* App content */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
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

                {/* Support the developer footer */}
                {/*<AppFooter />*/}
            </div>
        </div>
    );
}
