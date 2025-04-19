import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const LoginPage: React.FC = () => {
  const { loginWithGoogle, continueAsGuest, isLoading } = useAuth();
  const [hoverGoogle, setHoverGoogle] = useState(false);
  const [hoverGuest, setHoverGuest] = useState(false);

  return (
    <div
      className="d4m-flex d4m-flex-col d4m-items-center d4m-justify-center d4m-w-full d4m-h-screen d4m-overflow-hidden d4m-relative d4m-p-6"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      }}
    >
      {/* Animated background elements */}
      <div className="d4m-absolute d4m-inset-0 d4m-overflow-hidden d4m-opacity-20">
        <div className="d4m-absolute d4m-top-1/4 d4m-left-1/4 d4m-w-32 d4m-h-32 d4m-rounded-full d4m-bg-blue-500/30 d4m-animate-starfall-cascade-1"></div>
        <div className="d4m-absolute d4m-top-3/4 d4m-left-1/2 d4m-w-40 d4m-h-40 d4m-rounded-full d4m-bg-purple-500/20 d4m-animate-starfall-cascade-2"></div>
        <div className="d4m-absolute d4m-top-1/2 d4m-right-1/4 d4m-w-36 d4m-h-36 d4m-rounded-full d4m-bg-cyan-500/25 d4m-animate-starfall-cascade-3"></div>
      </div>

      {/* Content container with glass effect */}
      <div className="d4m-flex d4m-flex-col d4m-items-center d4m-justify-center d4m-z-10 d4m-bg-gray-900/50 d4m-backdrop-blur-md d4m-p-8 d4m-rounded-2xl d4m-border d4m-border-gray-700/50 d4m-shadow-xl d4m-animate-fade-in">
        {/* Logo with gradient ring and frosted glass effect */}
        <div className="d4m-w-32 d4m-h-32 d4m-mb-6 d4m-p-1 d4m-rounded-full d4m-bg-gradient-to-tr d4m-from-blue-400 d4m-to-purple-600 d4m-animate-pulse d4m-flex d4m-items-center d4m-justify-center">
          <div className="d4m-w-full d4m-h-full d4m-rounded-full d4m-bg-gray-900/75 d4m-flex d4m-items-center d4m-justify-center d4m-shadow-lg">
            <img
              src="/icons/icon128.png"
              alt="AgentChrome Logo"
              className="d4m-w-11/12 d4m-h-11/12 d4m-object-contain"
            />
          </div>
        </div>

        <h2 className="d4m-text-3xl d4m-font-bold d4m-mb-2 d4m-text-transparent d4m-bg-clip-text d4m-bg-gradient-to-r d4m-from-blue-400 d4m-to-purple-500 d4m-animate-fade-in d4m-text-center">
          Welcome to AgentChrome
        </h2>

        <p className="d4m-text-gray-300 d4m-mb-8 d4m-text-center d4m-max-w-xs d4m-animate-fade-in d4m-delay-200">
          Your AI-powered browser assistant
        </p>

        <button
          onClick={loginWithGoogle}
          onMouseEnter={() => setHoverGoogle(true)}
          onMouseLeave={() => setHoverGoogle(false)}
          disabled={isLoading}
          className={`d4m-relative d4m-w-full d4m-flex d4m-items-center d4m-justify-center d4m-px-6 d4m-py-3 d4m-mb-4 d4m-rounded-xl d4m-font-medium d4m-text-white d4m-transition-all d4m-duration-300 d4m-animate-fade-in d4m-delay-300 d4m-overflow-hidden ${
            isLoading ? "d4m-opacity-70 d4m-cursor-not-allowed" : ""
          }`}
          style={{
            background: hoverGoogle
              ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
              : "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
            boxShadow: hoverGoogle
              ? "0 10px 20px -10px rgba(79, 70, 229, 0.5)"
              : "0 8px 16px -8px rgba(59, 130, 246, 0.5)",
          }}
        >
          <span
            className={`d4m-absolute d4m-inset-0 d4m-w-full d4m-h-full d4m-bg-white/10 d4m-transition-all d4m-duration-300 ${
              hoverGoogle ? "d4m-scale-[2.5]" : "d4m-scale-0"
            } d4m-rounded-full`}
          ></span>
          <span className="d4m-relative d4m-flex d4m-items-center d4m-justify-center d4m-w-full">
            {isLoading ? (
              <>
                <svg
                  className="d4m-animate-spin d4m-w-5 d4m-h-5 d4m-mr-3"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="d4m-opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="d4m-opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Signing in...
              </>
            ) : (
              <>
                <svg
                  className="d4m-w-5 d4m-h-5 d4m-mr-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                </svg>
                Login with Google
              </>
            )}
          </span>
        </button>

        <button
          onClick={continueAsGuest}
          onMouseEnter={() => setHoverGuest(true)}
          onMouseLeave={() => setHoverGuest(false)}
          disabled={isLoading}
          className={`d4m-relative d4m-w-full d4m-flex d4m-items-center d4m-justify-center d4m-px-6 d4m-py-3 d4m-rounded-xl d4m-font-medium d4m-text-white d4m-transition-all d4m-duration-300 d4m-animate-fade-in d4m-delay-400 d4m-overflow-hidden ${
            isLoading ? "d4m-opacity-70 d4m-cursor-not-allowed" : ""
          }`}
          style={{
            background: hoverGuest
              ? "linear-gradient(135deg, #475569 0%, #64748b 100%)"
              : "linear-gradient(135deg, #334155 0%, #475569 100%)",
            boxShadow: hoverGuest
              ? "0 10px 20px -10px rgba(71, 85, 105, 0.5)"
              : "0 8px 16px -8px rgba(51, 65, 85, 0.5)",
          }}
        >
          <span
            className={`d4m-absolute d4m-inset-0 d4m-w-full d4m-h-full d4m-bg-white/10 d4m-transition-all d4m-duration-300 ${
              hoverGuest ? "d4m-scale-[2.5]" : "d4m-scale-0"
            } d4m-rounded-full`}
          ></span>
          <span className="d4m-relative d4m-flex d4m-items-center d4m-justify-center d4m-w-full">
            <svg
              className="d4m-w-5 d4m-h-5 d4m-mr-3"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
            Continue as Guest
          </span>
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
