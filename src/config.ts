/**
 * Application configuration
 */

// API configuration
export const API_CONFIG = {
  // Base URL for the backend API
  // This should be updated based on the environment (development, production, etc.)
  BASE_URL: "http://localhost:3000",

  // API version (if needed)
  VERSION: "v1",

  // API endpoints
  ENDPOINTS: {
    // Auth endpoints
    AUTH: {
      GOOGLE: "/auth/google",
      LOGOUT: "/auth/logout",
      PROTECTED: "/api/protected",
    },

    // Task endpoints
    TASKS: {
      BASE: "/api/tasks",
      BY_ID: (id: string) => `/api/tasks/${id}`,
    },

    // Chat endpoints
    CHATS: {
      BASE: "/api/chats",
      BY_ID: (id: string) => `/api/chats/${id}`,
      MESSAGES: (chatId: string) => `/api/chats/${chatId}/messages`,
    },

    // Database status endpoints
    DB: {
      STATUS: "/api/db/status",
      RECONNECT: "/api/db/reconnect",
    },
  },

  // Request timeout in milliseconds
  TIMEOUT: 30000,
};

// Feature flags
export const FEATURES = {
  ENABLE_OFFLINE_MODE: false,
  ENABLE_ANALYTICS: false,
  DEBUG_MODE: process.env.NODE_ENV === "development",
};

// Default application settings
export const DEFAULT_SETTINGS = {
  THEME: "dark",
  LANGUAGE: "en",
  NOTIFICATIONS_ENABLED: true,
};

// Export a default config object
const config = {
  API: API_CONFIG,
  FEATURES,
  DEFAULT_SETTINGS,
};

export default config;
