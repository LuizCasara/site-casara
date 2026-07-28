"use client";

import {useEffect, useRef, useState} from "react";
import {FaSpinner, FaUser} from "react-icons/fa";
import loveLanguagesJson from "./linguagens-do-amor.json";
import {LOVE_LANGUAGE_INFO, getLoveLanguageDisplayName} from "./love-language-info";
import {sendLoveLanguageTestMessage} from "@/app/api/telegram/utils";
import {generateLoveLanguagePdf, LoveLanguagePdfContent} from "@/utils/love-language-pdf-generator";
import {trackLoveLanguagePdfDownload, trackLoveLanguageQuestionDropout, trackLoveLanguageTestCompletion, trackLoveLanguageTestStart} from "@/utils/analytics";

type Metrics = {
    total_completed: number;
    combined_rate: number;
    by_primary: { language: string; count: number }[];
    averages: { afirmacao: number; qualidade: number; presentes: number; servico: number; toque: number; duration_seconds: number };
};

const LANGUAGES = ["afirmacao", "qualidade", "presentes", "servico", "toque"] as const;
type LanguageKey = typeof LANGUAGES[number];

const EMPTY_SCORES: Record<LanguageKey, number> = {afirmacao: 0, qualidade: 0, presentes: 0, servico: 0, toque: 0};

// Diferença de percentual (pontos) abaixo da qual as duas linguagens mais fortes
// são apresentadas como um "resultado combinado", em vez de forçar uma vencedora
// única — a própria teoria de origem prevê perfis mistos como algo normal.
const COMBINED_RESULT_THRESHOLD = 10;

type Scores = Record<LanguageKey, number>;

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const min = Math.round(seconds / 60);
    return `~${min} min`;
}

const DescubraSuaLinguagemDoAmor = () => {
    const [userName, setUserName] = useState("");
    const [userAge, setUserAge] = useState<number | "">(0);
    const [error, setError] = useState("");
    const [showTest, setShowTest] = useState(false);
    const pdfContentRef = useRef(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, { question: any; answer: string }>>({});
    const [answerHistory, setAnswerHistory] = useState<{ questionIndex: number; question: any; answer: string }[]>([]);
    const [testQuestions, setTestQuestions] = useState<any[]>([]);
    const [testComplete, setTestComplete] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [executionCount, setExecutionCount] = useState(0);
    const [isPdfLoading, setIsPdfLoading] = useState(false);
    const [totalScore, setTotalScore] = useState<Scores>({...EMPTY_SCORES});
    const testStartTimeRef = useRef<number | null>(null);
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [metricsLoading, setMetricsLoading] = useState(true);

    useEffect(() => {
        const questions = loveLanguagesJson.map(item => ({
            id: item.id,
            opcoes: [...item.opcoes].sort(() => Math.random() - 0.5),
        }));
        setTestQuestions(questions.sort(() => Math.random() - 0.5));
    }, []);

    const refreshMetrics = () => {
        fetch('/api/metrics/love-languages')
            .then(r => r.json())
            .then(setMetrics)
            .catch(() => {});
    };

    useEffect(() => {
        fetch('/api/metrics/love-languages')
            .then(r => r.json())
            .then(setMetrics)
            .catch(() => {})
            .finally(() => setMetricsLoading(false));
    }, []);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('loveLanguageTestExecutions');
            const newCount = (stored ? parseInt(stored, 10) : 0) + 1;
            localStorage.setItem('loveLanguageTestExecutions', newCount.toString());
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

        const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ]{3,}([ ]+[A-Za-zÀ-ÖØ-öø-ÿ]{3,})*$/;
        if (!nameRegex.test(userName.trim())) {
            setError("Por favor, insira um nome válido (mínimo de 3 letras).");
            return;
        }

        if (!userAge || userAge <= 0 || !Number.isInteger(Number(userAge))) {
            setError("Por favor, insira uma idade válida (número inteiro positivo).");
            return;
        }

        trackLoveLanguageTestStart();
        testStartTimeRef.current = Date.now();

        setCurrentQuestionIndex(0);
        setAnswers({});
        setAnswerHistory([]);
        setTestComplete(false);
        setResults(null);
        setTotalScore({...EMPTY_SCORES});
        setShowTest(true);
    };

    const answerQuestion = async (polo: string) => {
        const currentQuestion = testQuestions[currentQuestionIndex];

        const key = polo as LanguageKey;
        const newTotalScore = {...totalScore};
        if (key in newTotalScore) newTotalScore[key] += 1;

        const newAnswers = {...answers, [currentQuestionIndex]: {question: currentQuestion, answer: polo}};
        setAnswers(newAnswers);
        setAnswerHistory(prev => [...prev, {questionIndex: currentQuestionIndex, question: currentQuestion, answer: polo}]);
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

        setAnswerHistory(prev => prev.slice(0, -1));
        setAnswers(prev => {
            const next = {...prev};
            delete next[lastEntry.questionIndex];
            return next;
        });

        const key = lastEntry.answer as LanguageKey;
        const newTotalScore = {...totalScore};
        if (key in newTotalScore) newTotalScore[key] -= 1;

        setTotalScore(answerHistory.length <= 1 ? {...EMPTY_SCORES} : newTotalScore);
        setCurrentQuestionIndex(prev => prev - 1);
    };

    const stopTest = async () => {
        if (currentQuestionIndex < testQuestions.length - 1) {
            const currentQuestion = testQuestions[currentQuestionIndex];
            const questionText = currentQuestion?.opcoes?.map((o: {frase: string}) => o.frase).join(" / ") || "";
            trackLoveLanguageQuestionDropout(currentQuestionIndex, questionText);
        }
        await calculateResults(totalScore, Object.keys(answers).length);
    };

    const calculateResults = async (scores: Scores, answeredCount: number) => {
        const total = LANGUAGES.reduce((s, k) => s + scores[k], 0);

        // Largest-remainder rounding: floor every percentage, then hand out the
        // leftover points (100 - sum of floors) to the entries with the biggest
        // fractional remainder (ties broken by raw score). This only ever ADDS
        // points, so a tied-for-first entry can never end up displayed below a
        // sibling with the identical raw score — unlike blindly correcting a
        // fixed array index, which could subtract from whichever tied entry
        // happened to sort first and show it as weaker than its own tie.
        const withFloors = LANGUAGES.map(name => {
            const raw = total > 0 ? (scores[name] / total) * 100 : 0;
            const floor = Math.floor(raw);
            return {name, score: scores[name], floor, remainder: raw - floor};
        });

        const leftover = total > 0 ? 100 - withFloors.reduce((s, l) => s + l.floor, 0) : 0;
        const byRemainder = [...withFloors].sort((a, b) => b.remainder - a.remainder || b.score - a.score);
        for (let i = 0; i < leftover; i++) {
            byRemainder[i].floor += 1;
        }

        const sorted = withFloors
            .map(l => ({name: l.name, score: l.score, percentage: l.floor}))
            .sort((a, b) => b.score - a.score);

        const combined = total > 0 && Math.abs(sorted[0].percentage - sorted[1].percentage) <= COMBINED_RESULT_THRESHOLD;

        const resultsData = {
            primary: sorted[0],
            secondary: sorted[1],
            allLanguages: sorted,
            combined,
        };

        setResults(resultsData);
        setTestComplete(true);

        const languagePercentages = Object.fromEntries(
            LANGUAGES.map(name => [name, sorted.find(l => l.name === name)?.percentage ?? 0])
        );
        const durationSeconds = testStartTimeRef.current
            ? Math.floor((Date.now() - testStartTimeRef.current) / 1000)
            : answeredCount * 10;

        trackLoveLanguageTestCompletion({
            ...resultsData,
            languagePercentages,
            testDuration: durationSeconds,
        });

        setTimeout(refreshMetrics, 1500);

        const answeredPct = (answeredCount / testQuestions.length) * 100;
        if (answeredPct >= 50 && !userName.toLowerCase().includes("teste")) {
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

    const sendTelegramMessage = async (resultsData: any) => {
        try {
            await sendLoveLanguageTestMessage({
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
        if (results?.primary) {
            trackLoveLanguagePdfDownload(results.primary.name);
        }
        await generateLoveLanguagePdf(pdfContentRef, userName, setIsPdfLoading);
    };

    return (
        <div className="p-4 max-w-max mx-auto">
            {results && (
                <LoveLanguagePdfContent
                    ref={pdfContentRef}
                    data={{name: userName, age: userAge.toString(), date: new Date().toISOString(), results}}
                />
            )}

            {!showTest ? (
                <div className="space-y-8">
                    {/* Seção 1: Informações */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">As 5 Linguagens do Amor</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Segundo a teoria popularizada por Gary Chapman, as pessoas tendem a se sentir mais amadas
                            através de uma combinação de cinco formas de expressão de carinho:
                        </p>
                        <div className="grid sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {LANGUAGES.map(key => {
                                const info = LOVE_LANGUAGE_INFO[key];
                                return (
                                    <div key={key} className={`p-4 rounded-md flex flex-col gap-2 ${info.badgeBgClass}`}>
                                        <h3 className={`font-bold ${info.headingColorClass}`}>{info.displayName}</h3>
                                        <p className="text-gray-700 dark:text-gray-300 text-sm">{info.description}</p>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-gray-500 dark:text-gray-400 border-t pt-4">
                            <p><strong className="text-gray-700 dark:text-gray-300">Origem:</strong> teoria popularizada pelo pastor e conselheiro matrimonial Gary Chapman, no livro <em>The Five Love Languages</em> (1992).</p>
                            <p><strong className="text-gray-700 dark:text-gray-300">Combinações:</strong> é normal e esperado ter duas linguagens próximas em intensidade — o resultado deste teste trata isso como uma combinação, não como algo a ser desempatado à força.</p>
                            <p><strong className="text-gray-700 dark:text-gray-300">Aviso:</strong> este é um teste de autoconhecimento inspirado numa teoria popular, sem validação científica robusta — trate o resultado como reflexão, não como diagnóstico.</p>
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
                                    <p className="text-sm text-gray-400 dark:text-gray-500">
                                        · <span className="font-semibold text-gray-600 dark:text-gray-300">{metrics.combined_rate}%</span> tiveram resultado combinado
                                    </p>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">Distribuição dos resultados:</p>

                                <div className="space-y-3">
                                    {metrics.by_primary
                                        .filter(item => item.language)
                                        .map(item => {
                                            const pct = Math.round((item.count / metrics.total_completed) * 100);
                                            const info = LOVE_LANGUAGE_INFO[item.language as LanguageKey];
                                            const barClass = info?.barClass ?? "bg-gray-400";
                                            const textClass = info?.badgeTextClass ?? "text-gray-800 dark:text-gray-200";
                                            return (
                                                <div key={item.language}>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className={`text-sm font-medium ${textClass}`}>
                                                            {getLoveLanguageDisplayName(item.language)}
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
                                        Médias gerais — Palavras {metrics.averages.afirmacao}% · Tempo {metrics.averages.qualidade}% · Presentes {metrics.averages.presentes}% · Serviço {metrics.averages.servico}% · Toque {metrics.averages.toque}%
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
                            Preencha seu nome e clique em &quot;Iniciar Teste&quot; para descobrir sua linguagem do amor predominante.
                            Responda pensando em como você prefere <strong>receber</strong> carinho, não em como você costuma demonstrá-lo aos outros.
                        </p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label htmlFor="userName" className="block text-sm font-medium mb-1">
                                    Nome
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
                                        placeholder="Digite seu nome"
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
                                className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors"
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
            ) : !testComplete ? (
                <div>
                    <h2 className="text-2xl font-bold mb-4">Olá, {userName}!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium bg-pink-50 dark:bg-pink-900/20 p-3 rounded-md">
                        <strong>Observação importante:</strong> pense em como você prefere <strong>receber</strong> carinho
                        de alguém próximo (parceiro(a), família, amigos), não em como você costuma demonstrar carinho.
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
                                        className="bg-pink-500 h-2.5 rounded-full"
                                        style={{width: `${((currentQuestionIndex + 1) / testQuestions.length) * 100}%`}}
                                    ></div>
                                </div>
                            </div>

                            <div className="mb-4 text-center">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Qual das frases abaixo mais representa você?</p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {testQuestions[currentQuestionIndex]?.opcoes.map((opcao: {polo: string; frase: string}) => (
                                    <button
                                        key={opcao.polo}
                                        onClick={() => answerQuestion(opcao.polo)}
                                        className="p-4 min-h-24 flex items-center justify-center text-center bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-pink-50 hover:border-pink-300 dark:hover:bg-pink-900/30 dark:hover:border-pink-700 transition-colors"
                                    >
                                        <span className="font-medium">{opcao.frase}</span>
                                    </button>
                                ))}
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
            ) : (
                <div>
                    <h2 className="text-2xl font-bold mb-4">Resultado do Teste</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Olá, {userName}! Com base nas suas respostas, sua{results?.combined ? "s linguagens do amor principais são" : " linguagem do amor predominante é"}:
                    </p>

                    {results && (
                        <div className="space-y-6 mb-8">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold mb-4">Linguagens do Amor</h3>
                                <div className="space-y-4">
                                    {results.allLanguages.map((lang: any, index: number) => {
                                        const info = LOVE_LANGUAGE_INFO[lang.name as LanguageKey];
                                        const highlighted = results.combined ? index <= 1 : index === 0;
                                        const colors = highlighted && info
                                            ? {bg: info.badgeBgClass, text: info.badgeTextClass}
                                            : {bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-800 dark:text-gray-200"};
                                        return (
                                            <div key={lang.name} className={`p-4 rounded-md ${colors.bg}`}>
                                                <div className="flex justify-between items-center">
                                                    <h4 className={`font-bold ${colors.text}`}>
                                                        {index === 0 && "Principal: "}{index === 1 && "Secundária: "}
                                                        {getLoveLanguageDisplayName(lang.name)}
                                                    </h4>
                                                    <span className={`text-sm ${colors.text}`}>{lang.percentage}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                                    <div
                                                        className={`${highlighted ? "bg-pink-500" : "bg-gray-500"} h-2 rounded-full`}
                                                        style={{width: `${lang.percentage}%`}}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold mb-4">Interpretação</h3>
                                <p className="text-gray-700 dark:text-gray-300 mb-4">
                                    {results.combined ? (
                                        <>Suas duas linguagens do amor mais fortes
                                            são <strong>{getLoveLanguageDisplayName(results.primary.name)}</strong> e{" "}
                                            <strong>{getLoveLanguageDisplayName(results.secondary.name)}</strong>, bem
                                            próximas em intensidade. Isso é comum e esperado — a própria teoria de
                                            origem mostra que a maioria das pessoas valoriza mais de uma forma de
                                            expressão de carinho.</>
                                    ) : (
                                        <>Sua linguagem do amor
                                            predominante é <strong>{getLoveLanguageDisplayName(results.primary.name)}</strong>,
                                            com influência secundária
                                            de <strong>{getLoveLanguageDisplayName(results.secondary.name)}</strong>.</>
                                    )}
                                </p>
                            </div>

                            {[results.primary, ...(results.combined ? [results.secondary] : [])].map((lang: any) => {
                                const info = LOVE_LANGUAGE_INFO[lang.name as LanguageKey];
                                if (!info) return null;
                                return (
                                    <div key={lang.name} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                        <h3 className="text-xl font-semibold mb-4">
                                            Sobre {info.displayName}
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <h4 className={`font-bold mb-2 ${info.headingColorClass}`}>Como Você Se Sente Amado(a)</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                    {info.howYouFeelLoved.map(item => <li key={item}>{item}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className={`font-bold mb-2 ${info.headingColorClass}`}>Mal-Entendidos Comuns</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                    {info.commonMisunderstandings.map(item => <li key={item}>{item}</li>)}
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className={`font-bold mb-2 ${info.headingColorClass}`}>Dicas para Relacionamentos</h4>
                                                <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                    {info.relationshipTips.map(item => <li key={item}>{item}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex space-x-4">
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors"
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

export default DescubraSuaLinguagemDoAmor;
