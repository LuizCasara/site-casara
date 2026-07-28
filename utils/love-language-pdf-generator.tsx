import React, {RefObject} from 'react';
import {LOVE_LANGUAGE_INFO, getLoveLanguageDisplayName} from '@/apps/desenvolvimento-pessoal/love-language-info';
import {renderElementToPdf} from '@/utils/pdf-generator';

const getLoveLanguageColor = (name: string) => {
    return (LOVE_LANGUAGE_INFO as Record<string, { hexColor: string }>)[name]?.hexColor ?? "#999";
};

interface PdfData {
    name: string;
    age?: string;
    date: string;
    results: any;
}

export const LoveLanguagePdfContent = React.forwardRef<HTMLDivElement, { data: PdfData }>((props, ref) => {
    const {name, age, date, results} = props.data;

    const formattedDate = new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });

    return (
        <div id="love-language-pdf-content" ref={ref} style={{width: '800px', padding: '20px', fontFamily: 'Arial, sans-serif', display: 'none'}}>
            {/* Page 1 */}
            <div style={{backgroundColor: '#ec4899', color: 'black', padding: '20px', textAlign: 'center'}}>
                <h1 style={{color: 'black'}}>Resultado do Teste de Linguagens do Amor</h1>
            </div>

            <div style={{padding: '20px', color: 'black'}}>
                <div style={{marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px'}}>
                    <h2 style={{color: 'black'}}>Informações</h2>
                    <p style={{color: 'black'}}><strong>Nome:</strong> {name}</p>
                    {age && <p style={{color: 'black'}}><strong>Idade:</strong> {age}</p>}
                    <p style={{color: 'black'}}><strong>Data:</strong> {formattedDate}</p>
                </div>

                <div style={{marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px'}}>
                    <h2 style={{color: 'black', marginBottom: '20px'}}>Linguagens do Amor</h2>
                    {results.allLanguages.map((lang: any, index: number) => {
                        const displayName = getLoveLanguageDisplayName(lang.name);
                        const barColor = getLoveLanguageColor(lang.name);

                        return (
                            <div key={lang.name} style={{
                                marginBottom: '10px',
                                padding: '10px',
                                borderRadius: '5px',
                                borderLeft: `5px solid ${barColor}`,
                                backgroundColor: index === 0 ? '#fce7f3' :
                                    index === 1 ? '#e0f2fe' :
                                        index === 2 ? '#fff7ed' :
                                            index === 3 ? '#f0fdfa' : '#eef2ff'
                            }}>
                                <div style={{display: 'flex', justifyContent: 'space-between', color: 'black'}}>
                                    <strong>{index === 0 ? "Principal: " : index === 1 ? "Secundária: " : ""}{displayName}</strong>
                                    <span>{lang.percentage}%</span>
                                </div>
                                <div style={{width: '100%', backgroundColor: '#ddd', borderRadius: '10px', marginTop: '5px'}}>
                                    <div style={{
                                        height: '10px',
                                        width: `${lang.percentage}%`,
                                        backgroundColor: barColor,
                                        borderRadius: '10px'
                                    }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{marginTop: '20px', marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px'}}>
                    <h2 style={{color: 'black'}}>Interpretação</h2>
                    <p style={{color: 'black'}}>
                        {results.combined ? (
                            <>Suas duas linguagens do amor mais fortes são <strong>{getLoveLanguageDisplayName(results.primary.name)}</strong> e <strong>{getLoveLanguageDisplayName(results.secondary.name)}</strong>, bem próximas em intensidade — é comum e esperado ter um resultado combinado.</>
                        ) : (
                            <>Sua linguagem do amor principal é <strong>{getLoveLanguageDisplayName(results.primary.name)}</strong>, com influência secundária de <strong>{getLoveLanguageDisplayName(results.secondary.name)}</strong>.</>
                        )}
                    </p>
                </div>
            </div>

            {/* Page break indicator */}
            <div style={{pageBreakAfter: 'always', height: 0}}></div>

            {/* Page 2 */}
            <div style={{padding: '20px', color: 'black', marginTop: '200px'}}>
                {[results.primary, ...(results.combined ? [results.secondary] : [])].map((lang: any) => {
                    const info = LOVE_LANGUAGE_INFO[lang.name as keyof typeof LOVE_LANGUAGE_INFO];
                    if (!info) return null;
                    return (
                        <div key={lang.name} style={{marginBottom: '20px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px'}}>
                            <h2 style={{color: 'black'}}>Sobre {getLoveLanguageDisplayName(lang.name)}</h2>
                            <p style={{color: 'black', marginBottom: '15px'}}>{info.description}</p>

                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: info.hexColor, marginBottom: '10px'}}>Como você se sente amado(a)</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    {info.howYouFeelLoved.map(item => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: info.hexColor, marginBottom: '10px'}}>Mal-entendidos comuns</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    {info.commonMisunderstandings.map(item => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                            <div style={{marginBottom: '20px'}}>
                                <h3 style={{color: info.hexColor, marginBottom: '10px'}}>Dicas para Relacionamentos</h3>
                                <ul style={{listStyleType: 'disc', paddingLeft: '20px', marginBottom: '15px', color: 'black'}}>
                                    {info.relationshipTips.map(item => <li key={item}>{item}</li>)}
                                </ul>
                            </div>
                        </div>
                    );
                })}

                <div style={{textAlign: 'center', padding: '10px', fontSize: '12px', color: '#666'}}>
                    <p>Teste inspirado na teoria das 5 linguagens do amor (Gary Chapman), realizado no site luizcasara.com. Não é um instrumento clínico validado — use como ponto de partida de autoconhecimento, não como diagnóstico.</p>
                </div>
            </div>
        </div>
    );
});

LoveLanguagePdfContent.displayName = 'LoveLanguagePdfContent';

export const generateLoveLanguagePdf = async (
    pdfContentRef: RefObject<HTMLDivElement>,
    userName: string,
    setIsPdfLoading: (loading: boolean) => void
) => {
    return renderElementToPdf(pdfContentRef, `linguagem-do-amor-${userName.replace(/\s+/g, '-').toLowerCase()}`, setIsPdfLoading);
};
