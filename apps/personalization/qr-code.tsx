"use client";

import { useState, useRef } from "react";

const QRCodeGenerator = () => {
  // QR Code content types
  const contentTypes = [
    { id: "text", name: "Texto" },
    { id: "url", name: "URL / Link" },
    { id: "email", name: "Email" },
    { id: "phone", name: "Telefone" },
    { id: "sms", name: "SMS" },
    { id: "vcard", name: "Contato (vCard)" }
  ];

  // Color presets
  const colorPresets = [
    { fg: "#000000", bg: "#FFFFFF", name: "Padrão (Preto e Branco)" },
    { fg: "#0078D7", bg: "#FFFFFF", name: "Azul" },
    { fg: "#107C10", bg: "#FFFFFF", name: "Verde" },
    { fg: "#D83B01", bg: "#FFFFFF", name: "Laranja" },
    { fg: "#E3008C", bg: "#FFFFFF", name: "Rosa" },
    { fg: "#FFFFFF", bg: "#000000", name: "Invertido (Branco e Preto)" }
  ];

  // State for input values
  const [values, setValues] = useState({
    contentType: "text",
    text: "",
    url: "https://",
    email: {
      address: "",
      subject: "",
      body: ""
    },
    phone: "",
    sms: {
      number: "",
      message: ""
    },
    vcard: {
      firstName: "",
      lastName: "",
      organization: "",
      title: "",
      phone: "",
      email: "",
      website: "",
      address: ""
    },
    size: 200,
    fgColor: "#000000",
    bgColor: "#FFFFFF",
    includeMargin: true,
    logoFile: null,
    logoUrl: ""
  });

  // State for QR code
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCustomColors, setShowCustomColors] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(0);

  // Refs
  const qrCodeRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Handle nested input change
  const handleNestedInputChange = (parent, field, value) => {
    setValues({
      ...values,
      [parent]: {
        ...values[parent],
        [field]: value
      }
    });
  };

  // Handle color preset selection
  const handlePresetSelect = (index) => {
    const preset = colorPresets[index];
    setValues({
      ...values,
      fgColor: preset.fg,
      bgColor: preset.bg
    });
    setSelectedPreset(index);
    setShowCustomColors(false);
  };

  // Handle logo file selection
  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        setError("O tamanho do logo não pode exceder 1MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setValues({
          ...values,
          logoFile: file,
          logoUrl: event.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove logo
  const removeLogo = () => {
    setValues({
      ...values,
      logoFile: null,
      logoUrl: ""
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Generate QR code content based on type
  const generateQRContent = () => {
    switch (values.contentType) {
      case "text":
        return values.text;
      
      case "url":
        return values.url;
      
      case "email":
        let emailContent = `mailto:${values.email.address}`;
        if (values.email.subject || values.email.body) {
          emailContent += "?";
          if (values.email.subject) {
            emailContent += `subject=${encodeURIComponent(values.email.subject)}`;
          }
          if (values.email.body) {
            emailContent += `${values.email.subject ? "&" : ""}body=${encodeURIComponent(values.email.body)}`;
          }
        }
        return emailContent;
      
      case "phone":
        return `tel:${values.phone}`;
      
      case "sms":
        let smsContent = `sms:${values.sms.number}`;
        if (values.sms.message) {
          smsContent += `?body=${encodeURIComponent(values.sms.message)}`;
        }
        return smsContent;
      
      case "vcard":
        const v = values.vcard;
        let vCardContent = "BEGIN:VCARD\nVERSION:3.0\n";
        
        if (v.firstName || v.lastName) {
          vCardContent += `N:${v.lastName};${v.firstName};;;\n`;
          vCardContent += `FN:${v.firstName} ${v.lastName}\n`;
        }
        
        if (v.organization) {
          vCardContent += `ORG:${v.organization}\n`;
        }
        
        if (v.title) {
          vCardContent += `TITLE:${v.title}\n`;
        }
        
        if (v.phone) {
          vCardContent += `TEL;TYPE=WORK,VOICE:${v.phone}\n`;
        }
        
        if (v.email) {
          vCardContent += `EMAIL;TYPE=PREF,INTERNET:${v.email}\n`;
        }
        
        if (v.website) {
          vCardContent += `URL:${v.website}\n`;
        }
        
        if (v.address) {
          vCardContent += `ADR;TYPE=WORK:;;${v.address};;;;\n`;
        }
        
        vCardContent += "END:VCARD";
        return vCardContent;
      
      default:
        return "";
    }
  };

  // Generate QR code
  const generateQRCode = () => {
    setIsGenerating(true);
    setError("");
    setQrCodeUrl("");

    // Validate input based on content type
    if (values.contentType === "text" && !values.text.trim()) {
      setError("Por favor, insira um texto para gerar o QR code.");
      setIsGenerating(false);
      return;
    }

    if (values.contentType === "url" && (!values.url.trim() || values.url === "https://")) {
      setError("Por favor, insira uma URL válida.");
      setIsGenerating(false);
      return;
    }

    if (values.contentType === "email" && !values.email.address.trim()) {
      setError("Por favor, insira um endereço de email.");
      setIsGenerating(false);
      return;
    }

    if (values.contentType === "phone" && !values.phone.trim()) {
      setError("Por favor, insira um número de telefone.");
      setIsGenerating(false);
      return;
    }

    if (values.contentType === "sms" && !values.sms.number.trim()) {
      setError("Por favor, insira um número para SMS.");
      setIsGenerating(false);
      return;
    }

    if (values.contentType === "vcard" && 
        !values.vcard.firstName.trim() && 
        !values.vcard.lastName.trim() && 
        !values.vcard.phone.trim() && 
        !values.vcard.email.trim()) {
      setError("Por favor, preencha pelo menos um dos campos do contato.");
      setIsGenerating(false);
      return;
    }

    // Generate QR code content
    const content = generateQRContent();

    // In a real implementation, we would use a QR code library like qrcode.react
    // For this demo, we'll use a public API to generate the QR code
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(content)}&size=${values.size}x${values.size}&color=${values.fgColor.replace('#', '')}&bgcolor=${values.bgColor.replace('#', '')}`;
    
    // Simulate API call
    setTimeout(() => {
      setQrCodeUrl(apiUrl);
      setIsGenerating(false);
    }, 1000);
  };

  // Download QR code
  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qrcode-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset the generator
  const resetGenerator = () => {
    setValues({
      contentType: "text",
      text: "",
      url: "https://",
      email: {
        address: "",
        subject: "",
        body: ""
      },
      phone: "",
      sms: {
        number: "",
        message: ""
      },
      vcard: {
        firstName: "",
        lastName: "",
        organization: "",
        title: "",
        phone: "",
        email: "",
        website: "",
        address: ""
      },
      size: 200,
      fgColor: "#000000",
      bgColor: "#FFFFFF",
      includeMargin: true,
      logoFile: null,
      logoUrl: ""
    });
    setQrCodeUrl("");
    setError("");
    setSelectedPreset(0);
    setShowCustomColors(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Render input fields based on content type
  const renderContentTypeFields = () => {
    switch (values.contentType) {
      case "text":
        return (
          <div>
            <label htmlFor="text" className="block text-sm font-medium mb-1">
              Texto
            </label>
            <textarea
              id="text"
              value={values.text}
              onChange={(e) => handleInputChange("text", e.target.value)}
              placeholder="Digite o texto que deseja codificar"
              className="w-full p-2 border rounded-md h-24"
            />
          </div>
        );
      
      case "url":
        return (
          <div>
            <label htmlFor="url" className="block text-sm font-medium mb-1">
              URL / Link
            </label>
            <input
              type="url"
              id="url"
              value={values.url}
              onChange={(e) => handleInputChange("url", e.target.value)}
              placeholder="https://exemplo.com"
              className="w-full p-2 border rounded-md"
            />
          </div>
        );
      
      case "email":
        return (
          <div className="space-y-3">
            <div>
              <label htmlFor="emailAddress" className="block text-sm font-medium mb-1">
                Endereço de Email
              </label>
              <input
                type="email"
                id="emailAddress"
                value={values.email.address}
                onChange={(e) => handleNestedInputChange("email", "address", e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label htmlFor="emailSubject" className="block text-sm font-medium mb-1">
                Assunto (opcional)
              </label>
              <input
                type="text"
                id="emailSubject"
                value={values.email.subject}
                onChange={(e) => handleNestedInputChange("email", "subject", e.target.value)}
                placeholder="Assunto do email"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label htmlFor="emailBody" className="block text-sm font-medium mb-1">
                Corpo (opcional)
              </label>
              <textarea
                id="emailBody"
                value={values.email.body}
                onChange={(e) => handleNestedInputChange("email", "body", e.target.value)}
                placeholder="Conteúdo do email"
                className="w-full p-2 border rounded-md h-20"
              />
            </div>
          </div>
        );
      
      case "phone":
        return (
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1">
              Número de Telefone
            </label>
            <input
              type="tel"
              id="phone"
              value={values.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="+55 11 98765-4321"
              className="w-full p-2 border rounded-md"
            />
          </div>
        );
      
      case "sms":
        return (
          <div className="space-y-3">
            <div>
              <label htmlFor="smsNumber" className="block text-sm font-medium mb-1">
                Número para SMS
              </label>
              <input
                type="tel"
                id="smsNumber"
                value={values.sms.number}
                onChange={(e) => handleNestedInputChange("sms", "number", e.target.value)}
                placeholder="+55 11 98765-4321"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label htmlFor="smsMessage" className="block text-sm font-medium mb-1">
                Mensagem (opcional)
              </label>
              <textarea
                id="smsMessage"
                value={values.sms.message}
                onChange={(e) => handleNestedInputChange("sms", "message", e.target.value)}
                placeholder="Texto da mensagem"
                className="w-full p-2 border rounded-md h-20"
              />
            </div>
          </div>
        );
      
      case "vcard":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="vcardFirstName" className="block text-sm font-medium mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  id="vcardFirstName"
                  value={values.vcard.firstName}
                  onChange={(e) => handleNestedInputChange("vcard", "firstName", e.target.value)}
                  placeholder="Nome"
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label htmlFor="vcardLastName" className="block text-sm font-medium mb-1">
                  Sobrenome
                </label>
                <input
                  type="text"
                  id="vcardLastName"
                  value={values.vcard.lastName}
                  onChange={(e) => handleNestedInputChange("vcard", "lastName", e.target.value)}
                  placeholder="Sobrenome"
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
            <div>
              <label htmlFor="vcardOrganization" className="block text-sm font-medium mb-1">
                Organização
              </label>
              <input
                type="text"
                id="vcardOrganization"
                value={values.vcard.organization}
                onChange={(e) => handleNestedInputChange("vcard", "organization", e.target.value)}
                placeholder="Empresa ou Organização"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label htmlFor="vcardTitle" className="block text-sm font-medium mb-1">
                Cargo
              </label>
              <input
                type="text"
                id="vcardTitle"
                value={values.vcard.title}
                onChange={(e) => handleNestedInputChange("vcard", "title", e.target.value)}
                placeholder="Cargo ou Função"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label htmlFor="vcardPhone" className="block text-sm font-medium mb-1">
                Telefone
              </label>
              <input
                type="tel"
                id="vcardPhone"
                value={values.vcard.phone}
                onChange={(e) => handleNestedInputChange("vcard", "phone", e.target.value)}
                placeholder="+55 11 98765-4321"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label htmlFor="vcardEmail" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                type="email"
                id="vcardEmail"
                value={values.vcard.email}
                onChange={(e) => handleNestedInputChange("vcard", "email", e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label htmlFor="vcardWebsite" className="block text-sm font-medium mb-1">
                Website
              </label>
              <input
                type="url"
                id="vcardWebsite"
                value={values.vcard.website}
                onChange={(e) => handleNestedInputChange("vcard", "website", e.target.value)}
                placeholder="https://exemplo.com"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label htmlFor="vcardAddress" className="block text-sm font-medium mb-1">
                Endereço
              </label>
              <textarea
                id="vcardAddress"
                value={values.vcard.address}
                onChange={(e) => handleNestedInputChange("vcard", "address", e.target.value)}
                placeholder="Endereço completo"
                className="w-full p-2 border rounded-md h-20"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Gerador de QR Code Personalizado</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Crie QR codes personalizados para links, contatos ou texto, com opções de cores e logotipos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Input Form */}
        <div className="space-y-6">
          <div>
            <label htmlFor="contentType" className="block text-sm font-medium mb-1">
              Tipo de Conteúdo
            </label>
            <select
              id="contentType"
              value={values.contentType}
              onChange={(e) => handleInputChange("contentType", e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {contentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic content type fields */}
          {renderContentTypeFields()}

          {/* QR Code Options */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-medium mb-3">Opções de Aparência</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="size" className="block text-sm font-medium mb-1">
                  Tamanho (px)
                </label>
                <input
                  type="range"
                  id="size"
                  min="100"
                  max="500"
                  step="10"
                  value={values.size}
                  onChange={(e) => handleInputChange("size", parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-500 text-center">{values.size}px</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Esquema de Cores
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {colorPresets.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => handlePresetSelect(index)}
                      className={`p-2 text-xs border rounded-md ${selectedPreset === index ? 'ring-2 ring-green-500' : ''}`}
                      style={{ backgroundColor: preset.bg, color: preset.fg }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowCustomColors(!showCustomColors)}
                  className="text-sm text-green-600 dark:text-green-400 underline"
                >
                  {showCustomColors ? "Ocultar cores personalizadas" : "Personalizar cores"}
                </button>
              </div>
              
              {showCustomColors && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="fgColor" className="block text-sm font-medium mb-1">
                      Cor do QR Code
                    </label>
                    <div className="flex">
                      <input
                        type="color"
                        id="fgColor"
                        value={values.fgColor}
                        onChange={(e) => handleInputChange("fgColor", e.target.value)}
                        className="h-10 w-10 border rounded-l-md"
                      />
                      <input
                        type="text"
                        value={values.fgColor}
                        onChange={(e) => handleInputChange("fgColor", e.target.value)}
                        className="flex-1 p-2 border-l-0 rounded-r-md font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="bgColor" className="block text-sm font-medium mb-1">
                      Cor de Fundo
                    </label>
                    <div className="flex">
                      <input
                        type="color"
                        id="bgColor"
                        value={values.bgColor}
                        onChange={(e) => handleInputChange("bgColor", e.target.value)}
                        className="h-10 w-10 border rounded-l-md"
                      />
                      <input
                        type="text"
                        value={values.bgColor}
                        onChange={(e) => handleInputChange("bgColor", e.target.value)}
                        className="flex-1 p-2 border-l-0 rounded-r-md font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={values.includeMargin}
                    onChange={(e) => handleInputChange("includeMargin", e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Incluir margem ao redor do QR code</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Adicionar Logo (opcional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Nota: Em uma implementação real, o logo seria sobreposto ao QR code. 
                  Para esta demonstração, esta funcionalidade é simulada.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
                  ref={fileInputRef}
                />
                {values.logoUrl && (
                  <div className="mt-2 flex items-center">
                    <img 
                      src={values.logoUrl} 
                      alt="Logo Preview" 
                      className="h-10 w-10 object-contain border rounded-md mr-2" 
                    />
                    <button
                      onClick={removeLogo}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={generateQRCode}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              disabled={isGenerating}
            >
              {isGenerating ? "Gerando..." : "Gerar QR Code"}
            </button>
            <button
              onClick={resetGenerator}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Right Column - QR Code Preview */}
        <div className="border rounded-md p-6 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-medium mb-4">Pré-visualização</h3>
          
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md mb-4 w-full">
              {error}
            </div>
          )}
          
          <div 
            className="flex items-center justify-center mb-4"
            style={{ 
              width: `${values.size}px`, 
              height: `${values.size}px`, 
              maxWidth: '100%',
              backgroundColor: values.bgColor,
              padding: values.includeMargin ? '16px' : '0',
              borderRadius: '8px'
            }}
            ref={qrCodeRef}
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            ) : qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="max-w-full max-h-full" 
              />
            ) : (
              <div className="text-center text-gray-400 dark:text-gray-600">
                <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p>Preencha os campos e clique em "Gerar QR Code"</p>
              </div>
            )}
          </div>
          
          {qrCodeUrl && (
            <button
              onClick={downloadQRCode}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Baixar QR Code
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-semibold mb-3">Informações:</h3>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>QR Codes</strong> (Quick Response Codes) são códigos de barras bidimensionais que podem armazenar diversos tipos de informações.
          </p>
          <p>
            <strong>Dicas para QR Codes eficazes:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Mantenha o conteúdo conciso para gerar códigos menos complexos</li>
            <li>Teste o QR code em diferentes dispositivos antes de usá-lo</li>
            <li>Adicione margem suficiente ao redor do código para facilitar a leitura</li>
            <li>Ao adicionar um logo, certifique-se de que ele não interfira na leitura do código</li>
            <li>Use cores com bom contraste para melhor legibilidade</li>
          </ul>
          
          <p className="mt-2">
            <strong>Nota:</strong> Esta é uma demonstração. Em uma implementação real, o QR code seria gerado localmente usando bibliotecas como qrcode.react, e o logo seria sobreposto ao QR code.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;