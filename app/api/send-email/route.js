import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { name, date, browserInfo, results } = await request.json();

    // Create a transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Format date with timezone
    const formattedDate = new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });

    // Create HTML content for the email
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
            margin-bottom: 20px;
            padding: 15px;
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
            <p><strong>Navegador:</strong> ${browserInfo}</p>
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
        </div>
        <div class="footer">
          <p>Email automatico para registro de teste de temperamento, feito no site luizcasara.com.</p>
        </div>
      </body>
      </html>
    `;

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'fencher.aa@gmail.com',
      subject: `Resultado do Teste de Temperamento - ${name}`,
      html: htmlContent,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
