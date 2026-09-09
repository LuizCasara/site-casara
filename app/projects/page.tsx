"use client";

import Link from "next/link";
import {FaBookOpen, FaGlobeAmericas, FaThLarge} from "react-icons/fa";
import {useLang} from "@/context/LanguageContext";
import {ProjectAccordion} from "@/components/ui/interactive-image-accordion";
import {trackInternalProjectClick} from "@/utils/analytics";

const experimentos = [
  {
    slug: "aplicativos",
    href: "/app",
    icon: <FaThLarge size={18} />,
    wip: false,
    title: {pt: "Aplicativos", en: "Apps"},
    blurb: {
      pt: "Mini-ferramentas que construí para o dia a dia — conversores, testes e dinâmicas ao vivo.",
      en: "Mini-tools I built for everyday use — converters, quizzes and live activities.",
    },
  },
  {
    slug: "livros",
    href: "/livros",
    icon: <FaBookOpen size={18} />,
    wip: false,
    title: {pt: "Livros", en: "Books"},
    blurb: {
      pt: "Meu acervo numa sala de leitura 3D navegável, com resenhas e notas de cada livro.",
      en: "My library as a navigable 3D reading room, with reviews and notes on every book.",
    },
  },
  {
    slug: "ingress",
    href: "/ingress",
    icon: <FaGlobeAmericas size={18} />,
    wip: true,
    title: {pt: "Ingress", en: "Ingress"},
    blurb: {
      pt: "Painel do meu perfil de agente: medalhas, estatísticas e linha do tempo.",
      en: "My agent profile dashboard: medals, stats and timeline.",
    },
  },
];

const translations = {
  pt: {
    title: "Projetos",
    desc: "Coisas que construí — as que vivem aqui dentro do site e as que entreguei para clientes.",
    experimentsLabel: "Experimentos · feitos aqui",
    clientWorkLabel: "Trabalho com clientes",
    wipBadge: "em construção",
  },
  en: {
    title: "Projects",
    desc: "Things I've built — the ones that live here on the site and the ones I delivered for clients.",
    experimentsLabel: "Experiments · built here",
    clientWorkLabel: "Client work",
    wipBadge: "work in progress",
  },
};

const projects = [
  {
    id: 1,
    title: "Grupo Escoteiro Aldeia Verde",
    image: "/thumbnails/geavThumb.png",
    tags: ["Next.js", "React", "Tailwind CSS"],
    link: "https://www.gealdeiaverde.org/",
    description: {
      pt: "Website para um grupo escoteiro com histórico da organização e formulários para membros e voluntários.",
      en: "Website for a scout group with organization history and forms for members and volunteers.",
    },
  },
  {
    id: 2,
    title: "Gusloseimas",
    image: "/thumbnails/gusloseimasThumb.jpg",
    tags: ["Next.js", "React", "Tailwind CSS"],
    link: "https://www.gusloseimas.com/",
    description: {
      pt: "E-commerce para uma confeitaria gourmet com catálogo de produtos e sistema de pedidos.",
      en: "E-commerce website for a gourmet confectionery with product catalog and ordering system.",
    },
  },
  {
    id: 3,
    title: "Sencia",
    image: "/thumbnails/senciaThumb.png",
    tags: ["Next.js", "React", "Node.js", "PostgreSQL", "Java", "API Integration"],
    link: "https://sencia.app/",
    description: {
      pt: "Plataforma CRM para automação de negócios e tomada de decisão com analytics e relatórios.",
      en: "CRM platform for business automation and decision-making with analytics and reporting tools.",
    },
  },
];

export default function ProjectsPage() {
  const {lang} = useLang();
  const t = translations[lang];

  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3 text-gray-900 dark:text-white">{t.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl text-sm leading-relaxed">{t.desc}</p>
        </div>

        <section className="mb-14">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
            {t.experimentsLabel}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {experimentos.map((exp) => (
              <Link
                key={exp.slug}
                href={exp.href}
                onClick={() => trackInternalProjectClick(exp.slug)}
                className={`block rounded-xl border p-4 transition-all ${
                  exp.wip
                    ? "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                    : "border-green-200 dark:border-green-900/50 hover:border-green-300 dark:hover:border-green-800 hover:bg-green-50/50 dark:hover:bg-green-950/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-500 shrink-0">{exp.icon}</span>
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{exp.title[lang]}</span>
                  {exp.wip && (
                    <span className="font-mono text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded px-1 py-px">
                      {t.wipBadge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{exp.blurb[lang]}</p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
            {t.clientWorkLabel}
          </h2>
          <ProjectAccordion projects={projects} />
        </section>

      </div>
    </div>
  );
}
