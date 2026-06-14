import { AxiosError } from 'axios';

export const isNetworkError = (error: any): boolean => {
  return error instanceof AxiosError && !error.response;
};

export const isUnauthorizedError = (error: any): boolean => {
  return error instanceof AxiosError && error.response?.status === 401;
};

export const isForbiddenError = (error: any): boolean => {
  return error instanceof AxiosError && error.response?.status === 403;
};

export const isNotFoundError = (error: any): boolean => {
  return error instanceof AxiosError && error.response?.status === 404;
};

/**
 * Parses the error and returns a normalized message.
 * This can be mapped to i18n keys manually if needed, but returns raw string keys for now.
 */
export const getHttpErrorMessage = (error: any, defaultKey: string = 'errors.unexpected'): string => {
  if (isNetworkError(error)) {
    return 'errors.network';
  }
  
  if (error instanceof AxiosError && error.response) {
    const data = error.response.data as any;
    
    // Attempt to extract specific message from API response
    if (data && data.message) {
      // If the API returns an array of messages (e.g., class-validator)
      if (Array.isArray(data.message)) {
        return data.message[0];
      }
      return data.message;
    }
    
    if (isUnauthorizedError(error)) {
      return 'errors.sessionExpired';
    }
    
    if (isForbiddenError(error)) {
      return 'errors.forbiddenMessage';
    }
  }

  return error?.message || defaultKey;
};
