"use client";

import {Fa0, Fa3, FaFileArrowDown, FaMoneyBillTrendUp, FaPhotoFilm, FaSpoon} from "react-icons/fa6";
import {FaBitcoin, FaCoins, FaPercent, FaQrcode, FaBrain} from "react-icons/fa";
import {useRouter} from "next/navigation";

const appCategories = [
    {
        id: "desenvolvimento-pessoal",
        title: "Desenvolvimento Pessoal",
        apps: [
            {
                id: "descubra-seu-temperamento",
                title: "Descubra seu Temperamento",
                description: "Descubra qual dos quatro temperamentos humanos é predominante em você.",
                icon: <FaBrain size={32}/>,
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
                icon: <Fa3 size={32}/>,
                path: "math/rule-of-three"
            },
            {
                id: "compound-interest",
                title: "Calculadora de Juros Compostos",
                description: "Calcule juros compostos com base em capital inicial, taxa e tempo.",
                icon: <FaMoneyBillTrendUp size={32}/>,
                path: "math/compound-interest"
            },
            {
                id: "percentage",
                title: "Calculadora de Porcentagem Avançada",
                description: "Calcule porcentagens simples, aumentos, reduções e mais.",
                icon: <FaPercent size={32}/>,
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
                icon: <FaSpoon size={32}/>,
                path: "conversion/kitchen-units"
            },
            {
                id: "currency",
                title: "Conversor de Moedas",
                description: "Converta moedas em tempo real.",
                icon: <FaCoins size={32}/>,
                path: "conversion/currency"
            },
            {
                id: "bitcoin",
                title: "Conversor de Bitcoin",
                description: "Converta Bitcoin para dólar, real e outras moedas em tempo real.",
                icon: <FaBitcoin size={32}/>,
                path: "conversion/bitcoin"
            },
            {
                id: "file-size",
                title: "Conversor de Arquivos Simples",
                description: "Converta tamanhos de arquivo e estime tempo de download.",
                icon: <FaFileArrowDown size={32}/>,
                path: "conversion/file-size"
            },
            {
                id: "number-systems",
                title: "Conversor de Sistemas Numéricos",
                description: "Converta entre decimal, binário, hexadecimal e octal.",
                icon: <Fa0 size={32}/>,
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
                icon: <FaQrcode size={32}/>,
                path: "personalization/qr-code"
            },
            {
                id: "image-to-svg",
                title: "Conversão de PNG/JPG para SVG",
                description: "Envie um arquivo que será processado e convertido para SVG.",
                icon: <FaPhotoFilm size={32}/>,
                path: "personalization/image-to-svg"
            }
        ]
    }
];

// App categories and their respective apps

export default function AppsPage() {
    const router = useRouter();

    const navigateToApp = (app) => {
        router.push(`/app/${app.id}`);
    };

    return (
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
            {/* Page Header */}
            <div className="max-w-4xl mx-auto text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">Mini Aplicativos</h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                    Uma coleção de ferramentas úteis para ajudar em tarefas do dia a dia.
                    Clique em qualquer card para acessar o aplicativo em uma página dedicada.
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
                                    onClick={() => navigateToApp(app)}
                                >
                                    <div className="h-32 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                                        <div className="flex items-center justify-center">
                                            {app.icon}
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
        </div>
    );
}
