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
        setValues(prev => ({
            ...prev,
            fromCurrency: prev.toCurrency,
            toCurrency: prev.fromCurrency
        }));
        setResult(null);
    };

    // Calculate the conversion
    const calculateConversion = () => {
        // Clear previous results and errors
        setResult(null);
        setError("");

        const amount = parseFloat(values.amount);

        if (isNaN(amount) || amount <= 0) {
            setError("Por favor, insira um valor válido.");
            return;
        }

        if (!rates) {
            setError("Taxas de câmbio não disponíveis. Tente novamente mais tarde.");
            return;
        }

        const fromRate = rates.rates[values.fromCurrency];
        const toRate = rates.rates[values.toCurrency];

        if (!fromRate || !toRate) {
            setError("Taxa de câmbio não disponível para uma das moedas selecionadas.");
            return;
        }

        const inUSD = amount / fromRate;
        const converted = inUSD * toRate;

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
                    </div>
                </div>
            )}

            <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Informações:</h3>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <p>
                        <strong>Taxas de Câmbio:</strong> Este conversor utiliza a API ExchangeRate para taxas em tempo real.
                    </p>
                    <p>
                        <strong>Nota:</strong> As taxas são atualizadas periodicamente. Para decisões financeiras importantes, consulte fontes oficiais.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CurrencyConverter;