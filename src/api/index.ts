const API_BASE_URL = 'http://localhost:8000';

export const api = {
    async getEmails() {
        try {
            const response = await fetch(`${API_BASE_URL}/emails`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch emails:', error);
            throw error;
        }
    },

    async getRawEmail(messageId: string) {
        try {
            const response = await fetch(`${API_BASE_URL}/emails/raw/${messageId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.text();
        } catch (error) {
            console.error('Failed to fetch raw email:', error);
            throw error;
        }
    }
};