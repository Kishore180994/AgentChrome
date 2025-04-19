# API Service for Chrome Extension

This directory contains the API service for the Chrome extension, which provides a clean interface for interacting with the backend server.

## Overview

The API service is organized into several modules:

- `api.ts`: The main API service that provides methods for interacting with the backend server.
- `config.ts`: Configuration values for the API service, including the base URL and endpoint paths.

## API Service Structure

The API service is organized into several sub-services:

- `auth`: Authentication-related methods (login, logout, get current user).
- `tasks`: Task-related methods (create, read, update, delete).
- `chats`: Chat-related methods (create, read, add messages).
- `db`: Database status methods (get status, reconnect).

## Usage

### Importing the API Service

```typescript
import api from "../services/api";
```

### Authentication

```typescript
// Initiate Google OAuth login
api.auth.loginWithGoogle();

// Get the current authenticated user
const user = await api.auth.getCurrentUser();

// Logout
await api.auth.logout();
```

### Tasks

```typescript
// Get all tasks
const tasks = await api.tasks.getAllTasks();

// Get a single task by ID
const task = await api.tasks.getTaskById("task-id");

// Create a new task
const newTask = await api.tasks.createTask({
  title: "Task Title",
  description: "Task Description",
});

// Update a task
const updatedTask = await api.tasks.updateTask("task-id", {
  title: "Updated Title",
  description: "Updated Description",
  completed: true,
});

// Delete a task
await api.tasks.deleteTask("task-id");
```

### Chats

```typescript
// Get all chats
const chats = await api.chats.getAllChats();

// Get a single chat by ID (including messages)
const chat = await api.chats.getChatById("chat-id");

// Create a new chat
const newChat = await api.chats.createChat({
  title: "Chat Title",
});

// Add a message to a chat
const message = await api.chats.addMessage("chat-id", {
  sender: "user",
  content: "Hello, world!",
  stats: {
    messageLength: 13,
    tokenLength: 3,
  },
});
```

### Database Status

```typescript
// Get the database status
const status = await api.db.getStatus();

// Attempt to reconnect to the database
await api.db.reconnect();
```

### Configuration

The API service uses the configuration values from `config.ts`. You can update the base URL at runtime:

```typescript
// Set the base URL
api.setBaseUrl("https://new-backend-server.com");

// Get the current base URL
const baseUrl = api.getBaseUrl();
```

## Error Handling

All API methods throw errors if the request fails. You should wrap API calls in try/catch blocks:

```typescript
try {
  const tasks = await api.tasks.getAllTasks();
  // Handle successful response
} catch (error) {
  console.error("Failed to fetch tasks:", error);
  // Handle error
}
```

## Example Components

The `src/components` directory contains example components that use the API service:

- `TaskList.tsx`: A component for displaying and managing tasks.
- `ChatList.tsx`: A component for displaying and managing chats.

These components demonstrate how to use the API service in a React component, including:

- Fetching data on component mount
- Handling loading and error states
- Creating, updating, and deleting data
- Handling form submissions

## Authentication Flow

The API service handles authentication using Google OAuth. The flow is as follows:

1. User clicks "Login with Google" button
2. The `loginWithGoogle` method redirects the user to the Google OAuth page
3. User authenticates with Google and grants permissions
4. Google redirects back to the extension with an access token
5. The extension uses the access token to fetch the user's profile information
6. The user is now authenticated and can use the API

## Customization

You can customize the API service by modifying the `config.ts` file. This file contains configuration values for the API service, including:

- Base URL for the backend server
- API version
- Endpoint paths
- Request timeout

## TypeScript Interfaces

The API service includes TypeScript interfaces for all data types:

- `User`: User profile information
- `Task`: Task data
- `Chat`: Chat data
- `Message`: Message data
- `MessageStats`: Message statistics
- `DbStatus`: Database status information

These interfaces provide type safety and auto-completion when using the API service.
