// src/lib/api-config.ts

/**
 * Centralized API configuration
 * All API endpoints and external service configs should be defined here
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_LOGIN_URL = import.meta.env.VITE_API_LOGIN_URL;

// Validate required environment variables in development
if (!API_BASE_URL && import.meta.env.DEV) {
  console.error('❌ VITE_API_BASE_URL not configured! Please check your .env file.');
}

export const API_CONFIG = {
  // Base API URL for all endpoints
  BASE_URL: API_BASE_URL || '',
  
  // Authentication endpoint
  LOGIN_URL: API_LOGIN_URL || `${API_BASE_URL || ''}/api/auth/login`,
  
  // Request timeout in milliseconds
  TIMEOUT: 15000,
  
  // Long timeout for file uploads and large data operations
  LONG_TIMEOUT: 20000,
  
  // Cloudinary configuration for image uploads
  CLOUDINARY: {
    UPLOAD_URL: import.meta.env.VITE_CLOUDINARY_UPLOAD_URL || '',
    PRESET: import.meta.env.VITE_CLOUDINARY_PROFILE_UPLOAD_PRESET || '',
  },
} as const;

// Helper function to build organization-scoped endpoints
export const buildOrgEndpoint = (orgId: string, path: string): string => {
  return `${API_CONFIG.BASE_URL}/api/organizations/${encodeURIComponent(orgId)}${path}`;
};
