"use client";

import {useState} from "react";

const PercentageCalculator = () => {
    // Define calculation types
    const calculationTypes = [
        {id: "percentOfValue", label: "Calcular X% de Y"},
        {id: "valueIsPercentOfWhat", label: "X é qual % de Y?"},
        {id: "percentageChange", label: "Variação percentual entre X e Y"},
        {id: "reversePercentage", label: "Valor original antes do aumento/desconto"},
        {id: "addPercentage", label: "Adicionar X% a Y"},
        {id: "subtractPercentage", label: "Subtrair X% de Y"}
    ];

    // State for input values and calculation type
    const [values, setValues] = useState({
        x: "",
        y: "",
        calculationType: "percentOfValue"
    });

    // State for result
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

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

    // Handle calculation type change
    const handleCalculationTypeChange = (type) => {
        setValues({
            ...values,
            calculationType: type
        });
        setResult(null);
        setError("");
    };

    // Calculate the result
    const calculateResult = () => {
        // Clear previous results and errors
        setResult(null);
        setError("");

        // Convert inputs to numbers
        const x = parseFloat(values.x);
        const y = parseFloat(values.y);

        // Validate inputs based on calculation type
        if (isNaN(x)) {
            setError("Por favor, insira um valor válido para X.");
            return;
        }

        if (values.calculationType !== "reversePercentage" && isNaN(y)) {
            setError("Por favor, insira um valor válido para Y.");
            return;
        }

        let calculatedValue;
        let explanation;

        // Calculate based on calculation type
        switch (values.calculationType) {
            case "percentOfValue":
                // X% of Y
                calculatedValue = (x / 100) * y;
                explanation = `${x}% de ${y} = ${x} ÷ 100 × ${y} = ${calculatedValue}`;
                break;

            case "valueIsPercentOfWhat":
                // X is what % of Y?
                if (y === 0) {
                    setError("O valor de Y não pode ser zero para este cálculo.");
                    return;
                }
                calculatedValue = (x / y) * 100;
                explanation = `${x} é ${calculatedValue}% de ${y} porque ${x} ÷ ${y} × 100 = ${calculatedValue}%`;
                break;

            case "percentageChange":
                // Percentage change from X to Y
                if (x === 0) {
                    setError("O valor inicial (X) não pode ser zero para calcular a variação percentual.");
                    return;
                }
                calculatedValue = ((y - x) / Math.abs(x)) * 100;
                const changeType = calculatedValue >= 0 ? "aumento" : "diminuição";
                explanation = `A variação de ${x} para ${y} representa ${Math.abs(calculatedValue)}% de ${changeType}`;
                break;

            case "reversePercentage":
                // Original value before percentage change
                if (x === 0) {
                    setError("A porcentagem (X) não pode ser zero para este cálculo.");
                    return;
                }
                if (x === -100) {
                    setError("A porcentagem (X) não pode ser -100% para este cálculo.");
                    return;
                }
                calculatedValue = y / (1 + (x / 100));
                explanation = `Se ${y} representa um valor após ${x > 0 ? 'aumento' : 'desconto'} de ${Math.abs(x)}%, o valor original era ${calculatedValue}`;
                break;

            case "addPercentage":
                // Add X% to Y
                calculatedValue = y * (1 + (x / 100));
                explanation = `${y} + ${x}% = ${y} × (1 + ${x} ÷ 100) = ${calculatedValue}`;
                break;

            case "subtractPercentage":
                // Subtract X% from Y
                calculatedValue = y * (1 - (x / 100));
                explanation = `${y} - ${x}% = ${y} × (1 - ${x} ÷ 100) = ${calculatedValue}`;
                break;

            default:
                setError("Tipo de cálculo inválido.");
                return;
        }

        // Set the result
        setResult({
            value: calculatedValue,
            explanation
        });
    };

    // Reset the calculator
    const resetCalculator = () => {
        setValues({
            x: "",
            y: "",
            calculationType: "percentOfValue"
        });
        setResult(null);
        setError("");
    };

    // Get input labels based on calculation type
    const getInputLabels = () => {
        switch (values.calculationType) {
            case "percentOfValue":
                return {x: "Porcentagem (X%)", y: "Valor (Y)"};
            case "valueIsPercentOfWhat":
                return {x: "Valor (X)", y: "Valor Total (Y)"};
            case "percentageChange":
                return {x: "Valor Inicial (X)", y: "Valor Final (Y)"};
            case "reversePercentage":
                return {x: "Porcentagem de Aumento/Desconto (X%)", y: "Valor Final (Y)"};
            case "addPercentage":
                return {x: "Porcentagem a Adicionar (X%)", y: "Valor Base (Y)"};
            case "subtractPercentage":
                return {x: "Porcentagem a Subtrair (X%)", y: "Valor Base (Y)"};
            default:
                return {x: "X", y: "Y"};
        }
    };

    const inputLabels = getInputLabels();

    return (
        <div className="p-6 max-w-lg mx-auto">
            <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Realize diversos cálculos de porcentagem, como encontrar a porcentagem de um valor,
                    calcular aumentos/reduções percentuais e mais.
                </p>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Tipo de Cálculo</label>
                <div className="space-y-2">
                    {calculationTypes.map((type) => (
                        <div key={type.id} className="flex items-center">
                            <input
                                type="radio"
                                id={type.id}
                                name="calculationType"
                                checked={values.calculationType === type.id}
                                onChange={() => handleCalculationTypeChange(type.id)}
                                className="mr-2"
                            />
                            <label htmlFor={type.id} className="text-sm">{type.label}</label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4 mb-6">
                <div>
                    <label htmlFor="x" className="block text-sm font-medium mb-1">
                        {inputLabels.x}
                    </label>
                    <input
                        type="number"
                        id="x"
                        value={values.x}
                        onChange={(e) => handleInputChange("x", e.target.value)}
                        placeholder={`Ex: ${values.calculationType.includes("percent") ? "10" : "100"}`}
                        className="w-full p-4 border rounded-md text-gray-800"
                        step="any"
                    />
                </div>

                <div>
                    <label htmlFor="y" className="block text-sm font-medium mb-1">
                        {inputLabels.y}
                    </label>
                    <input
                        type="number"
                        id="y"
                        value={values.y}
                        onChange={(e) => handleInputChange("y", e.target.value)}
                        placeholder="Ex: 200"
                        className="w-full p-4 border rounded-md text-gray-800"
                        step="any"
                    />
                </div>
            </div>

            <div className="flex space-x-6 mb-6">
                <button
                    onClick={calculateResult}
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

            {result && (
                <div className="p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-md mb-6">
                    <h3 className="font-bold mb-2">Resultado:</h3>
                    <p className="text-lg mb-2">
                        {typeof result.value === 'number' && result.value % 1 !== 0
                            ? result.value.toFixed(2)
                            : result.value}
                        {values.calculationType === "valueIsPercentOfWhat" || values.calculationType === "percentageChange" ? "%" : ""}
                    </p>
                    <p className="text-sm">{result.explanation}</p>
                </div>
            )}

            <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Exemplos de Uso:</h3>
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                        <p className="font-medium">Calcular X% de Y</p>
                        <p>Exemplo: 15% de 200 = 30</p>
                        <p>Útil para calcular descontos, impostos, gorjetas, etc.</p>
                    </div>

                    <div>
                        <p className="font-medium">X é qual % de Y?</p>
                        <p>Exemplo: 30 é 15% de 200</p>
                        <p>Útil para entender a proporção de um valor em relação a outro.</p>
                    </div>

                    <div>
                        <p className="font-medium">Variação percentual entre X e Y</p>
                        <p>Exemplo: De 100 para 120 representa um aumento de 20%</p>
                        <p>Útil para analisar aumentos de preços, crescimento de vendas, etc.</p>
                    </div>

                    <div>
                        <p className="font-medium">Valor original antes do aumento/desconto</p>
                        <p>Exemplo: Se 120 representa um valor após aumento de 20%, o valor original era 100</p>
                        <p>Útil para descobrir preços originais antes de promoções ou aumentos.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PercentageCalculator;