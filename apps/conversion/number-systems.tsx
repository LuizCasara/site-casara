"use client";

import {useState} from "react";

const NumberSystemsConverter = () => {
    // Define number systems
    const numberSystems = [
        {id: "decimal", name: "Decimal", base: 10},
        {id: "binary", name: "Binário", base: 2},
        {id: "octal", name: "Octal", base: 8},
        {id: "hexadecimal", name: "Hexadecimal", base: 16}
    ];

    // State for input values
    const [values, setValues] = useState({
        inputValue: "",
        fromSystem: "decimal",
        showAllConversions: true
    });

    // State for results
    const [results, setResults] = useState(null);
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

    // Validate input based on number system
    const validateInput = (value, system) => {
        const patterns = {
            decimal: /^-?\d+$/,
            binary: /^[01]+$/,
            octal: /^[0-7]+$/,
            hexadecimal: /^[0-9A-Fa-f]+$/
        };

        return patterns[system].test(value);
    };

    // Convert between number systems
    const convertNumber = () => {
        // Clear previous results and errors
        setResults(null);
        setError("");

        const {inputValue, fromSystem} = values;

        // Validate input is not empty
        if (!inputValue.trim()) {
            setError("Por favor, insira um valor para converter.");
            return;
        }

        // Validate input format based on the source number system
        if (!validateInput(inputValue, fromSystem)) {
            setError(`Valor inválido para o sistema ${numberSystems.find(sys => sys.id === fromSystem).name}.`);
            return;
        }

        try {
            // Convert input to decimal first (as an intermediate step)
            let decimalValue;
            if (fromSystem === "decimal") {
                decimalValue = parseInt(inputValue, 10);
            } else {
                const base = numberSystems.find(sys => sys.id === fromSystem).base;
                decimalValue = parseInt(inputValue, base);
            }

            // Check if the conversion resulted in a valid number
            if (isNaN(decimalValue)) {
                setError("Conversão resultou em um valor inválido.");
                return;
            }

            // Convert from decimal to all other systems
            const conversions = {};

            numberSystems.forEach(system => {
                if (system.id === fromSystem) {
                    conversions[system.id] = inputValue;
                } else {
                    conversions[system.id] = decimalValue.toString(system.base).toUpperCase();
                }
            });

            // Set results
            setResults({
                originalValue: inputValue,
                originalSystem: fromSystem,
                conversions
            });
        } catch (e) {
            setError(`Erro na conversão: ${e.message}`);
        }
    };

    // Reset the converter
    const resetConverter = () => {
        setValues({
            inputValue: "",
            fromSystem: "decimal",
            showAllConversions: true
        });
        setResults(null);
        setError("");
    };

    // Get bit representation for educational purposes
    const getBitRepresentation = (value) => {
        // Convert to binary
        const binary = parseInt(value, 10).toString(2);

        // Pad to multiple of 4 for readability
        const paddedBinary = binary.padStart(Math.ceil(binary.length / 4) * 4, '0');

        // Group by 4 bits
        return paddedBinary.match(/.{1,4}/g).join(' ');
    };

    return (
        <div className="p-6 max-w-lg mx-auto">
            <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Converta números entre diferentes sistemas numéricos: decimal, binário, octal e hexadecimal.
                    Útil para programadores, estudantes de ciência da computação e entusiastas de tecnologia.
                </p>
            </div>

            <div className="space-y-4 mb-6">
                <div>
                    <label htmlFor="fromSystem" className="block text-sm font-medium mb-1">
                        Sistema de Origem
                    </label>
                    <select
                        id="fromSystem"
                        value={values.fromSystem}
                        onChange={(e) => handleInputChange("fromSystem", e.target.value)}
                        className="w-full p-4 text-gray-800 border rounded-md"
                    >
                        {numberSystems.map((system) => (
                            <option key={system.id} value={system.id}>
                                {system.name} (Base {system.base})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="inputValue" className="block text-sm font-medium mb-1">
                        Valor a Converter
                    </label>
                    <input
                        type="text"
                        id="inputValue"
                        value={values.inputValue}
                        onChange={(e) => handleInputChange("inputValue", e.target.value)}
                        placeholder={values.fromSystem === "decimal" ? "Ex: 42" : values.fromSystem === "binary" ? "Ex: 101010" : values.fromSystem === "octal" ? "Ex: 52" : "Ex: 2A"}
                        className="w-full p-4 text-gray-800 border rounded-md font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        {values.fromSystem === "decimal" ? "Apenas dígitos (0-9)" :
                            values.fromSystem === "binary" ? "Apenas 0 e 1" :
                                values.fromSystem === "octal" ? "Apenas dígitos de 0 a 7" :
                                    "Dígitos de 0 a 9 e letras de A a F"}
                    </p>
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="showAllConversions"
                        checked={values.showAllConversions}
                        onChange={(e) => handleInputChange("showAllConversions", e.target.checked)}
                        className="mr-2"
                    />
                    <label htmlFor="showAllConversions" className="text-sm">
                        Mostrar todas as conversões
                    </label>
                </div>
            </div>

            <div className="flex space-x-6 mb-6">
                <button
                    onClick={convertNumber}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                    Converter
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

            {results && (
                <div className="p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-md mb-6">
                    <h3 className="font-bold mb-3">Resultado:</h3>

                    {values.showAllConversions ? (
                        <div className="space-y-2">
                            {numberSystems.map((system) => (
                                <div key={system.id}
                                     className={`p-2 ${system.id === values.fromSystem ? 'bg-green-200 dark:bg-green-800 rounded' : ''}`}>
                                    <p className="font-medium">{system.name} (Base {system.base}):</p>
                                    <p className="font-mono">{results.conversions[system.id]}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {numberSystems.map((system) => {
                                if (system.id !== values.fromSystem) {
                                    return (
                                        <div key={system.id}>
                                            <p>
                                                <span
                                                    className="font-medium">{numberSystems.find(sys => sys.id === values.fromSystem).name}:</span> {results.originalValue}
                                            </p>
                                            <p>
                                                <span className="font-medium">{system.name}:</span> <span
                                                className="font-mono">{results.conversions[system.id]}</span>
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    )}

                    {/* Educational bit representation for decimal inputs */}
                    {values.fromSystem === "decimal" && parseInt(values.inputValue) >= 0 && parseInt(values.inputValue) <= 1000 && (
                        <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-800">
                            <p className="font-medium mb-1">Representação em bits:</p>
                            <p className="font-mono">{getBitRepresentation(values.inputValue)}</p>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Informações sobre Sistemas Numéricos:</h3>
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                        <p className="font-medium">Sistema Decimal (Base 10)</p>
                        <p>Utiliza 10 símbolos: 0-9</p>
                        <p>É o sistema que usamos no dia a dia.</p>
                        <p>Exemplo: 42 = 4×10¹ + 2×10⁰ = 40 + 2 = 42</p>
                    </div>

                    <div>
                        <p className="font-medium">Sistema Binário (Base 2)</p>
                        <p>Utiliza 2 símbolos: 0 e 1</p>
                        <p>É a base da computação digital, onde cada dígito representa um bit.</p>
                        <p>Exemplo: 101010 = 1×2⁵ + 0×2⁴ + 1×2³ + 0×2² + 1×2¹ + 0×2⁰ = 32 + 0 + 8 + 0 + 2 + 0 = 42</p>
                    </div>

                    <div>
                        <p className="font-medium">Sistema Octal (Base 8)</p>
                        <p>Utiliza 8 símbolos: 0-7</p>
                        <p>Cada dígito octal representa 3 bits binários.</p>
                        <p>Exemplo: 52 = 5×8¹ + 2×8⁰ = 40 + 2 = 42</p>
                    </div>

                    <div>
                        <p className="font-medium">Sistema Hexadecimal (Base 16)</p>
                        <p>Utiliza 16 símbolos: 0-9 e A-F (onde A=10, B=11, ..., F=15)</p>
                        <p>Cada dígito hexadecimal representa 4 bits binários.</p>
                        <p>Exemplo: 2A = 2×16¹ + 10×16⁰ = 32 + 10 = 42</p>
                    </div>

                    <div>
                        <p className="font-medium">Aplicações:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Binário: Usado em circuitos digitais e armazenamento de dados</li>
                            <li>Hexadecimal: Usado para representar cores em HTML, endereços de memória, etc.</li>
                            <li>Octal: Historicamente usado em alguns sistemas operacionais</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NumberSystemsConverter;