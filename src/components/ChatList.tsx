import React, { useState, useEffect } from "react";
import api, { Chat, Message, MessageStats } from "../services/api";
import { themeStyles } from "../utils/themes";

interface ChatListProps {
  onChatSelect?: (chat: Chat) => void;
  theme?: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor?: string;
  mode?: "light" | "dark";
}

/**
 * Component for displaying a list of chats from the backend
 */
const ChatList: React.FC<ChatListProps> = ({
  onChatSelect,
  theme = "neumorphism",
  accentColor = "rose",
  mode = "dark",
}) => {
  // Get theme styles
  const currentTheme = themeStyles[theme][mode];
  const textColor =
    mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200";
  const borderColor =
    mode === "light" ? "d4m-border-gray-300" : "d4m-border-gray-700";
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState<string>("");
  const [newMessage, setNewMessage] = useState<string>("");

  // Fetch chats on component mount
  useEffect(() => {
    fetchChats();
  }, []);

  // Fetch chat details when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchChatDetails(selectedChat._id);
    }
  }, [selectedChat?._id]);

  // Function to fetch chats from the API
  const fetchChats = async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedChats = await api.chats.getAllChats();
      setChats(fetchedChats);

      // Select the first chat if available and none is selected
      if (fetchedChats.length > 0 && !selectedChat) {
        setSelectedChat(fetchedChats[0]);
      }
    } catch (err) {
      console.error("Failed to fetch chats:", err);
      setError("Failed to load chats. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch chat details (including messages)
  const fetchChatDetails = async (chatId: string) => {
    try {
      const chatDetails = await api.chats.getChatById(chatId);

      // Update the selected chat with full details
      setSelectedChat(chatDetails);

      // Also update the chat in the list
      setChats(
        chats.map((chat) => (chat._id === chatDetails._id ? chatDetails : chat))
      );
    } catch (err) {
      console.error(`Failed to fetch chat details for ${chatId}:`, err);
      setError("Failed to load chat details. Please try again later.");
    }
  };

  // Function to create a new chat
  const createChat = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const newChat = await api.chats.createChat({
        title: newChatTitle || `Chat ${chats.length + 1}`,
      });

      // Add the new chat to the list
      setChats([...chats, newChat]);

      // Select the new chat
      setSelectedChat(newChat);

      // Clear the form
      setNewChatTitle("");
    } catch (err) {
      console.error("Failed to create chat:", err);
      setError("Failed to create chat. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Function to send a message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedChat || !newMessage.trim()) {
      return;
    }

    try {
      // Calculate message stats
      const messageStats: MessageStats = {
        messageLength: newMessage.length,
        tokenLength: newMessage.split(/\s+/).length, // Simple word count as token estimate
      };

      // Send the message
      const message = await api.chats.addMessage(selectedChat._id, {
        sender: "user",
        content: newMessage,
        stats: messageStats,
      });

      // Clear the input
      setNewMessage("");

      // Refresh the chat to get the updated messages
      fetchChatDetails(selectedChat._id);
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message. Please try again later.");
    }
  };

  // Function to handle chat selection
  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    if (onChatSelect) {
      onChatSelect(chat);
    }
  };

  return (
    <div
      className={`d4m-flex d4m-h-full ${currentTheme.container} d4m-rounded-lg d4m-overflow-hidden`}
    >
      {/* Chat list sidebar */}
      <div
        className={`d4m-w-1/3 d4m-border-r ${borderColor} d4m-flex d4m-flex-col ${currentTheme.messageBubble}`}
      >
        <div className={`d4m-p-4 d4m-border-b ${borderColor}`}>
          <h2
            className={`d4m-text-lg d4m-font-semibold d4m-mb-2 d4m-text-${accentColor}-400`}
          >
            Chats
          </h2>

          {/* New chat form */}
          <form onSubmit={createChat} className="d4m-flex d4m-space-x-2">
            <input
              type="text"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              className={`d4m-flex-1 d4m-px-3 d4m-py-2 ${currentTheme.textarea} d4m-rounded-md`}
              placeholder="New chat title (optional)"
            />
            <button
              type="submit"
              disabled={loading}
              className={`d4m-bg-${accentColor}-500 d4m-text-white d4m-px-4 d4m-py-2 d4m-rounded-md hover:d4m-bg-${accentColor}-600 d4m-transition-colors d4m-disabled:opacity-50`}
            >
              {loading ? "..." : "New"}
            </button>
          </form>
        </div>

        {/* Chat list */}
        <div className="d4m-flex-1 d4m-overflow-y-auto">
          {loading && chats.length === 0 ? (
            <div className="d4m-flex d4m-justify-center d4m-py-8">
              <div className="d4m-animate-spin d4m-rounded-full d4m-h-8 d4m-w-8 d4m-border-t-2 d4m-border-b-2 d4m-border-blue-500"></div>
            </div>
          ) : chats.length === 0 ? (
            <div className="d4m-text-center d4m-py-8 d4m-text-gray-500">
              No chats found. Create your first chat above.
            </div>
          ) : (
            <ul className="d4m-divide-y d4m-divide-gray-200">
              {chats.map((chat) => (
                <li
                  key={chat._id}
                  className={`d4m-p-4 d4m-cursor-pointer hover:d4m-bg-opacity-90 d4m-transition-colors d4m-rounded-md d4m-mb-1 ${
                    currentTheme.messageBubble
                  } ${
                    selectedChat?._id === chat._id
                      ? `d4m-border-l-4 d4m-border-${accentColor}-500`
                      : ""
                  }`}
                  onClick={() => handleChatSelect(chat)}
                >
                  <h3 className={`d4m-font-medium d4m-truncate ${textColor}`}>
                    {chat.title}
                  </h3>
                  <p className="d4m-text-xs d4m-text-gray-500 d4m-mt-1">
                    {new Date(chat.createdAt).toLocaleString()}
                  </p>
                  <p className="d4m-text-xs d4m-text-gray-400 d4m-mt-1">
                    {chat.messages?.length || 0} messages
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Chat detail view */}
      <div
        className={`d4m-flex-1 d4m-flex d4m-flex-col ${currentTheme.container}`}
      >
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div
              className={`d4m-p-4 d4m-border-b ${borderColor} ${currentTheme.header}`}
            >
              <h2
                className={`d4m-text-lg d4m-font-semibold d4m-text-${accentColor}-400`}
              >
                {selectedChat.title}
              </h2>
              <p className="d4m-text-xs d4m-text-gray-500">
                Created: {new Date(selectedChat.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Messages */}
            <div
              className={`d4m-flex-1 d4m-overflow-y-auto d4m-p-4 d4m-space-y-4 ${currentTheme.textarea}`}
            >
              {error && (
                <div className="d4m-bg-red-100 d4m-border d4m-border-red-400 d4m-text-red-700 d4m-px-4 d4m-py-3 d4m-rounded">
                  {error}
                </div>
              )}

              {selectedChat.messages?.length === 0 ? (
                <div className="d4m-text-center d4m-py-8 d4m-text-gray-500">
                  No messages yet. Start the conversation below.
                </div>
              ) : (
                selectedChat.messages?.map((message) => (
                  <div
                    key={message._id}
                    className={`d4m-max-w-3/4 d4m-p-3 d4m-rounded-lg ${
                      message.sender === "user"
                        ? `d4m-bg-${accentColor}-100/20 d4m-ml-auto ${currentTheme.messageBubble}`
                        : `${currentTheme.messageBubble}`
                    }`}
                  >
                    <p>{message.content}</p>
                    <p className="d4m-text-xs d4m-text-gray-500 d4m-mt-1">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Message input */}
            <div
              className={`d4m-p-4 d4m-border-t ${borderColor} ${currentTheme.form}`}
            >
              <form onSubmit={sendMessage} className="d4m-flex d4m-space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className={`d4m-flex-1 d4m-px-3 d4m-py-2 ${currentTheme.textarea} d4m-rounded-full`}
                  placeholder="Type your message..."
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className={`${currentTheme.sendButton.replace(
                    "amber",
                    accentColor
                  )} d4m-px-4 d4m-py-2 d4m-rounded-full d4m-transition-colors d4m-disabled:opacity-50`}
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="d4m-flex d4m-items-center d4m-justify-center d4m-h-full d4m-text-gray-500">
            Select a chat or create a new one to start messaging.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
