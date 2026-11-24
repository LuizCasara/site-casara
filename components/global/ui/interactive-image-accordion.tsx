"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/components/global/LanguageContext";
import { trackProjectClick } from "@/lib/global/analytics";

type Project = {
  id: number;
  title: string;
  image: string;
  tags: string[];
  link: string;
  description: { pt: string; en: string };
};

type AccordionItemProps = {
  project: Project;
  isActive: boolean;
  onActivate: () => void;
  lang: "pt" | "en";
  viewProjectLabel: string;
};

const AccordionItem = ({
  project,
  isActive,
  onActivate,
  lang,
  viewProjectLabel,
}: AccordionItemProps) => {
  return (
    <div
      // Mobile: barras horizontais empilhadas que expandem em altura
      // Desktop: barras verticais lado a lado que expandem em largura
      className={[
        "relative overflow-hidden cursor-pointer flex-shrink-0 rounded-2xl",
        "transition-all duration-700 ease-in-out",
        // mobile sizing
        "w-full",
        isActive ? "h-[300px]" : "h-[68px]",
        // desktop overrides: os fechados têm largura fixa e o aberto ocupa o que
        // sobra (`flex-1`), em vez de 600px fixos — com 5+ projetos a soma das
        // larguras fixas passava do container e aparecia scroll horizontal.
        "md:h-[520px] md:w-auto",
        isActive ? "md:flex-[1_1_0%] md:min-w-[280px]" : "md:flex-[0_0_72px]",
      ].join(" ")}
      onClick={onActivate}
      onMouseEnter={onActivate}
    >
      <Image
        src={project.image}
        alt={project.title}
        fill
        className="object-cover"
        sizes="(max-width: 767px) 100vw, (max-width: 1023px) 400px, 640px"
      />

      {/* Overlay */}
      <div
        className={[
          "absolute inset-0 transition-opacity duration-500",
          isActive
            ? "bg-gradient-to-t from-black/85 via-black/35 to-transparent"
            : "bg-black/55",
        ].join(" ")}
      />

      {/* Título no estado colapsado
          Mobile: horizontal, alinhado à esquerda no meio da barra
          Desktop: rotacionado 90°, centrado na barra estreita */}
      <span
        className={[
          "absolute text-white text-sm font-semibold whitespace-nowrap",
          "transition-opacity duration-300",
          // mobile: centralizado verticalmente, à esquerda
          "top-1/2 left-5 -translate-y-1/2",
          // desktop: reset e rotaciona
          "md:top-auto md:translate-y-0 md:bottom-28 md:left-1/2 md:-translate-x-1/2 md:rotate-90",
          isActive ? "opacity-0 pointer-events-none" : "opacity-100",
        ].join(" ")}
      >
        {project.title}
      </span>

      {/* Conteúdo expandido */}
      <div
        className={[
          "absolute inset-0 flex flex-col justify-end p-5 md:p-7",
          "transition-opacity duration-500",
          isActive ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <h3 className="text-white font-bold text-xl mb-2 leading-snug">
          {project.title}
        </h3>
        <p className="text-gray-200 text-sm leading-relaxed mb-3 line-clamp-3">
          {project.description[lang]}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-white/20 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-md font-mono"
            >
              {tag}
            </span>
          ))}
        </div>
        <Link
          href={project.link}
          target="_blank"
          rel="noopener noreferrer"
          // Fechado, o link está invisível (opacity-0): fora da ordem do Tab.
          tabIndex={isActive ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation();
            trackProjectClick(project.title);
          }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-green-400 hover:text-green-300 transition-colors"
        >
          {viewProjectLabel}
        </Link>
      </div>
    </div>
  );
};

type Props = {
  projects: Project[];
};

export function ProjectAccordion({ projects }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { lang } = useLang();

  const viewLabel = lang === "pt" ? "Ver projeto →" : "View project →";

  return (
    // Mobile: coluna empilhada | Desktop: linha lado a lado
    // `overflow-x-auto` é só rede de segurança: com a lista atual tudo cabe e
    // não aparece barra; ela só surge se um dia os projetos forem tantos que o
    // aberto bateria no `min-w-[280px]`.
    <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:overflow-x-auto">
      {projects.map((project, index) => (
        <AccordionItem
          key={project.id}
          project={project}
          isActive={index === activeIndex}
          onActivate={() => setActiveIndex(index)}
          lang={lang}
          viewProjectLabel={viewLabel}
        />
      ))}
    </div>
  );
}
