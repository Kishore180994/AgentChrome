import React, { useState, useEffect } from "react";
import { X, Plus, MessageSquare, LogIn } from "lucide-react";
import api, { Chat } from "../../services/api";
import { themeStyles } from "../../utils/themes";
import { useAuth } from "../../contexts/AuthContext";

interface ChatListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatSelect: (chat: Chat) => void;
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: string;
  mode: "light" | "dark";
}

/**
 * Modal component for displaying and selecting chats
 */
const ChatListModal: React.FC<ChatListModalProps> = ({
  isOpen,
  onClose,
  onChatSelect,
  theme,
  accentColor,
  mode,
}) => {
  const { user, loginWithGoogle, isLoading: authLoading } = useAuth(); // Removed token
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState<string>("");
  const [authError, setAuthError] = useState<boolean>(false);

  // Fetch chats when the modal opens or when user authentication status changes
  useEffect(() => {
    if (isOpen) {
      fetchChats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]); // Removed token

  // Function to fetch chats from the API
  const fetchChats = async () => {
    setLoading(true);
    setError(null);
    setAuthError(false);

    // Debug logs
    console.log("Current user:", user);
    // Removed console.log for token

    // Check if user is authenticated
    if (!user || "isGuest" in user) {
      // Fully removed token check from condition
      console.log("User not authenticated, showing auth error");
      setAuthError(true);

      // Try to get the token from storage directly
      const data = await chrome.storage.local.get("agentchrome_token");
      console.log("Token from storage:", data.agentchrome_token);
    }

    try {
      // Try to fetch chats from the API
      const fetchedChats = await api.chats.getAllChats();
      setChats(fetchedChats);
    } catch (err) {
      console.error("Failed to fetch chats:", err);

      // Check if this is an authentication error
      const errorMessage = String(err);
      if (errorMessage.includes("Authentication required")) {
        setAuthError(true);
      }

      // Check if we have any chats in local storage as a fallback
      try {
        const storedChats = await chrome.storage.local.get("chats");
        if (
          storedChats.chats &&
          Array.isArray(storedChats.chats) &&
          storedChats.chats.length > 0
        ) {
          setChats(storedChats.chats);
          if (!authError) {
            setError("Using locally stored chats. Server connection failed.");
          }
        } else if (!authError) {
          // No chats in local storage either
          setError(
            "Failed to load chats. Server connection failed and no local chats found."
          );
        }
      } catch (storageErr) {
        // Both API and local storage failed
        if (!authError) {
          setError(
            "Failed to load chats. Please check your connection and try again."
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to create a new chat
  const createChat = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    // Generate a unique ID for the chat
    const chatId = `local_${Date.now()}`;
    const chatTitle = newChatTitle || `Chat ${chats.length + 1}`;

    // Create a new chat object
    const newChat: Chat = {
      _id: chatId,
      userId: "local_user",
      title: chatTitle,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
    };

    try {
      // Try to create the chat via the API
      const apiChat = await api.chats.createChat({
        title: chatTitle,
      });

      // If successful, use the API chat
      setChats([...chats, apiChat]);

      // Clear the form
      setNewChatTitle("");

      // Select the new chat
      handleChatSelect(apiChat);
    } catch (err) {
      console.error("Failed to create chat via API:", err);

      // Check if this is an authentication error
      const errorMessage = String(err);
      if (errorMessage.includes("Authentication required")) {
        setAuthError(true);
        setLoading(false);
        return;
      }

      try {
        // Store the chat in local storage as a fallback
        const storedChats = await chrome.storage.local.get("chats");
        const updatedChats = [...(storedChats.chats || []), newChat];
        await chrome.storage.local.set({ chats: updatedChats });

        // Update the UI
        setChats([...chats, newChat]);

        // Clear the form
        setNewChatTitle("");

        // Select the new chat
        handleChatSelect(newChat);

        setError("Created chat locally. Server connection failed.");
      } catch (storageErr) {
        console.error("Failed to store chat locally:", storageErr);
        setError("Failed to create chat. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to handle chat selection
  const handleChatSelect = (chat: Chat) => {
    onChatSelect(chat);
    onClose();
  };

  if (!isOpen) return null;

  const currentTheme = themeStyles[theme][mode];
  const textColor =
    mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200";
  const borderColor =
    mode === "light" ? "d4m-border-gray-300" : "d4m-border-gray-700";

  return (
    <div
      className="d4m-fixed d4m-inset-0 d4m-z-50 d4m-bg-black/50 d4m-backdrop-blur-sm d4m-flex d4m-items-center d4m-justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`d4m-relative d4m-rounded-2xl d4m-p-4 d4m-w-full d4m-max-w-md d4m-shadow-xl ${currentTheme.container}`}
      >
        <div
          className={`d4m-flex d4m-items-center d4m-justify-between d4m-mb-4 ${currentTheme.header} d4m-rounded-t-xl d4m-p-3`}
        >
          <h2
            className={`d4m-text-lg d4m-font-semibold d4m-flex d4m-items-center d4m-gap-2 d4m-text-${accentColor}-400`}
          >
            <MessageSquare className="d4m-w-5 d4m-h-5" />
            Your Chats
          </h2>
          <button
            onClick={onClose}
            className={`${currentTheme.button} d4m-hover:text-${accentColor}-400 d4m-transition-colors d4m-p-1 d4m-rounded-full`}
          >
            <X className="d4m-w-5 d4m-h-5" />
          </button>
        </div>

        {/* Authentication status display based only on user object */}
        <div className="d4m-mb-4">
          <div className="d4m-text-xs d4m-text-gray-500 d4m-mb-2">
            Auth Status:{" "}
            {user && !("isGuest" in user)
              ? `Logged in as ${user.email}`
              : "Not logged in"}
          </div>
          {/* Removed the non-functional 'Verify with Backend' button and its condition */}
          <div className="d4m-flex d4m-flex-wrap d4m-gap-2 d4m-mt-2">
            {/* Kept Debug and Refresh Token buttons */}
            <div className="d4m-flex d4m-flex-wrap d4m-gap-2">
              <button
                onClick={async () => {
                  console.log("Debug token button clicked");

                  try {
                    // Get all tokens from storage
                    const data = await chrome.storage.local.get(null);
                    console.log("All storage data:", data);

                    // Check specific token keys
                    const tokenKeys = [
                      "agentchrome_token",
                      "TOKEN_STORAGE_KEY",
                    ];
                    for (const key of tokenKeys) {
                      console.log(`Token from ${key}:`, data[key]);
                    }

                    // Try to make an authenticated request
                    try {
                      const user = await api.auth.getCurrentUser();
                      console.log("Current user from API:", user);
                    } catch (apiError) {
                      console.error("API getCurrentUser error:", apiError);
                    }

                    // Show a message to the user
                    setError(
                      "Token debug info logged to console. Check browser developer tools."
                    );
                  } catch (error) {
                    console.error("Debug token failed:", error);
                    setError("Failed to debug token: " + String(error));
                  }
                }}
                className={`d4m-text-xs d4m-bg-gray-500 d4m-text-white d4m-px-2 d4m-py-1 d4m-rounded-md d4m-hover:bg-gray-600 d4m-transition-colors`}
              >
                Debug Token
              </button>

              <button
                onClick={async () => {
                  console.log("Force refresh token button clicked");

                  try {
                    // Get the token from storage
                    const data = await chrome.storage.local.get([
                      "agentchrome_token",
                      "TOKEN_STORAGE_KEY",
                    ]);
                    let token =
                      data.agentchrome_token || data.TOKEN_STORAGE_KEY;

                    if (!token) {
                      setError(
                        "No token found in storage. Please log in first."
                      );
                      return;
                    }

                    // Store the token in both storage keys to ensure it's found
                    await chrome.storage.local.set({
                      agentchrome_token: token,
                      TOKEN_STORAGE_KEY: token,
                    });

                    console.log("Token stored in both storage keys:", token);

                    // Refresh the page to reload the AuthContext with the token
                    window.location.reload();
                  } catch (error) {
                    console.error("Force refresh token failed:", error);
                    setError("Failed to refresh token: " + String(error));
                  }
                }}
                className={`d4m-text-xs d4m-bg-${accentColor}-500 d4m-text-white d4m-px-2 d4m-py-1 d4m-rounded-md d4m-hover:bg-${accentColor}-600 d4m-transition-colors`}
              >
                Force Refresh Token
              </button>
            </div>
          </div>
        </div>

        {/* Authentication error */}
        {authError && (
          <div className="d4m-bg-yellow-100 d4m-border d4m-border-yellow-400 d4m-text-yellow-800 d4m-px-4 d4m-py-3 d4m-rounded d4m-mb-4">
            <div className="d4m-flex d4m-items-center d4m-justify-between">
              <p>You need to log in to access your chats from the server.</p>
              <button
                onClick={() => {
                  console.log("Login button clicked");
                  loginWithGoogle();
                  setAuthError(false);
                }}
                className={`d4m-bg-${accentColor}-500 d4m-text-white d4m-px-3 d4m-py-1 d4m-rounded-md d4m-hover:bg-${accentColor}-600 d4m-transition-colors d4m-flex d4m-items-center d4m-gap-1 d4m-ml-2`}
              >
                <LogIn className="d4m-w-4 d4m-h-4" />
                Login
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="d4m-bg-red-100 d4m-border d4m-border-red-400 d4m-text-red-700 d4m-px-4 d4m-py-3 d4m-rounded d4m-mb-4">
            {error}
          </div>
        )}

        {/* New chat form */}
        <form
          onSubmit={createChat}
          className={`d4m-flex d4m-space-x-2 d4m-mb-4 d4m-p-3 ${currentTheme.form} d4m-rounded-md`}
        >
          <input
            type="text"
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            className={`d4m-flex-1 d4m-px-3 d4m-py-2 ${currentTheme.textarea} d4m-text-sm d4m-rounded-full`}
            placeholder="New chat title (optional)"
          />
          <button
            type="submit"
            disabled={loading || authLoading}
            className={`${currentTheme.sendButton.replace(
              "amber",
              accentColor
            )} d4m-px-4 d4m-py-2 d4m-rounded-full d4m-disabled:opacity-50 d4m-flex d4m-items-center d4m-gap-1`}
          >
            <Plus className="d4m-w-4 d4m-h-4" />
            New
          </button>
        </form>

        {/* Chat list */}
        <div className="d4m-max-h-[300px] d4m-overflow-y-auto d4m-pr-1">
          {loading ? (
            <div className="d4m-flex d4m-justify-center d4m-py-8">
              <div
                className={`d4m-animate-spin d4m-rounded-full d4m-h-8 d4m-w-8 d4m-border-t-2 d4m-border-b-2 d4m-border-${accentColor}-500`}
              ></div>
            </div>
          ) : chats.length === 0 ? (
            <div className="d4m-text-center d4m-py-8 d4m-text-gray-500">
              No chats found. Create your first chat above.
            </div>
          ) : (
            <ul className={`d4m-divide-y ${borderColor}`}>
              {chats.map((chat) => (
                <li
                  key={chat._id}
                  className={`d4m-p-3 d4m-cursor-pointer d4m-hover:bg-opacity-90 d4m-transition-colors d4m-mb-2 ${currentTheme.messageBubble}`}
                  onClick={() => handleChatSelect(chat)}
                >
                  <div className="d4m-flex d4m-items-start d4m-gap-3">
                    <div
                      className={`d4m-p-2 d4m-rounded-full ${currentTheme.avatar} d4m-text-${accentColor}-400`}
                    >
                      <MessageSquare className="d4m-w-4 d4m-h-4" />
                    </div>
                    <div className="d4m-flex-1 d4m-min-w-0">
                      <h3
                        className={`d4m-font-medium ${textColor} d4m-truncate`}
                      >
                        {chat.title}
                      </h3>
                      <p className="d4m-text-xs d4m-text-gray-500 d4m-mt-1">
                        {new Date(chat.createdAt).toLocaleString()}
                      </p>
                      <p className="d4m-text-xs d4m-text-gray-400 d4m-mt-1">
                        {chat.messages?.length || 0} messages
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatListModal;
