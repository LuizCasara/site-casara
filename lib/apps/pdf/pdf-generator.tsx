import React, {RefObject} from 'react';
import {TEMPERAMENT_INFO, getCharacteristicDisplayName, getTemperamentDisplayName} from '@/apps/desenvolvimento-pessoal/temperament-info';
import {renderElementToPdf} from '@/lib/global/pdf-engine';

export {renderElementToPdf};

// Helper function to get color for temperament
const getTemperamentColor = (name: string) => {
    return (TEMPERAMENT_INFO as Record<string, { hexColor: string }>)[name]?.hexColor ?? "#999";
};

// Interface for PDF data
interface PdfData {
    name: string;
    age?: string;
    date: string;
    results: any;
}

// Component to render PDF content (hidden in UI)
export const PdfContent = React.forwardRef<HTMLDivElement, { data: PdfData }>((props, ref) => {
    const {name, age, date, results} = props.data;

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
                    {age && <p style={{color: 'black'}}><strong>Idade:</strong> {age}</p>}
                    <p style={{color: 'black'}}><strong>Data:</strong> {formattedDate}</p>
                </div>

                <div style={{marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px'}}>
                    <h2 style={{color: 'black', marginBottom: '20xp'}}>Temperamentos</h2>
                    {results.allTemperaments.map((temp: any, index: number) => {
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

                <div style={{marginTop: '20px', marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px'}}>
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
            <div style={{padding: '20px', color: 'black', marginTop: '200px'}}>
                <div style={{marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px'}}>
                    <h2 style={{color: 'black'}}>Detalhes do Temperamento {getTemperamentDisplayName(results.primaryTemperament.name)}</h2>

                    {(() => {
                        const info = TEMPERAMENT_INFO[results.primaryTemperament.name as keyof typeof TEMPERAMENT_INFO];
                        if (!info) return null;
                        return (
                            <>
                                <div style={{marginBottom: '20px'}}>
                                    <h3 style={{color: info.hexColor, marginBottom: '10px'}}>Pontos Fortes</h3>
                                    <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                        {info.strengths.map(item => <li key={item}>{item}</li>)}
                                    </ul>
                                </div>
                                <div style={{marginBottom: '20px'}}>
                                    <h3 style={{color: info.hexColor, marginBottom: '10px'}}>Pontos de Atenção</h3>
                                    <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                        {info.attentionPoints.map(item => <li key={item}>{item}</li>)}
                                    </ul>
                                </div>
                                <div style={{marginBottom: '20px'}}>
                                    <h3 style={{color: info.hexColor, marginBottom: '10px'}}>Dicas para Relacionamentos</h3>
                                    <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                        {info.relationshipTips.map(item => <li key={item}>{item}</li>)}
                                    </ul>
                                </div>
                            </>
                        );
                    })()}
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
    return renderElementToPdf(pdfContentRef, `temperamento-${userName.replace(/\s+/g, '-').toLowerCase()}`, setIsPdfLoading);
};
