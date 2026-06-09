"use client";

import Image from "next/image";
import Link from "next/link";
import {FaGithub, FaGlobe, FaInstagram, FaLinkedin, FaWhatsapp} from "react-icons/fa";
import {trackSocialMediaClick} from "@/utils/analytics";
import {useLang} from "@/context/LanguageContext";
import {Typewriter} from "@/components/ui/typewriter";

const skills: Record<string, string[]> = {
  "Liderança & Processo": ["Tech Leadership", "Spec-Driven Development", "Squad Management", "Architecture Review"],
  "Front-End & Mobile": ["React", "Next.js", "TypeScript", "React Native", "Tailwind CSS", "Styled-Components"],
  "Back-End & APIs": ["Node.js", "GraphQL (Apollo)", "REST APIs", "Java (JPA/Hibernate)", "Python", "Spring Boot"],
  "Banco de Dados": ["PostgreSQL", "Oracle", "SQLite"],
  "QA & DevOps": ["Cypress", "E2E Testing", "CI/CD Pipelines", "Git", "Linux"],
  "AI Tools": ["Claude Code", "GitHub Copilot"],
};

const experience = [
  {
    role: "Tech Lead / Senior Front-End Engineer",
    company: "Dock",
    companyUrl: "https://dock.tech",
    period: {pt: "Mai 2022 – Presente", en: "May 2022 – Present"},
    description: {
      pt: "Fintech de infraestrutura bancária (BaaS) para grandes instituições financeiras brasileiras.",
      en: "Banking-as-a-service (BaaS) fintech powering major Brazilian financial institutions.",
    },
    highlights: {
      pt: [
        "Liderança de dois squads multifuncionais — arquitetura, planejamento e qualidade de código.",
        "Dono técnico de 9 produtos financeiros, alguns com SLA ≤20ms e 350+ TPS de throughput sustentado.",
        "Micro-frontend com React + TypeScript, GraphQL (Apollo), Node.js BFFs e Python APIs.",
        "Conduzindo a adoção de Spec-Driven Development para melhorar previsibilidade entre squads.",
      ],
      en: [
        "Leading two cross-functional squads — architecture decisions, delivery planning, and code quality.",
        "Technical owner of 9 financial products, some with ≤20ms SLA and 350+ TPS sustained throughput.",
        "Micro-frontend architecture with React + TypeScript, GraphQL (Apollo), Node.js BFFs, and Python APIs.",
        "Driving Spec-Driven Development adoption to improve squad predictability and alignment.",
      ],
    },
  },
  {
    role: "Senior Full-Stack Developer",
    company: "TOTVS (Wealth Systems)",
    companyUrl: "https://www.totvs.com",
    period: {pt: "Out 2018 – Presente (Contrato)", en: "Oct 2018 – Present (Contract)"},
    description: {
      pt: "Maior empresa de ERP do Brasil, vertical de gestão de patrimônio.",
      en: "Brazil's largest ERP company, wealth management vertical.",
    },
    highlights: {
      pt: [
        "Features front-end e mobile com React, React Native, TypeScript e Styled-Components.",
        "CI/CD pipelines e iniciativas de qualidade E2E com Cypress.",
        "AG Grid para experiências complexas de tabela de dados.",
      ],
      en: [
        "Front-end and mobile features with React, React Native, TypeScript, and Styled-Components.",
        "CI/CD pipelines and E2E quality initiatives using Cypress.",
        "AG Grid implementations for complex data table experiences.",
      ],
    },
  },
  {
    role: "Senior Full-Stack Developer",
    company: "Maxxidata",
    period: {pt: "Out 2019 – Jan 2023", en: "Oct 2019 – Jan 2023"},
    description: {
      pt: "Consultoria de tecnologia com projetos enterprise em múltiplos setores.",
      en: "Technology consulting firm delivering enterprise solutions across multiple industries.",
    },
    highlights: {
      pt: [
        "Múltiplos projetos simultâneos, adaptando-se rapidamente a diferentes stacks e domínios.",
        "Especialização em performance, design de APIs e práticas ágeis.",
      ],
      en: [
        "Multiple concurrent projects, rapidly adapting to different tech stacks and business domains.",
        "Expertise in performance optimization, API design, and agile delivery practices.",
      ],
    },
  },
  {
    role: "Software Analyst & Developer",
    company: "ISP Saúde (SmartBR)",
    period: {pt: "Jan 2014 – Out 2018", en: "Jan 2014 – Oct 2018"},
    description: {
      pt: "Empresa de tecnologia para gestão de planos de saúde.",
      en: "Healthcare technology company providing software for health plan management.",
    },
    highlights: {
      pt: [
        "Pioneiro na plataforma e-commerce da empresa usando React (micro-serviços) e Spring Boot.",
        "Stack principal: Java com JPA/Hibernate, Oracle Database e REST APIs.",
      ],
      en: [
        "Pioneered the company's e-commerce platform using React (micro-services) and Spring Boot.",
        "Core stack: Java with JPA/Hibernate, Oracle Database, and REST APIs.",
      ],
    },
  },
];

const translations = {
  pt: {
    bio1: `10+ anos de experiência construindo software de alta criticidade em escala. Atualmente Tech Lead na`,
    bio1company: "Dock",
    bio1end: ", uma fintech de infraestrutura bancária. Bacharel em Ciência da Computação pela Anhanguera — Cascavel, PR.",
    bio2: `Sou movido por desafios complexos e pela melhoria constante. Fora do trabalho, sou Chefe Escoteiro e coordenador regional do movimento escoteiro no oeste do Paraná — papel que me ensinou tanto sobre liderança quanto qualquer projeto de tecnologia.`,
    stackTitle: "Stack Técnico",
    skillCategories: {
      "Liderança & Processo": "Liderança & Processo",
      "Front-End & Mobile": "Front-End & Mobile",
      "Back-End & APIs": "Back-End & APIs",
      "Banco de Dados": "Banco de Dados",
      "QA & DevOps": "QA & DevOps",
      "AI Tools": "AI Tools",
    } as Record<string, string>,
    experienceTitle: "Experiência",
    beyondTitle: "Além do código",
    beyondItems: [
      {emoji: "🏕️", text: "Chefe Escoteiro voluntário — coordenador regional do movimento escoteiro no oeste do Paraná. Fundei um grupo escoteiro em 2012."},
      {emoji: "🎮", text: "Gamer no Steam (Friend Code: 140363246) e ouvinte ativo no Spotify (@fencherlc)."},
      {emoji: "🌱", text: "Aprendendo AWS e GoLang. Defensor da melhoria de 1% por dia."},
    ],
    contactTitle: "Contato",
    contactText: "Sempre disponível para uma",
    contactBold: "boa",
    contactText2: "conversa!",
  },
  en: {
    bio1: `10+ years of experience building high-criticality software at scale. Currently Tech Lead at`,
    bio1company: "Dock",
    bio1end: ", a banking-as-a-service fintech. Bachelor's in Computer Science from Anhanguera — Cascavel, Brazil.",
    bio2: `I'm driven by complex challenges and constant improvement. Outside of work, I'm a Scout Leader and regional coordinator of the Scout movement in western Paraná — a role that taught me as much about leadership as any tech project.`,
    stackTitle: "Tech Stack",
    skillCategories: {
      "Liderança & Processo": "Leadership & Process",
      "Front-End & Mobile": "Front-End & Mobile",
      "Back-End & APIs": "Back-End & APIs",
      "Banco de Dados": "Databases",
      "QA & DevOps": "QA & DevOps",
      "AI Tools": "AI Tools",
    } as Record<string, string>,
    experienceTitle: "Experience",
    beyondTitle: "Beyond the code",
    beyondItems: [
      {emoji: "🏕️", text: "Volunteer Scout Leader — regional coordinator of the Scout movement in western Paraná. Founded a Scout group in 2012."},
      {emoji: "🎮", text: "Gamer on Steam (Friend Code: 140363246) and active Spotify listener (@fencherlc)."},
      {emoji: "🌱", text: "Learning AWS and GoLang. Advocate for 1% daily improvement."},
    ],
    contactTitle: "Contact",
    contactText: "Always available for a",
    contactBold: "good",
    contactText2: "conversation!",
  },
};

export default function About() {
  const {lang} = useLang();
  const t = translations[lang];

  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Hero */}
        <div className="flex flex-col md:flex-row gap-10 items-start mb-16">
          <div className="flex-shrink-0">
            <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm">
              <Image src="/luiz.jpeg" alt="Luiz Casara" fill sizes="112px" className="object-cover" priority />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-1 text-gray-900 dark:text-white">Luiz Casara</h1>
            <p className="font-mono text-xs text-green-500 dark:text-green-400 tracking-widest uppercase mb-3">
              Tech Lead · Senior Full-Stack Engineer
            </p>
            <div className="font-mono text-sm text-gray-400 dark:text-gray-500 mb-4 h-5">
              <Typewriter
                text={lang === "pt"
                  ? ["Lidero squads de alto desempenho", "Construo produtos financeiros em escala", "Chefe Escoteiro voluntário 🏕️", "1% melhor todo dia"]
                  : ["Leading high-performance squads", "Building financial products at scale", "Volunteer Scout Leader 🏕️", "1% better every day"]
                }
                speed={55}
                deleteSpeed={25}
                waitTime={2200}
                cursorChar="_"
                cursorClassName=""
              />
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3 max-w-2xl">
              {t.bio1}{" "}
              <a href="https://dock.tech" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">
                {t.bio1company}
              </a>
              {t.bio1end}
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">{t.bio2}</p>
            <div className="mt-5">
              <a
                href="/2026_Luiz_Casara_Resume_US.pdf"
                download
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download CV (EN)
              </a>
            </div>
          </div>
        </div>

        {/* Skills */}
        <section className="mb-16">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">{t.stackTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(skills).map(([category, items]) => (
              <div key={category} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  {t.skillCategories[category]}
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map(item => (
                    <span key={item} className="font-mono text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-md">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Experience */}
        <section className="mb-16">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">{t.experienceTitle}</h2>
          <div className="space-y-4">
            {experience.map((exp, i) => (
              <div key={i} className="p-5 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{exp.role}</h3>
                    {exp.companyUrl ? (
                      <a href={exp.companyUrl} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600 font-semibold text-sm">
                        {exp.company}
                      </a>
                    ) : (
                      <p className="text-green-500 font-semibold text-sm">{exp.company}</p>
                    )}
                  </div>
                  <span className="font-mono text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0">
                    {exp.period[lang]}
                  </span>
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 italic mb-3">{exp.description[lang]}</p>
                <ul className="space-y-1">
                  {exp.highlights[lang].map((h, j) => (
                    <li key={j} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                      <span className="text-green-500 shrink-0 mt-0.5">·</span>
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Personal */}
        <section className="mb-16 p-6 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold mb-5 text-gray-900 dark:text-white">{t.beyondTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm text-gray-600 dark:text-gray-400">
            {t.beyondItems.map(({emoji, text}) => (
              <div key={emoji} className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{emoji}</span>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{t.contactTitle}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
            {t.contactText} <strong className="text-gray-900 dark:text-white">{t.contactBold}</strong> {t.contactText2}
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              {href: "https://github.com/LuizCasara", icon: <FaGithub size={18} />, label: "GitHub", track: "GitHub"},
              {href: "https://www.linkedin.com/in/luiz-claudio-perin-casara-8bb1a5ab/", icon: <FaLinkedin size={18} />, label: "LinkedIn", track: "LinkedIn"},
              {href: "https://www.instagram.com/luiz_cpc", icon: <FaInstagram size={18} />, label: "Instagram", track: "Instagram"},
              {href: "https://wa.me/5545991119881", icon: <FaWhatsapp size={18} />, label: "WhatsApp", track: "WhatsApp"},
              {href: "https://bio.site/luizcasara", icon: <FaGlobe size={18} />, label: "Bio Site", track: "Bio Site"},
            ].map(({href, icon, label, track}) => (
              <Link
                key={label}
                href={href}
                target={href.startsWith("mailto:") ? undefined : "_blank"}
                rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                onClick={() => trackSocialMediaClick(track)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                {icon}
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
