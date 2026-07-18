export type TemperamentName = "Sanguineo" | "Colerico" | "Melancolico" | "Fleumatico";

export interface TemperamentInfo {
    displayName: string;
    // Hex value for contexts that can't use Tailwind classes (PDF inline styles).
    hexColor: string;
    // Tailwind classes for the "Detalhes do Temperamento" heading on the results page.
    headingColorClass: string;
    // Tailwind classes for the ranked badge shown in the temperament list/stats.
    badgeBgClass: string;
    badgeTextClass: string;
    // Tailwind class for the stats distribution bar.
    barClass: string;
    strengths: string[];
    attentionPoints: string[];
    relationshipTips: string[];
}

export const TEMPERAMENT_INFO: Record<TemperamentName, TemperamentInfo> = {
    Sanguineo: {
        displayName: "Sanguíneo",
        hexColor: "#e53935",
        headingColorClass: "text-red-600 dark:text-red-400",
        badgeBgClass: "bg-red-100 dark:bg-red-900/30",
        badgeTextClass: "text-red-800 dark:text-red-200",
        barClass: "bg-red-400",
        strengths: [
            "Comunicativo e sociável",
            "Entusiasta e otimista",
            "Criativo e adaptável",
            "Bom em iniciar projetos",
            "Carismático e persuasivo",
        ],
        attentionPoints: [
            "Pode ser desorganizado",
            "Tendência a ser impulsivo",
            "Dificuldade em manter o foco",
            "Pode deixar projetos inacabados",
            "Às vezes superficial nas relações",
        ],
        relationshipTips: [
            "Pratique a escuta ativa",
            "Desenvolva compromisso e consistência",
            "Estabeleça limites claros",
            "Cultive relacionamentos mais profundos",
        ],
    },
    Colerico: {
        displayName: "Colérico",
        hexColor: "#ffb300",
        headingColorClass: "text-yellow-600 dark:text-yellow-400",
        badgeBgClass: "bg-yellow-100 dark:bg-yellow-900/30",
        badgeTextClass: "text-yellow-800 dark:text-yellow-200",
        barClass: "bg-yellow-400",
        strengths: [
            "Decidido e determinado",
            "Líder natural e visionário",
            "Orientado para objetivos",
            "Prático e eficiente",
            "Confiante e independente",
        ],
        attentionPoints: [
            "Pode ser impaciente",
            "Tendência a ser dominador",
            "Às vezes insensível aos sentimentos alheios",
            "Pode ser intolerante com erros",
            "Dificuldade em delegar",
        ],
        relationshipTips: [
            "Desenvolva paciência e empatia",
            "Aprenda a ouvir sem interromper",
            "Pratique a gentileza nas críticas",
            "Reconheça os sentimentos dos outros",
        ],
    },
    Melancolico: {
        displayName: "Melancólico",
        hexColor: "#1e88e5",
        headingColorClass: "text-blue-600 dark:text-blue-400",
        badgeBgClass: "bg-blue-100 dark:bg-blue-900/30",
        badgeTextClass: "text-blue-800 dark:text-blue-200",
        barClass: "bg-blue-400",
        strengths: [
            "Analítico e detalhista",
            "Perfeccionista e organizado",
            "Profundo e reflexivo",
            "Sensível e empático",
            "Criativo e artístico",
        ],
        attentionPoints: [
            "Tendência ao pessimismo",
            "Pode ser muito crítico",
            "Dificuldade em tomar decisões",
            "Propenso a mudanças de humor",
            "Pode se isolar socialmente",
        ],
        relationshipTips: [
            "Cultive o otimismo",
            "Estabeleça limites para autocrítica",
            "Pratique a assertividade",
            "Busque equilíbrio entre isolamento e socialização",
        ],
    },
    Fleumatico: {
        displayName: "Fleumático",
        hexColor: "#43a047",
        headingColorClass: "text-green-600 dark:text-green-400",
        badgeBgClass: "bg-green-100 dark:bg-green-900/30",
        badgeTextClass: "text-green-800 dark:text-green-200",
        barClass: "bg-green-400",
        strengths: [
            "Calmo e equilibrado",
            "Paciente e diplomático",
            "Confiável e consistente",
            "Bom mediador de conflitos",
            "Observador e analítico",
        ],
        attentionPoints: [
            "Pode ser indeciso",
            "Tendência à procrastinação",
            "Às vezes falta iniciativa",
            "Pode evitar conflitos necessários",
            "Resistência a mudanças",
        ],
        relationshipTips: [
            "Desenvolva assertividade",
            "Estabeleça metas e prazos",
            "Pratique expressar suas emoções",
            "Aprenda a lidar com conflitos de forma saudável",
        ],
    },
};

export function getTemperamentDisplayName(name: string): string {
    return (TEMPERAMENT_INFO as Record<string, TemperamentInfo>)[name]?.displayName ?? name;
}

export function getCharacteristicDisplayName(name: string): string {
    return name === "Umido" ? "Úmido" : name;
}
