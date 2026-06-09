"use client";

import { useLang } from "@/context/LanguageContext";
import { ProjectAccordion } from "@/components/ui/interactive-image-accordion";

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
    title: "Soupe",
    image: "/thumbnails/soupeThumb.png",
    tags: ["Next.js", "React", "Node.js", "PostgreSQL", "Java", "API Integration"],
    link: "https://www.soupe.app/",
    description: {
      pt: "Plataforma CRM para automação de negócios e tomada de decisão com analytics e relatórios.",
      en: "CRM platform for business automation and decision-making with analytics and reporting tools.",
    },
  },
];

const translations = {
  pt: {
    title: "Projetos",
    desc: "Uma seleção de projetos que desenvolvi para clientes — cada um com seus desafios e tecnologias específicas.",
  },
  en: {
    title: "Projects",
    desc: "A selection of projects I built for clients — each with its own challenges and technologies.",
  },
};

export default function ProjectsPage() {
  const { lang } = useLang();
  const t = translations[lang];

  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3 text-gray-900 dark:text-white">{t.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl text-sm leading-relaxed">{t.desc}</p>
        </div>

        <ProjectAccordion projects={projects} />

      </div>
    </div>
  );
}
