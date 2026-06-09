"use client";

import {useEffect, useRef, useState} from "react";
import {FaSpinner, FaUser} from "react-icons/fa";
import temperamentosJson from "./temperamentos.json";
import tiebreakerQuestionsJson from "./tiebreakerQuestions.json";
import {sendTemperamentTestMessage} from "@/app/api/telegram/utils";
import {generatePdf, PdfContent} from "@/utils/pdf-generator";
import {trackPdfDownload, trackQuestionDropout, trackTemperamentDistribution, trackTestCompletion, trackTestStart} from "@/utils/analytics";

const TEMPERAMENT_DISPLAY: Record<string, string> = {
    Sanguineo: "Sanguíneo",
    Colerico: "Colérico",
    Melancolico: "Melancólico",
    Fleumatico: "Fleumático",
};

const TEMPERAMENT_COLORS: Record<string, { bg: string; text: string }> = {
    Sanguineo: {bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-800 dark:text-red-200"},
    Colerico: {bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-800 dark:text-yellow-200"},
    Melancolico: {bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-200"},
    Fleumatico: {bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-800 dark:text-green-200"},
};

const TEMPERAMENT_BAR: Record<string, string> = {
    Sanguineo: "bg-red-400",
    Colerico: "bg-yellow-400",
    Melancolico: "bg-blue-400",
    Fleumatico: "bg-green-400",
};

type Metrics = {
    total_completed: number;
    by_primary: { temperament: string; count: number }[];
    averages: { sanguineo: number; colerico: number; melancolico: number; fleumatico: number; duration_seconds: number };
};

const EMPTY_SCORES = {Quente: 0, Frio: 0, Seco: 0, Umido: 0};

const TIEBREAKER_THRESHOLD = 10;

type Scores = typeof EMPTY_SCORES;

function computeTemperamentScores(s: Scores) {
    return {
        Sanguineo: (s.Quente * 0.5) + (s.Umido * 0.5),
        Colerico: (s.Quente * 0.5) + (s.Seco * 0.5),
        Melancolico: (s.Frio * 0.5) + (s.Seco * 0.5),
        Fleumatico: (s.Frio * 0.5) + (s.Umido * 0.5),
    };
}

function toRoundedPercentages<T extends Record<string, number>>(scores: T): T {
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    if (total === 0) return Object.fromEntries(Object.keys(scores).map(k => [k, 0])) as T;
    return Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Math.round((v / total) * 100)])) as T;
}

function displayChar(name: string) {
    return name === "Umido" ? "Úmido" : name;
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const min = Math.round(seconds / 60);
    return `~${min} min`;
}

const DescubraSeuTemperamento = () => {
    const [userName, setUserName] = useState("");
    const [userAge, setUserAge] = useState<number | "">(0);
    const [error, setError] = useState("");
    const [showTest, setShowTest] = useState(false);
    const pdfContentRef = useRef(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, { question: any; answer: number }>>({});
    const [answerHistory, setAnswerHistory] = useState<{ questionIndex: number; question: any; answer: number }[]>([]);
    const [testQuestions, setTestQuestions] = useState<any[]>([]);
    const [testComplete, setTestComplete] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [executionCount, setExecutionCount] = useState(0);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [totalScore, setTotalScore] = useState<Scores>({...EMPTY_SCORES});
    const [tiebreakerPhase, setTiebreakerPhase] = useState(false);
    const [tiebreakerQuestions, setTiebreakerQuestions] = useState<any[]>([]);
    const [currentTiebreakerIndex, setCurrentTiebreakerIndex] = useState(0);
    const [tiebreakerPair, setTiebreakerPair] = useState<[string, string]>(["", ""]);
    const testStartTimeRef = useRef<number | null>(null);
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [metricsLoading, setMetricsLoading] = useState(true);

    useEffect(() => {
        const questions = temperamentosJson.map(item => ({
            id: item.id,
            question: item.pergunta,
            classificacao: item.classificacao,
        }));
        setTestQuestions(questions.sort(() => Math.random() - 0.5));
    }, []);

    const refreshMetrics = () => {
        fetch('/api/metrics/temperament')
            .then(r => r.json())
            .then(setMetrics)
            .catch(() => {});
    };

    useEffect(() => {
        fetch('/api/metrics/temperament')
            .then(r => r.json())
            .then(setMetrics)
            .catch(() => {})
            .finally(() => setMetricsLoading(false));
    }, []);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('temperamentTestExecutions');
            const newCount = (stored ? parseInt(stored, 10) : 0) + 1;
            localStorage.setItem('temperamentTestExecutions', newCount.toString());
            setExecutionCount(newCount);
        } catch {
            setExecutionCount(0);
        }
    }, []);

    const resetForm = () => {
        setUserName("");
        setUserAge(0);
        setError("");
        setShowTest(false);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setAnswerHistory([]);
        setTestComplete(false);
        setResults(null);
        setTotalScore({...EMPTY_SCORES});
        setTiebreakerPhase(false);
        setTiebreakerQuestions([]);
        setCurrentTiebreakerIndex(0);
        setTiebreakerPair(["", ""]);
    };

    const handleInputChange = (field: string, value: string) => {
        if (error) setError("");
        if (field === 'name') {
            setUserName(value);
        } else if (field === 'age') {
            if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
                setUserAge(value === '' ? '' : parseInt(value));
            }
        }
    };

    const startTest = () => {
        if (!userName.trim()) {
            setError("Por favor, insira seu nome para iniciar o teste.");
            return;
        }

        const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ]{3,}([ ]+[A-Za-zÀ-ÖØ-öø-ÿ]{3,})+$/;
        if (!nameRegex.test(userName.trim())) {
            setError("Por favor, insira nome e sobrenome válidos (mínimo de 3 letras, um espaço e outro nome com mínimo de 3 letras).");
            return;
        }

        if (!userAge || userAge <= 0 || !Number.isInteger(Number(userAge))) {
            setError("Por favor, insira uma idade válida (número inteiro positivo).");
            return;
        }

        trackTestStart(userName);
        testStartTimeRef.current = Date.now();

        setCurrentQuestionIndex(0);
        setAnswers({});
        setAnswerHistory([]);
        setTestComplete(false);
        setResults(null);
        setTotalScore({...EMPTY_SCORES});
        setShowTest(true);
    };

    const answerQuestion = async (answer: number) => {
        const currentQuestion = testQuestions[currentQuestionIndex];
        const classificacao: string[] = currentQuestion?.classificacao || [];

        // Compute new scores locally so calculateResults receives accurate data
        const newTotalScore = {...totalScore};
        classificacao.forEach(type => {
            const key = (type.charAt(0).toUpperCase() + type.slice(1)) as keyof Scores;
            if (key in newTotalScore) newTotalScore[key] += answer;
        });

        const newAnswers = {...answers, [currentQuestionIndex]: {question: currentQuestion, answer}};
        setAnswers(newAnswers);
        setAnswerHistory(prev => [...prev, {questionIndex: currentQuestionIndex, question: currentQuestion, answer}]);
        setTotalScore(newTotalScore);

        if (currentQuestionIndex < testQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            await calculateResults(newTotalScore, Object.keys(newAnswers).length);
        }
    };

    const goToPreviousQuestion = () => {
        if (currentQuestionIndex === 0) return;

        const lastEntry = answerHistory[answerHistory.length - 1];
        const lastClassificacao: string[] = lastEntry.question?.classificacao || [];

        setAnswerHistory(prev => prev.slice(0, -1));
        setAnswers(prev => {
            const next = {...prev};
            delete next[lastEntry.questionIndex];
            return next;
        });

        const newTotalScore = {...totalScore};
        lastClassificacao.forEach(type => {
            const key = (type.charAt(0).toUpperCase() + type.slice(1)) as keyof Scores;
            if (key in newTotalScore) newTotalScore[key] -= lastEntry.answer;
        });

        // Reset to empty if going back before the first answer
        setTotalScore(answerHistory.length <= 1 ? {...EMPTY_SCORES} : newTotalScore);
        setCurrentQuestionIndex(prev => prev - 1);
    };

    const stopTest = async () => {
        if (currentQuestionIndex < testQuestions.length - 1) {
            const currentQuestion = testQuestions[currentQuestionIndex];
            trackQuestionDropout(currentQuestionIndex, currentQuestion?.question || "");
        }
        await calculateResults(totalScore, Object.keys(answers).length);
    };

    const answerTiebreakerQuestion = async (answer: number) => {
        const currentQuestion = tiebreakerQuestions[currentTiebreakerIndex];
        const classificacao: string[] = currentQuestion?.classificacao || [];

        const newTotalScore = {...totalScore};
        classificacao.forEach(type => {
            const key = (type.charAt(0).toUpperCase() + type.slice(1)) as keyof Scores;
            if (key in newTotalScore) newTotalScore[key] += answer;
        });
        setTotalScore(newTotalScore);

        if (currentTiebreakerIndex < tiebreakerQuestions.length - 1) {
            setCurrentTiebreakerIndex(prev => prev + 1);
        } else {
            setTiebreakerPhase(false);
            await calculateResults(newTotalScore, Object.keys(answers).length, true);
        }
    };

    const calculateResults = async (scores: Scores, answeredCount: number, skipTiebreaker = false) => {
        const totalCharScore = scores.Quente + scores.Frio + scores.Seco + scores.Umido;

        const sortedCharacteristics = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .map(([name, score]) => ({
                name,
                score,
                percentage: totalCharScore > 0 ? Math.round((score / totalCharScore) * 100) : 0,
            }));

        if (totalCharScore > 0) {
            const charSum = sortedCharacteristics.reduce((s, c) => s + c.percentage, 0);
            if (charSum !== 100) {
                const topIdx = [...sortedCharacteristics].sort((a, b) => b.percentage - a.percentage)
                    .findIndex(c => c === sortedCharacteristics.find(x => x.name === c.name));
                const maxIdx = sortedCharacteristics.reduce((mi, c, i, arr) => c.percentage > arr[mi].percentage ? i : mi, 0);
                sortedCharacteristics[maxIdx].percentage += 100 - charSum;
            }
        }

        const tempScores = computeTemperamentScores(scores);
        const totalTempScore = Object.values(tempScores).reduce((a, b) => a + b, 0);
        const sortedTemperaments = Object.entries(tempScores)
            .sort((a, b) => b[1] - a[1])
            .map(([name, score]) => ({
                name,
                score,
                percentage: totalTempScore > 0 ? Math.round((score / totalTempScore) * 100) : 0,
            }));

        if (totalTempScore > 0) {
            const tempSum = sortedTemperaments.reduce((s, t) => s + t.percentage, 0);
            if (tempSum !== 100) {
                const maxIdx = sortedTemperaments.reduce((mi, t, i, arr) => t.percentage > arr[mi].percentage ? i : mi, 0);
                sortedTemperaments[maxIdx].percentage += 100 - tempSum;
            }
        }

        if (!skipTiebreaker && totalTempScore > 0 && sortedTemperaments.length >= 2) {
            const diff = Math.abs(sortedTemperaments[0].percentage - sortedTemperaments[1].percentage);
            if (diff <= TIEBREAKER_THRESHOLD) {
                const pairKey = [sortedTemperaments[0].name, sortedTemperaments[1].name].sort().join('-');
                const tbData = tiebreakerQuestionsJson as Record<string, {id: string; pergunta: string; classificacao: string[]}[]>;
                const tbQuestions = tbData[pairKey] ?? [];
                if (tbQuestions.length > 0) {
                    const selected = [...tbQuestions]
                        .sort(() => Math.random() - 0.5)
                        .slice(0, 5)
                        .map(q => ({id: q.id, question: q.pergunta, classificacao: q.classificacao}));
                    setTiebreakerPair([sortedTemperaments[0].name, sortedTemperaments[1].name]);
                    setTiebreakerQuestions(selected);
                    setCurrentTiebreakerIndex(0);
                    setTiebreakerPhase(true);
                    return;
                }
            }
        }

        const pad = <T extends object>(arr: T[], min: number): T[] => {
            const r = [...arr];
            while (r.length < min) r.push({name: 'Não definido', score: 0, percentage: 0} as T);
            return r;
        };

        const safeTemperaments = pad(sortedTemperaments, 2);
        const safeCharacteristics = pad(sortedCharacteristics, 4);

        const resultsData = {
            primaryTemperament: safeTemperaments[0],
            secondaryTemperament: safeTemperaments[1],
            primaryCharacteristic: safeCharacteristics[0],
            secondaryCharacteristic: safeCharacteristics[1],
            allTemperaments: safeTemperaments,
            allCharacteristics: safeCharacteristics,
        };

        setResults(resultsData);
        setTestComplete(true);

        const temperamentPercentages = Object.fromEntries(
            ["Sanguineo", "Colerico", "Melancolico", "Fleumatico"].map(name => [
                name,
                safeTemperaments.find(t => t.name === name)?.percentage ?? 0,
            ])
        );
        const durationSeconds = testStartTimeRef.current
            ? Math.floor((Date.now() - testStartTimeRef.current) / 1000)
            : answeredCount * 10;

        trackTestCompletion({
            ...resultsData,
            temperamentPercentages,
            testDuration: durationSeconds,
        });

        setTimeout(refreshMetrics, 1500);

        const answeredPct = (answeredCount / testQuestions.length) * 100;
        if (answeredPct >= 50 && !userName.toLowerCase().includes("teste")) {
            sendTestResultsEmail(resultsData);
            await sendTelegramMessage(resultsData);
        }
    };

    const getBrowserInfo = () => {
        const ua = navigator.userAgent;
        let browser = "Unknown";
        if (ua.match(/chrome|chromium|crios/i)) browser = "Chrome";
        else if (ua.match(/firefox|fxios/i)) browser = "Firefox";
        else if (ua.match(/safari/i)) browser = "Safari";
        else if (ua.match(/opr\//i)) browser = "Opera";
        else if (ua.match(/edg/i)) browser = "Edge";
        else if (ua.match(/msie|trident/i)) browser = "Internet Explorer";
        const v = ua.match(/(chrome|firefox|safari|opr|edg|msie|rv)[\s/:](\d+(\.\d+)?)/i);
        return `${browser}${v ? ` ${v[2]}` : ''} - ${navigator.platform}`;
    };

    const sendTestResultsEmail = async (resultsData: any) => {
        try {
            await fetch('/api/send-email', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: userName,
                    age: userAge,
                    date: new Date().toISOString(),
                    browserInfo: getBrowserInfo(),
                    results: resultsData,
                }),
            });
        } catch {}
    };

    const sendTelegramMessage = async (resultsData: any) => {
        try {
            await sendTemperamentTestMessage({
                name: userName,
                age: userAge,
                date: new Date().toISOString(),
                browserInfo: getBrowserInfo(),
                results: resultsData,
                executionCount,
            });
        } catch (e) {
            console.error('Error sending Telegram message:', e);
        }
    };

    const downloadPdf = async () => {
        if (results?.primaryTemperament) {
            trackPdfDownload(userName, results.primaryTemperament.name);
        }
        await generatePdf(pdfContentRef, userName, setIsPdfLoading);
    };

    return (
        <div className="p-4 max-w-max mx-auto">
            {results && (
                <PdfContent
                    ref={pdfContentRef}
                    data={{name: userName, age: userAge.toString(), date: new Date().toISOString(), results}}
                />
            )}

            {!showTest ? (
                <div className="space-y-8">
                    {/* Seção 1: Informações */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">Os Quatro Temperamentos</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Os temperamentos humanos são classificados em quatro tipos principais, cada um com
                            características distintas:
                        </p>
                        <div className="grid sm:grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md flex flex-col gap-3">
                                <h3 className="font-bold text-red-600 dark:text-red-400">Sanguíneo</h3>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    Extrovertido, comunicativo, sociável e entusiasmado. Tende a ser otimista, alegre e carismático.
                                </p>
                                <div className="border-t border-red-200 dark:border-red-800 pt-2">
                                    <p className="text-xs text-red-500 dark:text-red-400 font-medium mb-1">Pontos de atenção</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Impulsivo, desorganizado, dificuldade de foco e pode deixar projetos inacabados.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md flex flex-col gap-3">
                                <h3 className="font-bold text-yellow-600 dark:text-yellow-400">Colérico</h3>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    Enérgico, decidido, prático e orientado para objetivos. Tende a ser líder natural e independente.
                                </p>
                                <div className="border-t border-yellow-200 dark:border-yellow-800 pt-2">
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mb-1">Pontos de atenção</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Impaciente, dominador e pode ser insensível aos sentimentos dos outros.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md flex flex-col gap-3">
                                <h3 className="font-bold text-blue-600 dark:text-blue-400">Melancólico</h3>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    Analítico, perfeccionista, sensível e detalhista. Tende a ser profundo, reflexivo e criativo.
                                </p>
                                <div className="border-t border-blue-200 dark:border-blue-800 pt-2">
                                    <p className="text-xs text-blue-500 dark:text-blue-400 font-medium mb-1">Pontos de atenção</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Tendência ao pessimismo, autocrítica excessiva e propensão ao isolamento.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md flex flex-col gap-3">
                                <h3 className="font-bold text-green-600 dark:text-green-400">Fleumático</h3>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    Calmo, paciente, equilibrado e diplomático. Tende a ser pacificador, confiável e observador.
                                </p>
                                <div className="border-t border-green-200 dark:border-green-800 pt-2">
                                    <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Pontos de atenção</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Indeciso, procrastinador e tende a evitar conflitos mesmo quando necessário.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-gray-500 dark:text-gray-400 border-t pt-4">
                            <p><strong className="text-gray-700 dark:text-gray-300">Temperamento:</strong> É a maneira natural de uma pessoa reagir e interagir com o mundo ao seu redor.</p>
                            <p><strong className="text-gray-700 dark:text-gray-300">Origem:</strong> A teoria dos quatro temperamentos tem origem na medicina antiga grega, com Hipócrates.</p>
                            <p><strong className="text-gray-700 dark:text-gray-300">Combinações:</strong> A maioria das pessoas possui uma combinação de temperamentos, com um ou dois predominantes.</p>
                        </div>
                    </section>

                    {/* Seção 2: Estatísticas */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">Estatísticas</h2>
                        {metricsLoading ? (
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-4">
                                <FaSpinner className="animate-spin"/>
                                <span className="text-sm">Carregando dados...</span>
                            </div>
                        ) : metrics && metrics.total_completed > 0 ? (
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-5 space-y-5">
                                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white mr-1">
                                            {metrics.total_completed}
                                        </span>
                                        testes realizados
                                    </p>
                                    {metrics.averages.duration_seconds > 0 && (
                                        <p className="text-sm text-gray-400 dark:text-gray-500">
                                            · tempo médio{" "}
                                            <span className="font-semibold text-gray-600 dark:text-gray-300">
                                                {formatDuration(metrics.averages.duration_seconds)}
                                            </span>
                                        </p>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">Distribuição dos resultados:</p>

                                <div className="space-y-3">
                                    {metrics.by_primary
                                        .filter(item => item.temperament)
                                        .map(item => {
                                            const pct = Math.round((item.count / metrics.total_completed) * 100);
                                            const barClass = TEMPERAMENT_BAR[item.temperament] ?? "bg-gray-400";
                                            const colors = TEMPERAMENT_COLORS[item.temperament] ?? {
                                                bg: "bg-gray-100 dark:bg-gray-700",
                                                text: "text-gray-800 dark:text-gray-200",
                                            };
                                            return (
                                                <div key={item.temperament}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className={`text-sm font-medium ${colors.text}`}>
                                                            {TEMPERAMENT_DISPLAY[item.temperament] ?? item.temperament}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {item.count} pessoas · {pct}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                                        <div
                                                            className={`${barClass} h-3 rounded-full transition-all duration-500`}
                                                            style={{width: `${pct}%`}}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>

                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        Médias gerais — Sanguíneo {metrics.averages.sanguineo}% · Colérico {metrics.averages.colerico}% · Melancólico {metrics.averages.melancolico}% · Fleumático {metrics.averages.fleumatico}%
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum dado disponível ainda.</p>
                        )}
                    </section>

                    {/* Seção 3: Responder */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">Responder</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Preencha seu nome e clique em "Iniciar Teste" para descobrir seu temperamento predominante.
                        </p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label htmlFor="userName" className="block text-sm font-medium mb-1">
                                    Nome e Sobrenome
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaUser className="text-gray-400"/>
                                    </div>
                                    <input
                                        type="text"
                                        id="userName"
                                        value={userName}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        placeholder="Digite seu nome e sobrenome"
                                        className="w-full pl-10 p-4 border rounded-md text-gray-900"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="userAge" className="block text-sm font-medium mb-1">
                                    Idade
                                </label>
                                <input
                                    type="number"
                                    id="userAge"
                                    value={userAge === 0 ? "" : userAge}
                                    onChange={(e) => handleInputChange('age', e.target.value)}
                                    placeholder="Digite sua idade"
                                    min="1"
                                    step="1"
                                    className="w-full p-4 border rounded-md text-gray-900"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex space-x-6 mb-6">
                            <button
                                onClick={startTest}
                                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                            >
                                Iniciar Teste
                            </button>
                            <button
                                onClick={resetForm}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                            >
                                Limpar
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md mb-4">
                                {error}
                            </div>
                        )}
                    </section>
                </div>
            ) : !testComplete && !tiebreakerPhase ? (
                <div>
                    <h2 className="text-2xl font-bold mb-4">Olá, {userName}!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
                        <strong>Observação importante:</strong> Na dúvida olhar para o comportamento primitivo, de sua
                        infância, e não o comportamento de hoje já condicionado.
                    </p>

                    {testQuestions.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                            <div className="mb-4">
                                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                                    <span>Pergunta {currentQuestionIndex + 1}/{testQuestions.length}</span>
                                    <span>{Math.round(((currentQuestionIndex + 1) / testQuestions.length) * 100)}% concluído</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                    <div
                                        className="bg-green-500 h-2.5 rounded-full"
                                        style={{width: `${((currentQuestionIndex + 1) / testQuestions.length) * 100}%`}}
                                    ></div>
                                </div>
                            </div>

                            <div className="h-36 overflow-y-auto mb-6 content-center text-center">
                                <h3 className="text-xl font-semibold">{testQuestions[currentQuestionIndex]?.question}</h3>
                            </div>

                            <div className="mb-2 text-center">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Quanto você se identifica com
                                    esta afirmação/pergunta?</p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                <button
                                    onClick={() => answerQuestion(0)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <span className="text-lg font-bold">Nada</span>
                                </button>
                                <button
                                    onClick={() => answerQuestion(1)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">Pouco</span>
                                </button>
                                <button
                                    onClick={() => answerQuestion(3)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">Médio</span>
                                </button>
                                <button
                                    onClick={() => answerQuestion(5)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">Totalmente</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex space-x-4">
                        {currentQuestionIndex > 0 && (
                            <button
                                onClick={goToPreviousQuestion}
                                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                            >
                                Voltar
                            </button>
                        )}
                        <div className="relative group">
                            <button
                                onClick={stopTest}
                                disabled={Object.keys(answers).length < testQuestions.length}
                                className={`px-4 py-2 ${Object.keys(answers).length < testQuestions.length
                                    ? "bg-blue-300 cursor-not-allowed"
                                    : "bg-blue-500 hover:bg-blue-600"} text-white rounded-md transition-colors`}
                            >
                                Finalizar Teste
                            </button>
                            {Object.keys(answers).length < testQuestions.length && (
                                <div
                                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    Responda todas as perguntas para finalizar o teste
                                </div>
                            )}
                        </div>
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancelar Teste
                        </button>
                    </div>
                </div>
            ) : tiebreakerPhase ? (
                <div>
                    <h2 className="text-2xl font-bold mb-2">Perguntas de Desempate</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                        Suas respostas estão muito equilibradas
                        entre <strong>{TEMPERAMENT_DISPLAY[tiebreakerPair[0]] ?? tiebreakerPair[0]}</strong> e{" "}
                        <strong>{TEMPERAMENT_DISPLAY[tiebreakerPair[1]] ?? tiebreakerPair[1]}</strong>. Responda mais
                        algumas perguntas para um resultado mais preciso.
                    </p>

                    {tiebreakerQuestions.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                            <div className="mb-4">
                                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                                    <span>Desempate {currentTiebreakerIndex + 1}/{tiebreakerQuestions.length}</span>
                                    <span>{Math.round(((currentTiebreakerIndex + 1) / tiebreakerQuestions.length) * 100)}% concluído</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                    <div
                                        className="bg-blue-500 h-2.5 rounded-full"
                                        style={{width: `${((currentTiebreakerIndex + 1) / tiebreakerQuestions.length) * 100}%`}}
                                    ></div>
                                </div>
                            </div>

                            <div className="h-36 overflow-y-auto mb-6 content-center text-center">
                                <h3 className="text-xl font-semibold">{tiebreakerQuestions[currentTiebreakerIndex]?.question}</h3>
                            </div>

                            <div className="mb-2 text-center">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Quanto você se identifica com
                                    esta afirmação/pergunta?</p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                <button
                                    onClick={() => answerTiebreakerQuestion(0)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <span className="text-lg font-bold">Nada</span>
                                </button>
                                <button
                                    onClick={() => answerTiebreakerQuestion(1)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">Pouco</span>
                                </button>
                                <button
                                    onClick={() => answerTiebreakerQuestion(3)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">Médio</span>
                                </button>
                                <button
                                    onClick={() => answerTiebreakerQuestion(5)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">Totalmente</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={resetForm}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancelar Teste
                    </button>
                </div>
            ) : (
                <div>
                    <h2 className="text-2xl font-bold mb-4">Resultado do Teste</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Olá, {userName}! Com base nas suas respostas, seu temperamento predominante é:
                    </p>

                    {results && (
                        <div className="space-y-6 mb-8">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold mb-4">Temperamentos</h3>
                                <div className="space-y-4">
                                    {results.allTemperaments.map((temp: any, index: number) => {
                                        const colors = index === 0
                                            ? (TEMPERAMENT_COLORS[temp.name] ?? {bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-800 dark:text-gray-200"})
                                            : {bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-800 dark:text-gray-200"};
                                        return (
                                            <div key={temp.name} className={`p-4 rounded-md ${colors.bg}`}>
                                                <div className="flex justify-between items-center">
                                                    <h4 className={`font-bold ${colors.text}`}>
                                                        {index === 0 && "Primário: "}{index === 1 && "Secundário: "}
                                                        {TEMPERAMENT_DISPLAY[temp.name] ?? temp.name}
                                                    </h4>
                                                    <span className={`text-sm ${colors.text}`}>{temp.percentage}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                                    <div
                                                        className={`${index === 0 ? "bg-green-500" : "bg-gray-500"} h-2 rounded-full`}
                                                        style={{width: `${temp.percentage}%`}}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold mb-4">Características</h3>
                                <div className="space-y-4">
                                    {results.allCharacteristics.map((char: any, index: number) => (
                                        <div key={char.name} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-gray-800 dark:text-gray-200">
                                                    {index === 0 && "Primário: "}{index === 1 && "Secundário: "}
                                                    {displayChar(char.name)}
                                                </h4>
                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                    {char.percentage}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                                <div
                                                    className={`${index === 0 ? "bg-green-500" : "bg-gray-500"} h-2 rounded-full`}
                                                    style={{width: `${char.percentage}%`}}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold mb-4">Interpretação</h3>
                                <p className="text-gray-700 dark:text-gray-300 mb-4">
                                    Seu temperamento predominante
                                    é <strong>{TEMPERAMENT_DISPLAY[results.primaryTemperament.name] ?? results.primaryTemperament.name}</strong>,
                                    com influência secundária
                                    de <strong>{TEMPERAMENT_DISPLAY[results.secondaryTemperament.name] ?? results.secondaryTemperament.name}</strong>.
                                </p>
                                <p className="text-gray-700 dark:text-gray-300 mb-4">
                                    Você tende a ser
                                    mais <strong>{displayChar(results.primaryCharacteristic.name)}</strong> e <strong>{displayChar(results.secondaryCharacteristic.name)}</strong> em
                                    suas reações e comportamentos.
                                </p>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold mb-4">
                                    Detalhes do Temperamento {TEMPERAMENT_DISPLAY[results.primaryTemperament.name] ?? results.primaryTemperament.name}
                                </h3>

                                {results.primaryTemperament.name === "Sanguineo" && (
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-bold text-red-600 dark:text-red-400 mb-2">Pontos Fortes</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Comunicativo e sociável</li>
                                                <li>Entusiasta e otimista</li>
                                                <li>Criativo e adaptável</li>
                                                <li>Bom em iniciar projetos</li>
                                                <li>Carismático e persuasivo</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-red-600 dark:text-red-400 mb-2">Pontos de Atenção</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Pode ser desorganizado</li>
                                                <li>Tendência a ser impulsivo</li>
                                                <li>Dificuldade em manter o foco</li>
                                                <li>Pode deixar projetos inacabados</li>
                                                <li>Às vezes superficial nas relações</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-red-600 dark:text-red-400 mb-2">Dicas para Relacionamentos</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Pratique a escuta ativa</li>
                                                <li>Desenvolva compromisso e consistência</li>
                                                <li>Estabeleça limites claros</li>
                                                <li>Cultive relacionamentos mais profundos</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {results.primaryTemperament.name === "Colerico" && (
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-bold text-yellow-600 dark:text-yellow-400 mb-2">Pontos Fortes</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Decidido e determinado</li>
                                                <li>Líder natural e visionário</li>
                                                <li>Orientado para objetivos</li>
                                                <li>Prático e eficiente</li>
                                                <li>Confiante e independente</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-yellow-600 dark:text-yellow-400 mb-2">Pontos de Atenção</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Pode ser impaciente</li>
                                                <li>Tendência a ser dominador</li>
                                                <li>Às vezes insensível aos sentimentos alheios</li>
                                                <li>Pode ser intolerante com erros</li>
                                                <li>Dificuldade em delegar</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-yellow-600 dark:text-yellow-400 mb-2">Dicas para Relacionamentos</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Desenvolva paciência e empatia</li>
                                                <li>Aprenda a ouvir sem interromper</li>
                                                <li>Pratique a gentileza nas críticas</li>
                                                <li>Reconheça os sentimentos dos outros</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {results.primaryTemperament.name === "Melancolico" && (
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2">Pontos Fortes</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Analítico e detalhista</li>
                                                <li>Perfeccionista e organizado</li>
                                                <li>Profundo e reflexivo</li>
                                                <li>Sensível e empático</li>
                                                <li>Criativo e artístico</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2">Pontos de Atenção</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Tendência ao pessimismo</li>
                                                <li>Pode ser muito crítico</li>
                                                <li>Dificuldade em tomar decisões</li>
                                                <li>Propenso a mudanças de humor</li>
                                                <li>Pode se isolar socialmente</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2">Dicas para Relacionamentos</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Cultive o otimismo</li>
                                                <li>Estabeleça limites para autocrítica</li>
                                                <li>Pratique a assertividade</li>
                                                <li>Busque equilíbrio entre isolamento e socialização</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {results.primaryTemperament.name === "Fleumatico" && (
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-bold text-green-600 dark:text-green-400 mb-2">Pontos Fortes</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Calmo e equilibrado</li>
                                                <li>Paciente e diplomático</li>
                                                <li>Confiável e consistente</li>
                                                <li>Bom mediador de conflitos</li>
                                                <li>Observador e analítico</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-green-600 dark:text-green-400 mb-2">Pontos de Atenção</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Pode ser indeciso</li>
                                                <li>Tendência à procrastinação</li>
                                                <li>Às vezes falta iniciativa</li>
                                                <li>Pode evitar conflitos necessários</li>
                                                <li>Resistência a mudanças</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-green-600 dark:text-green-400 mb-2">Dicas para Relacionamentos</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Desenvolva assertividade</li>
                                                <li>Estabeleça metas e prazos</li>
                                                <li>Pratique expressar suas emoções</li>
                                                <li>Aprenda a lidar com conflitos de forma saudável</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex space-x-4">
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                        >
                            Voltar ao Início
                        </button>
                        <button
                            onClick={downloadPdf}
                            disabled={isPdfLoading}
                            className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center ${isPdfLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {isPdfLoading ? (
                                <FaSpinner className="w-4 h-4 mr-2 animate-spin"/>
                            ) : (
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                     xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                            )}
                            {isPdfLoading ? 'Gerando PDF...' : 'Baixar Resultado em PDF'}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DescubraSeuTemperamento;
