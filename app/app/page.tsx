"use client";

import Link from "next/link";
import {Fa0, Fa3, FaFileArrowDown, FaMoneyBillTrendUp, FaPhotoFilm, FaSpoon} from "react-icons/fa6";
import {FaBitcoin, FaCoins, FaPercent, FaQrcode, FaBrain} from "react-icons/fa";
import {useLang} from "@/context/LanguageContext";
import {trackAppClick} from "@/utils/analytics";

const appCategories = [
    {
        id: "desenvolvimento-pessoal",
        title: {pt: "Desenvolvimento Pessoal", en: "Personal Development"},
        apps: [
            {
                id: "descubra-seu-temperamento",
                title: "Descubra seu Temperamento",
                description: "Descubra qual dos quatro temperamentos humanos é predominante em você.",
                icon: <FaBrain size={18}/>,
            }
        ]
    },
    {
        id: "math",
        title: {pt: "Matemática e Cálculo", en: "Math & Calculation"},
        apps: [
            {
                id: "rule-of-three",
                title: "Regra de Três",
                description: "Calcule proporções automaticamente.",
                icon: <Fa3 size={18}/>,
            },
            {
                id: "compound-interest",
                title: "Juros Compostos",
                description: "Calcule juros com capital, taxa e prazo.",
                icon: <FaMoneyBillTrendUp size={18}/>,
            },
            {
                id: "percentage",
                title: "Porcentagem",
                description: "Calcule porcentagens, aumentos e reduções.",
                icon: <FaPercent size={18}/>,
            }
        ]
    },
    {
        id: "conversion",
        title: {pt: "Conversores", en: "Converters"},
        apps: [
            {
                id: "kitchen-units",
                title: "Unidades de Cozinha",
                description: "Converta xícaras, colheres e gramas por ingrediente.",
                icon: <FaSpoon size={18}/>,
            },
            {
                id: "currency",
                title: "Moedas",
                description: "Converta entre moedas com taxas em tempo real.",
                icon: <FaCoins size={18}/>,
            },
            {
                id: "bitcoin",
                title: "Bitcoin",
                description: "Converta BTC para dólar, real e outras moedas.",
                icon: <FaBitcoin size={18}/>,
            },
            {
                id: "file-size",
                title: "Tamanho de Arquivo",
                description: "Converta unidades e estime tempo de download.",
                icon: <FaFileArrowDown size={18}/>,
            },
            {
                id: "number-systems",
                title: "Sistemas Numéricos",
                description: "Converta entre decimal, binário, hex e octal.",
                icon: <Fa0 size={18}/>,
            }
        ]
    },
    {
        id: "personalization",
        title: {pt: "Personalização", en: "Personalization"},
        apps: [
            {
                id: "qr-code",
                title: "Gerador de QR Code",
                description: "Crie QR codes personalizados com cores e logo.",
                icon: <FaQrcode size={18}/>,
            },
            {
                id: "image-to-svg",
                title: "PNG/JPG para SVG",
                description: "Converta imagens para formato vetorial SVG.",
                icon: <FaPhotoFilm size={18}/>,
            }
        ]
    }
];

const translations = {
    pt: {
        title: "Mini Aplicativos",
        desc: "Ferramentas que construí para uso no dia a dia.",
    },
    en: {
        title: "Mini Apps",
        desc: "Tools I built for everyday use.",
    },
};

export default function AppsPage() {
    const {lang} = useLang();
    const t = translations[lang];

    return (
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">

                <div className="mb-12">
                    <h1 className="text-3xl font-bold mb-3 text-gray-900 dark:text-white">{t.title}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed">{t.desc}</p>
                </div>

                <div className="space-y-10">
                    {appCategories.map((category) => (
                        <section key={category.id}>
                            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                                {category.title[lang]}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {category.apps.map((app) => (
                                    <Link
                                        key={app.id}
                                        href={`/app/${app.id}`}
                                        onClick={() => trackAppClick(app.id, app.title)}
                                        className="block border border-gray-100 dark:border-gray-800 rounded-xl p-4 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all"
                                    >
                                        <div className="flex items-start gap-3 mb-2">
                                            <div className="mt-0.5 text-green-500 shrink-0">
                                                {app.icon}
                                            </div>
                                            <span className="font-semibold text-sm text-gray-900 dark:text-white leading-snug">
                                                {app.title}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed pl-7">
                                            {app.description}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

            </div>
        </div>
    );
}
