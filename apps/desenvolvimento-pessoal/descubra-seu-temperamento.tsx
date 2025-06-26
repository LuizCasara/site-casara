"use client";

import { useState, useEffect } from "react";
import { FaUser } from "react-icons/fa";
import { temperamentosData } from "./temperamentos-data";

const DescubraSeuTemperamento = () => {
    // State for user name and whether to show the test
    const [userName, setUserName] = useState("");
    const [error, setError] = useState("");
    const [showTest, setShowTest] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [testQuestions, setTestQuestions] = useState([]);
    const [testComplete, setTestComplete] = useState(false);
    const [results, setResults] = useState(null);

    // State for real-time percentages
    const [temperamentPercentages, setTemperamentPercentages] = useState({
        "Sanguineo": 0,
        "Colerico": 0,
        "Melancolico": 0,
        "Fleumatico": 0
    });
    const [characteristicPercentages, setCharacteristicPercentages] = useState({
        "Quente": 0,
        "Frio": 0,
        "Seco": 0,
        "Umido": 0
    });

    // Prepare test questions when component mounts
    useEffect(() => {
        const questions = [];

        // Add questions from each temperament's qualities and defects
        Object.keys(temperamentosData).forEach(temperament => {
            if (["Sanguineo", "Colerico", "Melancolico", "Fleumatico"].includes(temperament)) {
                // Add qualities
                if (temperamentosData[temperament].Qualidades) {
                    temperamentosData[temperament].Qualidades.forEach(quality => {
                        questions.push({
                            question: quality.pergunta,
                            category: temperament,
                            type: "Qualidade",
                            trait: quality.definicao
                        });
                    });
                }

                // Add defects
                if (temperamentosData[temperament].Defeitos) {
                    temperamentosData[temperament].Defeitos.forEach(defect => {
                        questions.push({
                            question: defect.pergunta,
                            category: temperament,
                            type: "Defeito",
                            trait: defect.definicao
                        });
                    });
                }

                // Add Vetor_Tempo_de_Reacao
                if (temperamentosData[temperament].Vetor_Tempo_de_Reacao) {
                    temperamentosData[temperament].Vetor_Tempo_de_Reacao.forEach(item => {
                        questions.push({
                            question: item.pergunta,
                            category: temperament,
                            type: "Vetor Tempo de Reação",
                            trait: item.definicao
                        });
                    });
                }

                // Add Vetor_Profundidade
                if (temperamentosData[temperament].Vetor_Profundidade) {
                    temperamentosData[temperament].Vetor_Profundidade.forEach(item => {
                        questions.push({
                            question: item.pergunta,
                            category: temperament,
                            type: "Vetor Profundidade",
                            trait: item.definicao
                        });
                    });
                }

                // Add Riscos_na_Adolescencia
                if (temperamentosData[temperament].Riscos_na_Adolescencia) {
                    temperamentosData[temperament].Riscos_na_Adolescencia.forEach(item => {
                        questions.push({
                            question: item.pergunta,
                            category: temperament,
                            type: "Riscos na Adolescência",
                            trait: item.definicao
                        });
                    });
                }
            } else if (["Quente", "Frio", "Seco", "Umido"].includes(temperament)) {
                // Add characteristics
                if (temperamentosData[temperament].Palavras) {
                    temperamentosData[temperament].Palavras.forEach(word => {
                        questions.push({
                            question: word.pergunta,
                            category: temperament,
                            type: "Característica",
                            trait: word.definicao
                        });
                    });
                }

                // Add affirmations
                if (temperamentosData[temperament].Afirmacoes) {
                    temperamentosData[temperament].Afirmacoes.forEach(affirmation => {
                        questions.push({
                            question: affirmation.pergunta,
                            category: temperament,
                            type: "Afirmação",
                            trait: affirmation.definicao
                        });
                    });
                }
            }
        });

        // Shuffle questions
        const shuffledQuestions = questions.sort(() => Math.random() - 0.5);

        // Use all questions
        setTestQuestions(shuffledQuestions);
    }, []);

    // Handle input change
    const handleInputChange = (value) => {
        // Clear error when user types
        if (error) setError("");
        setUserName(value);
    };

    // Start the test
    const startTest = () => {
        // Validate input
        if (!userName.trim()) {
            setError("Por favor, insira seu nome para iniciar o teste.");
            return;
        }

        // Reset test state
        setCurrentQuestionIndex(0);
        setAnswers({});
        setTestComplete(false);
        setResults(null);

        // Show the test
        setShowTest(true);
    };

    // Handle answering a question
    const answerQuestion = (answer) => {
        // Save the answer
        setAnswers(prev => {
            return {
                ...prev,
                [currentQuestionIndex]: {
                    question: testQuestions[currentQuestionIndex],
                    answer
                }
            }
        });

        // Calculate percentages after each answer
        setTimeout(() => {
            calculatePercentages();
        }, 0);

        // Move to next question or complete test
        if (currentQuestionIndex < testQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            calculateResults();
        }
    };

    // Stop the test and show results
    const stopTest = () => {
        calculateResults();
    };

    // Calculate percentages in real-time
    const calculatePercentages = () => {
        const scores = {
            "Sanguineo": 0,
            "Colerico": 0,
            "Melancolico": 0,
            "Fleumatico": 0,
            "Quente": 0,
            "Frio": 0,
            "Seco": 0,
            "Umido": 0
        };

        console.log(answers);
        console.log(scores);

        // Sum scores for each category (0-5 scale)
        Object.values(answers).forEach(item => {
            // @ts-ignore
            const category = item.question.category;
            // @ts-ignore
            const score = item.answer;

            // Add the numeric score (0-5) to the category total
            scores[category] += score;

            // Apply the relationships between temperaments and characteristics
            if (category === "Sanguineo") {
                // Sanguíneo = "úmido e quente"
                scores["Umido"] += score;
                scores["Quente"] += score;
            } else if (category === "Colerico") {
                // Colérico = "seco e quente"
                scores["Seco"] += score;
                scores["Quente"] += score;
            } else if (category === "Melancolico") {
                // Melancólico = "seco e frio"
                scores["Seco"] += score;
                scores["Frio"] += score;
            } else if (category === "Fleumatico") {
                // Fleumático = "úmido e frio"
                scores["Umido"] += score;
                scores["Frio"] += score;
            } else if (category === "Quente") {
                // Quente affects Sanguíneo and Colérico
                scores["Sanguineo"] += score;
                scores["Colerico"] += score;
            } else if (category === "Frio") {
                // Frio affects Melancólico and Fleumático
                scores["Melancolico"] += score;
                scores["Fleumatico"] += score;
            } else if (category === "Seco") {
                // Seco affects Colérico and Melancólico
                scores["Colerico"] += score;
                scores["Melancolico"] += score;
            } else if (category === "Umido") {
                // Úmido affects Sanguíneo and Fleumático
                scores["Sanguineo"] += score;
                scores["Fleumatico"] += score;
            }
        });

        // If this is the first question answered, set the temperament to 100%
        if (Object.keys(answers).length === 1) {
            const firstAnswer = answers[0];
            const category = firstAnswer.question.category;

            // If it's a temperament category
            if (["Sanguineo", "Colerico", "Melancolico", "Fleumatico"].includes(category)) {
                const tempPercentages = {
                    "Sanguineo": 0,
                    "Colerico": 0,
                    "Melancolico": 0,
                    "Fleumatico": 0
                };
                tempPercentages[category] = 100;
                setTemperamentPercentages(tempPercentages);
            }

            // If it's a characteristic category
            if (["Quente", "Frio", "Seco", "Umido"].includes(category)) {
                const charPercentages = {
                    "Quente": 0,
                    "Frio": 0,
                    "Seco": 0,
                    "Umido": 0
                };
                charPercentages[category] = 100;
                setCharacteristicPercentages(charPercentages);
            }

            return scores;
        }

        // For subsequent questions, calculate percentages based on accumulated scores
        const totalTempScore = scores["Sanguineo"] + scores["Colerico"] + scores["Melancolico"] + scores["Fleumatico"];
        const totalCharScore = scores["Quente"] + scores["Frio"] + scores["Seco"] + scores["Umido"];

        if (totalTempScore > 0) {
            const tempPercentages = {
                "Sanguineo": Math.round((scores["Sanguineo"] / totalTempScore) * 100),
                "Colerico": Math.round((scores["Colerico"] / totalTempScore) * 100),
                "Melancolico": Math.round((scores["Melancolico"] / totalTempScore) * 100),
                "Fleumatico": Math.round((scores["Fleumatico"] / totalTempScore) * 100)
            };

            // Ensure the sum is exactly 100% by adjusting the highest value if needed
            const tempSum = Object.values(tempPercentages).reduce((a, b) => a + b, 0);
            if (tempSum !== 100 && tempSum > 0) {
                // Find the highest value to adjust
                const highestTemp = Object.entries(tempPercentages)
                    .sort((a, b) => b[1] - a[1])[0][0];
                tempPercentages[highestTemp] += (100 - tempSum);
            }

            setTemperamentPercentages(tempPercentages);
        }

        if (totalCharScore > 0) {
            const charPercentages = {
                "Quente": Math.round((scores["Quente"] / totalCharScore) * 100),
                "Frio": Math.round((scores["Frio"] / totalCharScore) * 100),
                "Seco": Math.round((scores["Seco"] / totalCharScore) * 100),
                "Umido": Math.round((scores["Umido"] / totalCharScore) * 100)
            };

            // Ensure the sum is exactly 100% by adjusting the highest value if needed
            const charSum = Object.values(charPercentages).reduce((a, b) => a + b, 0);
            if (charSum !== 100 && charSum > 0) {
                // Find the highest value to adjust
                const highestChar = Object.entries(charPercentages)
                    .sort((a, b) => b[1] - a[1])[0][0];
                charPercentages[highestChar] += (100 - charSum);
            }

            setCharacteristicPercentages(charPercentages);
        }

        return scores;
    };

    // Calculate test results
    const calculateResults = () => {
        const scores = calculatePercentages();

        // Find primary and secondary temperaments
        const temperamentScores = {
            "Sanguineo": scores["Sanguineo"],
            "Colerico": scores["Colerico"],
            "Melancolico": scores["Melancolico"],
            "Fleumatico": scores["Fleumatico"]
        };

        const characteristicScores = {
            "Quente": scores["Quente"],
            "Frio": scores["Frio"],
            "Seco": scores["Seco"],
            "Umido": scores["Umido"]
        };

        // Calculate total scores for percentage calculation
        const totalTempScore = Object.values(temperamentScores).reduce((a, b) => a + b, 0);
        const totalCharScore = Object.values(characteristicScores).reduce((a, b) => a + b, 0);

        // Sort temperaments by score and add percentage
        const sortedTemperaments = Object.entries(temperamentScores)
            .sort((a, b) => b[1] - a[1])
            .map(entry => ({ 
                name: entry[0], 
                score: entry[1],
                percentage: totalTempScore > 0 ? Math.round((entry[1] / totalTempScore) * 100) : 0
            }));

        // Ensure temperament percentages sum to 100%
        if (totalTempScore > 0) {
            const tempSum = sortedTemperaments.reduce((sum, temp) => sum + temp.percentage, 0);
            if (tempSum !== 100) {
                sortedTemperaments[0].percentage += (100 - tempSum);
            }
        }

        // Sort characteristics by score and add percentage
        const sortedCharacteristics = Object.entries(characteristicScores)
            .sort((a, b) => b[1] - a[1])
            .map(entry => ({ 
                name: entry[0], 
                score: entry[1],
                percentage: totalCharScore > 0 ? Math.round((entry[1] / totalCharScore) * 100) : 0
            }));

        // Ensure characteristic percentages sum to 100%
        if (totalCharScore > 0) {
            const charSum = sortedCharacteristics.reduce((sum, char) => sum + char.percentage, 0);
            if (charSum !== 100) {
                sortedCharacteristics[0].percentage += (100 - charSum);
            }
        }

        setResults({
            primaryTemperament: sortedTemperaments[0],
            secondaryTemperament: sortedTemperaments[1],
            primaryCharacteristic: sortedCharacteristics[0],
            secondaryCharacteristic: sortedCharacteristics[1],
            allTemperaments: sortedTemperaments,
            allCharacteristics: sortedCharacteristics
        });

        setTestComplete(true);
    };

    // Reset the form
    const resetForm = () => {
        setUserName("");
        setError("");
        setShowTest(false);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setTestComplete(false);
        setResults(null);
    };

    return (
        <div className="p-6 max-w-max mx-auto">
            {!showTest ? (
                <>
                    <div className="mb-6">
                        <h2 className="text-xl font-bold mb-4">Os Quatro Temperamentos</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Os temperamentos humanos são classificados em quatro tipos principais, cada um com características distintas:
                        </p>

                        <div className="space-y-4 mb-6">
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                                <h3 className="font-bold text-red-600 dark:text-red-400">Sanguíneo</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Extrovertido, comunicativo, sociável e entusiasmado. Pessoas com este temperamento tendem a ser otimistas e alegres.
                                </p>
                            </div>

                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                                <h3 className="font-bold text-yellow-600 dark:text-yellow-400">Colérico</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Enérgico, decidido, prático e orientado para objetivos. Pessoas com este temperamento tendem a ser líderes naturais.
                                </p>
                            </div>

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                <h3 className="font-bold text-blue-600 dark:text-blue-400">Melancólico</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Analítico, perfeccionista, sensível e detalhista. Pessoas com este temperamento tendem a ser profundas e reflexivas.
                                </p>
                            </div>

                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                                <h3 className="font-bold text-green-600 dark:text-green-400">Fleumático</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Calmo, paciente, equilibrado e diplomático. Pessoas com este temperamento tendem a ser pacificadoras.
                                </p>
                            </div>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Este teste ajudará você a descobrir qual é o seu temperamento predominante. Preencha seu nome e clique em "Iniciar Teste" para começar.
                        </p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label htmlFor="userName" className="block text-sm font-medium mb-1">
                                Seu Nome
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaUser className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="userName"
                                    value={userName}
                                    onChange={(e) => handleInputChange(e.target.value)}
                                    placeholder="Digite seu nome"
                                    className="w-full pl-10 p-4 border rounded-md text-gray-900"
                                />
                            </div>
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
                </>
            ) : !testComplete ? (
                <div>
                    <h2 className="text-2xl font-bold mb-4">Olá, {userName}!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Responda às afirmações abaixo indicando o quanto você se identifica com cada uma, de 0 (não me identifico nada) até 5 (me identifico completamente).
                    </p>

                    {/* Real-time percentage counters */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">Percentuais em Tempo Real:</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                                <h4 className="font-medium mb-2">Temperamentos</h4>
                                <div className="space-y-2">
                                    <div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-red-600 dark:text-red-400 font-medium">Sanguíneo</span>
                                            <span>{temperamentPercentages.Sanguineo}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                            <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${temperamentPercentages.Sanguineo}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-yellow-600 dark:text-yellow-400 font-medium">Colérico</span>
                                            <span>{temperamentPercentages.Colerico}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                            <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${temperamentPercentages.Colerico}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-blue-600 dark:text-blue-400 font-medium">Melancólico</span>
                                            <span>{temperamentPercentages.Melancolico}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${temperamentPercentages.Melancolico}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-green-600 dark:text-green-400 font-medium">Fleumático</span>
                                            <span>{temperamentPercentages.Fleumatico}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${temperamentPercentages.Fleumatico}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                                <h4 className="font-medium mb-2">Características</h4>
                                <div className="space-y-2">
                                    <div>
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">Quente</span>
                                            <span>{characteristicPercentages.Quente}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                            <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${characteristicPercentages.Quente}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">Frio</span>
                                            <span>{characteristicPercentages.Frio}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                            <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${characteristicPercentages.Frio}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">Seco</span>
                                            <span>{characteristicPercentages.Seco}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${characteristicPercentages.Seco}%` }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">Úmido</span>
                                            <span>{characteristicPercentages.Umido}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                            <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${characteristicPercentages.Umido}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {testQuestions.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                            <div className="mb-4">
                                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                                    <span>Pergunta {currentQuestionIndex + 1} de {testQuestions.length}</span>
                                    <span>{Math.round(((currentQuestionIndex + 1) / testQuestions.length) * 100)}% concluído</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                    <div 
                                        className="bg-green-500 h-2.5 rounded-full" 
                                        style={{ width: `${((currentQuestionIndex + 1) / testQuestions.length) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="h-32 overflow-y-auto mb-6 content-center text-center">
                                <h3 className="text-md">[ {testQuestions[currentQuestionIndex]?.category}{testQuestions[currentQuestionIndex]?.definicao} ]</h3>
                                <h3 className="text-xl font-semibold">{testQuestions[currentQuestionIndex]?.question}</h3>
                            </div>

                            <div className="mb-2 text-center">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Quanto você se identifica com esta afirmação?</p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                <button
                                    onClick={() => answerQuestion(0)}
                                    className="w-16 h-16 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <span className="text-lg font-bold">0</span>
                                    <span className="text-xs">Nada</span>
                                </button>
                                <button
                                    onClick={() => answerQuestion(1)}
                                    className="w-16 h-16 flex flex-col items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">1</span>
                                    <span className="text-xs">Pouco</span>
                                </button>
                                <button
                                    onClick={() => answerQuestion(1)}
                                    className="w-16 h-16 flex flex-col items-center justify-center bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-md hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">2</span>
                                    <span className="text-xs">As Vezes</span>
                                </button>
                                <button
                                    onClick={() => answerQuestion(3)}
                                    className="w-16 h-16 flex flex-col items-center justify-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">3</span>
                                    <span className="text-xs">Médio</span>
                                </button>
                                <button
                                    onClick={() => answerQuestion(5)}
                                    className="w-16 h-16 flex flex-col items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">4</span>
                                    <span className="text-xs">Bastante</span>
                                </button>
                                <button
                                    onClick={() => answerQuestion(10)}
                                    className="w-16 h-16 flex flex-col items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">5</span>
                                    <span className="text-xs">Totalmente</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex space-x-4">
                        <button
                            onClick={stopTest}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        >
                            Finalizar Teste
                        </button>
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
                        Olá, {userName}! Com base nas suas respostas, seu temperamento predominante é:
                    </p>

                    {results && (
                        <div className="space-y-6 mb-8">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold mb-4">Temperamentos</h3>

                                <div className="space-y-4">
                                    {results.allTemperaments.map((temp, index) => {
                                        let bgColor = "bg-gray-100 dark:bg-gray-700";
                                        let textColor = "text-gray-800 dark:text-gray-200";

                                        if (index === 0) {
                                            if (temp.name === "Sanguineo") {
                                                bgColor = "bg-red-100 dark:bg-red-900/30";
                                                textColor = "text-red-800 dark:text-red-200";
                                                temp.displayName = "Sanguíneo";
                                            } else if (temp.name === "Colerico") {
                                                bgColor = "bg-yellow-100 dark:bg-yellow-900/30";
                                                textColor = "text-yellow-800 dark:text-yellow-200";
                                                temp.displayName = "Colérico";
                                            } else if (temp.name === "Melancolico") {
                                                bgColor = "bg-blue-100 dark:bg-blue-900/30";
                                                textColor = "text-blue-800 dark:text-blue-200";
                                                temp.displayName = "Melancólico";
                                            } else if (temp.name === "Fleumatico") {
                                                bgColor = "bg-green-100 dark:bg-green-900/30";
                                                textColor = "text-green-800 dark:text-green-200";
                                                temp.displayName = "Fleumático";
                                            }
                                        }

                                        return (
                                            <div key={temp.name} className={`p-4 rounded-md ${bgColor}`}>
                                                <div className="flex justify-between items-center">
                                                    <h4 className={`font-bold ${textColor}`}>
                                                        {index === 0 && "Primário: "}{index === 1 && "Secundário: "}{temp.displayName || temp.name}
                                                    </h4>
                                                    <span className={`text-sm ${textColor}`}>
                                                        {temp.percentage}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                                    <div 
                                                        className={`${index === 0 ? "bg-green-500" : "bg-gray-500"} h-2 rounded-full`}
                                                        style={{ width: `${temp.percentage}%` }}
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
                                    {results.allCharacteristics.map((char, index) => (
                                        <div key={char.name} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-gray-800 dark:text-gray-200">
                                                    {index === 0 && "Primário: "}{index === 1 && "Secundário: "}
                                                    {char.name === "Quente" ? "Quente" : 
                                                     char.name === "Frio" ? "Frio" : 
                                                     char.name === "Seco" ? "Seco" : 
                                                     char.name === "Umido" ? "Úmido" : char.name}
                                                </h4>
                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                    {char.percentage}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                                <div 
                                                    className={`${index === 0 ? "bg-green-500" : "bg-gray-500"} h-2 rounded-full`}
                                                    style={{ width: `${char.percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold mb-4">Interpretação</h3>

                                <p className="text-gray-700 dark:text-gray-300 mb-4">
                                    Seu temperamento predominante é <strong>{results.primaryTemperament.displayName || results.primaryTemperament.name}</strong>, 
                                    com influência secundária de <strong>{results.secondaryTemperament.displayName || results.secondaryTemperament.name}</strong>.
                                </p>

                                <p className="text-gray-700 dark:text-gray-300 mb-4">
                                    Você tende a ser mais 
                                    <strong> {results.primaryCharacteristic.name === "Quente" ? "Quente" : 
                                             results.primaryCharacteristic.name === "Frio" ? "Frio" : 
                                             results.primaryCharacteristic.name === "Seco" ? "Seco" : 
                                             results.primaryCharacteristic.name === "Umido" ? "Úmido" : results.primaryCharacteristic.name}</strong> e 
                                    <strong> {results.secondaryCharacteristic.name === "Quente" ? "Quente" : 
                                             results.secondaryCharacteristic.name === "Frio" ? "Frio" : 
                                             results.secondaryCharacteristic.name === "Seco" ? "Seco" : 
                                             results.secondaryCharacteristic.name === "Umido" ? "Úmido" : results.secondaryCharacteristic.name}</strong> em suas reações e comportamentos.
                                </p>
                            </div>

                            {/* Detailed information about the primary temperament */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold mb-4">Detalhes do Temperamento {results.primaryTemperament.displayName || results.primaryTemperament.name}</h3>

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
                            onClick={() => {
                                setTestComplete(false);
                                setCurrentQuestionIndex(0);
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        >
                            Refazer o Teste
                        </button>
                    </div>
                </div>
            )}

            {(!showTest || testComplete) && (
                <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-semibold mb-3">Informações:</h3>
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                        <p>
                            <strong>Temperamento:</strong> É a maneira natural de uma pessoa reagir e interagir com o mundo ao seu redor.
                        </p>
                        <p>
                            <strong>Origem:</strong> A teoria dos quatro temperamentos tem origem na medicina antiga grega, com Hipócrates.
                        </p>
                        <p>
                            <strong>Combinações:</strong> A maioria das pessoas possui uma combinação de temperamentos, com um ou dois predominantes.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DescubraSeuTemperamento;
