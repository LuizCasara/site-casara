"use client";

import {useState} from "react";

const CompoundInterestCalculator = () => {
    // State for input values
    const [values, setValues] = useState({
        principal: "",
        rate: "",
        time: "",
        frequency: "12", // Monthly by default
        contribution: "", // Optional additional periodic contribution
    });

    // State for results
    const [results, setResults] = useState(null);
    const [error, setError] = useState("");
    const [showChart, setShowChart] = useState(false);

    // Handle input change
    const handleInputChange = (field, value) => {
        // Clear error when user types
        if (error) setError("");

        // Update values
        setValues({
            ...values,
            [field]: value
        });
    };

    // Calculate the compound interest
    const calculateInterest = () => {
        // Clear previous results and errors
        setResults(null);
        setError("");

        // Convert inputs to numbers
        const principal = parseFloat(values.principal);
        const rate = parseFloat(values.rate) / 100; // Convert percentage to decimal
        const time = parseFloat(values.time);
        const frequency = parseInt(values.frequency);
        const contribution = parseFloat(values.contribution) || 0;

        // Validate inputs
        if (isNaN(principal) || principal <= 0) {
            setError("Por favor, insira um capital inicial válido.");
            return;
        }
        if (isNaN(rate) || rate <= 0) {
            setError("Por favor, insira uma taxa de juros válida.");
            return;
        }
        if (isNaN(time) || time <= 0) {
            setError("Por favor, insira um período de tempo válido.");
            return;
        }
        if (isNaN(frequency) || frequency <= 0) {
            setError("Por favor, selecione uma frequência de capitalização válida.");
            return;
        }
        if (isNaN(contribution) || contribution < 0) {
            setError("Por favor, insira um valor de aporte periódico válido ou deixe em branco.");
            return;
        }

        // Calculate total periods
        const periods = time * frequency;

        // Calculate rate per period
        const ratePerPeriod = rate / frequency;

        // Calculate final amount with compound interest
        let finalAmount = principal * Math.pow(1 + ratePerPeriod, periods);

        // If there's a periodic contribution, calculate its effect
        if (contribution > 0) {
            // Formula for future value with regular contributions
            // FV = PMT × ((1 + r)^n - 1) / r
            finalAmount += contribution * ((Math.pow(1 + ratePerPeriod, periods) - 1) / ratePerPeriod);
        }

        // Calculate total interest earned
        const totalInterest = finalAmount - principal - (contribution * periods);

        // Calculate data for chart (simplified)
        const chartData = [];
        let currentAmount = principal;

        for (let i = 0; i <= periods; i++) {
            if (i === 0) {
                chartData.push({
                    period: i,
                    amount: currentAmount,
                    interest: 0,
                    contribution: 0
                });
            } else {
                const interestEarned = currentAmount * ratePerPeriod;
                currentAmount = currentAmount * (1 + ratePerPeriod) + contribution;

                chartData.push({
                    period: i,
                    amount: currentAmount,
                    interest: interestEarned,
                    contribution: contribution
                });
            }
        }

        // Set results
        setResults({
            finalAmount,
            totalInterest,
            totalContributions: contribution * periods,
            chartData
        });

        // Show chart
        setShowChart(true);
    };

    // Reset the calculator
    const resetCalculator = () => {
        setValues({
            principal: "",
            rate: "",
            time: "",
            frequency: "12",
            contribution: ""
        });
        setResults(null);
        setError("");
        setShowChart(false);
    };

    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    return (
        <div className="p-6 max-w-lg mx-auto">
            <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Calcule o montante final e os juros ganhos com base no capital inicial, taxa de juros, tempo e
                    frequência de capitalização.
                </p>
            </div>

            <div className="space-y-4 mb-6">
                <div>
                    <label htmlFor="principal" className="block text-sm font-medium mb-1">
                        Capital Inicial (R$)
                    </label>
                    <input
                        type="number"
                        id="principal"
                        value={values.principal}
                        onChange={(e) => handleInputChange("principal", e.target.value)}
                        placeholder="Ex: 1000"
                        className="w-full p-4 border rounded-md text-gray-900 "
                        min="0"
                        step="0.01"
                    />
                </div>

                <div>
                    <label htmlFor="rate" className="block text-sm font-medium mb-1">
                        Taxa de Juros (% ao ano)
                    </label>
                    <input
                        type="number"
                        id="rate"
                        value={values.rate}
                        onChange={(e) => handleInputChange("rate", e.target.value)}
                        placeholder="Ex: 5.5"
                        className="w-full p-4 border rounded-md text-gray-900 "
                        min="0"
                        step="0.01"
                    />
                </div>

                <div>
                    <label htmlFor="time" className="block text-sm font-medium mb-1">
                        Tempo (anos)
                    </label>
                    <input
                        type="number"
                        id="time"
                        value={values.time}
                        onChange={(e) => handleInputChange("time", e.target.value)}
                        placeholder="Ex: 5"
                        className="w-full p-4 border rounded-md text-gray-900 "
                        min="0"
                        step="0.01"
                    />
                </div>

                <div>
                    <label htmlFor="frequency" className="block text-sm font-medium mb-1">
                        Frequência de Capitalização
                    </label>
                    <select
                        id="frequency"
                        value={values.frequency}
                        onChange={(e) => handleInputChange("frequency", e.target.value)}
                        className="w-full p-4 border rounded-md text-gray-900 "
                    >
                        <option value="1">Anual</option>
                        <option value="2">Semestral</option>
                        <option value="4">Trimestral</option>
                        <option value="12">Mensal</option>
                        <option value="365">Diária</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="contribution" className="block text-sm font-medium mb-1">
                        Aporte Periódico (R$) - Opcional
                    </label>
                    <input
                        type="number"
                        id="contribution"
                        value={values.contribution}
                        onChange={(e) => handleInputChange("contribution", e.target.value)}
                        placeholder="Ex: 100"
                        className="w-full p-4 border rounded-md text-gray-900 "
                        min="0"
                        step="0.01"
                    />
                </div>
            </div>

            <div className="flex space-x-6 mb-6">
                <button
                    onClick={calculateInterest}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                    Calcular
                </button>
                <button
                    onClick={resetCalculator}
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

            {results && (
                <div className="p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-md mb-6">
                    <h3 className="font-bold mb-2">Resultados:</h3>
                    <div className="space-y-2">
                        <p>
                            <span className="font-medium">Montante Final:</span> {formatCurrency(results.finalAmount)}
                        </p>
                        <p>
                            <span
                                className="font-medium">Capital Inicial:</span> {formatCurrency(parseFloat(values.principal))}
                        </p>
                        {parseFloat(values.contribution) > 0 && (
                            <p>
                                <span
                                    className="font-medium">Total de Aportes:</span> {formatCurrency(results.totalContributions)}
                            </p>
                        )}
                        <p>
                            <span className="font-medium">Juros Ganhos:</span> {formatCurrency(results.totalInterest)}
                        </p>
                    </div>
                </div>
            )}

            {showChart && results && (
                <div className="mt-6 border-t pt-6">
                    <h3 className="text-lg font-semibold mb-3">Evolução do Investimento</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead>
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Período
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Montante
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Juros no Período
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {/* Show only first, middle and last periods for simplicity */}
                            {[0, Math.floor(results.chartData.length / 2), results.chartData.length - 1].map((index) => {
                                const data = results.chartData[index];
                                return (
                                    <tr key={index}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                            {data.period}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                            {formatCurrency(data.amount)}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                            {formatCurrency(data.interest)}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Informações:</h3>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <p>
                        <strong>Juros Compostos:</strong> São juros que incidem sobre o capital inicial mais os juros
                        acumulados nos períodos anteriores.
                    </p>
                    <p>
                        <strong>Fórmula:</strong> M = P(1 + i)^n, onde M é o montante final, P é o capital inicial, i é
                        a taxa de juros por período e n é o número de períodos.
                    </p>
                    <p>
                        <strong>Frequência de Capitalização:</strong> Determina quantas vezes os juros são calculados e
                        adicionados ao capital por ano.
                    </p>
                    <p>
                        <strong>Aporte Periódico:</strong> Valor adicional investido regularmente na mesma frequência da
                        capitalização.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CompoundInterestCalculator;
