import { NextResponse } from 'next/server';
import { getLoveLanguageDisplayName } from '@/apps/desenvolvimento-pessoal/love-language-info';
import { compareMessages } from '@/lib/ingress-compare-message.mjs';
import { radarPng } from './ingress-radar.jsx';
import { rateLimitOrNull } from '@/lib/rate-limit';
import { escapeTelegramMarkdown as esc } from '@/lib/telegram-markdown.mjs';
import { countryFlagEmoji } from '@/lib/ingress-format.mjs';

/**
 * Envia a comparação de fichas do radar do /ingress para o tópico do Ingress:
 * a foto do radar (A verde vs B roxo) + a tabela de valores. Chamado do
 * `ProfileRadar` a cada comparação nova (o cliente já deduplica por 10 min).
 * @param {{a:{codename,stats}, b:{codename,stats}, vsOwner?:boolean}} data
 */
async function sendIngressCompare(data) {
    const { a, b, vsOwner } = data;
    if (!a?.codename || !b?.codename || !a?.stats || !b?.stats) {
        throw new Error('ingress-compare: faltam a/b com codename e stats');
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_INGRESS_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
    const threadId = process.env.TELEGRAM_INGRESS_THREAD_ID;
    if (!botToken || !chatId) {
        throw new Error('Telegram bot token or chat ID not configured');
    }

    const { caption, table } = compareMessages({ a, b, vsOwner });
    const base = `https://api.telegram.org/bot${botToken}`;
    const common = { chat_id: chatId, parse_mode: 'Markdown' };
    if (threadId) common.message_thread_id = threadId;

    const sendJson = async (method, body) => {
        const r = await fetch(`${base}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...common, ...body }),
        });
        if (!r.ok) throw new Error(`Telegram ${method}: ${JSON.stringify(await r.json())}`);
        return r.json();
    };

    let png = null;
    try {
        png = await radarPng({ a, b });
    } catch (e) {
        console.error('ingress-compare: radar PNG falhou, mando só texto', e);
    }

    if (png) {
        const form = new FormData();
        for (const [k, v] of Object.entries(common)) form.append(k, String(v));
        form.append('caption', caption);
        form.append('photo', new Blob([png], { type: 'image/png' }), 'radar.png');
        const r = await fetch(`${base}/sendPhoto`, { method: 'POST', body: form });
        if (!r.ok) throw new Error(`Telegram sendPhoto: ${JSON.stringify(await r.json())}`);
    } else {
        await sendJson('sendMessage', { text: caption });
    }

    return sendJson('sendMessage', { text: table });
}

/**
 * Alerta direto (sem imagem, sem detalhe extra) toda vez que uma submissão em
 * `/ingress/ranking` grava de verdade (nunca quando o debounce bloqueia).
 * Em vez do antigo "top 3 fixo" (irrelevante pra quem entra longe do topo),
 * mostra uma janela de até 2 colocados antes + a posição nova + até 2 depois
 * — mesma janela calculada por `getRankWindow` em `api/ingress-rankings`,
 * então a ordem que chega aqui já é a final. `rankingUrl` carrega
 * `?destaque=<codenameKey>`, que `IngressRankingTable` lê pra rolar/realçar
 * a linha de quem entrou quando alguém clica no link vindo do Telegram.
 * `isNewAgent` distingue um codinome nunca visto (INSERT) de um agente já
 * rankeado que atualizou os stats (UPDATE do upsert, calculado via `xmax` em
 * `api/ingress-rankings`) — muda o título/verbo da mensagem, já que "entrou
 * no ranking" não faz sentido pra quem só está reenviando um export novo.
 * @param {{codename:string, rank:number, totalAgents:number, isNewAgent:boolean,
 *   window:{codenameKey:string, codename:string, overallScore:number, countryCode:string|null, rank:number}[],
 *   rankingUrl:string}} data
 */
async function sendIngressRankingEntry(data) {
    const { codename, rank, totalAgents, isNewAgent, window: rankWindow, rankingUrl } = data;
    if (!codename || !rank || !Array.isArray(rankWindow) || !rankingUrl) {
        throw new Error('ingress-ranking-entry: faltam codename/rank/window/rankingUrl');
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_INGRESS_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
    const threadId = process.env.TELEGRAM_INGRESS_THREAD_ID;
    if (!botToken || !chatId) {
        throw new Error('Telegram bot token or chat ID not configured');
    }

    const windowLines = rankWindow
        .map((entry) => {
            const flag = countryFlagEmoji(entry.countryCode) || '🏳️';
            const line = `${flag} *${entry.rank}º* ${esc(entry.codename)} — ${Math.round(entry.overallScore)}`;
            return entry.rank === rank ? `➡️ ${line}` : `　 ${line}`;
        })
        .join('\n');

    const headline = isNewAgent
        ? `🆕 *Novo agente no ranking!*\n\n*${esc(codename)}* entrou na *${rank}ª posição* (de ${totalAgents}).`
        : `📈 *Atualização no ranking!*\n\n*${esc(codename)}* atualizou os stats e está na *${rank}ª posição* (de ${totalAgents}).`;

    // const text = `${headline}\n\n*Ranking ao redor:*\n${windowLines}\n\n[Ver ranking completo »](${rankingUrl})`;
    const text = `${headline}\n\n*Ranking:*\n${windowLines}`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_thread_id: threadId, text, parse_mode: 'Markdown' }),
    });
    if (!response.ok) throw new Error(`Telegram sendMessage: ${JSON.stringify(await response.json())}`);
    return response.json();
}

/**
 * Sends a message to a Telegram group via bot for temperament test results
 * @param {Object} data - Test data including name, date, and results
 * @returns {Promise<Object>} - Response from Telegram API
 */
async function sendTemperamentTestMessage(data) {
    const { name, age, date, results, executionCount } = data;

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

    // Create a summary message with date, time, name, age, execution count, and results
    const message = `
📊 *Resultado do Teste de Temperamento*

📅 *Data e Hora:* ${formattedDate}
👤 *Nome:* ${esc(name)}
🔢 *Idade:* ${esc(age)}
🔄 *Execuções neste dispositivo:* ${esc(executionCount || 'N/A')}

*Resultados:*
🔸 *1º: ${esc(getPropSafely(results, 'primaryTemperament.name', 'Não definido'))}* (${esc(getPropSafely(results, 'primaryTemperament.percentage', 0))}%)
🔹 *2º: ${esc(getPropSafely(results, 'secondaryTemperament.name', 'Não definido'))}* (${esc(getPropSafely(results, 'secondaryTemperament.percentage', 0))}%)

▫️ ${esc(getArrayElementSafely(results?.allCharacteristics, 0, 'name', 'Não definido'))} (${esc(getArrayElementSafely(results?.allCharacteristics, 0, 'percentage', 0))}%)
▫️ ${esc(getArrayElementSafely(results?.allCharacteristics, 1, 'name', 'Não definido'))} (${esc(getArrayElementSafely(results?.allCharacteristics, 1, 'percentage', 0))}%)
▫️ ${esc(getArrayElementSafely(results?.allCharacteristics, 2, 'name', 'Não definido'))} (${esc(getArrayElementSafely(results?.allCharacteristics, 2, 'percentage', 0))}%)
▫️ ${esc(getArrayElementSafely(results?.allCharacteristics, 3, 'name', 'Não definido'))} (${esc(getArrayElementSafely(results?.allCharacteristics, 3, 'percentage', 0))}%)
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
 * Sends a message to a Telegram group via bot for love language test results.
 * Same chat/bot as the temperament test, but posted to a different topic
 * (message_thread_id) so the two tests don't mix in the same thread.
 * @param {Object} data - Test data including name, date, and results
 * @returns {Promise<Object>} - Response from Telegram API
 */
async function sendLoveLanguageTestMessage(data) {
    const { name, age, date, results, executionCount } = data;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const threadId = process.env.TELEGRAM_LOVE_LANGUAGES_THREAD_ID;

    if (!botToken || !chatId) {
        throw new Error('Telegram bot token or chat ID not configured');
    }

    const formattedDate = new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });

    const getPropSafely = (obj, path, fallback = 'N/A') => {
        try {
            return path.split('.').reduce((o, p) => o?.[p], obj) ?? fallback;
        } catch {
            return fallback;
        }
    };

    const allLanguages = results?.allLanguages || [];
    const languagesLines = allLanguages
        .map(l => `▫️ ${esc(getLoveLanguageDisplayName(l.name))} (${esc(l.percentage)}%)`)
        .join('\n');

    const primaryName = getPropSafely(results, 'primary.name', 'Não definido');
    const secondaryName = getPropSafely(results, 'secondary.name', 'Não definido');

    const message = `
💌 *Resultado do Teste de Linguagens do Amor*

📅 *Data e Hora:* ${formattedDate}
👤 *Nome:* ${esc(name)}
🔢 *Idade:* ${esc(age)}
🔄 *Execuções neste dispositivo:* ${esc(executionCount || 'N/A')}

*Resultado:* ${results?.combined ? '(combinado, próximo entre as 2 primeiras)' : ''}
🔸 *1º: ${esc(getLoveLanguageDisplayName(primaryName))}* (${esc(getPropSafely(results, 'primary.percentage', 0))}%)
🔹 *2º: ${esc(getLoveLanguageDisplayName(secondaryName))}* (${esc(getPropSafely(results, 'secondary.percentage', 0))}%)

*Todas as linguagens:*
${languagesLines}
`;

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

    const responseClone = response.clone();

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Telegram API error: ${JSON.stringify(errorData)}`);
    }

    return await responseClone.json();
}

/**
 * API route handler for sending Telegram notifications
 * Supports temperament test and love language test notifications
 */
export async function POST(request) {
    // Rota pública sem autenticação (qualquer visitante que conclui um teste,
    // ou compara um perfil do /ingress, chama isto do navegador) — o limite
    // é o que impede alguém de escrever um script que inunda o grupo/tópico
    // do Telegram com centenas de mensagens.
    const limited = await rateLimitOrNull(request, 'TELEGRAM');
    if (limited) return limited;

    try {
        const data = await request.json();
        const { type } = data;

        let result;

        // Handle different notification types
        switch (type) {
            case 'temperament-test':
                result = await sendTemperamentTestMessage(data);
                break;
            case 'love-language-test':
                result = await sendLoveLanguageTestMessage(data);
                break;
            case 'ingress-compare':
                result = await sendIngressCompare(data);
                break;
            case 'ingress-ranking-entry':
                result = await sendIngressRankingEntry(data);
                break;
            default:
                return NextResponse.json({ error: `tipo de notificação desconhecido: ${type}` }, { status: 400 });
        }

        return NextResponse.json({ success: true, result }, { status: 200 });
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
