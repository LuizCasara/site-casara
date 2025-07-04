import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import React, {RefObject} from 'react';

// Helper function to get display name for temperaments
const getTemperamentDisplayName = (name: string) => {
    return name === "Sanguineo" ? "Sanguíneo" :
        name === "Colerico" ? "Colérico" :
            name === "Melancolico" ? "Melancólico" :
                name === "Fleumatico" ? "Fleumático" : name;
};

// Helper function to get display name for characteristics
const getCharacteristicDisplayName = (name: string) => {
    return name === "Umido" ? "Úmido" : name;
};

// Helper function to get color for temperament
const getTemperamentColor = (name: string) => {
    return name === "Sanguineo" ? "#e53935" :
        name === "Colerico" ? "#ffb300" :
            name === "Melancolico" ? "#1e88e5" :
                name === "Fleumatico" ? "#43a047" : "#999";
};

// Helper function to get background color class for temperament
const getTemperamentBgClass = (name: string) => {
    return name === "Sanguineo" ? "sanguineo" :
        name === "Colerico" ? "colerico" :
            name === "Melancolico" ? "melancolico" :
                name === "Fleumatico" ? "fleumatico" : "";
};

// Interface for PDF data
interface PdfData {
    name: string;
    date: string;
    results: any;
}

// Component to render PDF content (hidden in UI)
export const PdfContent = React.forwardRef<HTMLDivElement, { data: PdfData }>((props, ref) => {
    const {name, date, results} = props.data;

    // Format date with timezone
    const formattedDate = new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });

    return (
        <div id="pdf-content" ref={ref} style={{width: '800px', padding: '20px', fontFamily: 'Arial, sans-serif', display: 'none'}}>
            {/* Page 1 */}
            <div style={{backgroundColor: '#4CAF50', color: 'black', padding: '20px', textAlign: 'center'}}>
                <h1 style={{color: 'black'}}>Resultado do Teste de Temperamento</h1>
            </div>

            <div style={{padding: '20px', color: 'black'}}>
                <div style={{marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px'}}>
                    <h2 style={{color: 'black'}}>Informações</h2>
                    <p style={{color: 'black'}}><strong>Nome:</strong> {name}</p>
                    <p style={{color: 'black'}}><strong>Data:</strong> {formattedDate}</p>
                </div>

                <div style={{marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px'}}>
                    <h2 style={{color: 'black', marginBottom: '20xp'}}>Temperamentos</h2>
                    {results.allTemperaments.map((temp: any, index: number) => {
                        const tempClass = getTemperamentBgClass(temp.name);
                        const displayName = getTemperamentDisplayName(temp.name);
                        const barColor = getTemperamentColor(temp.name);

                        return (
                            <div key={temp.name} style={{
                                marginBottom: '10px',
                                padding: '10px',
                                borderRadius: '5px',
                                borderLeft: `5px solid ${barColor}`,
                                backgroundColor: index === 0 ? '#ffebee' :
                                    index === 1 ? '#fff8e1' :
                                        index === 2 ? '#e3f2fd' : '#e8f5e9'
                            }}>
                                <div style={{display: 'flex', justifyContent: 'space-between', color: 'black'}}>
                                    <strong>{index === 0 ? "Primário: " : index === 1 ? "Secundário: " : ""}{displayName}</strong>
                                    <span>{temp.percentage}%</span>
                                </div>
                                <div style={{width: '100%', backgroundColor: '#ddd', borderRadius: '10px', marginTop: '5px'}}>
                                    <div style={{
                                        height: '10px',
                                        width: `${temp.percentage}%`,
                                        backgroundColor: barColor,
                                        borderRadius: '10px'
                                    }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px'}}>
                    <h2 style={{color: 'black', marginBottom: '20xp'}}>Características</h2>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                        <tr>
                            <th style={{
                                padding: '8px',
                                textAlign: 'left',
                                borderBottom: '1px solid #ddd',
                                backgroundColor: '#f2f2f2',
                                color: 'black'
                            }}>Característica
                            </th>
                            <th style={{
                                padding: '8px',
                                textAlign: 'left',
                                borderBottom: '1px solid #ddd',
                                backgroundColor: '#f2f2f2',
                                color: 'black'
                            }}>Percentual
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {results.allCharacteristics.map((char: any) => (
                            <tr key={char.name}>
                                <td style={{
                                    padding: '8px',
                                    textAlign: 'left',
                                    borderBottom: '1px solid #ddd',
                                    color: 'black'
                                }}>{getCharacteristicDisplayName(char.name)}</td>
                                <td style={{padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd', color: 'black'}}>{char.percentage}%</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div style={{marginTop: '10px', marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px'}}>
                    <h2 style={{color: 'black'}}>Interpretação</h2>
                    <p style={{color: 'black'}}>
                        O temperamento predominante é <strong>{getTemperamentDisplayName(results.primaryTemperament.name)}</strong>,
                        com influência secundária de <strong>{getTemperamentDisplayName(results.secondaryTemperament.name)}</strong>.
                    </p>
                    <p style={{color: 'black'}}>
                        A pessoa tende a ser mais
                        <strong> {getCharacteristicDisplayName(results.primaryCharacteristic.name)}</strong> e
                        <strong> {getCharacteristicDisplayName(results.secondaryCharacteristic.name)}</strong> em suas reações e comportamentos.
                    </p>
                </div>
            </div>

            {/* Page break indicator */}
            <div style={{pageBreakAfter: 'always', height: 0}}></div>

            {/* Page 2 */}
            <div style={{padding: '20px', color: 'black', marginTop: '100px'}}>
                <div style={{marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px'}}>
                    <h2 style={{color: 'black'}}>Detalhes do Temperamento {getTemperamentDisplayName(results.primaryTemperament.name)}</h2>

                    {results.primaryTemperament.name === "Sanguineo" && (
                        <>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: '#e53935', marginBottom: '10px'}}>Pontos Fortes</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    <li>Comunicativo e sociável</li>
                                    <li>Entusiasta e otimista</li>
                                    <li>Criativo e adaptável</li>
                                    <li>Bom em iniciar projetos</li>
                                    <li>Carismático e persuasivo</li>
                                </ul>
                            </div>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: '#e53935', marginBottom: '10px'}}>Pontos de Atenção</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    <li>Pode ser desorganizado</li>
                                    <li>Tendência a ser impulsivo</li>
                                    <li>Dificuldade em manter o foco</li>
                                    <li>Pode deixar projetos inacabados</li>
                                    <li>Às vezes superficial nas relações</li>
                                </ul>
                            </div>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: '#e53935', marginBottom: '10px'}}>Dicas para Relacionamentos</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    <li>Pratique a escuta ativa</li>
                                    <li>Desenvolva compromisso e consistência</li>
                                    <li>Estabeleça limites claros</li>
                                    <li>Cultive relacionamentos mais profundos</li>
                                </ul>
                            </div>
                        </>
                    )}

                    {results.primaryTemperament.name === "Colerico" && (
                        <>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: '#ffb300', marginBottom: '10px'}}>Pontos Fortes</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    <li>Decidido e determinado</li>
                                    <li>Líder natural e visionário</li>
                                    <li>Orientado para objetivos</li>
                                    <li>Prático e eficiente</li>
                                    <li>Confiante e independente</li>
                                </ul>
                            </div>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: '#ffb300', marginBottom: '10px'}}>Pontos de Atenção</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    <li>Pode ser impaciente</li>
                                    <li>Tendência a ser dominador</li>
                                    <li>Às vezes insensível aos sentimentos alheios</li>
                                    <li>Pode ser intolerante com erros</li>
                                    <li>Dificuldade em delegar</li>
                                </ul>
                            </div>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: '#ffb300', marginBottom: '10px'}}>Dicas para Relacionamentos</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    <li>Desenvolva paciência e empatia</li>
                                    <li>Aprenda a ouvir sem interromper</li>
                                    <li>Pratique a gentileza nas críticas</li>
                                    <li>Reconheça os sentimentos dos outros</li>
                                </ul>
                            </div>
                        </>
                    )}

                    {results.primaryTemperament.name === "Melancolico" && (
                        <>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: '#1e88e5', marginBottom: '10px'}}>Pontos Fortes</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    <li>Analítico e detalhista</li>
                                    <li>Perfeccionista e organizado</li>
                                    <li>Profundo e reflexivo</li>
                                    <li>Sensível e empático</li>
                                    <li>Criativo e artístico</li>
                                </ul>
                            </div>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: '#1e88e5', marginBottom: '10px'}}>Pontos de Atenção</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    <li>Tendência ao pessimismo</li>
                                    <li>Pode ser muito crítico</li>
                                    <li>Dificuldade em tomar decisões</li>
                                    <li>Propenso a mudanças de humor</li>
                                    <li>Pode se isolar socialmente</li>
                                </ul>
                            </div>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: '#1e88e5', marginBottom: '10px'}}>Dicas para Relacionamentos</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    <li>Cultive o otimismo</li>
                                    <li>Estabeleça limites para autocrítica</li>
                                    <li>Pratique a assertividade</li>
                                    <li>Busque equilíbrio entre isolamento e socialização</li>
                                </ul>
                            </div>
                        </>
                    )}

                    {results.primaryTemperament.name === "Fleumatico" && (
                        <>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: '#43a047', marginBottom: '10px'}}>Pontos Fortes</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    <li>Calmo e equilibrado</li>
                                    <li>Paciente e diplomático</li>
                                    <li>Confiável e consistente</li>
                                    <li>Bom mediador de conflitos</li>
                                    <li>Observador e analítico</li>
                                </ul>
                            </div>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: '#43a047', marginBottom: '10px'}}>Pontos de Atenção</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    <li>Pode ser indeciso</li>
                                    <li>Tendência à procrastinação</li>
                                    <li>Às vezes falta iniciativa</li>
                                    <li>Pode evitar conflitos necessários</li>
                                    <li>Resistência a mudanças</li>
                                </ul>
                            </div>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: '#43a047', marginBottom: '10px'}}>Dicas para Relacionamentos</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    <li>Desenvolva assertividade</li>
                                    <li>Estabeleça metas e prazos</li>
                                    <li>Pratique expressar suas emoções</li>
                                    <li>Aprenda a lidar com conflitos de forma saudável</li>
                                </ul>
                            </div>
                        </>
                    )}
                </div>

                <div style={{textAlign: 'center', padding: '10px', fontSize: '12px', color: '#666'}}>
                    <p>Teste de temperamento realizado no site luizcasara.com.</p>
                </div>
            </div>
        </div>
    );
});

PdfContent.displayName = 'PdfContent';

// Function to generate and download PDF
export const generatePdf = async (
    pdfContentRef: RefObject<HTMLDivElement>,
    userName: string,
    setIsPdfLoading: (loading: boolean) => void
) => {
    try {
        setIsPdfLoading(true);

        // Get the PDF content element
        const pdfContentElement = pdfContentRef.current;
        if (!pdfContentElement) {
            throw new Error('PDF content element not found');
        }

        // Make the PDF content visible for html2canvas to capture it
        pdfContentElement.style.display = 'block';
        pdfContentElement.style.position = 'absolute';
        pdfContentElement.style.left = '-9999px';

        // Use html2canvas to capture the content as an image
        const canvas = await html2canvas(pdfContentElement, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            logging: false,
            allowTaint: true
        });

        // Hide the PDF content again
        pdfContentElement.style.display = 'none';

        // Create PDF with jsPDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/png');

        // Calculate dimensions to fit the image on the page
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm

        // Calculate the total height of the image in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Add the image to the PDF, potentially across multiple pages
        let heightLeft = imgHeight;
        let position = 0;
        let page = 1;

        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add additional pages if needed
        while (heightLeft > 0) {
            position = -pageHeight * page;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            page++;
        }

        // Save the PDF
        pdf.save(`temperamento-${userName.replace(/\s+/g, '-').toLowerCase()}.pdf`);

        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);

        // Show an alert to the user with a helpful message
        alert('Não foi possível gerar o PDF. Por favor, tente novamente mais tarde.');

        return false;
    } finally {
        setIsPdfLoading(false);
    }
};