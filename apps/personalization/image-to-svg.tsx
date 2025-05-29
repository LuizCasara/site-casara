"use client";

import { useState, useRef, useEffect } from "react";
import * as potrace from "potrace";

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

    // Create a new image to load the file
    const img = new Image();
    img.onload = () => {
      try {
        // Create a canvas to draw the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0);

        // Apply grayscale or black and white if needed
        if (conversionSettings.colorMode !== 'color') {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            // Convert to grayscale
            const gray = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11);

            if (conversionSettings.colorMode === 'grayscale') {
              data[i] = data[i + 1] = data[i + 2] = gray;
            } else if (conversionSettings.colorMode === 'blackAndWhite') {
              // Black and white (threshold at 128)
              const bw = gray > 128 ? 255 : 0;
              data[i] = data[i + 1] = data[i + 2] = bw;
            }
          }

          ctx.putImageData(imageData, 0, 0);
        }

        // Get image data as base64
        const imageDataUrl = canvas.toDataURL('image/png');

        // Configure potrace
        const params = {
          turdSize: 2, // Suppress speckles
          optTolerance: 0.2,
          threshold: -1, // Auto threshold
          blackOnWhite: true,
          optCurve: true,
          alphaMax: 1,
          background: conversionSettings.removeBackground ? null : '#fff'
        };

        // Adjust simplification based on user settings (1-5)
        // Lower turdSize and higher alphaMax for more details (lower simplifyPaths value)
        if (conversionSettings.simplifyPaths <= 2) {
          params.turdSize = 1;
          params.alphaMax = 1;
        } else if (conversionSettings.simplifyPaths >= 4) {
          params.turdSize = 5;
          params.alphaMax = 0.5;
        }

        // Convert image to SVG using potrace
        potrace.trace(imageDataUrl, params, (err, svgContent) => {
          if (err) {
            setError("Erro na conversão: " + err.message);
            setIsConverting(false);
            return;
          }

          // Create a blob URL for the SVG
          const blob = new Blob([svgContent], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);

          setSvgUrl(url);
          setIsConverting(false);
        });
      } catch (err) {
        setError("Erro na conversão. Por favor, tente novamente com outra imagem.");
        setIsConverting(false);
      }
    };

    img.onerror = () => {
      setError("Erro ao carregar a imagem. Verifique se o arquivo é válido.");
      setIsConverting(false);
    };

    // Load the image from the file
    img.src = previewUrl;
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
                    className="w-full p-4 text-gray-800 border rounded-md"
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

          <div className="flex flex-col xs:flex-row space-y-3 xs:space-y-0 xs:space-x-6">
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
            <strong>Nota:</strong> Esta ferramenta utiliza a biblioteca Potrace para converter imagens em SVG. A qualidade da conversão pode variar dependendo da complexidade da imagem original.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageToSvgConverter;
