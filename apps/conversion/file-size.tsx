"use client";

import {useState} from "react";

const FileSizeConverter = () => {
    // Define file size units
    const fileSizeUnits = [
        {id: "b", name: "Bytes (B)", factor: 1},
        {id: "kb", name: "Kilobytes (KB)", factor: 1024},
        {id: "mb", name: "Megabytes (MB)", factor: 1024 * 1024},
        {id: "gb", name: "Gigabytes (GB)", factor: 1024 * 1024 * 1024},
        {id: "tb", name: "Terabytes (TB)", factor: 1024 * 1024 * 1024 * 1024}
    ];

    // Define internet speed units
    const speedUnits = [
        {id: "bps", name: "bits por segundo (bps)", factor: 1},
        {id: "kbps", name: "Kilobits por segundo (Kbps)", factor: 1000},
        {id: "mbps", name: "Megabits por segundo (Mbps)", factor: 1000000},
        {id: "gbps", name: "Gigabits por segundo (Gbps)", factor: 1000000000}
    ];

    // State for input values
    const [values, setValues] = useState({
        fileSize: "",
        fromUnit: "mb",
        toUnit: "gb",
        internetSpeed: "",
        speedUnit: "mbps",
        showDownloadTime: false
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
            // If changing file size or internet speed, update showDownloadTime
            showDownloadTime: field === "internetSpeed" ? value !== "" : values.showDownloadTime
        });
    };

    // Convert file size
    const convertFileSize = () => {
        // Clear previous results and errors
        setResult(null);
        setError("");

        // Convert input to number
        const fileSize = parseFloat(values.fileSize);

        // Validate input
        if (isNaN(fileSize) || fileSize < 0) {
            setError("Por favor, insira um tamanho de arquivo válido.");
            return;
        }

        // Get conversion factors
        const fromFactor = fileSizeUnits.find(unit => unit.id === values.fromUnit)?.factor;
        const toFactor = fileSizeUnits.find(unit => unit.id === values.toUnit)?.factor;

        if (!fromFactor || !toFactor) {
            setError("Unidade de medida inválida.");
            return;
        }

        // Convert to bytes first, then to target unit
        const sizeInBytes = fileSize * fromFactor;
        const convertedSize = sizeInBytes / toFactor;

        // Calculate download time if internet speed is provided
        let downloadTime = null;
        if (values.showDownloadTime && values.internetSpeed) {
            const speed = parseFloat(values.internetSpeed);

            if (isNaN(speed) || speed <= 0) {
                setError("Por favor, insira uma velocidade de internet válida.");
                return;
            }

            const speedFactor = speedUnits.find(unit => unit.id === values.speedUnit)?.factor;

            if (!speedFactor) {
                setError("Unidade de velocidade inválida.");
                return;
            }

            // Convert speed to bits per second
            const speedInBitsPerSecond = speed * speedFactor;

            // Convert file size from bytes to bits (1 byte = 8 bits)
            const sizeInBits = sizeInBytes * 8;

            // Calculate download time in seconds
            const downloadTimeInSeconds = sizeInBits / speedInBitsPerSecond;

            downloadTime = formatTime(downloadTimeInSeconds);
        }

        // Set the result
        setResult({
            originalSize: fileSize,
            originalUnit: values.fromUnit,
            convertedSize,
            convertedUnit: values.toUnit,
            downloadTime
        });
    };

    // Format time in a human-readable format
    const formatTime = (seconds) => {
        if (seconds < 1) {
            return `${Math.round(seconds * 1000)} milissegundos`;
        } else if (seconds < 60) {
            return `${seconds.toFixed(2)} segundos`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes} minuto${minutes > 1 ? 's' : ''} e ${remainingSeconds.toFixed(0)} segundo${remainingSeconds !== 1 ? 's' : ''}`;
        } else if (seconds < 86400) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours} hora${hours > 1 ? 's' : ''} e ${minutes} minuto${minutes > 1 ? 's' : ''}`;
        } else {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            return `${days} dia${days > 1 ? 's' : ''} e ${hours} hora${hours > 1 ? 's' : ''}`;
        }
    };

    // Reset the converter
    const resetConverter = () => {
        setValues({
            fileSize: "",
            fromUnit: "mb",
            toUnit: "gb",
            internetSpeed: "",
            speedUnit: "mbps",
            showDownloadTime: false
        });
        setResult(null);
        setError("");
    };

    // Format file size for display
    const formatFileSize = (size, unit) => {
        if (size >= 1000) {
            return `${size.toFixed(2)} ${unit}`;
        } else if (size >= 100) {
            return `${size.toFixed(2)} ${unit}`;
        } else if (size >= 10) {
            return `${size.toFixed(3)} ${unit}`;
        } else {
            return `${size.toFixed(4)} ${unit}`;
        }
    };

    return (
        <div className="p-6 max-w-lg mx-auto">
            <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Converta entre diferentes unidades de tamanho de arquivo e estime o tempo de download com base na
                    velocidade da internet.
                </p>
            </div>

            <div className="space-y-4 mb-6">
                <div>
                    <label htmlFor="fileSize" className="block text-sm font-medium mb-1">
                        Tamanho do Arquivo
                    </label>
                    <input
                        type="number"
                        id="fileSize"
                        value={values.fileSize}
                        onChange={(e) => handleInputChange("fileSize", e.target.value)}
                        placeholder="Ex: 10"
                        className="w-full p-4 text-gray-800 border rounded-md"
                        min="0"
                        step="any"
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
                            className="w-full p-4 text-gray-800 border rounded-md"
                        >
                            {fileSizeUnits.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                    {unit.name}
                                </option>
                            ))}
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
                            className="w-full p-4 text-gray-800 border rounded-md"
                        >
                            {fileSizeUnits.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                    {unit.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium mb-3">Estimar Tempo de Download</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="internetSpeed" className="block text-sm font-medium mb-1">
                                Velocidade da Internet
                            </label>
                            <input
                                type="number"
                                id="internetSpeed"
                                value={values.internetSpeed}
                                onChange={(e) => handleInputChange("internetSpeed", e.target.value)}
                                placeholder="Ex: 100"
                                className="w-full p-4 text-gray-800 border rounded-md"
                                min="0"
                                step="any"
                            />
                        </div>

                        <div>
                            <label htmlFor="speedUnit" className="block text-sm font-medium mb-1">
                                Unidade de Velocidade
                            </label>
                            <select
                                id="speedUnit"
                                value={values.speedUnit}
                                onChange={(e) => handleInputChange("speedUnit", e.target.value)}
                                className="w-full p-4 text-gray-800 border rounded-md"
                            >
                                {speedUnits.map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                        {unit.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex space-x-6 mb-6">
                <button
                    onClick={convertFileSize}
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
                    <div className="space-y-2">
                        <p>
                            {result.originalSize} {fileSizeUnits.find(unit => unit.id === result.originalUnit)?.name} = {formatFileSize(result.convertedSize, fileSizeUnits.find(unit => unit.id === result.convertedUnit)?.name)}
                        </p>

                        {result.downloadTime && (
                            <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                                <p className="font-medium">Tempo estimado de download:</p>
                                <p>{result.downloadTime}</p>
                                <p className="text-xs mt-1">
                                    (com velocidade
                                    de {values.internetSpeed} {speedUnits.find(unit => unit.id === values.speedUnit)?.name})
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold mb-3">Informações:</h3>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <p>
                        <strong>Unidades de Tamanho de Arquivo:</strong>
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>1 Kilobyte (KB) = 1.024 Bytes</li>
                        <li>1 Megabyte (MB) = 1.024 Kilobytes</li>
                        <li>1 Gigabyte (GB) = 1.024 Megabytes</li>
                        <li>1 Terabyte (TB) = 1.024 Gigabytes</li>
                    </ul>

                    <p className="mt-2">
                        <strong>Unidades de Velocidade:</strong>
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>1 Kilobit por segundo (Kbps) = 1.000 bits por segundo</li>
                        <li>1 Megabit por segundo (Mbps) = 1.000 Kbps</li>
                        <li>1 Gigabit por segundo (Gbps) = 1.000 Mbps</li>
                    </ul>

                    <p className="mt-2">
                        <strong>Nota:</strong> O tempo de download estimado é teórico e baseado na velocidade máxima
                        informada. Na prática, o tempo real pode variar devido a diversos fatores como latência,
                        congestionamento da rede, limitações do servidor, etc.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FileSizeConverter;