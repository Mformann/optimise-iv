import { message } from 'antd';

/**
 * Reusable error handler for API requests.
 * Extracts the error message from the backend response or generic error and displays it via Ant Design's message.
 */
export const handleApiError = (error: any, defaultMessage = 'An unexpected error occurred') => {
    console.error('API Error:', error);

    let errorMessage = defaultMessage;

    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }

    message.error(errorMessage);
};
