/**
 * Utility function to send temperament test results to Telegram
 * This is a client-side wrapper around the API route
 * @param {Object} data - Test data including name, date, and results
 * @returns {Promise<Object>} - Response from the API
 */
export async function sendTemperamentTestMessage(data) {
    return sendTelegramNotification({...data, type: 'temperament-test'});
}

/**
 * Utility function to send love language test results to Telegram
 * Posts to the same bot/chat as the temperament test, but a different topic
 * (message_thread_id), configured via TELEGRAM_LOVE_LANGUAGES_THREAD_ID.
 * @param {Object} data - Test data including name, date, and results
 * @returns {Promise<Object>} - Response from the API
 */
export async function sendLoveLanguageTestMessage(data) {
    return sendTelegramNotification({...data, type: 'love-language-test'});
}

async function sendTelegramNotification(body) {
    try {
        const response = await fetch('/api/telegram', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        // Clone the response before consuming it
        const responseClone = response.clone();

        if (!response.ok) {
            const errorData = await response.json();
            console.error(errorData.error || 'Failed to send Telegram message');
            return {error: errorData.error || 'Failed to send Telegram message'};
        }

        try {
            return await responseClone.json();
        } catch (jsonError) {
            console.error('Error parsing response JSON:', jsonError);
            return {success: true}; // Return a default response if JSON parsing fails
        }
    } catch (error) {
        console.error('Error sending Telegram message:', error);
        return {error: error.message || 'Error sending Telegram message'};
    }
}
