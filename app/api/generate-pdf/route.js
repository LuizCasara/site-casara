import {NextResponse} from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request) {
    try {
        const {name, date, results} = await request.json();

        // Format date with timezone
        const formattedDate = new Date(date).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo'
        });

        // Create HTML content for the PDF (same as email template but without browser info)
        const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
          }
          .content {
            padding: 20px;
          }
          .section {
            margin-bottom: 5px;
            padding: 10px;
            background-color: #f9f9f9;
            border-radius: 5px;
          }
          .temperament {
            margin-bottom: 10px;
            padding: 10px;
            border-radius: 5px;
          }
          .sanguineo {
            background-color: #ffebee;
            border-left: 5px solid #e53935;
          }
          .colerico {
            background-color: #fff8e1;
            border-left: 5px solid #ffb300;
          }
          .melancolico {
            background-color: #e3f2fd;
            border-left: 5px solid #1e88e5;
          }
          .fleumatico {
            background-color: #e8f5e9;
            border-left: 5px solid #43a047;
          }
          .progress-container {
            width: 100%;
            background-color: #ddd;
            border-radius: 10px;
            margin-top: 5px;
          }
          .progress-bar {
            height: 10px;
            border-radius: 10px;
          }
          .footer {
            text-align: center;
            padding: 10px;
            font-size: 12px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f2f2f2;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Resultado do Teste de Temperamento</h1>
        </div>
        <div class="content">
          <div class="section">
            <h2>Informações</h2>
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>Data:</strong> ${formattedDate}</p>
          </div>

          <div class="section">
            <h2>Temperamentos</h2>
            ${results.allTemperaments.map((temp, index) => {
            const tempClass = temp.name.toLowerCase();
            const displayName =
                temp.name === "Sanguineo" ? "Sanguíneo" :
                    temp.name === "Colerico" ? "Colérico" :
                        temp.name === "Melancolico" ? "Melancólico" :
                            temp.name === "Fleumatico" ? "Fleumático" : temp.name;

            const barColor =
                temp.name === "Sanguineo" ? "#e53935" :
                    temp.name === "Colerico" ? "#ffb300" :
                        temp.name === "Melancolico" ? "#1e88e5" :
                            temp.name === "Fleumatico" ? "#43a047" : "#999";

            return `
                <div class="temperament ${tempClass}">
                  <div style="display: flex; justify-content: space-between;">
                    <strong>${index === 0 ? "Primário: " : index === 1 ? "Secundário: " : ""}${displayName}</strong>
                    <span>${temp.percentage}%</span>
                  </div>
                  <div class="progress-container">
                    <div class="progress-bar" style="width: ${temp.percentage}%; background-color: ${barColor};"></div>
                  </div>
                </div>
              `;
        }).join('')}
          </div>

          <div class="section">
            <h2>Características</h2>
            <table>
              <tr>
                <th>Característica</th>
                <th>Percentual</th>
              </tr>
              ${results.allCharacteristics.map(char => {
            const displayName =
                char.name === "Quente" ? "Quente" :
                    char.name === "Frio" ? "Frio" :
                        char.name === "Seco" ? "Seco" :
                            char.name === "Umido" ? "Úmido" : char.name;

            return `
                  <tr>
                    <td>${displayName}</td>
                    <td>${char.percentage}%</td>
                  </tr>
                `;
        }).join('')}
            </table>
          </div>

          <div class="section">
            <h2>Interpretação</h2>
            <p>
              O temperamento predominante é <strong>${
            results.primaryTemperament.name === "Sanguineo" ? "Sanguíneo" :
                results.primaryTemperament.name === "Colerico" ? "Colérico" :
                    results.primaryTemperament.name === "Melancolico" ? "Melancólico" :
                        results.primaryTemperament.name === "Fleumatico" ? "Fleumático" :
                            results.primaryTemperament.name
        }</strong>, 
              com influência secundária de <strong>${
            results.secondaryTemperament.name === "Sanguineo" ? "Sanguíneo" :
                results.secondaryTemperament.name === "Colerico" ? "Colérico" :
                    results.secondaryTemperament.name === "Melancolico" ? "Melancólico" :
                        results.secondaryTemperament.name === "Fleumatico" ? "Fleumático" :
                            results.secondaryTemperament.name
        }</strong>.
            </p>
            <p>
              A pessoa tende a ser mais 
              <strong> ${
            results.primaryCharacteristic.name === "Quente" ? "Quente" :
                results.primaryCharacteristic.name === "Frio" ? "Frio" :
                    results.primaryCharacteristic.name === "Seco" ? "Seco" :
                        results.primaryCharacteristic.name === "Umido" ? "Úmido" :
                            results.primaryCharacteristic.name
        }</strong> e 
              <strong> ${
            results.secondaryCharacteristic.name === "Quente" ? "Quente" :
                results.secondaryCharacteristic.name === "Frio" ? "Frio" :
                    results.secondaryCharacteristic.name === "Seco" ? "Seco" :
                        results.secondaryCharacteristic.name === "Umido" ? "Úmido" :
                            results.secondaryCharacteristic.name
        }</strong> em suas reações e comportamentos.
            </p>
          </div>

          <div class="section">
            <h2>Detalhes do Temperamento ${
            results.primaryTemperament.name === "Sanguineo" ? "Sanguíneo" :
                results.primaryTemperament.name === "Colerico" ? "Colérico" :
                    results.primaryTemperament.name === "Melancolico" ? "Melancólico" :
                        results.primaryTemperament.name === "Fleumatico" ? "Fleumático" :
                            results.primaryTemperament.name
        }</h2>

            ${results.primaryTemperament.name === "Sanguineo" ? `
              <div style="margin-bottom: 20px;">
                <h3 style="color: #e53935; margin-bottom: 10px;">Pontos Fortes</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 15px;">
                  <li>Comunicativo e sociável</li>
                  <li>Entusiasta e otimista</li>
                  <li>Criativo e adaptável</li>
                  <li>Bom em iniciar projetos</li>
                  <li>Carismático e persuasivo</li>
                </ul>
              </div>
              <div style="margin-bottom: 20px;">
                <h3 style="color: #e53935; margin-bottom: 10px;">Pontos de Atenção</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 15px;">
                  <li>Pode ser desorganizado</li>
                  <li>Tendência a ser impulsivo</li>
                  <li>Dificuldade em manter o foco</li>
                  <li>Pode deixar projetos inacabados</li>
                  <li>Às vezes superficial nas relações</li>
                </ul>
              </div>
              <div style="margin-bottom: 20px;">
                <h3 style="color: #e53935; margin-bottom: 10px;">Dicas para Relacionamentos</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 15px;">
                  <li>Pratique a escuta ativa</li>
                  <li>Desenvolva compromisso e consistência</li>
                  <li>Estabeleça limites claros</li>
                  <li>Cultive relacionamentos mais profundos</li>
                </ul>
              </div>
            ` : results.primaryTemperament.name === "Colerico" ? `
              <div style="margin-bottom: 20px;">
                <h3 style="color: #ffb300; margin-bottom: 10px;">Pontos Fortes</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 15px;">
                  <li>Decidido e determinado</li>
                  <li>Líder natural e visionário</li>
                  <li>Orientado para objetivos</li>
                  <li>Prático e eficiente</li>
                  <li>Confiante e independente</li>
                </ul>
              </div>
              <div style="margin-bottom: 20px;">
                <h3 style="color: #ffb300; margin-bottom: 10px;">Pontos de Atenção</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 15px;">
                  <li>Pode ser impaciente</li>
                  <li>Tendência a ser dominador</li>
                  <li>Às vezes insensível aos sentimentos alheios</li>
                  <li>Pode ser intolerante com erros</li>
                  <li>Dificuldade em delegar</li>
                </ul>
              </div>
              <div style="margin-bottom: 20px;">
                <h3 style="color: #ffb300; margin-bottom: 10px;">Dicas para Relacionamentos</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 15px;">
                  <li>Desenvolva paciência e empatia</li>
                  <li>Aprenda a ouvir sem interromper</li>
                  <li>Pratique a gentileza nas críticas</li>
                  <li>Reconheça os sentimentos dos outros</li>
                </ul>
              </div>
            ` : results.primaryTemperament.name === "Melancolico" ? `
              <div style="margin-bottom: 20px;">
                <h3 style="color: #1e88e5; margin-bottom: 10px;">Pontos Fortes</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 15px;">
                  <li>Analítico e detalhista</li>
                  <li>Perfeccionista e organizado</li>
                  <li>Profundo e reflexivo</li>
                  <li>Sensível e empático</li>
                  <li>Criativo e artístico</li>
                </ul>
              </div>
              <div style="margin-bottom: 20px;">
                <h3 style="color: #1e88e5; margin-bottom: 10px;">Pontos de Atenção</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 15px;">
                  <li>Tendência ao pessimismo</li>
                  <li>Pode ser muito crítico</li>
                  <li>Dificuldade em tomar decisões</li>
                  <li>Propenso a mudanças de humor</li>
                  <li>Pode se isolar socialmente</li>
                </ul>
              </div>
              <div style="margin-bottom: 20px;">
                <h3 style="color: #1e88e5; margin-bottom: 10px;">Dicas para Relacionamentos</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 15px;">
                  <li>Cultive o otimismo</li>
                  <li>Estabeleça limites para autocrítica</li>
                  <li>Pratique a assertividade</li>
                  <li>Busque equilíbrio entre isolamento e socialização</li>
                </ul>
              </div>
            ` : results.primaryTemperament.name === "Fleumatico" ? `
              <div style="margin-bottom: 20px;">
                <h3 style="color: #43a047; margin-bottom: 10px;">Pontos Fortes</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 15px;">
                  <li>Calmo e equilibrado</li>
                  <li>Paciente e diplomático</li>
                  <li>Confiável e consistente</li>
                  <li>Bom mediador de conflitos</li>
                  <li>Observador e analítico</li>
                </ul>
              </div>
              <div style="margin-bottom: 20px;">
                <h3 style="color: #43a047; margin-bottom: 10px;">Pontos de Atenção</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 15px;">
                  <li>Pode ser indeciso</li>
                  <li>Tendência à procrastinação</li>
                  <li>Às vezes falta iniciativa</li>
                  <li>Pode evitar conflitos necessários</li>
                  <li>Resistência a mudanças</li>
                </ul>
              </div>
              <div style="margin-bottom: 20px;">
                <h3 style="color: #43a047; margin-bottom: 10px;">Dicas para Relacionamentos</h3>
                <ul style="list-style-type: disc; padding-left: 20px; margin-bottom: 15px;">
                  <li>Desenvolva assertividade</li>
                  <li>Estabeleça metas e prazos</li>
                  <li>Pratique expressar suas emoções</li>
                  <li>Aprenda a lidar com conflitos de forma saudável</li>
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="footer">
          <p>Teste de temperamento realizado no site luizcasara.com.</p>
        </div>
      </body>
      </html>
    `;

        // Generate PDF using puppeteer with more robust settings
        const browser = await puppeteer.launch({
            headless: true, // Use traditional headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();

        // Set viewport for consistent rendering
        await page.setViewport({
            width: 1200,
            height: 1600,
            deviceScaleFactor: 1,
        });

        await page.setContent(htmlContent, {waitUntil: 'networkidle0'});

        // More specific PDF options for better compatibility
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            },
            preferCSSPageSize: true
        });

        await browser.close();

        // Return the PDF as a response
        return new NextResponse(pdf, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="temperamento-${name.replace(/\s+/g, '-').toLowerCase()}.pdf"`
            }
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        return new NextResponse(JSON.stringify({error: error.message}), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}
