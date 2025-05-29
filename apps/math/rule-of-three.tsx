"use client";

import { useState } from "react";

const RuleOfThreeCalculator = () => {
  // State for input values
  const [values, setValues] = useState({
    a: "",
    b: "",
    c: "",
    d: "",
    activeField: "d" // Which field is being calculated (a, b, c, or d)
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
      [field]: value,
      // If user is typing in the active field, change the active field
      activeField: field === values.activeField ? "" : values.activeField
    });
  };

  // Set which field to calculate
  const setActiveField = (field) => {
    setValues({
      ...values,
      activeField: field
    });
  };

  // Calculate the result
  const calculateResult = () => {
    // Clear previous results and errors
    setResult(null);
    setError("");

    // Convert inputs to numbers
    const a = parseFloat(values.a);
    const b = parseFloat(values.b);
    const c = parseFloat(values.c);
    const d = parseFloat(values.d);

    // Validate inputs based on which field is being calculated
    if (values.activeField === "a" && (isNaN(b) || isNaN(c) || isNaN(d))) {
      setError("Por favor, preencha os campos B, C e D.");
      return;
    } else if (values.activeField === "b" && (isNaN(a) || isNaN(c) || isNaN(d))) {
      setError("Por favor, preencha os campos A, C e D.");
      return;
    } else if (values.activeField === "c" && (isNaN(a) || isNaN(b) || isNaN(d))) {
      setError("Por favor, preencha os campos A, B e D.");
      return;
    } else if (values.activeField === "d" && (isNaN(a) || isNaN(b) || isNaN(c))) {
      setError("Por favor, preencha os campos A, B e C.");
      return;
    }

    // Calculate based on which field is active
    let calculatedValue;
    if (values.activeField === "a") {
      if (c === 0) {
        setError("O valor de C não pode ser zero.");
        return;
      }
      calculatedValue = (b * d) / c;
    } else if (values.activeField === "b") {
      if (d === 0) {
        setError("O valor de D não pode ser zero.");
        return;
      }
      calculatedValue = (a * d) / c;
    } else if (values.activeField === "c") {
      if (b === 0) {
        setError("O valor de B não pode ser zero.");
        return;
      }
      calculatedValue = (a * d) / b;
    } else if (values.activeField === "d") {
      if (a === 0) {
        setError("O valor de A não pode ser zero.");
        return;
      }
      calculatedValue = (b * c) / a;
    }

    // Set the result
    setResult({
      field: values.activeField,
      value: calculatedValue
    });

    // Update the values state with the calculated value
    setValues({
      ...values,
      [values.activeField]: calculatedValue.toString()
    });
  };

  // Reset the calculator
  const resetCalculator = () => {
    setValues({
      a: "",
      b: "",
      c: "",
      d: "",
      activeField: "d"
    });
    setResult(null);
    setError("");
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          A regra de três é um método simples para encontrar um valor desconhecido em uma proporção.
          Preencha três dos quatro valores e selecione qual valor você deseja calcular.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex flex-col">
          <div className="flex items-center mb-2">
            <input
              type="radio"
              id="calculateA"
              name="calculateField"
              checked={values.activeField === "a"}
              onChange={() => setActiveField("a")}
              className="mr-2"
            />
            <label htmlFor="calculateA" className="text-sm font-medium">Calcular A</label>
          </div>
          <input
            type="number"
            value={values.a}
            onChange={(e) => handleInputChange("a", e.target.value)}
            placeholder="Valor de A"
            className={`p-2 border rounded-md !text-gray-800 ${values.activeField === "a" ? "bg-gray-100 dark:bg-gray-800" : ""}`}
            disabled={values.activeField === "a"}
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center mb-2">
            <input
              type="radio"
              id="calculateB"
              name="calculateField"
              checked={values.activeField === "b"}
              onChange={() => setActiveField("b")}
              className="mr-2"
            />
            <label htmlFor="calculateB" className="text-sm font-medium">Calcular B</label>
          </div>
          <input
            type="number"
            value={values.b}
            onChange={(e) => handleInputChange("b", e.target.value)}
            placeholder="Valor de B"
            className={`p-2 border rounded-md text-gray-900 dark:text-gray-100 ${values.activeField === "b" ? "bg-gray-100 dark:bg-gray-800" : ""}`}
            disabled={values.activeField === "b"}
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center mb-2">
            <input
              type="radio"
              id="calculateC"
              name="calculateField"
              checked={values.activeField === "c"}
              onChange={() => setActiveField("c")}
              className="mr-2"
            />
            <label htmlFor="calculateC" className="text-sm font-medium">Calcular C</label>
          </div>
          <input
            type="number"
            value={values.c}
            onChange={(e) => handleInputChange("c", e.target.value)}
            placeholder="Valor de C"
            className={`p-2 border rounded-md text-gray-900 dark:text-gray-100 ${values.activeField === "c" ? "bg-gray-100 dark:bg-gray-800" : ""}`}
            disabled={values.activeField === "c"}
          />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center mb-2">
            <input
              type="radio"
              id="calculateD"
              name="calculateField"
              checked={values.activeField === "d"}
              onChange={() => setActiveField("d")}
              className="mr-2"
            />
            <label htmlFor="calculateD" className="text-sm font-medium">Calcular D</label>
          </div>
          <input
            type="number"
            value={values.d}
            onChange={(e) => handleInputChange("d", e.target.value)}
            placeholder="Valor de D"
            className={`p-2 border rounded-md text-gray-900 dark:text-gray-100 ${values.activeField === "d" ? "bg-gray-100 dark:bg-gray-800" : ""}`}
            disabled={values.activeField === "d"}
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
        <div className="p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-md">
          <h3 className="font-bold mb-2">Resultado:</h3>
          <p>
            {result.field.toUpperCase()} = {result.value.toFixed(2)}
          </p>
        </div>
      )}

      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-semibold mb-3">Exemplos de uso:</h3>
        <div className="space-y-3">
          <div>
            <p className="font-medium">Exemplo 1: Conversão de preço</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Se 3 kg de maçãs custam R$ 15, quanto custarão 5 kg?
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A = 3, B = 15, C = 5, D = ?
            </p>
          </div>
          <div>
            <p className="font-medium">Exemplo 2: Receita</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Se uma receita para 4 pessoas usa 200g de farinha, quanto de farinha é necessário para 10 pessoas?
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A = 4, B = 200, C = 10, D = ?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleOfThreeCalculator;
