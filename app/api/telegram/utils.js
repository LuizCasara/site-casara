/**
 * Utility function to send temperament test results to Telegram
 * This is a client-side wrapper around the API route
 * @param {Object} data - Test data including name, date, and results
 * @returns {Promise<Object>} - Response from the API
 */
export async function sendTemperamentTestMessage(data) {
    try {
        const response = await fetch('/api/telegram', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...data,
                type: 'temperament-test' // Add the type required by the API
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error(errorData.error || 'Failed to send Telegram message');
        }

        return await response.json();
    } catch (error) {
        console.error('Error sending Telegram message:', error);
    }
}