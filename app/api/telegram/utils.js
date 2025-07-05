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
