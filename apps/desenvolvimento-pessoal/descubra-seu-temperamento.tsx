"use client";

import {useEffect, useRef, useState} from "react";
import {FaSpinner, FaUser} from "react-icons/fa";
import temperamentosJson from "./temperamentos.json";
import {sendTemperamentTestMessage} from "@/app/api/telegram/utils";
import {generatePdf, PdfContent} from "@/utils/pdf-generator";
import {trackPdfDownload, trackQuestionDropout, trackTemperamentDistribution, trackTestCompletion, trackTestStart} from "@/utils/analytics";

const DescubraSeuTemperamento = () => {
    const [userName, setUserName] = useState("");
    const [userAge, setUserAge] = useState(0);
    const [error, setError] = useState("");
    const [showTest, setShowTest] = useState(false);
    const pdfContentRef = useRef(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [answerHistory, setAnswerHistory] = useState([]);
    const [testQuestions, setTestQuestions] = useState([]);
    const [testComplete, setTestComplete] = useState(false);
    const [results, setResults] = useState(null);
    const [testMode, setTestMode] = useState("normal"); // "normal" or "teste"
    const [executionCount, setExecutionCount] = useState(0);

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

    const [isPdfLoading, setIsPdfLoading] = useState(false);

    // State to accumulate total scores for each characteristic
    const [totalScore, setTotalScore] = useState({
        "Quente": 0,
        "Frio": 0,
        "Seco": 0,
        "Umido": 0
    });

    useEffect(() => {
        const questions = [];
        temperamentosJson.forEach(item => {
            questions.push({
                id: item.id,
                question: item.pergunta,
                classificacao: item.classificacao,
            });
        });
        // Shuffle questions
        const shuffledQuestions = questions.sort(() => Math.random() - 0.5);
        setTestQuestions(shuffledQuestions);
    }, []);

    useEffect(() => {
        try {
            const storedCount = localStorage.getItem('temperamentTestExecutions');
            const currentCount = storedCount ? parseInt(storedCount, 10) : 0;
            const newCount = currentCount + 1;
            localStorage.setItem('temperamentTestExecutions', newCount.toString());
            setExecutionCount(newCount);
        } catch (error) {
            console.error('Error accessing localStorage:', error);
            setExecutionCount(0);
        }
    }, []);

    function resetTest() {
        // Reset totalScore
        setTotalScore({
            "Quente": 0,
            "Frio": 0,
            "Seco": 0,
            "Umido": 0
        });

        // Reset percentages
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
        setTestMode("normal"); // Reset to normal mode
        resetTest();
    };

    const handleInputChange = (field, value) => {
        if (error) setError("");
        if (field === 'name') {
            setUserName(value);
        } else if (field === 'age') {
            // Only allow positive integers
            if (value === '' || (/^\d+$/.test(value) && parseInt(value) >= 0)) {
                setUserAge(value);
            }
        }
    };

    const startTest = () => {
        if (!userName.trim()) {
            setError("Por favor, insira seu nome para iniciar o teste.");
            return;
        }

        // Validate name format (at least 3 letters + space + at least 3 letters)
        const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ]{3,}([ ]+[A-Za-zÀ-ÖØ-öø-ÿ]{3,})+$/;
        if (!nameRegex.test(userName.trim())) {
            setError("Por favor, insira nome e sobrenome válidos (mínimo de 3 letras, um espaço e outro nome com mínimo de 3 letras).");
            return;
        }

        // Validate age
        if (!userAge || userAge <= 0 || !Number.isInteger(Number(userAge))) {
            setError("Por favor, insira uma idade válida (número inteiro positivo).");
            return;
        }

        // Track test start
        trackTestStart(userName);

        setCurrentQuestionIndex(0);
        setAnswers({});
        setAnswerHistory([]);
        setTestComplete(false);
        setResults(null);
        resetTest();

        setShowTest(true);
    };

    // Handle answering a question
    const answerQuestion = async (answer) => {
        // Get the current question's classification
        const currentQuestion = testQuestions[currentQuestionIndex];
        const classificacao = currentQuestion?.classificacao || [];

        // Save the answer
        setAnswers(prev => {
            return {
                ...prev,
                [currentQuestionIndex]: {
                    question: currentQuestion,
                    answer
                }
            }
        });

        // Add to answer history
        setAnswerHistory(prev => [
            ...prev,
            {
                questionIndex: currentQuestionIndex,
                question: currentQuestion,
                answer
            }
        ]);

        // Update totalScore based on the question's classification
        setTotalScore(prev => {
            const newScores = {...prev};

            // Add the score to each characteristic in the classification
            classificacao.forEach(type => {
                const formattedType = type.charAt(0).toUpperCase() + type.slice(1);
                if (newScores[formattedType] !== undefined) {
                    newScores[formattedType] += answer;
                }
            });

            console.log("answerQuestion newScores >", newScores);
            return newScores;
        });

        // Calculate percentages after each answer
        setTimeout(() => {
            calculatePercentages();
        }, 0);

        // Move to next question or complete test
        if (currentQuestionIndex < testQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            try {
                await calculateResults();
            } catch (error) {
                console.error('Error calculating results:', error);
                // Silent error handling - don't show errors to the user
            }
        }
    };

    // Handle going back to the previous question
    const goToPreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            // Get the last answer from history
            const lastAnswer = answerHistory[answerHistory.length - 1];
            const lastQuestion = lastAnswer.question;
            const lastScore = lastAnswer.answer;
            const lastClassificacao = lastQuestion?.classificacao || [];

            // Remove the last answer from history
            setAnswerHistory(prev => prev.slice(0, -1));

            // Remove the answer from answers
            setAnswers(prev => {
                const newAnswers = {...prev};
                delete newAnswers[lastAnswer.questionIndex];
                return newAnswers;
            });

            // Update totalScore by subtracting the last answer's score
            setTotalScore(prev => {
                const newScores = {...prev};

                // Subtract the score from each characteristic in the classification
                lastClassificacao.forEach(type => {
                    const formattedType = type.charAt(0).toUpperCase() + type.slice(1);
                    if (newScores[formattedType] !== undefined) {
                        newScores[formattedType] -= lastScore;
                    }
                });

                return newScores;
            });

            // Go back to the previous question
            setCurrentQuestionIndex(prev => prev - 1);

            // Recalculate percentages with a clean state
            setTimeout(() => {
                calculatePercentages();

                // If we've gone back to the beginning (no answers), reset percentages
                if (Object.keys(answers).length === 0) {
                    resetTest();
                }
            }, 0);
        }
    };

    const stopTest = async () => {
        try {
            // Track question dropouts if not all questions were answered
            if (currentQuestionIndex < testQuestions.length - 1) {
                const currentQuestion = testQuestions[currentQuestionIndex];
                trackQuestionDropout(currentQuestionIndex, currentQuestion?.question || "");
            }

            await calculateResults();
        } catch (error) {
            console.error('Error calculating results:', error);
            // Silent error handling - don't show errors to the user
        }
    };

    // Calculate percentages in real-time
    const calculatePercentages = () => {
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

            return;
        }

        // Calculate total score for characteristics
        const totalCharScore = totalScore.Quente + totalScore.Frio + totalScore.Seco + totalScore.Umido;

        // Calculate characteristic percentages
        if (totalCharScore > 0) {
            // Calculate percentages
            const charPercentages = {
                "Quente": Math.round((totalScore.Quente / totalCharScore) * 100),
                "Frio": Math.round((totalScore.Frio / totalCharScore) * 100),
                "Seco": Math.round((totalScore.Seco / totalCharScore) * 100),
                "Umido": Math.round((totalScore.Umido / totalCharScore) * 100)
            };

            // Ensure the sum is exactly 100% by adjusting the highest value if needed @TODO ver se esse bloco faz falta
            // const charSum = Object.values(charPercentages).reduce((a, b) => a + b, 0);
            // if (charSum !== 100 && charSum > 0) {
            //     // Find the highest value to adjust
            //     const highestChar = Object.entries(charPercentages)
            //         .sort((a, b) => b[1] - a[1])[0][0];
            //     charPercentages[highestChar] += (100 - charSum);
            // }

            setCharacteristicPercentages(charPercentages);

            // // Sort characteristics by score to determine primary and secondary
            // const sortedChars = Object.entries(totalScore)
            //     .sort((a, b) => b[1] - a[1])
            //     .map(entry => entry[0]);
            //
            // // Calculate weights for each characteristic
            // const charWeights = {
            //     "Quente": 0,
            //     "Frio": 0,
            //     "Seco": 0,
            //     "Umido": 0
            // };

            // // Assign weights based on position (primary, secondary, etc.)
            // const primaryWeight = 60;
            // const secondaryWeight = 30;
            // const otherWeight = 10;
            //
            // sortedChars.forEach((char, index) => {
            //     if (index === 0) {
            //         charWeights[char] = primaryWeight;
            //     } else if (index === 1) {
            //         charWeights[char] = secondaryWeight;
            //     } else {
            //         charWeights[char] = otherWeight;
            //     }
            // });
            //
            // Calculate temperament scores based on characteristic combinations
            const tempScores = {
                // Sanguineo = Quente + Umido
                "Sanguineo": (totalScore.Quente * 0.5) + (totalScore.Umido * 0.5),
                // Colerico = Quente + Seco
                "Colerico": (totalScore.Quente * 0.5) + (totalScore.Seco * 0.5),
                // Melancolico = Frio + Seco
                "Melancolico": (totalScore.Frio * 0.5) + (totalScore.Seco * 0.5),
                // Fleumatico = Frio + Umido
                "Fleumatico": (totalScore.Frio * 0.5) + (totalScore.Umido * 0.5)
            };

            // Calculate temperament percentages
            const totalTempScore = Object.values(tempScores).reduce((a, b) => a + b, 0);
            if (totalTempScore > 0) {
                const tempPercentages = {
                    "Sanguineo": Math.round((tempScores["Sanguineo"] / totalTempScore) * 100),
                    "Colerico": Math.round((tempScores["Colerico"] / totalTempScore) * 100),
                    "Melancolico": Math.round((tempScores["Melancolico"] / totalTempScore) * 100),
                    "Fleumatico": Math.round((tempScores["Fleumatico"] / totalTempScore) * 100)
                };

                // // Ensure the sum is exactly 100% by adjusting the highest value if needed @TODO ver se esse bloco faz falta
                // const tempSum = Object.values(tempPercentages).reduce((a, b) => a + b, 0);
                // if (tempSum !== 100 && tempSum > 0) {
                //     // Find the highest value to adjust
                //     const highestTemp = Object.entries(tempPercentages)
                //         .sort((a, b) => b[1] - a[1])[0][0];
                //     tempPercentages[highestTemp] += (100 - tempSum);
                // }

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
    };

    // Calculate test results
    const calculateResults = async () => {
        // Calculate percentages first to ensure state is updated
        calculatePercentages();

        // Calculate total score for characteristics
        const totalCharScore = totalScore.Quente + totalScore.Frio + totalScore.Seco + totalScore.Umido;

        // Sort characteristics by score and add percentage
        const sortedCharacteristics = Object.entries(totalScore)
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

        // // Calculate weights for each characteristic
        // const charWeights = {
        //     "Quente": 0,
        //     "Frio": 0,
        //     "Seco": 0,
        //     "Umido": 0
        // };
        //
        // // Assign weights based on position (primary, secondary, etc.)
        // const primaryWeight = 60;
        // const secondaryWeight = 30;
        // const otherWeight = 10;
        //
        // sortedCharacteristics.forEach((char, index) => {
        //     if (index === 0) {
        //         charWeights[char.name] = primaryWeight;
        //     } else if (index === 1) {
        //         charWeights[char.name] = secondaryWeight;
        //     } else {
        //         charWeights[char.name] = otherWeight;
        //     }
        // });

        // Calculate temperament scores based on characteristic combinations
        const temperamentScores = {
            // Sanguineo = Quente + Umido
            "Sanguineo": (totalScore.Quente * 0.5) + (totalScore.Umido * 0.5),
            // Colerico = Quente + Seco
            "Colerico": (totalScore.Quente * 0.5) + (totalScore.Seco * 0.5),
            // Melancolico = Frio + Seco
            "Melancolico": (totalScore.Frio * 0.5) + (totalScore.Seco * 0.5),
            // Fleumatico = Frio + Umido
            "Fleumatico": (totalScore.Frio * 0.5) + (totalScore.Umido * 0.5)
        };

        // Sort temperaments by score and add percentage
        const totalTempScore = Object.values(temperamentScores).reduce((a, b) => a + b, 0);
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
                // Find the highest value to adjust
                const highestIndex = sortedTemperaments
                    .map((temp, index) => ({index, percentage: temp.percentage}))
                    .sort((a, b) => b.percentage - a.percentage)[0].index;

                sortedTemperaments[highestIndex].percentage += (100 - tempSum);
            }
        }

        // Ensure we have at least 2 elements in each array to avoid undefined access
        const ensureMinLength = (arr, minLength) => {
            if (!Array.isArray(arr)) return new Array(minLength).fill({});
            while (arr.length < minLength) {
                arr.push({
                    name: 'Não definido',
                    score: 0,
                    percentage: 0
                });
            }
            return arr;
        };

        // Make sure arrays have at least 2 elements
        const safeTemperaments = ensureMinLength(sortedTemperaments, 2);
        const safeCharacteristics = ensureMinLength(sortedCharacteristics, 4);

        const resultsData = {
            primaryTemperament: safeTemperaments[0],
            secondaryTemperament: safeTemperaments[1],
            primaryCharacteristic: safeCharacteristics[0],
            secondaryCharacteristic: safeCharacteristics[1],
            allTemperaments: safeTemperaments,
            allCharacteristics: safeCharacteristics
        };

        setResults(resultsData);
        setTestComplete(true);

        // Track test completion and temperament distribution
        const testDuration = Object.keys(answers).length * 10; // Rough estimate of test duration in seconds
        trackTestCompletion({
            ...resultsData,
            testDuration
        });

        trackTemperamentDistribution({
            temperamentPercentages: {
                Sanguineo: resultsData.allTemperaments[0].name === "Sanguineo" ? resultsData.allTemperaments[0].percentage :
                    resultsData.allTemperaments[1].name === "Sanguineo" ? resultsData.allTemperaments[1].percentage : 0,
                Colerico: resultsData.allTemperaments[0].name === "Colerico" ? resultsData.allTemperaments[0].percentage :
                    resultsData.allTemperaments[1].name === "Colerico" ? resultsData.allTemperaments[1].percentage : 0,
                Melancolico: resultsData.allTemperaments[0].name === "Melancolico" ? resultsData.allTemperaments[0].percentage :
                    resultsData.allTemperaments[1].name === "Melancolico" ? resultsData.allTemperaments[1].percentage : 0,
                Fleumatico: resultsData.allTemperaments[0].name === "Fleumatico" ? resultsData.allTemperaments[0].percentage :
                    resultsData.allTemperaments[1].name === "Fleumatico" ? resultsData.allTemperaments[1].percentage : 0
            }
        });

        // Check if at least 50% of questions were answered
        const answeredQuestionsPercentage = (Object.keys(answers).length / testQuestions.length) * 100;
        if (answeredQuestionsPercentage >= 50 && testMode === "normal" && !userName.includes("teste")) {
            try {
                // Send email with test results
                sendTestResultsEmail(resultsData);
                // Send telegram message with test results
                await sendTelegramMessage(resultsData);
            } catch (error) {
                console.error('Error in sending results:', error);
                // Silent error handling - don't show errors to the user
            }
        }
    };

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

    const sendTestResultsEmail = async (resultsData) => {
        try {
            await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: userName,
                    age: userAge,
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

    const sendTelegramMessage = async (resultsData) => {
        try {
            await sendTemperamentTestMessage({
                name: userName,
                age: userAge,
                date: new Date().toISOString(),
                browserInfo: getBrowserInfo(),
                results: resultsData,
                executionCount: executionCount
            });
        } catch (telegramError) {
            console.error('Error sending Telegram message:', telegramError);
        }
    }

    // Removed PdfContent component - now imported from utils/pdf-generator.tsx

    const downloadPdf = async () => {
        // Track PDF download
        if (results && results.primaryTemperament) {
            trackPdfDownload(userName, results.primaryTemperament.name);
        }

        // Use the generatePdf function from the utils file
        await generatePdf(pdfContentRef, userName, setIsPdfLoading);
    };

    return (
        <div className="p-4 max-w-max mx-auto">
            {/* Hidden PDF content for generation */}
            {results && <PdfContent ref={pdfContentRef} data={{name: userName, age: userAge.toString(), date: new Date().toISOString(), results: results}}/>}
            {!showTest ? (
                <>
                    <div className="mb-6">
                        <h2 className="text-xl font-bold mb-4">Os Quatro Temperamentos</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Os temperamentos humanos são classificados em quatro tipos principais, cada um com
                            características distintas:
                        </p>

                        <div className="mb-6 grid sm:grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 h-52 bg-red-50 dark:bg-red-900/20 rounded-md">
                                <h3 className="font-bold text-red-600 dark:text-red-400">Sanguíneo</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Extrovertido, comunicativo, sociável e entusiasmado. Pessoas com este temperamento
                                    tendem a ser otimistas e alegres.
                                </p>
                            </div>

                            <div className="p-4 h-52 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                                <h3 className="font-bold text-yellow-600 dark:text-yellow-400">Colérico</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Enérgico, decidido, prático e orientado para objetivos. Pessoas com este
                                    temperamento tendem a ser líderes naturais.
                                </p>
                            </div>

                            <div className="p-4 h-52 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                <h3 className="font-bold text-blue-600 dark:text-blue-400">Melancólico</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    Analítico, perfeccionista, sensível e detalhista. Pessoas com este temperamento
                                    tendem a ser profundas e reflexivas.
                                </p>
                            </div>

                            <div className="p-4 h-52 bg-green-50 dark:bg-green-900/20 rounded-md">
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
                            <div className="relative">
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

                        {/*<div>*/}
                        {/*    <label className="block text-sm font-medium mb-2">*/}
                        {/*        Modo do Teste*/}
                        {/*    </label>*/}
                        {/*    <div className="flex space-x-4">*/}
                        {/*        <div className="flex items-center">*/}
                        {/*            <input*/}
                        {/*                type="radio"*/}
                        {/*                id="modeNormal"*/}
                        {/*                name="testMode"*/}
                        {/*                value="normal"*/}
                        {/*                checked={testMode === "normal"}*/}
                        {/*                onChange={() => setTestMode("normal")}*/}
                        {/*                className="mr-2"*/}
                        {/*            />*/}
                        {/*            <label htmlFor="modeNormal" className="text-gray-700 dark:text-gray-300">*/}
                        {/*                Normal*/}
                        {/*            </label>*/}
                        {/*        </div>*/}
                        {/*        <div className="flex items-center">*/}
                        {/*            <input*/}
                        {/*                type="radio"*/}
                        {/*                id="modeTeste"*/}
                        {/*                name="testMode"*/}
                        {/*                value="teste"*/}
                        {/*                checked={testMode === "teste"}*/}
                        {/*                onChange={() => setTestMode("teste")}*/}
                        {/*                className="mr-2"*/}
                        {/*            />*/}
                        {/*            <label htmlFor="modeTeste" className="text-gray-700 dark:text-gray-300">*/}
                        {/*                Debug (usado apenas para testar o funcionamento)*/}
                        {/*            </label>*/}
                        {/*        </div>*/}
                        {/*    </div>*/}
                        {/*    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">*/}
                        {/*        {testMode === "normal"*/}
                        {/*            ? "Modo normal: apenas perguntas e botões."*/}
                        {/*            : "Modo teste: mostra painéis de totalizadores e score detalhado para testes."}*/}
                        {/*    </p>*/}
                        {/*</div>*/}
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
                        {/*<span className={`px-3 py-1 text-xs font-medium rounded-full ${*/}
                        {/*    testMode === "normal"*/}
                        {/*        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"*/}
                        {/*        : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"*/}
                        {/*}`}>*/}
                        {/*    {testMode === "normal" ? "Modo Normal" : "Modo Teste"}*/}
                        {/*</span>*/}
                    </div>
                    {/*<p className="text-gray-600 dark:text-gray-400 mb-2">*/}
                    {/*    Responda às afirmações abaixo indicando o quanto você se identifica com cada afirmação ou*/}
                    {/*    pergunta.*/}
                    {/*</p>*/}
                    <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
                        <strong>Observação importante:</strong> Na dúvida olhar para o comportamento primitivo, de sua
                        infância, e não o comportamento de hoje já condicionado.
                    </p>

                    {/* Real-time percentage counters - only shown in test mode */}
                    {testMode === "teste" && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Percentuais em Tempo Real: </h3>
                            <div className="mb-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                                <h4 className="font-medium mb-2">Current Score</h4>
                                <div className="grid grid-cols-4 gap-4 bg-gray-800 p-2">
                                    <p>Frio: [{totalScore.Frio}]</p>
                                    <p>Quente: [{totalScore.Quente}]</p>
                                    <p>Seco: [{totalScore.Seco}]</p>
                                    <p>Umido: [{totalScore.Umido}]</p>
                                </div>
                            </div>
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
                                {testMode === "teste" && (
                                    <h3 className="text-md text-gray-500 dark:text-gray-400 mb-2">
                                        [ {testQuestions[currentQuestionIndex]?.classificacao?.join(", ")} ]
                                    </h3>
                                )}
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
                                    <span className="text-xs"></span>
                                </button>
                                <button
                                    onClick={() => answerQuestion(1)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">Pouco</span>
                                    <span className="text-xs"></span>
                                </button>
                                <button
                                    onClick={() => answerQuestion(3)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-md hover:bg-yellow-200 dark:hover:bg-yellow-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">Médio</span>
                                    <span className="text-xs"></span>
                                </button>
                                <button
                                    onClick={() => answerQuestion(5)}
                                    className="w-28 h-16 flex flex-col items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md hover:bg-green-200 dark:hover:bg-green-800/50 transition-colors"
                                >
                                    <span className="text-lg font-bold">Totalmente</span>
                                    <span className="text-xs"></span>
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
                        {/*<button onClick={() => calculateResults()}>send telegram</button>*/}
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
