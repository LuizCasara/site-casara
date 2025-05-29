"use client";

import { useState, useRef } from "react";

const ImageToSvgConverter = () => {
  // State for file and conversion
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [svgUrl, setSvgUrl] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");
  const [conversionSettings, setConversionSettings] = useState({
    colorMode: "color", // color, grayscale, blackAndWhite
    simplifyPaths: 3, // 1-5 (1: most detailed, 5: most simplified)
    removeBackground: false,
    svgSize: "original" // original, fixed
  });

  // Refs
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Clear previous state
    setSelectedFile(null);
    setPreviewUrl("");
    setSvgUrl("");
    setError("");

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError("Por favor, selecione um arquivo PNG ou JPG.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("O tamanho do arquivo não pode exceder 5MB.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Set file and create preview
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle settings change
  const handleSettingChange = (setting, value) => {
    setConversionSettings({
      ...conversionSettings,
      [setting]: value
    });
  };

  // Convert image to SVG
  const convertToSvg = () => {
    if (!selectedFile) {
      setError("Por favor, selecione um arquivo para converter.");
      return;
    }

    setIsConverting(true);
    setError("");
    setSvgUrl("");

    // In a real implementation, we would use a library like potrace or send the image to a server
    // For this demo, we'll simulate the conversion process

    setTimeout(() => {
      try {
        // Simulate SVG generation
        // In a real app, this would be the result of actual conversion
        const mockSvgContent = `
          <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="#f0f0f0"/>
            <text x="50" y="50" font-family="Quicksand, sans-serif" font-size="12" text-anchor="middle">
              SVG Preview (${conversionSettings.colorMode})
            </text>
            <text x="50" y="70" font-family="Quicksand, sans-serif" font-size="10" text-anchor="middle">
              Simplification: ${conversionSettings.simplifyPaths}
            </text>
          </svg>
        `;

        // Create a blob URL for the SVG
        const blob = new Blob([mockSvgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        setSvgUrl(url);
        setIsConverting(false);
      } catch (err) {
        setError("Erro na conversão. Por favor, tente novamente com outra imagem.");
        setIsConverting(false);
      }
    }, 2000); // Simulate processing time
  };

  // Download SVG
  const downloadSvg = () => {
    if (!svgUrl) return;

    const link = document.createElement('a');
    link.href = svgUrl;
    link.download = `${selectedFile.name.split('.')[0]}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset the converter
  const resetConverter = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setSvgUrl("");
    setError("");
    setConversionSettings({
      colorMode: "color",
      simplifyPaths: 3,
      removeBackground: false,
      svgSize: "original"
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Conversão de PNG/JPG para SVG</h2>

      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Converta imagens PNG ou JPG para o formato SVG (gráficos vetoriais escaláveis).
          Útil para logotipos, ícones e ilustrações que precisam ser redimensionados sem perda de qualidade.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Input and Settings */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Selecione uma imagem (PNG ou JPG)
            </label>
            <input
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
              ref={fileInputRef}
            />
            <p className="text-xs text-gray-500 mt-1">
              Tamanho máximo: 5MB. Formatos suportados: PNG, JPG.
            </p>
          </div>

          {selectedFile && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium mb-3">Opções de Conversão</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="colorMode" className="block text-sm font-medium mb-1">
                    Modo de Cor
                  </label>
                  <select
                    id="colorMode"
                    value={conversionSettings.colorMode}
                    onChange={(e) => handleSettingChange("colorMode", e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="color">Colorido</option>
                    <option value="grayscale">Escala de Cinza</option>
                    <option value="blackAndWhite">Preto e Branco</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="simplifyPaths" className="block text-sm font-medium mb-1">
                    Simplificação de Caminhos
                  </label>
                  <div className="flex items-center">
                    <span className="text-xs mr-2">Detalhado</span>
                    <input
                      type="range"
                      id="simplifyPaths"
                      min="1"
                      max="5"
                      value={conversionSettings.simplifyPaths}
                      onChange={(e) => handleSettingChange("simplifyPaths", parseInt(e.target.value))}
                      className="flex-grow"
                    />
                    <span className="text-xs ml-2">Simplificado</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Níveis mais altos de simplificação resultam em arquivos SVG menores, mas com menos detalhes.
                  </p>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={conversionSettings.removeBackground}
                      onChange={(e) => handleSettingChange("removeBackground", e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Tentar remover o fundo</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-5">
                    Melhor para imagens com fundo sólido e alto contraste.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tamanho do SVG
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="svgSize"
                        value="original"
                        checked={conversionSettings.svgSize === "original"}
                        onChange={() => handleSettingChange("svgSize", "original")}
                        className="mr-1"
                      />
                      <span className="text-sm">Original</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="svgSize"
                        value="fixed"
                        checked={conversionSettings.svgSize === "fixed"}
                        onChange={() => handleSettingChange("svgSize", "fixed")}
                        className="mr-1"
                      />
                      <span className="text-sm">Otimizado</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={convertToSvg}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-400"
              disabled={!selectedFile || isConverting}
            >
              {isConverting ? "Convertendo..." : "Converter para SVG"}
            </button>
            <button
              onClick={resetConverter}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="border rounded-md p-6 flex flex-col bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-medium mb-4">Pré-visualização</h3>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md mb-4 w-full">
              {error}
            </div>
          )}

          <div className="flex-grow flex flex-col">
            {/* Original Image Preview */}
            {previewUrl && (
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Imagem Original:</p>
                <div className="border rounded-md overflow-hidden bg-white dark:bg-gray-800 p-2">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-48 mx-auto object-contain" 
                  />
                </div>
              </div>
            )}

            {/* SVG Preview */}
            <div className="flex-grow">
              {svgUrl ? (
                <div>
                  <p className="text-sm font-medium mb-2">SVG Convertido:</p>
                  <div className="border rounded-md overflow-hidden bg-white dark:bg-gray-800 p-2 mb-4">
                    <img 
                      src={svgUrl} 
                      alt="SVG Preview" 
                      className="max-w-full max-h-48 mx-auto object-contain" 
                    />
                  </div>
                  <button
                    onClick={downloadSvg}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Baixar SVG
                  </button>
                </div>
              ) : isConverting ? (
                <div className="flex-grow flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <p className="text-gray-500">Convertendo imagem para SVG...</p>
                    <p className="text-xs text-gray-400 mt-2">Isso pode levar alguns segundos dependendo da complexidade da imagem.</p>
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex items-center justify-center">
                  <div className="text-center text-gray-400 dark:text-gray-600">
                    <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>Selecione uma imagem e clique em "Converter para SVG"</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-semibold mb-3">Informações:</h3>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>SVG (Scalable Vector Graphics)</strong> é um formato de imagem vetorial que pode ser redimensionado sem perda de qualidade.
          </p>
          <p>
            <strong>Vantagens do SVG:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Escalabilidade: mantém a nitidez em qualquer tamanho</li>
            <li>Tamanho de arquivo reduzido para imagens simples</li>
            <li>Editável com editores de texto ou software de design</li>
            <li>Suporte a animações e interatividade</li>
            <li>Melhor para logotipos, ícones e ilustrações</li>
          </ul>

          <p className="mt-2">
            <strong>Limitações:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Não ideal para fotografias complexas</li>
            <li>A conversão automática pode não capturar todos os detalhes</li>
            <li>Imagens com muitos detalhes podem resultar em arquivos SVG grandes</li>
          </ul>

          <p className="mt-2">
            <strong>Nota:</strong> Esta é uma demonstração. Em uma implementação real, a conversão seria feita usando bibliotecas como Potrace, ImageTracer ou serviços de conversão.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageToSvgConverter;
