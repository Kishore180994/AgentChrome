/**
 * API Service for interacting with the backend server
 */

import config from "../config";

// Get the base URL from the configuration
const API_BASE_URL = config.API.BASE_URL;

// Types for API responses and requests
export interface User {
  _id: string;
  googleId: string;
  name: string;
  email: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface MessageStats {
  messageLength: number;
  tokenLength: number;
}

export interface Message {
  _id: string;
  chatId: string;
  sender: "user" | "ai";
  content: string;
  stats: MessageStats;
  createdAt: string;
}

export interface Chat {
  _id: string;
  userId: string;
  title: string;
  messages?: Message[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface DbStatus {
  status: "connected" | "disconnected";
  message: string;
  retryStatus?: {
    attemptsMade: number;
    maxRetries: number;
    willRetry: boolean;
  };
}

// Helper function for making authenticated API requests
async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Get the token from storage
  const authData = await chrome.storage.local.get("agentchrome_token");
  const token = authData.agentchrome_token;

  // Ensure credentials are included for session cookies and add token if available
  const fetchOptions: RequestInit = {
    ...options,
    credentials: "include", // Important for sending cookies
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, fetchOptions);

    // Handle unauthorized responses (clear token and redirect to login)
    if (response.status === 401) {
      console.error("Authentication failed with 401 status");

      // Clear the invalid token and user data
      await chrome.storage.local.remove([
        "agentchrome_token",
        "agentchrome_user",
      ]);

      // Redirect to Google auth
      window.location.href = `${API_BASE_URL}/auth/google`;
      throw new Error("Authentication required");
    }

    return response;
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

// Authentication API
export const authApi = {
  /**
   * Initiates Google OAuth login
   */
  loginWithGoogle: (): void => {
    window.location.href = `${API_BASE_URL}${config.API.ENDPOINTS.AUTH.GOOGLE}`;
  },

  /**
   * Gets the current authenticated user
   */
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await fetchWithAuth(config.API.ENDPOINTS.AUTH.PROTECTED);
      if (!response.ok) return null;

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error("Failed to get current user:", error);
      return null;
    }
  },

  /**
   * Logs out the current user
   */
  logout: async (): Promise<boolean> => {
    try {
      const response = await fetchWithAuth(config.API.ENDPOINTS.AUTH.LOGOUT);
      return response.ok;
    } catch (error) {
      console.error("Logout failed:", error);
      return false;
    }
  },
};

// Tasks API
export const tasksApi = {
  /**
   * Get all tasks
   */
  getAllTasks: async (): Promise<Task[]> => {
    const response = await fetchWithAuth(config.API.ENDPOINTS.TASKS.BASE);
    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get a single task by ID
   */
  getTaskById: async (taskId: string): Promise<Task> => {
    const response = await fetchWithAuth(
      config.API.ENDPOINTS.TASKS.BY_ID(taskId)
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch task: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Create a new task
   */
  createTask: async (taskData: {
    title: string;
    description: string;
  }): Promise<Task> => {
    const response = await fetchWithAuth(config.API.ENDPOINTS.TASKS.BASE, {
      method: "POST",
      body: JSON.stringify(taskData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Update an existing task
   */
  updateTask: async (
    taskId: string,
    taskData: Partial<{
      title: string;
      description: string;
      completed: boolean;
    }>
  ): Promise<Task> => {
    const response = await fetchWithAuth(
      config.API.ENDPOINTS.TASKS.BY_ID(taskId),
      {
        method: "PUT",
        body: JSON.stringify(taskData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Delete a task
   */
  deleteTask: async (taskId: string): Promise<{ message: string }> => {
    const response = await fetchWithAuth(
      config.API.ENDPOINTS.TASKS.BY_ID(taskId),
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete task: ${response.statusText}`);
    }

    return response.json();
  },
};

// Chats API
export const chatsApi = {
  /**
   * Get all chats for the current user
   */
  getAllChats: async (): Promise<Chat[]> => {
    const response = await fetchWithAuth(config.API.ENDPOINTS.CHATS.BASE);
    if (!response.ok) {
      throw new Error(`Failed to fetch chats: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get a single chat by ID (including messages)
   */
  getChatById: async (chatId: string): Promise<Chat> => {
    const response = await fetchWithAuth(
      config.API.ENDPOINTS.CHATS.BY_ID(chatId)
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch chat: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Create a new chat
   */
  createChat: async (chatData: { title?: string } = {}): Promise<Chat> => {
    const response = await fetchWithAuth(config.API.ENDPOINTS.CHATS.BASE, {
      method: "POST",
      body: JSON.stringify(chatData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create chat: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Add a message to a chat
   */
  addMessage: async (
    chatId: string,
    messageData: {
      sender: "user" | "ai";
      content: string;
      stats: MessageStats;
    }
  ): Promise<Message> => {
    const response = await fetchWithAuth(
      config.API.ENDPOINTS.CHATS.MESSAGES(chatId),
      {
        method: "POST",
        body: JSON.stringify(messageData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to add message: ${response.statusText}`);
    }

    return response.json();
  },
};

// Database Status API
export const dbApi = {
  /**
   * Get the current database connection status
   */
  getStatus: async (): Promise<DbStatus> => {
    const response = await fetch(
      `${API_BASE_URL}${config.API.ENDPOINTS.DB.STATUS}`
    );
    if (!response.ok) {
      throw new Error(`Failed to get DB status: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Attempt to reconnect to the database
   */
  reconnect: async (): Promise<{ message: string }> => {
    const response = await fetch(
      `${API_BASE_URL}${config.API.ENDPOINTS.DB.RECONNECT}`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to reconnect to DB: ${response.statusText}`);
    }

    return response.json();
  },
};

// Export a default API object with all services
const api = {
  auth: authApi,
  tasks: tasksApi,
  chats: chatsApi,
  db: dbApi,

  // Utility to set the base URL (useful for configuration)
  setBaseUrl: (url: string) => {
    // This is a simple implementation - in a real app, you might want to validate the URL
    (window as any).API_BASE_URL = url;
    Object.defineProperty(window, "API_BASE_URL", {
      get: () => url,
      configurable: true,
    });
  },

  // Get the current base URL
  getBaseUrl: (): string => {
    return (window as any).API_BASE_URL || API_BASE_URL;
  },
};

export default api;
