// Unified configuration for local and production Vercel environments
export const API_URL = '/api';
export const API_BASE_URL = '/api';
export const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
