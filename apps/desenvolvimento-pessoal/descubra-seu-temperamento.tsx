"use client";

import {useState, useEffect} from "react";
import {FaUser} from "react-icons/fa";
import temperamentosJson from "./temperamentos.json";

const DescubraSeuTemperamento = () => {
    // State for user name and whether to show the test
    const [userName, setUserName] = useState("");
    const [error, setError] = useState("");
    const [showTest, setShowTest] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [answerHistory, setAnswerHistory] = useState([]);
    const [testQuestions, setTestQuestions] = useState([]);
    const [testComplete, setTestComplete] = useState(false);
    const [results, setResults] = useState(null);
    const [testMode, setTestMode] = useState("normal"); // "normal" or "teste"
    // Email sending is now completely silent, no need for emailSent state

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

        // Add questions from temperamentosJson
        temperamentosJson.forEach(item => {
            questions.push({
                id: item.id,
                question: item.pergunta,
                classificacao: item.classificacao,
            });
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
        setAnswerHistory([]);
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

        // Add to answer history
        setAnswerHistory(prev => [
            ...prev,
            {
                questionIndex: currentQuestionIndex,
                question: testQuestions[currentQuestionIndex],
                answer
            }
        ]);

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

    // Handle going back to the previous question
    const goToPreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            // Get the last answer from history
            const lastAnswer = answerHistory[answerHistory.length - 1];

            // Remove the last answer from history
            setAnswerHistory(prev => prev.slice(0, -1));

            // Remove the answer from answers
            setAnswers(prev => {
                const newAnswers = {...prev};
                delete newAnswers[lastAnswer.questionIndex];
                return newAnswers;
            });

            // Go back to the previous question
            setCurrentQuestionIndex(prev => prev - 1);

            // Recalculate percentages with a clean state
            setTimeout(() => {
                // This will recalculate based on the updated answers object
                const updatedScores = calculatePercentages();

                // If we've gone back to the beginning (no answers), reset percentages
                if (Object.keys(answers).length === 0) {
                    setTemperamentPercentages({
                        "Sanguineo": 0,
                        "Colerico": 0,
                        "Melancolico": 0,
                        "Fleumatico": 0
                    });

                    setCharacteristicPercentages({
                        "Quente": 0,
                        "Frio": 0,
                        "Seco": 0,
                        "Umido": 0
                    });
                }
            }, 0);
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

        // Sum scores for each category based on classificacao array
        Object.values(answers).forEach(item => {
            // @ts-ignore
            const classificacao = item.question.classificacao;
            // @ts-ignore
            const score = item.answer;

            if (classificacao && Array.isArray(classificacao)) {
                // Add the score to each temperament type in the classificacao array
                classificacao.forEach(temperamentType => {
                    // Convert temperament type to proper case for our scores object
                    const formattedType = temperamentType.charAt(0).toUpperCase() + temperamentType.slice(1);

                    // Map the temperament types from the JSON to our score categories
                    const scoreCategory =
                        formattedType === "Sanguineo" ? "Sanguineo" :
                            formattedType === "Colerico" ? "Colerico" :
                                formattedType === "Melancolico" ? "Melancolico" :
                                    formattedType === "Fleumatico" ? "Fleumatico" :
                                        formattedType === "Quente" ? "Quente" :
                                            formattedType === "Frio" ? "Frio" :
                                                formattedType === "Seco" ? "Seco" :
                                                    formattedType === "Umido" ? "Umido" : null;

                    if (scoreCategory && scores[scoreCategory] !== undefined) {
                        scores[scoreCategory] += score;
                    }
                });
            }
        });

        // If no answers yet, return empty scores
        if (Object.keys(answers).length === 0) {
            setTemperamentPercentages({
                "Sanguineo": 0,
                "Colerico": 0,
                "Melancolico": 0,
                "Fleumatico": 0
            });

            setCharacteristicPercentages({
                "Quente": 0,
                "Frio": 0,
                "Seco": 0,
                "Umido": 0
            });

            return scores;
        }

        // Calculate percentages based on accumulated scores
        const totalCharScore = scores["Quente"] + scores["Frio"] + scores["Seco"] + scores["Umido"];

        // Calculate characteristic percentages
        if (totalCharScore > 0) {
            // Create a copy of the scores for characteristics
            const charScores = {
                "Quente": scores["Quente"],
                "Frio": scores["Frio"],
                "Seco": scores["Seco"],
                "Umido": scores["Umido"]
            };

            // Calculate percentages
            const charPercentages = {
                "Quente": Math.round((charScores["Quente"] / totalCharScore) * 100),
                "Frio": Math.round((charScores["Frio"] / totalCharScore) * 100),
                "Seco": Math.round((charScores["Seco"] / totalCharScore) * 100),
                "Umido": Math.round((charScores["Umido"] / totalCharScore) * 100)
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

            // Sort characteristics by score to determine primary and secondary
            const sortedChars = Object.entries(charScores)
                .sort((a, b) => b[1] - a[1])
                .map(entry => entry[0]);

            const primaryChar = sortedChars[0] || "";
            const secondaryChar = sortedChars[1] || "";

            // Create temperament scores based on characteristic combinations
            const tempScores = {
                "Sanguineo": 0,
                "Colerico": 0,
                "Melancolico": 0,
                "Fleumatico": 0
            };

            // Assign scores based on the combinations
            if ((primaryChar === "Quente" && secondaryChar === "Umido") ||
                (primaryChar === "Umido" && secondaryChar === "Quente")) {
                tempScores["Sanguineo"] = 100;
            } else if ((primaryChar === "Quente" && secondaryChar === "Seco") ||
                (primaryChar === "Seco" && secondaryChar === "Quente")) {
                tempScores["Colerico"] = 100;
            } else if ((primaryChar === "Frio" && secondaryChar === "Seco") ||
                (primaryChar === "Seco" && secondaryChar === "Frio")) {
                tempScores["Melancolico"] = 100;
            } else if ((primaryChar === "Frio" && secondaryChar === "Umido") ||
                (primaryChar === "Umido" && secondaryChar === "Frio")) {
                tempScores["Fleumatico"] = 100;
            } else {
                // Fallback if we don't have a clear combination
                // Assign some weight to each temperament based on characteristics
                if (primaryChar === "Quente") {
                    tempScores["Sanguineo"] += 40;
                    tempScores["Colerico"] += 40;
                } else if (primaryChar === "Frio") {
                    tempScores["Melancolico"] += 40;
                    tempScores["Fleumatico"] += 40;
                } else if (primaryChar === "Seco") {
                    tempScores["Colerico"] += 40;
                    tempScores["Melancolico"] += 40;
                } else if (primaryChar === "Umido") {
                    tempScores["Sanguineo"] += 40;
                    tempScores["Fleumatico"] += 40;
                }

                if (secondaryChar === "Quente") {
                    tempScores["Sanguineo"] += 20;
                    tempScores["Colerico"] += 20;
                } else if (secondaryChar === "Frio") {
                    tempScores["Melancolico"] += 20;
                    tempScores["Fleumatico"] += 20;
                } else if (secondaryChar === "Seco") {
                    tempScores["Colerico"] += 20;
                    tempScores["Melancolico"] += 20;
                } else if (secondaryChar === "Umido") {
                    tempScores["Sanguineo"] += 20;
                    tempScores["Fleumatico"] += 20;
                }
            }

            // Calculate temperament percentages
            const totalTempScore = Object.values(tempScores).reduce((a, b) => a + b, 0);
            if (totalTempScore > 0) {
                const tempPercentages = {
                    "Sanguineo": Math.round((tempScores["Sanguineo"] / totalTempScore) * 100),
                    "Colerico": Math.round((tempScores["Colerico"] / totalTempScore) * 100),
                    "Melancolico": Math.round((tempScores["Melancolico"] / totalTempScore) * 100),
                    "Fleumatico": Math.round((tempScores["Fleumatico"] / totalTempScore) * 100)
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
            } else {
                // If no temperament scores, set all to 0
                setTemperamentPercentages({
                    "Sanguineo": 0,
                    "Colerico": 0,
                    "Melancolico": 0,
                    "Fleumatico": 0
                });
            }
        } else {
            // If no characteristic scores, set all to 0
            setCharacteristicPercentages({
                "Quente": 0,
                "Frio": 0,
                "Seco": 0,
                "Umido": 0
            });

            setTemperamentPercentages({
                "Sanguineo": 0,
                "Colerico": 0,
                "Melancolico": 0,
                "Fleumatico": 0
            });
        }

        // Calculate characteristic percentages
        if (totalCharScore > 0) {
            // Create a copy of the scores for characteristics
            const charScores = {
                "Quente": scores["Quente"],
                "Frio": scores["Frio"],
                "Seco": scores["Seco"],
                "Umido": scores["Umido"]
            };

            // Calculate percentages
            const charPercentages = {
                "Quente": Math.round((charScores["Quente"] / totalCharScore) * 100),
                "Frio": Math.round((charScores["Frio"] / totalCharScore) * 100),
                "Seco": Math.round((charScores["Seco"] / totalCharScore) * 100),
                "Umido": Math.round((charScores["Umido"] / totalCharScore) * 100)
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
        } else {
            // If no characteristic scores, set all to 0
            setCharacteristicPercentages({
                "Quente": 0,
                "Frio": 0,
                "Seco": 0,
                "Umido": 0
            });
        }

        return scores;
    };

    // Calculate test results
    const calculateResults = () => {
        // Get the latest scores
        const scores = calculatePercentages();

        // Create separate copies for characteristic scores
        const characteristicScores = {
            "Quente": scores["Quente"],
            "Frio": scores["Frio"],
            "Seco": scores["Seco"],
            "Umido": scores["Umido"]
        };

        // Calculate total score for characteristics
        const totalCharScore = Object.values(characteristicScores).reduce((a, b) => a + b, 0);

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
                // Find the highest value to adjust
                const highestIndex = sortedCharacteristics
                    .map((char, index) => ({index, percentage: char.percentage}))
                    .sort((a, b) => b.percentage - a.percentage)[0].index;

                sortedCharacteristics[highestIndex].percentage += (100 - charSum);
            }
        } else {
            // If no characteristic scores, set all to 0
            sortedCharacteristics.forEach(char => {
                char.percentage = 0;
            });
        }

        // Determine temperament based on the dominant characteristics
        // According to the rules:
        // seco + quente = colerico
        // umido + quente = sanguineo
        // seco + frio = melancolico
        // umido + frio = fleumatico

        // Get the two dominant characteristics
        const primaryChar = sortedCharacteristics[0]?.name || "";
        const secondaryChar = sortedCharacteristics[1]?.name || "";

        // Create temperament scores based on characteristic combinations
        const temperamentScores = {
            "Sanguineo": 0,
            "Colerico": 0,
            "Melancolico": 0,
            "Fleumatico": 0
        };

        // Assign scores based on the combinations
        if ((primaryChar === "Quente" && secondaryChar === "Umido") ||
            (primaryChar === "Umido" && secondaryChar === "Quente")) {
            temperamentScores["Sanguineo"] = 100;
        } else if ((primaryChar === "Quente" && secondaryChar === "Seco") ||
            (primaryChar === "Seco" && secondaryChar === "Quente")) {
            temperamentScores["Colerico"] = 100;
        } else if ((primaryChar === "Frio" && secondaryChar === "Seco") ||
            (primaryChar === "Seco" && secondaryChar === "Frio")) {
            temperamentScores["Melancolico"] = 100;
        } else if ((primaryChar === "Frio" && secondaryChar === "Umido") ||
            (primaryChar === "Umido" && secondaryChar === "Frio")) {
            temperamentScores["Fleumatico"] = 100;
        } else {
            // Fallback if we don't have a clear combination
            // Assign some weight to each temperament based on characteristics
            if (primaryChar === "Quente") {
                temperamentScores["Sanguineo"] += 40;
                temperamentScores["Colerico"] += 40;
            } else if (primaryChar === "Frio") {
                temperamentScores["Melancolico"] += 40;
                temperamentScores["Fleumatico"] += 40;
            } else if (primaryChar === "Seco") {
                temperamentScores["Colerico"] += 40;
                temperamentScores["Melancolico"] += 40;
            } else if (primaryChar === "Umido") {
                temperamentScores["Sanguineo"] += 40;
                temperamentScores["Fleumatico"] += 40;
            }

            if (secondaryChar === "Quente") {
                temperamentScores["Sanguineo"] += 20;
                temperamentScores["Colerico"] += 20;
            } else if (secondaryChar === "Frio") {
                temperamentScores["Melancolico"] += 20;
                temperamentScores["Fleumatico"] += 20;
            } else if (secondaryChar === "Seco") {
                temperamentScores["Colerico"] += 20;
                temperamentScores["Melancolico"] += 20;
            } else if (secondaryChar === "Umido") {
                temperamentScores["Sanguineo"] += 20;
                temperamentScores["Fleumatico"] += 20;
            }
        }

        // Sort temperaments by score and add percentage
        const sortedTemperaments = Object.entries(temperamentScores)
            .sort((a, b) => b[1] - a[1])
            .map(entry => ({
                name: entry[0],
                score: entry[1],
                percentage: entry[1]
            }));

        const resultsData = {
            primaryTemperament: sortedTemperaments[0],
            secondaryTemperament: sortedTemperaments[1],
            primaryCharacteristic: sortedCharacteristics[0],
            secondaryCharacteristic: sortedCharacteristics[1],
            allTemperaments: sortedTemperaments,
            allCharacteristics: sortedCharacteristics
        };

        setResults(resultsData);
        setTestComplete(true);

        // Check if at least 20% of questions were answered
        const answeredQuestionsPercentage = (Object.keys(answers).length / testQuestions.length) * 100;
        if (answeredQuestionsPercentage >= 20) {
            // Send email with test results
            sendTestResultsEmail(resultsData);
        }
    };

    // Function to get browser information
    const getBrowserInfo = () => {
        const userAgent = navigator.userAgent;
        let browserName = "Unknown";
        let browserVersion = "";

        if (userAgent.match(/chrome|chromium|crios/i)) {
            browserName = "Chrome";
        } else if (userAgent.match(/firefox|fxios/i)) {
            browserName = "Firefox";
        } else if (userAgent.match(/safari/i)) {
            browserName = "Safari";
        } else if (userAgent.match(/opr\//i)) {
            browserName = "Opera";
        } else if (userAgent.match(/edg/i)) {
            browserName = "Edge";
        } else if (userAgent.match(/msie|trident/i)) {
            browserName = "Internet Explorer";
        }

        // Try to extract version
        const versionMatch = userAgent.match(/(chrome|firefox|safari|opr|edg|msie|rv)[\s/:](\d+(\.\d+)?)/i);
        if (versionMatch && versionMatch[2]) {
            browserVersion = versionMatch[2];
        }

        return `${browserName} ${browserVersion} - ${navigator.platform}`;
    };

    // Function to send test results via email - silent operation
    const sendTestResultsEmail = async (resultsData) => {
        try {
            await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: userName,
                    date: new Date().toISOString(),
                    browserInfo: getBrowserInfo(),
                    results: resultsData
                }),
            });
            // No state updates or console logs to keep the process imperceptible
        } catch (error) {
            // Silent error handling - no console logs or UI updates
        }
    };

    // Reset the form
    const resetForm = () => {
        setUserName("");
        setError("");
        setShowTest(false);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setAnswerHistory([]);
        setTestComplete(false);
        setResults(null);
        setTestMode("normal"); // Reset to normal mode
    };

    return (
        <div className="p-6 max-w-max mx-auto">
            {!showTest ? (
                <>
                    <div className="mb-6">
                        <h2 className="text-xl font-bold mb-4">Os Quatro Temperamentos</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Os temperamentos humanos são classificados em quatro tipos principais, cada um com
                            características distintas:
                        </p>

                        <div className="space-y-4 mb-6">
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
                                <h3 className="font-bold text-red-600 dark:text-red-400">Sanguíneo</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Extrovertido, comunicativo, sociável e entusiasmado. Pessoas com este temperamento
                                    tendem a ser otimistas e alegres.
                                </p>
                            </div>

                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                                <h3 className="font-bold text-yellow-600 dark:text-yellow-400">Colérico</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Enérgico, decidido, prático e orientado para objetivos. Pessoas com este
                                    temperamento tendem a ser líderes naturais.
                                </p>
                            </div>

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                <h3 className="font-bold text-blue-600 dark:text-blue-400">Melancólico</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Analítico, perfeccionista, sensível e detalhista. Pessoas com este temperamento
                                    tendem a ser profundas e reflexivas.
                                </p>
                            </div>

                            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                                <h3 className="font-bold text-green-600 dark:text-green-400">Fleumático</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Calmo, paciente, equilibrado e diplomático. Pessoas com este temperamento tendem a
                                    ser pacificadoras.
                                </p>
                            </div>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Este teste ajudará você a descobrir qual é o seu temperamento predominante. Preencha seu
                            nome e clique em "Iniciar Teste" para começar.
                        </p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label htmlFor="userName" className="block text-sm font-medium mb-1">
                                Seu Nome
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaUser className="text-gray-400"/>
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

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Modo do Teste
                            </label>
                            <div className="flex space-x-4">
                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        id="modeNormal"
                                        name="testMode"
                                        value="normal"
                                        checked={testMode === "normal"}
                                        onChange={() => setTestMode("normal")}
                                        className="mr-2"
                                    />
                                    <label htmlFor="modeNormal" className="text-gray-700 dark:text-gray-300">
                                        Normal
                                    </label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        id="modeTeste"
                                        name="testMode"
                                        value="teste"
                                        checked={testMode === "teste"}
                                        onChange={() => setTestMode("teste")}
                                        className="mr-2"
                                    />
                                    <label htmlFor="modeTeste" className="text-gray-700 dark:text-gray-300">
                                        Teste
                                    </label>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {testMode === "normal"
                                    ? "Modo normal: apenas perguntas e botões."
                                    : "Modo teste: mostra painéis de totalizadores e score detalhado para testes."}
                            </p>
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
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">Olá, {userName}!</h2>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            testMode === "normal"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                        }`}>
                            {testMode === "normal" ? "Modo Normal" : "Modo Teste"}
                        </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Responda às afirmações abaixo indicando o quanto você se identifica com cada afirmação ou
                        pergunta.
                    </p>

                    {/* Real-time percentage counters - only shown in test mode */}
                    {testMode === "teste" && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Percentuais em Tempo Real:</h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                                    <h4 className="font-medium mb-2">Temperamentos</h4>
                                    <div className="space-y-2">
                                        <div>
                                            <div className="flex justify-between text-sm">
                                                <span
                                                    className="text-red-600 dark:text-red-400 font-medium">Sanguíneo</span>
                                                <span>{temperamentPercentages.Sanguineo}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div className="bg-red-500 h-1.5 rounded-full"
                                                     style={{width: `${temperamentPercentages.Sanguineo}%`}}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm">
                                                <span
                                                    className="text-yellow-600 dark:text-yellow-400 font-medium">Colérico</span>
                                                <span>{temperamentPercentages.Colerico}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div className="bg-yellow-500 h-1.5 rounded-full"
                                                     style={{width: `${temperamentPercentages.Colerico}%`}}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm">
                                                <span
                                                    className="text-blue-600 dark:text-blue-400 font-medium">Melancólico</span>
                                                <span>{temperamentPercentages.Melancolico}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div className="bg-blue-500 h-1.5 rounded-full"
                                                     style={{width: `${temperamentPercentages.Melancolico}%`}}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm">
                                                <span
                                                    className="text-green-600 dark:text-green-400 font-medium">Fleumático</span>
                                                <span>{temperamentPercentages.Fleumatico}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div className="bg-green-500 h-1.5 rounded-full"
                                                     style={{width: `${temperamentPercentages.Fleumatico}%`}}></div>
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
                                                <div className="bg-orange-500 h-1.5 rounded-full"
                                                     style={{width: `${characteristicPercentages.Quente}%`}}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">Frio</span>
                                                <span>{characteristicPercentages.Frio}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div className="bg-cyan-500 h-1.5 rounded-full"
                                                     style={{width: `${characteristicPercentages.Frio}%`}}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">Seco</span>
                                                <span>{characteristicPercentages.Seco}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div className="bg-amber-500 h-1.5 rounded-full"
                                                     style={{width: `${characteristicPercentages.Seco}%`}}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm">
                                                <span className="font-medium">Úmido</span>
                                                <span>{characteristicPercentages.Umido}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                                <div className="bg-teal-500 h-1.5 rounded-full"
                                                     style={{width: `${characteristicPercentages.Umido}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

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
                                        style={{width: `${((currentQuestionIndex + 1) / testQuestions.length) * 100}%`}}
                                    ></div>
                                </div>
                            </div>

                            <div className="h-32 overflow-y-auto mb-6 content-center text-center">
                                {testMode === "teste" && (
                                    <h3 className="text-md text-gray-500 dark:text-gray-400 mb-2">
                                        [ {testQuestions[currentQuestionIndex]?.classificacao?.join(", ")} ]
                                    </h3>
                                )}
                                <h3 className="text-xl font-semibold">{testQuestions[currentQuestionIndex]?.question}</h3>
                            </div>

                            <div className="mb-2 text-center">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Quanto você se identifica com
                                    esta afirmação?</p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                <button
                                    onClick={() => answerQuestion(0)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <span className="text-lg font-bold">1</span>
                                    <span className="text-xs">Nada / Não</span>
                                </button>
                                <button
                                    onClick={() => answerQuestion(3)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">2</span>
                                    <span className="text-xs">Médio / As Vezes</span>
                                </button>
                                <button
                                    onClick={() => answerQuestion(5)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">3</span>
                                    <span className="text-xs">Totalmente / Sim</span>
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
                                                <div
                                                    className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
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
                                    é <strong>{results.primaryTemperament.displayName || results.primaryTemperament.name}</strong>,
                                    com influência secundária
                                    de <strong>{results.secondaryTemperament.displayName || results.secondaryTemperament.name}</strong>.
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
                                                results.secondaryCharacteristic.name === "Umido" ? "Úmido" : results.secondaryCharacteristic.name}</strong> em
                                    suas reações e comportamentos.
                                </p>
                            </div>

                            {/* Detailed information about the primary temperament */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                                <h3 className="text-xl font-semibold mb-4">Detalhes do
                                    Temperamento {results.primaryTemperament.displayName || results.primaryTemperament.name}</h3>

                                {results.primaryTemperament.name === "Sanguineo" && (
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-bold text-red-600 dark:text-red-400 mb-2">Pontos
                                                Fortes</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Comunicativo e sociável</li>
                                                <li>Entusiasta e otimista</li>
                                                <li>Criativo e adaptável</li>
                                                <li>Bom em iniciar projetos</li>
                                                <li>Carismático e persuasivo</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-red-600 dark:text-red-400 mb-2">Pontos de
                                                Atenção</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Pode ser desorganizado</li>
                                                <li>Tendência a ser impulsivo</li>
                                                <li>Dificuldade em manter o foco</li>
                                                <li>Pode deixar projetos inacabados</li>
                                                <li>Às vezes superficial nas relações</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-red-600 dark:text-red-400 mb-2">Dicas para
                                                Relacionamentos</h4>
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
                                            <h4 className="font-bold text-yellow-600 dark:text-yellow-400 mb-2">Pontos
                                                Fortes</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Decidido e determinado</li>
                                                <li>Líder natural e visionário</li>
                                                <li>Orientado para objetivos</li>
                                                <li>Prático e eficiente</li>
                                                <li>Confiante e independente</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-yellow-600 dark:text-yellow-400 mb-2">Pontos
                                                de Atenção</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Pode ser impaciente</li>
                                                <li>Tendência a ser dominador</li>
                                                <li>Às vezes insensível aos sentimentos alheios</li>
                                                <li>Pode ser intolerante com erros</li>
                                                <li>Dificuldade em delegar</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-yellow-600 dark:text-yellow-400 mb-2">Dicas
                                                para Relacionamentos</h4>
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
                                            <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2">Pontos
                                                Fortes</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Analítico e detalhista</li>
                                                <li>Perfeccionista e organizado</li>
                                                <li>Profundo e reflexivo</li>
                                                <li>Sensível e empático</li>
                                                <li>Criativo e artístico</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2">Pontos de
                                                Atenção</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Tendência ao pessimismo</li>
                                                <li>Pode ser muito crítico</li>
                                                <li>Dificuldade em tomar decisões</li>
                                                <li>Propenso a mudanças de humor</li>
                                                <li>Pode se isolar socialmente</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2">Dicas para
                                                Relacionamentos</h4>
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
                                            <h4 className="font-bold text-green-600 dark:text-green-400 mb-2">Pontos
                                                Fortes</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Calmo e equilibrado</li>
                                                <li>Paciente e diplomático</li>
                                                <li>Confiável e consistente</li>
                                                <li>Bom mediador de conflitos</li>
                                                <li>Observador e analítico</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-green-600 dark:text-green-400 mb-2">Pontos de
                                                Atenção</h4>
                                            <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                                                <li>Pode ser indeciso</li>
                                                <li>Tendência à procrastinação</li>
                                                <li>Às vezes falta iniciativa</li>
                                                <li>Pode evitar conflitos necessários</li>
                                                <li>Resistência a mudanças</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-green-600 dark:text-green-400 mb-2">Dicas para
                                                Relacionamentos</h4>
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

                            {/* Email is sent silently without notification */}
                        </div>
                    )}

                    <div className="flex space-x-4">
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                        >
                            Voltar ao Início
                        </button>
                        {/*<button*/}
                        {/*    onClick={() => {*/}
                        {/*        setTestComplete(false);*/}
                        {/*        setCurrentQuestionIndex(0);*/}
                        {/*    }}*/}
                        {/*    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"*/}
                        {/*>*/}
                        {/*    Refazer o Teste*/}
                        {/*</button>*/}
                    </div>
                </div>
            )}

            {(!showTest || testComplete) && (
                <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-semibold mb-3">Informações:</h3>
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                        <p>
                            <strong>Temperamento:</strong> É a maneira natural de uma pessoa reagir e interagir com o
                            mundo ao seu redor.
                        </p>
                        <p>
                            <strong>Origem:</strong> A teoria dos quatro temperamentos tem origem na medicina antiga
                            grega, com Hipócrates.
                        </p>
                        <p>
                            <strong>Combinações:</strong> A maioria das pessoas possui uma combinação de temperamentos,
                            com um ou dois predominantes.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DescubraSeuTemperamento;
