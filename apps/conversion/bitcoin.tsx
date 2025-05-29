"use client";

import {useState, useEffect} from "react";
import {FaBitcoin} from "react-icons/fa";

const BitcoinConverter = () => {
    // Target currencies
    const currencies = [
        {code: "USD", name: "Dólar Americano"},
        {code: "BRL", name: "Real Brasileiro"},
        {code: "EUR", name: "Euro"},
        {code: "GBP", name: "Libra Esterlina"},
        {code: "JPY", name: "Iene Japonês"},
        {code: "CAD", name: "Dólar Canadense"},
        {code: "AUD", name: "Dólar Australiano"},
        {code: "CHF", name: "Franco Suíço"},
        {code: "CNY", name: "Yuan Chinês"},
    ];

    // State for input values
    const [values, setValues] = useState({
        amount: "",
        toCurrency: "USD"
    });

    // State for results and UI
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [rates, setRates] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [historicalData, setHistoricalData] = useState([]);

    // Fetch Bitcoin rates from CoinGecko API
    useEffect(() => {
        const fetchRates = async () => {
            setLoading(true);
            setError("");

            try {
                // Get Bitcoin price in various currencies
                const response = await fetch(
                    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,brl,eur,gbp,jpy,cad,aud,chf,cny&include_last_updated_at=true"
                );

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const data = await response.json();

                if (!data.bitcoin) {
                    throw new Error("Bitcoin data not available");
                }

                // Format the rates in a more usable structure
                const formattedRates = {
                    USD: data.bitcoin.usd,
                    BRL: data.bitcoin.brl,
                    EUR: data.bitcoin.eur,
                    GBP: data.bitcoin.gbp,
                    JPY: data.bitcoin.jpy,
                    CAD: data.bitcoin.cad,
                    AUD: data.bitcoin.aud,
                    CHF: data.bitcoin.chf,
                    CNY: data.bitcoin.cny
                };

                
                setRates(formattedRates);

                // Convert timestamp to readable date
                const lastUpdated = data.bitcoin.last_updated_at
                    ? new Date(data.bitcoin.last_updated_at * 1000).toLocaleString()
                    : new Date().toLocaleString();

                
                setLastUpdate(lastUpdated);
            } catch (err) {
                console.error("Error fetching Bitcoin rates:", err);
                setError("Não foi possível obter as taxas de Bitcoin. Por favor, tente novamente mais tarde.");
            } finally {
                setLoading(false);
            }
        };

        fetchRates();

        // Refresh rates every 5 minutes
        const intervalId = setInterval(fetchRates, 5 * 60 * 1000);

        return () => clearInterval(intervalId);
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

    // Fetch historical data from CoinGecko
    const fetchHistoricalData = async () => {
        setLoading(true);
        setError("");

        try {
            // Get 7 days of Bitcoin price history in the selected currency
            const currency = values.toCurrency.toLowerCase();
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=${currency}&days=7&interval=daily`
            );

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.prices || data.prices.length === 0) {
                throw new Error("Historical data not available");
            }

            // Format the historical data
            
            const history = data.prices.map(item => {
                const [timestamp, price] = item;
                return {
                    date: new Date(timestamp).toLocaleDateString(),
                    rate: price
                };
            });

            setHistoricalData(history);
            setShowHistory(true);
        } catch (err) {
            console.error("Error fetching historical data:", err);
            setError("Não foi possível obter os dados históricos. Por favor, tente novamente mais tarde.");
        } finally {
            setLoading(false);
        }
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
            setError("Taxas de Bitcoin não disponíveis. Tente novamente mais tarde.");
            return;
        }

        // Get exchange rate for the selected currency
        const rate = rates[values.toCurrency];

        if (!rate) {
            setError("Taxa de câmbio não disponível para a moeda selecionada.");
            return;
        }

        // Calculate conversion (Bitcoin to selected currency)
        const converted = amount * rate;

        
        setResult({
            amount,
            toCurrency: values.toCurrency,
            converted,
            rate
        });

        // Fetch historical data
        fetchHistoricalData();
    };

    // Reset the converter
    const resetConverter = () => {
        setValues({
            amount: "",
            toCurrency: "USD"
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

    // Format Bitcoin
    
    const formatBitcoin = (value) => {
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 8
        }).format(value) + " BTC";
    };

    // Toggle history view
    const toggleHistory = () => {
        setShowHistory(!showHistory);
    };

    return (
        <div className="p-6 max-w-lg mx-auto">
            <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Converta Bitcoin (BTC) para diferentes moedas usando taxas de câmbio em tempo real.
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
                        Quantidade de Bitcoin (BTC)
                    </label>
                    <input
                        type="number"
                        id="amount"
                        value={values.amount}
                        onChange={(e) => handleInputChange("amount", e.target.value)}
                        placeholder="Ex: 0.5"
                        className="w-full p-4 text-gray-800 border rounded-md"
                        min="0"
                        step="0.00000001"
                    />
                </div>

                <div>
                    <label htmlFor="toCurrency" className="block text-sm font-medium mb-1">
                        Converter para
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

            <div className="flex flex-col xs:flex-row space-y-3 xs:space-y-0 xs:space-x-6 mb-6">
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
                            {formatBitcoin(result.amount)} = {formatCurrency(result.converted, result.toCurrency)}
                        </p>
                        <p className="text-sm">
                            Taxa de câmbio: 1 BTC = {formatCurrency(result.rate, result.toCurrency)}
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

            {false && showHistory && historicalData.length > 0 && (
                <div className="mb-6 border rounded-md overflow-hidden">
                    <h3 className="font-bold p-3 bg-gray-100 dark:bg-gray-800">Histórico de 7 dias:</h3>
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
                                        {formatCurrency(data.rate, values.toCurrency)}
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
                        <strong>Bitcoin (BTC)</strong> é uma criptomoeda descentralizada criada em 2009 por uma pessoa
                        ou grupo de pessoas usando o pseudônimo Satoshi Nakamoto.
                    </p>
                    <p>
                        <strong>Taxas de Câmbio:</strong> Este conversor utiliza taxas de câmbio em tempo real da API
                        CoinGecko para fornecer conversões precisas.
                    </p>
                    <p>
                        <strong>Volatilidade:</strong> O preço do Bitcoin pode ser altamente volátil, com grandes
                        variações em curtos períodos de tempo.
                    </p>
                    <p>
                        <strong>Histórico:</strong> Os dados históricos mostram a variação do preço do Bitcoin nos
                        últimos 7 dias.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BitcoinConverter;
