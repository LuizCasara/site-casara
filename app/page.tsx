"use client";

import Link from "next/link";
import {useEffect, useState} from "react";
import {FaBookOpen, FaChartLine, FaCode, FaLaugh, FaLightbulb, FaRandom} from "react-icons/fa";
import {trackGenerateQuote, trackHomePageVisit, trackQuickAccessLink, trackReceiveTip} from "@/utils/analytics";
import {useLang} from "@/context/LanguageContext";
import {TextScramble} from "@/components/ui/text-scramble";
import {RainingLetters} from "@/components/ui/raining-letters";

const translations = {
  pt: {
    location: "🇧🇷 Cascavel, Brasil",
    bio: `10+ anos construindo software de alta criticidade em escala. Atualmente lidero dois squads em fintech — responsável por 9 produtos financeiros, alguns com SLA de`,
    bioHighlight1: "≤20ms",
    bioMid: "e",
    bioHighlight2: "350+ TPS",
    bioEnd: "de throughput.",
    subtitle: "Tech Lead · Senior Full-Stack Engineer",
    viewProjects: "Ver Projetos",
    aboutMe: "Sobre Mim",
    stats: [
      {value: "10+", label: "Anos de experiência"},
      {value: "2", label: "Squads liderados"},
      {value: "9", label: "Produtos financeiros"},
    ],
    appsTitle: "Mini Aplicativos",
    appsDesc: "Ferramentas que construí para uso no dia a dia.",
    seeAll: "Ver todos →",
    apps: [
      {label: "Regra de Três"},
      {label: "Juros Compostos"},
      {label: "Gerador QR"},
      {label: "Temperamento"},
    ],
    funTitle: "Diversão",
    funDesc: "Para os momentos de inspiração (ou procrastinação).",
    quoteTitle: "Citação Aleatória",
    quotePlaceholder: "Clique para gerar uma citação de programação",
    quoteBtn: "Gerar Citação",
    tipTitle: "Dica de Tecnologia",
    tipPlaceholder: "Clique para receber uma dica de tecnologia",
    tipBtn: "Receber Dica",
    tips: [
      "Use atalhos de teclado para aumentar a produtividade",
      "Backups regulares podem salvar você de desastres",
      "Modo escuro pode reduzir o cansaço visual ao programar à noite",
      "Aprenda estratégias de branching do Git para melhor colaboração",
      "Tente a técnica Pomodoro para maior foco",
      "Comente seu código como se o próximo desenvolvedor fosse um psicopata que sabe onde você mora",
      "O debugging com pato de borracha realmente funciona!",
      "Faça pausas regulares para evitar o burnout",
      "Aprenda um novo conceito de programação por semana",
      "Contribua com open source para melhorar suas habilidades",
    ],
  },
  en: {
    location: "🇧🇷 Cascavel, Brazil",
    bio: `10+ years building high-criticality software at scale. Currently leading two squads at a fintech — responsible for 9 financial products, some with`,
    bioHighlight1: "≤20ms",
    bioMid: "SLA and",
    bioHighlight2: "350+ TPS",
    bioEnd: "throughput.",
    subtitle: "Tech Lead · Senior Full-Stack Engineer",
    viewProjects: "View Projects",
    aboutMe: "About Me",
    stats: [
      {value: "10+", label: "Years of experience"},
      {value: "2", label: "Squads led"},
      {value: "9", label: "Financial products"},
    ],
    appsTitle: "Mini Apps",
    appsDesc: "Tools I built for everyday use.",
    seeAll: "See all →",
    apps: [
      {label: "Rule of Three"},
      {label: "Compound Interest"},
      {label: "QR Generator"},
      {label: "Temperament"},
    ],
    funTitle: "Fun",
    funDesc: "For moments of inspiration (or procrastination).",
    quoteTitle: "Random Quote",
    quotePlaceholder: "Click to generate a programming quote",
    quoteBtn: "Generate Quote",
    tipTitle: "Tech Tip",
    tipPlaceholder: "Click to receive a tech tip",
    tipBtn: "Get Tip",
    tips: [
      "Use keyboard shortcuts to boost productivity",
      "Regular backups can save you from disaster",
      "Dark mode can reduce eye strain during night coding",
      "Learn Git branching strategies for better collaboration",
      "Try the Pomodoro technique for better focus",
      "Comment your code as if the next developer is a psychopath who knows where you live",
      "Rubber duck debugging really works!",
      "Take regular breaks to prevent burnout",
      "Learn one new programming concept each week",
      "Contribute to open source to improve your skills",
    ],
  },
};

const appLinks = [
  {href: "/app/rule-of-three", icon: <FaRandom className="text-green-500" size={20} />, trackLabel: "Regra de Três"},
  {href: "/app/compound-interest", icon: <FaChartLine className="text-green-500" size={20} />, trackLabel: "Juros Compostos"},
  {href: "/app/qr-code", icon: <FaCode className="text-green-500" size={20} />, trackLabel: "Gerador QR Code"},
  {href: "/app/descubra-seu-temperamento", icon: <FaLaugh className="text-green-500" size={20} />, trackLabel: "Temperamento"},
];

export default function Home() {
  const {lang} = useLang();
  const t = translations[lang];
  const [randomQuote, setRandomQuote] = useState("");
  const [randomTip, setRandomTip] = useState("");
  const [nameHovered, setNameHovered] = useState(false);

  useEffect(() => {
    return trackHomePageVisit();
  }, []);

  useEffect(() => {
    setRandomTip("");
    setRandomQuote("");
  }, [lang]);

  const generateRandomTip = () => {
    trackReceiveTip();
    setRandomTip(t.tips[Math.floor(Math.random() * t.tips.length)]);
  };

  const generateRandomQuote = () => {
    trackGenerateQuote();
    const quotes = [
      "\"Code is like humor. When you have to explain it, it's bad.\" – Cory House",
      "\"It's not a bug – it's an undocumented feature.\" – Anonymous",
      "\"First, solve the problem. Then, write the code.\" – John Johnson",
      "\"The best error message is the one that never shows up.\" – Thomas Fuchs",
      "\"Programming isn't about what you know; it's about what you can figure out.\" – Chris Pine",
      "\"The most disastrous thing that you can ever learn is your first programming language.\" – Alan Kay",
      "\"The only way to learn a new programming language is by writing programs in it.\" – Dennis Ritchie",
      "\"Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday's code.\" – Dan Salomon",
      "\"Simplicity is the soul of efficiency.\" – Austin Freeman",
      "\"Any fool can write code that a computer can understand. Good programmers write code that humans can understand.\" – Martin Fowler",
    ];
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  };

  return (
    <>
    <RainingLetters />
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative" style={{zIndex: 1}}>

      {/* Hero */}
      <section className="py-16 md:py-28">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t.location}</span>
          </div>

          <TextScramble
            as="h1"
            className="text-5xl sm:text-6xl font-bold tracking-tight mb-3 text-gray-900 dark:text-white cursor-default"
            speed={0.03}
            duration={0.7}
            trigger={nameHovered}
            onScrambleComplete={() => setNameHovered(false)}
            onHoverStart={() => setNameHovered(true)}
          >
            Luiz Casara
          </TextScramble>
          <p className="text-sm font-mono text-green-500 dark:text-green-400 mb-6 tracking-widest uppercase">
            {t.subtitle}
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8 max-w-2xl">
            {t.bio}{" "}
            <span className="text-gray-900 dark:text-gray-200 font-semibold">{t.bioHighlight1}</span>{" "}
            {t.bioMid}{" "}
            <span className="text-gray-900 dark:text-gray-200 font-semibold">{t.bioHighlight2}</span>{" "}
            {t.bioEnd}
          </p>

          <div className="flex flex-wrap gap-2 mb-10">
            {["React", "TypeScript", "GraphQL", "Node.js", "Next.js", "React Native"].map(tech => (
              <span
                key={tech}
                className="font-mono text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700"
              >
                {tech}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center rounded-lg bg-green-500 px-6 py-3 text-white font-semibold hover:bg-green-600 transition-colors"
            >
              {t.viewProjects}
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 px-6 py-3 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              {t.aboutMe}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 border-y border-gray-100 dark:border-gray-800/60">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-2xl">
          {t.stats.map(stat => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mini Apps */}
      <section className="py-16">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t.appsTitle}</h2>
          <Link href="/app" className="text-sm text-green-500 hover:text-green-600 transition-colors">
            {t.seeAll}
          </Link>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">{t.appsDesc}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {appLinks.map(({href, icon, trackLabel}, i) => (
            <Link
              key={href}
              href={href}
              onClick={() => trackQuickAccessLink(trackLabel)}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-800/60 hover:bg-green-50/50 dark:hover:bg-green-950/20 transition-all text-center"
            >
              {icon}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.apps[i].label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Fun */}
      <section className="py-16 border-t border-gray-100 dark:border-gray-800/60">
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{t.funTitle}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">{t.funDesc}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <FaBookOpen className="text-blue-500" size={15} />
              <span className="font-semibold text-sm text-gray-900 dark:text-white">{t.quoteTitle}</span>
            </div>
            <div className="p-5">
              <p className="text-gray-600 dark:text-gray-400 italic text-sm min-h-[60px] mb-4 leading-relaxed">
                {randomQuote || t.quotePlaceholder}
              </p>
              <button
                onClick={generateRandomQuote}
                className="w-full py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                {t.quoteBtn}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <FaLightbulb className="text-purple-500" size={15} />
              <span className="font-semibold text-sm text-gray-900 dark:text-white">{t.tipTitle}</span>
            </div>
            <div className="p-5">
              <p className="text-gray-600 dark:text-gray-400 text-sm min-h-[60px] mb-4 leading-relaxed">
                {randomTip || t.tipPlaceholder}
              </p>
              <button
                onClick={generateRandomTip}
                className="w-full py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
              >
                {t.tipBtn}
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
    </>
  );
}
