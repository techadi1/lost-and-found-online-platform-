/**
 * Application Configuration
 */

// In development, we use the local server. In production, we use relative paths.
// Vercel and Netlify both handle /api routes via rewrites/functions.
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? '' : '/');

export const API_URL = `${API_BASE_URL}/api`;

export { API_BASE_URL };

export default {
  API_URL,
  API_BASE_URL
};
