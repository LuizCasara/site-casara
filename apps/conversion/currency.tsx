"use client";

import {useState, useEffect} from "react";

const CurrencyConverter = () => {
    // Common currencies
    const currencies = [
        {code: "USD", name: "Dólar Americano"},
        {code: "EUR", name: "Euro"},
        {code: "BRL", name: "Real Brasileiro"},
        {code: "GBP", name: "Libra Esterlina"},
        {code: "JPY", name: "Iene Japonês"},
        {code: "CAD", name: "Dólar Canadense"},
        {code: "AUD", name: "Dólar Australiano"},
        {code: "CHF", name: "Franco Suíço"},
        {code: "CNY", name: "Yuan Chinês"},
        {code: "ARS", name: "Peso Argentino"},
        {code: "MXN", name: "Peso Mexicano"}
    ];

    // State for input values
    const [values, setValues] = useState({
        amount: "",
        fromCurrency: "USD",
        toCurrency: "BRL"
    });

    // State for results and UI
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [rates, setRates] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [historicalData, setHistoricalData] = useState([]);

    // Mock exchange rates (in a real app, these would come from an API)
    useEffect(() => {
        // Simulate API call to get exchange rates
        const fetchRates = async () => {
            setLoading(true);

            const values = await fetch('https://api.exchangerate-api.com/v4/latest/USD');

            // For this demo, we'll use mock data
            // setTimeout(() => {
            //   const mockRates = {
            //     base: "USD",
            //     rates: {
            //       USD: 1,
            //       EUR: 0.85,
            //       BRL: 5.40,
            //       GBP: 0.75,
            //       JPY: 110.32,
            //       CAD: 1.25,
            //       AUD: 1.35,
            //       CHF: 0.92,
            //       CNY: 6.45,
            //       ARS: 97.5,
            //       MXN: 20.1
            //     }
            //   };

            setRates(await values.json());
            setLastUpdate(new Date().toLocaleString());
            setLoading(false);
            //}, 1000);
        };

        fetchRates();
    }, []);

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

    // Swap currencies
    const swapCurrencies = () => {
        setValues({
            ...values,
            fromCurrency: values.toCurrency,
            toCurrency: values.fromCurrency
        });

        // If there's a result, recalculate
        if (result) {
            calculateConversion();
        }
    };

    // Generate mock historical data
    const generateHistoricalData = () => {
        const today = new Date();
        const data = [];

        // Generate data for the last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);

            // Create a random fluctuation around the current rate
            const baseRate = rates.rates[values.toCurrency] / rates.rates[values.fromCurrency];
            const fluctuation = (Math.random() * 0.1) - 0.05; // Random between -5% and +5%
            const rate = baseRate * (1 + fluctuation);

            data.push({
                date: date.toLocaleDateString(),
                rate: rate
            });
        }

        return data;
    };

    // Calculate the conversion
    const calculateConversion = () => {
        // Clear previous results and errors
        setResult(null);
        setError("");
        setHistoricalData([]);
        setShowHistory(false);

        // Convert input to number
        const amount = parseFloat(values.amount);

        // Validate input
        if (isNaN(amount) || amount <= 0) {
            setError("Por favor, insira um valor válido.");
            return;
        }

        if (!rates) {
            setError("Taxas de câmbio não disponíveis. Tente novamente mais tarde.");
            return;
        }

        // Get exchange rates for the selected currencies
        const fromRate = rates.rates[values.fromCurrency];
        const toRate = rates.rates[values.toCurrency];

        if (!fromRate || !toRate) {
            setError("Taxa de câmbio não disponível para uma das moedas selecionadas.");
            return;
        }

        // Calculate conversion
        // First convert to USD (base currency), then to target currency
        const inUSD = amount / fromRate;
        const converted = inUSD * toRate;

        // Generate historical data
        const history = generateHistoricalData();
        setHistoricalData(history);

        // Set the result
        setResult({
            amount,
            fromCurrency: values.fromCurrency,
            toCurrency: values.toCurrency,
            converted,
            rate: toRate / fromRate
        });
    };

    // Reset the converter
    const resetConverter = () => {
        setValues({
            amount: "",
            fromCurrency: "USD",
            toCurrency: "BRL"
        });
        setResult(null);
        setError("");
        setHistoricalData([]);
        setShowHistory(false);
    };

    // Format currency
    const formatCurrency = (value, currencyCode) => {
        let locale = 'en-US';
        if (currencyCode === 'BRL') locale = 'pt-BR';
        else if (currencyCode === 'EUR') locale = 'de-DE';

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode
        }).format(value);
    };

    // Toggle history view
    const toggleHistory = () => {
        setShowHistory(!showHistory);
    };

    return (
        <div className="p-6 max-w-lg mx-auto">
            <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Converta valores entre diferentes moedas e veja o histórico de variação recente.
                </p>
                {lastUpdate && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                        Última atualização: {lastUpdate}
                    </p>
                )}
            </div>

            <div className="space-y-4 mb-6">
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium mb-1">
                        Valor
                    </label>
                    <input
                        type="number"
                        id="amount"
                        value={values.amount}
                        onChange={(e) => handleInputChange("amount", e.target.value)}
                        placeholder="Ex: 100"
                        className="w-full p-4 text-gray-800 border rounded-md"
                        min="0"
                        step="0.01"
                    />
                </div>

                <div className="grid grid-cols-5 gap-2 items-center">
                    <div className="col-span-2">
                        <label htmlFor="fromCurrency" className="block text-sm font-medium mb-1">
                            De
                        </label>
                        <select
                            id="fromCurrency"
                            value={values.fromCurrency}
                            onChange={(e) => handleInputChange("fromCurrency", e.target.value)}
                            className="w-full p-4 text-gray-800 border rounded-md"
                        >
                            {currencies.map((currency) => (
                                <option key={currency.code} value={currency.code}>
                                    {currency.code} - {currency.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-center">
                        <button
                            onClick={swapCurrencies}
                            className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Trocar moedas"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20"
                                 fill="currentColor">
                                <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                                      clipRule="evenodd"/>
                                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v8a1 1 0 11-2 0V6a1 1 0 011-1z"
                                      clipRule="evenodd"/>
                            </svg>
                        </button>
                    </div>

                    <div className="col-span-2">
                        <label htmlFor="toCurrency" className="block text-sm font-medium mb-1">
                            Para
                        </label>
                        <select
                            id="toCurrency"
                            value={values.toCurrency}
                            onChange={(e) => handleInputChange("toCurrency", e.target.value)}
                            className="w-full p-4 text-gray-800 border rounded-md"
                        >
                            {currencies.map((currency) => (
                                <option key={currency.code} value={currency.code}>
                                    {currency.code} - {currency.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex space-x-6 mb-6">
                <button
                    onClick={calculateConversion}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                    disabled={loading}
                >
                    {loading ? "Carregando..." : "Converter"}
                </button>
                <button
                    onClick={resetConverter}
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

            {result && (
                <div className="p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-md mb-6">
                    <h3 className="font-bold mb-2">Resultado:</h3>
                    <div className="space-y-2">
                        <p className="text-lg">
                            {formatCurrency(result.amount, result.fromCurrency)} = {formatCurrency(result.converted, result.toCurrency)}
                        </p>
                        <p className="text-sm">
                            Taxa de câmbio: 1 {result.fromCurrency} = {result.rate.toFixed(4)} {result.toCurrency}
                        </p>
                        <button
                            onClick={toggleHistory}
                            className="text-sm underline mt-2 hidden"
                        >
                            {showHistory ? "Ocultar histórico" : "Ver histórico de 7 dias"}
                        </button>
                    </div>
                </div>
            )}

            {showHistory && historicalData.length > 0 && (
                <div className="mb-6 border rounded-md overflow-hidden">
                    <h3 className="font-bold p-3 bg-gray-100 dark:bg-gray-800 p-2">Histórico de 7 dias:</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Data
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Taxa
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Valor Convertido
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {historicalData.map((data, index) => (
                                <tr key={index}
                                    className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                        {data.date}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                        {data.rate.toFixed(4)}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                        {formatCurrency(parseFloat(values.amount) * data.rate, values.toCurrency)}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Informações:</h3>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <p>
                        <strong>Nota:</strong> Este conversor utiliza taxas de câmbio simuladas para fins de
                        demonstração.
                    </p>
                    <p>
                        <strong>Taxas de Câmbio:</strong> Em uma aplicação real, as taxas seriam obtidas de APIs como
                        Open Exchange Rates, Fixer.io ou API do Banco Central.
                    </p>
                    <p>
                        <strong>Histórico:</strong> Os dados históricos mostrados são simulados e não representam
                        variações reais do mercado.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CurrencyConverter;