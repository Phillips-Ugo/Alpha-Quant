// API configuration for different environments
const API_CONFIG = {
  development: {
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8888/.netlify/functions',
  },
  production: {
    baseURL: process.env.REACT_APP_API_URL || '/.netlify/functions',
  }
};

const currentConfig = API_CONFIG[process.env.NODE_ENV] || API_CONFIG.development;

export const API_BASE_URL = currentConfig.baseURL;

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Default export for backward compatibility
export default {
  baseURL: API_BASE_URL,
  buildApiUrl
};
