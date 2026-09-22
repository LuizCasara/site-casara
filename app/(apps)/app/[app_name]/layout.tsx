import type { Metadata } from "next";

const APP_META: Record<string, { title: string; description: string }> = {
  "descubra-seu-temperamento": {
    title: "Descubra seu Temperamento",
    description:
      "Responda perguntas simples e descubra qual dos quatro temperamentos humanos é predominante em você: Colérico, Sanguíneo, Melancólico ou Fleumático.",
  },
  "rule-of-three": {
    title: "Calculadora de Regra de Três",
    description: "Calcule proporções automaticamente com esta calculadora interativa.",
  },
  "compound-interest": {
    title: "Calculadora de Juros Compostos",
    description: "Calcule juros compostos com base em capital inicial, taxa e tempo.",
  },
  percentage: {
    title: "Calculadora de Porcentagem",
    description: "Calcule porcentagens simples, aumentos, reduções e muito mais.",
  },
  "kitchen-units": {
    title: "Conversor de Unidades de Cozinha",
    description: "Converta medidas comuns em receitas com base em ingredientes específicos.",
  },
  currency: {
    title: "Conversor de Moedas",
    description: "Converta moedas em tempo real.",
  },
  bitcoin: {
    title: "Conversor de Bitcoin",
    description: "Converta Bitcoin para dólar, real e outras moedas em tempo real.",
  },
  "file-size": {
    title: "Conversor de Tamanho de Arquivo",
    description: "Converta tamanhos de arquivo e estime tempo de download.",
  },
  "number-systems": {
    title: "Conversor de Sistemas Numéricos",
    description: "Converta entre decimal, binário, hexadecimal e octal.",
  },
  "qr-code": {
    title: "Gerador de QR Code",
    description: "Crie QR codes personalizados para links, contatos ou texto.",
  },
  "image-to-svg": {
    title: "Conversor PNG/JPG para SVG",
    description: "Envie uma imagem e obtenha um arquivo SVG vetorizado.",
  },
};

const BASE_URL = "https://luizcasara.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ app_name: string }>;
}): Promise<Metadata> {
  const { app_name } = await params;
  const meta = APP_META[app_name] ?? {
    title: "Mini Apps",
    description: "Ferramentas e aplicativos interativos criados por Luiz Casara.",
  };

  const url = `${BASE_URL}/app/${app_name}`;

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      type: "website",
      url,
      title: meta.title,
      description: meta.description,
      siteName: "Luiz Casara",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
  };
}

export default function AppNameLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
