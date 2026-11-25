"use client";

import {useLang} from "@/components/global/LanguageContext";
import {ProjectAccordion} from "@/components/global/ui/interactive-image-accordion";
import {type Experimento, ExperimentBento} from "@/components/global/projects/ExperimentCards";

const experimentos: Experimento[] = [
  {
    slug: "aplicativos",
    href: "/app",
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
    wip: false,
    title: {pt: "Ingress", en: "Ingress"},
    blurb: {
      pt: "Painel do meu perfil de agente: medalhas, estatísticas, ranking e linha do tempo.",
      en: "My agent profile dashboard: medals, stats, ranking and timeline.",
    },
  },
  {
    slug: "sintonia",
    href: null,
    wip: true,
    title: {pt: "Sintonia", en: "Sintonia"},
    blurb: {
      pt: "Um app novo que está saindo do forno. Por enquanto, só um spoiler.",
      en: "A new app fresh out of the oven. For now, just a teaser.",
    },
  },
  // Por último de propósito: é a faixa inteira da 3ª linha do bento.
  {
    slug: "fe",
    href: "/fe",
    wip: false,
    title: {pt: "Fé", en: "Faith"},
    blurb: {
      pt: "Dinâmicas interativas sobre Deus e a Palavra. A primeira é A Ponte: Romanos 6:23 contado em perguntas, com o desenho se montando a cada resposta.",
      en: "Interactive pieces about God and the Bible. The first is The Bridge: Romans 6:23 told through questions, with the drawing coming together at each answer (in Portuguese).",
    },
  },
];

const translations = {
  pt: {
    title: "Projetos",
    desc: "Coisas que construí — as que vivem aqui dentro do site e as que vivem lá fora.",
    experimentsLabel: "Experimentos · feitos aqui",
    clientWorkLabel: "Outros Trabalhos",
    wipBadge: "em construção",
    open: "Abrir",
  },
  en: {
    title: "Projects",
    desc: "Things I've built — the ones that live here on the site and the ones that live out there.",
    experimentsLabel: "Experiments · built here",
    clientWorkLabel: "Other Work",
    wipBadge: "work in progress",
    open: "Open",
  },
};

const projects = [
  {
    id: 4,
    title: "PageFoundry",
    image: "/thumbnails/pagefoundryThumb.png",
    tags: ["Next.js", "Tailwind CSS", "Landing pages"],
    link: "https://pagefoundry-seven.vercel.app/",
    description: {
      pt: "Vitrine de landing pages prontas, cada uma com deploy próprio — veja a demo, confira a stack e escolha a que combina com o seu negócio.",
      en: "A showcase of ready-made landing pages, each with its own deploy — see the demo, check the stack and pick the one that fits your business.",
    },
  },
  {
    id: 5,
    title: "CyberPyo",
    image: "/thumbnails/cyberpyoThumb.png",
    tags: ["Next.js", "React", "PWA"],
    link: "https://www.gealdeiaverde.org/cyberpyo",
    description: {
      pt: "Site do Mutirão Regional Pioneiro 2027, com tema cyberpunk: contagem regressiva, programação ao vivo, mural, FAQ e boletins — instalável como app.",
      en: "Website for the 2027 Regional Rover Service Camp, cyberpunk-themed: countdown, live schedule, message board, FAQ and bulletins — installable as an app.",
    },
  },
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
          <ExperimentBento items={experimentos} lang={lang} wipLabel={t.wipBadge} openLabel={t.open} />
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
