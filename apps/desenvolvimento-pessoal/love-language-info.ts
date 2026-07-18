export type LoveLanguageName = "afirmacao" | "qualidade" | "presentes" | "servico" | "toque";

export interface LoveLanguageInfo {
    displayName: string;
    // Hex value for contexts that can't use Tailwind classes (PDF inline styles).
    hexColor: string;
    // Tailwind classes for the "Detalhes" heading on the results page.
    headingColorClass: string;
    // Tailwind classes for the ranked badge shown in the language list/stats.
    badgeBgClass: string;
    badgeTextClass: string;
    // Tailwind class for the stats distribution bar.
    barClass: string;
    description: string;
    howYouFeelLoved: string[];
    commonMisunderstandings: string[];
    relationshipTips: string[];
}

export const LOVE_LANGUAGE_INFO: Record<LoveLanguageName, LoveLanguageInfo> = {
    afirmacao: {
        displayName: "Palavras de Afirmação",
        hexColor: "#6366f1",
        headingColorClass: "text-indigo-600 dark:text-indigo-400",
        badgeBgClass: "bg-indigo-100 dark:bg-indigo-900/30",
        badgeTextClass: "text-indigo-800 dark:text-indigo-200",
        barClass: "bg-indigo-400",
        description: "Você se sente mais amado(a) através de elogios sinceros, palavras de incentivo e reconhecimento verbal ou escrito.",
        howYouFeelLoved: [
            "Elogios sinceros e específicos sobre o que você fez ou é",
            "Mensagens de apoio e incentivo nos momentos difíceis",
            "Reconhecimento verbal do seu esforço, mesmo em coisas pequenas",
            "Um \"eu te amo\" dito com frequência, não só assumido",
        ],
        commonMisunderstandings: [
            "Pode interpretar silêncio ou falta de elogios como desinteresse, mesmo quando não é o caso",
            "Críticas, mesmo construtivas, tendem a doer mais fundo do que o esperado",
            "Corre o risco de supervalorizar palavras bonitas mesmo quando não vêm acompanhadas de ação",
            "Pode se sentir invisível perto de alguém mais reservado, que ama mas raramente verbaliza",
        ],
        relationshipTips: [
            "Avise as pessoas próximas que palavras específicas fazem diferença pra você — a maioria não adivinha isso sozinha",
            "Pratique também dar esse tipo de reconhecimento a quem você ama, mesmo que não seja a linguagem principal deles",
            "Separe elogio de sinceridade: peça feedback direto quando precisar, não só validação",
            "Guarde mensagens e bilhetes marcantes — reler ajuda a lembrar de momentos de afeto",
        ],
    },
    qualidade: {
        displayName: "Tempo de Qualidade",
        hexColor: "#14b8a6",
        headingColorClass: "text-teal-600 dark:text-teal-400",
        badgeBgClass: "bg-teal-100 dark:bg-teal-900/30",
        badgeTextClass: "text-teal-800 dark:text-teal-200",
        barClass: "bg-teal-400",
        description: "Você se sente mais amado(a) quando recebe atenção plena e indivisa — presença de verdade, sem distrações.",
        howYouFeelLoved: [
            "Conversas profundas, sem celular ou TV por perto",
            "Atividades feitas junto, mesmo que simples",
            "Alguém que escuta de verdade, sem interromper ou desviar",
            "Planejar tempo juntos, não só \"estar no mesmo espaço\"",
        ],
        commonMisunderstandings: [
            "Pode confundir \"estar perto fisicamente\" com \"estar presente de verdade\" — a diferença importa muito pra você",
            "Cancelamentos de última hora tendem a doer mais do que pareceria razoável pra outra pessoa",
            "Corre o risco de exigir tempo exclusivo de pessoas com agendas legitimamente cheias",
            "Pode se sentir negligenciado(a) por quem ama por atos práticos, não por presença",
        ],
        relationshipTips: [
            "Proteja um tempo fixo e recorrente com quem você ama — não deixe só pra \"quando sobrar\"",
            "Guarde o celular durante esse tempo — é o gesto mais simples e mais valorizado por quem tem essa linguagem",
            "Explique que \"tempo junto\" pra você é sobre atenção, não duração — 15 minutos focados valem mais que 2 horas distraídas",
            "Reconheça quando alguém te dá esse tempo, mesmo que seja pouco — isso reforça o comportamento",
        ],
    },
    presentes: {
        displayName: "Presentes",
        hexColor: "#ec4899",
        headingColorClass: "text-pink-600 dark:text-pink-400",
        badgeBgClass: "bg-pink-100 dark:bg-pink-900/30",
        badgeTextClass: "text-pink-800 dark:text-pink-200",
        barClass: "bg-pink-400",
        description: "Você se sente mais amado(a) ao receber algo tangível que mostra que pensaram em você — o valor simbólico importa mais que o financeiro.",
        howYouFeelLoved: [
            "Um mimo trazido sem motivo especial, só porque lembraram de você",
            "Presentes que mostram que a pessoa prestou atenção nos seus gostos",
            "Lembranças de viagens ou momentos especiais",
            "O gesto de escolher algo, não só o objeto em si",
        ],
        commonMisunderstandings: [
            "Corre o risco de ser mal-interpretado(a) como materialista quando o que importa é o gesto, não o preço",
            "Esquecer datas importantes tende a doer mais fundo do que pareceria razoável pra quem não tem essa linguagem",
            "Pode supervalorizar presentes caros sobre gestos mais baratos mas igualmente pensados, sem perceber",
            "Quem não tem essa linguagem pode achar desnecessário gastar com \"coisas\" e não entender o simbolismo por trás",
        ],
        relationshipTips: [
            "Deixe claro que o que importa é o cuidado por trás do gesto, não o valor gasto — ajuda a tirar a pressão financeira de quem te ama",
            "Guarde os presentes que mais te marcaram — funcionam como lembrete físico de afeto em dias difíceis",
            "Preste atenção também aos pequenos gestos não materiais de quem não fala essa língua — eles também são carinho",
            "Dê dicas sutis de coisas que gosta ao longo do tempo — facilita quem quer te presentear e não sabe como",
        ],
    },
    servico: {
        displayName: "Atos de Serviço",
        hexColor: "#f97316",
        headingColorClass: "text-orange-600 dark:text-orange-400",
        badgeBgClass: "bg-orange-100 dark:bg-orange-900/30",
        badgeTextClass: "text-orange-800 dark:text-orange-200",
        barClass: "bg-orange-400",
        description: "Você se sente mais amado(a) quando alguém alivia seu fardo com ações práticas — fazer algo por você fala mais alto que dizer algo.",
        howYouFeelLoved: [
            "Alguém resolvendo uma tarefa chata sem você precisar pedir",
            "Ajuda prática nos momentos de sobrecarga",
            "Gestos que antecipam uma necessidade sua",
            "Ver o esforço colocado numa tarefa feita para você",
        ],
        commonMisunderstandings: [
            "Pode interpretar promessas não cumpridas como falta de amor, mesmo quando a intenção era boa",
            "Corre o risco de se sentir mais amado(a) por quem \"faz\" do que por quem \"diz\", mesmo quando os dois amam igualmente",
            "Tende a demonstrar amor fazendo tarefas por outros mesmo quando eles preferem outra coisa, como atenção ou palavras",
            "Pedir ajuda quando precisa pode ser difícil, e a falta de oferta espontânea pode ser sentida como descaso",
        ],
        relationshipTips: [
            "Seja específico sobre o que ajudaria de verdade — \"me ajuda com isso?\" costuma funcionar melhor que esperar que adivinhem",
            "Reconheça verbalmente quando alguém faz algo por você, mesmo que ações sejam sua linguagem principal — reforça o vínculo",
            "Cuidado para não medir o amor do outro só pelo que ele faz por você — outras linguagens amam de formas diferentes, igualmente válidas",
            "Evite prometer ajuda que não vai cumprir — pra você isso pesa mais do que parece pra quem promete",
        ],
    },
    toque: {
        displayName: "Toque Físico",
        hexColor: "#f43f5e",
        headingColorClass: "text-rose-600 dark:text-rose-400",
        badgeBgClass: "bg-rose-100 dark:bg-rose-900/30",
        badgeTextClass: "text-rose-800 dark:text-rose-200",
        barClass: "bg-rose-400",
        description: "Você se sente mais amado(a) através do contato físico — abraços, mãos dadas, proximidade — mais do que por palavras ou gestos.",
        howYouFeelLoved: [
            "Abraços demorados, especialmente em momentos difíceis",
            "Proximidade física no dia a dia, como ficar encostado(a)",
            "Um toque no ombro ou um cafuné, mesmo sem contexto especial",
            "Contato físico espontâneo, não só em momentos íntimos",
        ],
        commonMisunderstandings: [
            "Falta de contato físico pode ser sentida como distanciamento emocional, mesmo quando não é a intenção da outra pessoa",
            "Corre o risco de confundir essa linguagem especificamente com desejo sexual, quando é sobre proximidade e conforto no geral",
            "Pessoas mais reservadas fisicamente podem amar igualmente sem perceber que esse gesto faz tanta diferença pra você",
            "Em fases de distância física (viagem, doença, brigas) você tende a sentir o impacto emocional com mais intensidade",
        ],
        relationshipTips: [
            "Comunique de forma clara e respeitosa que contato físico é importante pra você — evita que pareça \"carência\" quando é só sua forma de se conectar",
            "Sempre respeite os limites de conforto físico do outro — essa linguagem exige consentimento e leitura de contexto redobrados",
            "Busque outras formas dessa linguagem no dia a dia além do romântico: um abraço em amigos e família também conta",
            "Em relacionamentos à distância, planeje compensar com chamadas de vídeo e reencontros com esse tipo de proximidade em mente",
        ],
    },
};

export function getLoveLanguageDisplayName(name: string): string {
    return (LOVE_LANGUAGE_INFO as Record<string, LoveLanguageInfo>)[name]?.displayName ?? name;
}
