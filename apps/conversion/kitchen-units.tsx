"use client";

import { useState } from "react";

const KitchenUnitsConverter = () => {
  // Define ingredient types and their conversion factors
  const ingredients = [
    { id: "flour", name: "Farinha de Trigo", cupToGram: 120, tbspToGram: 8, tspToGram: 3 },
    { id: "sugar", name: "Açúcar", cupToGram: 200, tbspToGram: 12, tspToGram: 4 },
    { id: "brownSugar", name: "Açúcar Mascavo", cupToGram: 180, tbspToGram: 11, tspToGram: 4 },
    { id: "rice", name: "Arroz Cru", cupToGram: 180, tbspToGram: 12, tspToGram: 4 },
    { id: "butter", name: "Manteiga", cupToGram: 227, tbspToGram: 14, tspToGram: 5 },
    { id: "oil", name: "Óleo", cupToMl: 240, tbspToMl: 15, tspToMl: 5 },
    { id: "milk", name: "Leite", cupToMl: 240, tbspToMl: 15, tspToMl: 5 },
    { id: "water", name: "Água", cupToMl: 240, tbspToMl: 15, tspToMl: 5 },
    { id: "salt", name: "Sal", cupToGram: 240, tbspToGram: 15, tspToGram: 5 },
    { id: "bakingPowder", name: "Fermento em Pó", cupToGram: 200, tbspToGram: 12, tspToGram: 4 },
    { id: "cocoa", name: "Cacau em Pó", cupToGram: 100, tbspToGram: 6, tspToGram: 2 },
    { id: "honey", name: "Mel", cupToGram: 340, tbspToGram: 21, tspToGram: 7 },
  ];

  // Define unit types
  const unitTypes = [
    { id: "volume", name: "Volume", units: ["cup", "tbsp", "tsp", "ml"] },
    { id: "weight", name: "Peso", units: ["g", "kg", "oz", "lb"] },
  ];

  // State for input values
  const [values, setValues] = useState({
    amount: "",
    fromUnit: "cup",
    toUnit: "g",
    ingredient: "flour"
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

  // Get the selected ingredient
  const getSelectedIngredient = () => {
    return ingredients.find(ing => ing.id === values.ingredient);
  };

  // Check if a unit is volume or weight
  const isVolumeUnit = (unit) => {
    return ["cup", "tbsp", "tsp", "ml"].includes(unit);
  };

  const isWeightUnit = (unit) => {
    return ["g", "kg", "oz", "lb"].includes(unit);
  };

  // Convert between units
  const convertUnits = () => {
    // Clear previous results and errors
    setResult(null);
    setError("");

    // Convert input to number
    const amount = parseFloat(values.amount);

    // Validate input
    if (isNaN(amount) || amount <= 0) {
      setError("Por favor, insira uma quantidade válida.");
      return;
    }

    const ingredient = getSelectedIngredient();
    
    if (!ingredient) {
      setError("Ingrediente não encontrado.");
      return;
    }

    // Check if conversion is possible
    const fromIsVolume = isVolumeUnit(values.fromUnit);
    const toIsVolume = isVolumeUnit(values.toUnit);
    const fromIsWeight = isWeightUnit(values.fromUnit);
    const toIsWeight = isWeightUnit(values.toUnit);

    // If both units are of the same type (volume to volume or weight to weight)
    // or if we have conversion factors for the ingredient
    let convertedAmount;
    let conversionPath = "";

    // First convert to grams or ml (base units)
    let baseAmount;

    // Convert from unit to base unit (g or ml)
    if (values.fromUnit === "cup") {
      if (ingredient.cupToGram) {
        baseAmount = amount * ingredient.cupToGram;
        conversionPath = `${amount} xícara(s) = ${baseAmount} g`;
      } else if (ingredient.cupToMl) {
        baseAmount = amount * ingredient.cupToMl;
        conversionPath = `${amount} xícara(s) = ${baseAmount} ml`;
      }
    } else if (values.fromUnit === "tbsp") {
      if (ingredient.tbspToGram) {
        baseAmount = amount * ingredient.tbspToGram;
        conversionPath = `${amount} colher(es) de sopa = ${baseAmount} g`;
      } else if (ingredient.tbspToMl) {
        baseAmount = amount * ingredient.tbspToMl;
        conversionPath = `${amount} colher(es) de sopa = ${baseAmount} ml`;
      }
    } else if (values.fromUnit === "tsp") {
      if (ingredient.tspToGram) {
        baseAmount = amount * ingredient.tspToGram;
        conversionPath = `${amount} colher(es) de chá = ${baseAmount} g`;
      } else if (ingredient.tspToMl) {
        baseAmount = amount * ingredient.tspToMl;
        conversionPath = `${amount} colher(es) de chá = ${baseAmount} ml`;
      }
    } else if (values.fromUnit === "g") {
      baseAmount = amount;
      conversionPath = `${amount} g`;
    } else if (values.fromUnit === "kg") {
      baseAmount = amount * 1000;
      conversionPath = `${amount} kg = ${baseAmount} g`;
    } else if (values.fromUnit === "ml") {
      baseAmount = amount;
      conversionPath = `${amount} ml`;
    } else if (values.fromUnit === "oz") {
      baseAmount = amount * 28.35;
      conversionPath = `${amount} oz = ${baseAmount} g`;
    } else if (values.fromUnit === "lb") {
      baseAmount = amount * 453.592;
      conversionPath = `${amount} lb = ${baseAmount} g`;
    }

    // Now convert from base unit to target unit
    if (values.toUnit === "cup") {
      if (ingredient.cupToGram && baseAmount) {
        convertedAmount = baseAmount / ingredient.cupToGram;
        conversionPath += ` = ${convertedAmount.toFixed(2)} xícara(s)`;
      } else if (ingredient.cupToMl && baseAmount) {
        convertedAmount = baseAmount / ingredient.cupToMl;
        conversionPath += ` = ${convertedAmount.toFixed(2)} xícara(s)`;
      }
    } else if (values.toUnit === "tbsp") {
      if (ingredient.tbspToGram && baseAmount) {
        convertedAmount = baseAmount / ingredient.tbspToGram;
        conversionPath += ` = ${convertedAmount.toFixed(2)} colher(es) de sopa`;
      } else if (ingredient.tbspToMl && baseAmount) {
        convertedAmount = baseAmount / ingredient.tbspToMl;
        conversionPath += ` = ${convertedAmount.toFixed(2)} colher(es) de sopa`;
      }
    } else if (values.toUnit === "tsp") {
      if (ingredient.tspToGram && baseAmount) {
        convertedAmount = baseAmount / ingredient.tspToGram;
        conversionPath += ` = ${convertedAmount.toFixed(2)} colher(es) de chá`;
      } else if (ingredient.tspToMl && baseAmount) {
        convertedAmount = baseAmount / ingredient.tspToMl;
        conversionPath += ` = ${convertedAmount.toFixed(2)} colher(es) de chá`;
      }
    } else if (values.toUnit === "g") {
      convertedAmount = baseAmount;
      conversionPath += ` = ${convertedAmount.toFixed(2)} g`;
    } else if (values.toUnit === "kg") {
      convertedAmount = baseAmount / 1000;
      conversionPath += ` = ${convertedAmount.toFixed(4)} kg`;
    } else if (values.toUnit === "ml") {
      convertedAmount = baseAmount;
      conversionPath += ` = ${convertedAmount.toFixed(2)} ml`;
    } else if (values.toUnit === "oz") {
      convertedAmount = baseAmount / 28.35;
      conversionPath += ` = ${convertedAmount.toFixed(2)} oz`;
    } else if (values.toUnit === "lb") {
      convertedAmount = baseAmount / 453.592;
      conversionPath += ` = ${convertedAmount.toFixed(4)} lb`;
    }

    if (convertedAmount === undefined) {
      setError("Não foi possível realizar esta conversão para o ingrediente selecionado.");
      return;
    }

    // Set the result
    setResult({
      value: convertedAmount,
      unit: values.toUnit,
      explanation: conversionPath
    });
  };

  // Reset the converter
  const resetConverter = () => {
    setValues({
      amount: "",
      fromUnit: "cup",
      toUnit: "g",
      ingredient: "flour"
    });
    setResult(null);
    setError("");
  };

  // Format unit name for display
  const formatUnitName = (unit) => {
    switch (unit) {
      case "cup": return "Xícara";
      case "tbsp": return "Colher de Sopa";
      case "tsp": return "Colher de Chá";
      case "g": return "Gramas";
      case "kg": return "Quilogramas";
      case "ml": return "Mililitros";
      case "oz": return "Onças";
      case "lb": return "Libras";
      default: return unit;
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-6">Conversor de Unidades de Cozinha</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Converta medidas comuns em receitas com base em ingredientes específicos.
          Útil para converter entre xícaras, colheres, gramas e outras unidades.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="ingredient" className="block text-sm font-medium mb-1">
            Ingrediente
          </label>
          <select
            id="ingredient"
            value={values.ingredient}
            onChange={(e) => handleInputChange("ingredient", e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {ingredients.map((ing) => (
              <option key={ing.id} value={ing.id}>
                {ing.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-1">
            Quantidade
          </label>
          <input
            type="number"
            id="amount"
            value={values.amount}
            onChange={(e) => handleInputChange("amount", e.target.value)}
            placeholder="Ex: 1"
            className="w-full p-2 border rounded-md"
            min="0"
            step="0.01"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="fromUnit" className="block text-sm font-medium mb-1">
              De
            </label>
            <select
              id="fromUnit"
              value={values.fromUnit}
              onChange={(e) => handleInputChange("fromUnit", e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <optgroup label="Volume">
                <option value="cup">Xícara</option>
                <option value="tbsp">Colher de Sopa</option>
                <option value="tsp">Colher de Chá</option>
                <option value="ml">Mililitros (ml)</option>
              </optgroup>
              <optgroup label="Peso">
                <option value="g">Gramas (g)</option>
                <option value="kg">Quilogramas (kg)</option>
                <option value="oz">Onças (oz)</option>
                <option value="lb">Libras (lb)</option>
              </optgroup>
            </select>
          </div>
          
          <div>
            <label htmlFor="toUnit" className="block text-sm font-medium mb-1">
              Para
            </label>
            <select
              id="toUnit"
              value={values.toUnit}
              onChange={(e) => handleInputChange("toUnit", e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <optgroup label="Volume">
                <option value="cup">Xícara</option>
                <option value="tbsp">Colher de Sopa</option>
                <option value="tsp">Colher de Chá</option>
                <option value="ml">Mililitros (ml)</option>
              </optgroup>
              <optgroup label="Peso">
                <option value="g">Gramas (g)</option>
                <option value="kg">Quilogramas (kg)</option>
                <option value="oz">Onças (oz)</option>
                <option value="lb">Libras (lb)</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={convertUnits}
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

      {result && (
        <div className="p-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-md mb-6">
          <h3 className="font-bold mb-2">Resultado:</h3>
          <p className="text-lg mb-2">
            {result.value.toFixed(2)} {formatUnitName(result.unit)}
          </p>
          <p className="text-sm">{result.explanation}</p>
        </div>
      )}

      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-semibold mb-3">Dicas de Medidas:</h3>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>1 xícara de farinha de trigo</strong> ≈ 120g
          </p>
          <p>
            <strong>1 colher de sopa</strong> ≈ 15ml
          </p>
          <p>
            <strong>1 colher de chá</strong> ≈ 5ml
          </p>
          <p>
            <strong>Medidas de xícara</strong> podem variar dependendo do país. Este conversor usa o padrão brasileiro.
          </p>
          <p>
            <strong>Dica:</strong> Para maior precisão em receitas, especialmente em confeitaria, é sempre melhor usar medidas de peso (gramas) em vez de volume.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KitchenUnitsConverter;