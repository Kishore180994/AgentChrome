import React from "react";
import App from "../App";
import LoginPage from "./LoginPage";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

// Inner component that uses the auth context
const SidebarContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Loading indicator
  if (isLoading) {
    return (
      <div
        id="agent-chrome-sidebar"
        className="d4m-wrapper
          d4m-bg-gray-900
          d4m-to-black/90
          d4m-transition-transform
          d4m-duration-300
          d4m-ease-in-out
          d4m-text-gray-100
          d4m-h-full
          d4m-flex
          d4m-items-center
          d4m-justify-center"
      >
        <div className="d4m-flex d4m-flex-col d4m-items-center d4m-justify-center d4m-p-8">
          <div className="d4m-w-16 d4m-h-16 d4m-mb-4 d4m-p-1 d4m-rounded-full d4m-bg-gradient-to-tr d4m-from-blue-400 d4m-to-purple-600 d4m-animate-pulse d4m-flex d4m-items-center d4m-justify-center">
            <div className="d4m-w-full d4m-h-full d4m-rounded-full d4m-bg-gray-900/75 d4m-flex d4m-items-center d4m-justify-center d4m-shadow-lg">
              <img
                src="/icons/icon128.png"
                alt="AgentChrome Logo"
                className="d4m-w-11/12 d4m-h-11/12 d4m-object-contain"
              />
            </div>
          </div>
          <div className="d4m-flex d4m-items-center d4m-justify-center d4m-space-x-2">
            <div
              className="d4m-w-2 d4m-h-2 d4m-bg-blue-400 d4m-rounded-full d4m-animate-bounce"
              style={{ animationDelay: "0ms" }}
            ></div>
            <div
              className="d4m-w-2 d4m-h-2 d4m-bg-indigo-500 d4m-rounded-full d4m-animate-bounce"
              style={{ animationDelay: "150ms" }}
            ></div>
            <div
              className="d4m-w-2 d4m-h-2 d4m-bg-purple-500 d4m-rounded-full d4m-animate-bounce"
              style={{ animationDelay: "300ms" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="agent-chrome-sidebar"
      className="d4m-wrapper
        d4m-bg-gray-900
        d4m-to-black/90
        d4m-transition-transform
        d4m-duration-300
        d4m-ease-in-out
        d4m-text-gray-100
        d4m-h-full"
    >
      {user ? <App /> : <LoginPage />}
    </div>
  );
};

// Outer component that provides the auth context
const Sidebar: React.FC = () => {
  return (
    <AuthProvider>
      <SidebarContent />
    </AuthProvider>
  );
};

export default Sidebar;
