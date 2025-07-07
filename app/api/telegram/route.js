import {NextResponse} from 'next/server';

/**
 * Sends a message to a Telegram group via bot for temperament test results
 * @param {Object} data - Test data including name, date, and results
 * @returns {Promise<Object>} - Response from Telegram API
 */
async function sendTemperamentTestMessage(data) {
    const {name, age, date, results} = data;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const threadId = process.env.TELEGRAM_THREAD_ID;

    if (!botToken || !chatId) {
        throw new Error('Telegram bot token or chat ID not configured');
    }
    // Format date with timezone
    const formattedDate = new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });

    // Safely access nested properties with fallbacks
    const getPropSafely = (obj, path, fallback = 'N/A') => {
        try {
            return path.split('.').reduce((o, p) => o?.[p], obj) ?? fallback;
        } catch {
            return fallback;
        }
    };

    // Safely get array element with fallback
    const getArrayElementSafely = (arr, index, propName, fallback = 'N/A') => {
        try {
            return arr?.[index]?.[propName] ?? fallback;
        } catch {
            return fallback;
        }
    };

    // Create a summary message with date, time, name, age, and results
    const message = `
📊 *Resultado do Teste de Temperamento*

📅 *Data e Hora:* ${formattedDate}
👤 *Nome:* ${name}
🔢 *Idade:* ${age}

*Resultados:*
🔸 *1º: ${getPropSafely(results, 'primaryTemperament.name', 'Não definido')}* (${getPropSafely(results, 'primaryTemperament.percentage', 0)}%)
🔹 *2º: ${getPropSafely(results, 'secondaryTemperament.name', 'Não definido')}* (${getPropSafely(results, 'secondaryTemperament.percentage', 0)}%)

▫️ ${getArrayElementSafely(results?.allCharacteristics, 0, 'name', 'Não definido')} (${getArrayElementSafely(results?.allCharacteristics, 0, 'percentage', 0)}%)
▫️ ${getArrayElementSafely(results?.allCharacteristics, 1, 'name', 'Não definido')} (${getArrayElementSafely(results?.allCharacteristics, 1, 'percentage', 0)}%)
▫️ ${getArrayElementSafely(results?.allCharacteristics, 2, 'name', 'Não definido')} (${getArrayElementSafely(results?.allCharacteristics, 2, 'percentage', 0)}%)
▫️ ${getArrayElementSafely(results?.allCharacteristics, 3, 'name', 'Não definido')} (${getArrayElementSafely(results?.allCharacteristics, 3, 'percentage', 0)}%)
`;

    // Send message to Telegram
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: chatId,
            message_thread_id: threadId,
            text: message,
            parse_mode: 'Markdown',
        }),
    });

    // Clone the response before consuming it
    const responseClone = response.clone();

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Telegram API error: ${JSON.stringify(errorData)}`);
    }

    return await responseClone.json();
}

/**
 * API route handler for sending Telegram notifications
 * Currently supports temperament test notifications, but can be expanded for other types
 */
export async function POST(request) {
    try {
        const data = await request.json();
        const {type} = data;

        let result;

        // Handle different notification types
        switch (type) {
            case 'temperament-test':
                result = await sendTemperamentTestMessage(data);
                break;
            default:
                console.error(`Unsupported notification type: ${type}`);
        }

        return NextResponse.json({success: true, result}, {status: 200});
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
        return NextResponse.json(
            {error: error.message},
            {status: 500}
        );
    }
}
