// src/components/ToastNotification.tsx (or relevant path)

import React, { useState, useEffect } from "react";

// Define animation classes (ensure these exist in your CSS)
const enterAnimation = "d4m-animate-slide-down-fade-in";
const exitAnimation = "d4m-animate-slide-up-fade-out";

interface ToastNotificationProps {
  message: string;
  type?: "success" | "info" | "error";
  duration?: number; // Total time VISIBLE before starting fade out
  animationDuration?: number; // Duration of fade in/out animation
  onClose: () => void; // Called after the exit animation completes
}

export function ToastNotification({
  message,
  type = "info",
  duration = 3000, // Default visible duration 3s
  animationDuration = 300, // Animation speed 300ms
  onClose,
}: ToastNotificationProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration);
    const closeTimer = setTimeout(() => {
      onClose();
    }, duration + animationDuration);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, animationDuration, onClose]);

  const handleCloseClick = () => {
    setIsExiting(true);
    setTimeout(onClose, animationDuration);
  };

  const typeStyles = {
    success: "d4m-bg-green-500",
    info: "d4m-bg-blue-500",
    error: "d4m-bg-red-500",
  };

  return (
    // --- Updated Classes for Absolute Positioning ---
    <div
      style={{ animationDuration: `${animationDuration}ms` }}
      className={`
        d4m-absolute d4m-top-14 /* Position below header (adjust top value as needed) */
        d4m-left-4 d4m-right-4 /* Position within parent padding */
        d4m-z-10 /* Ensure it's above messages */
        d4m-p-2 /* Padding */
        d4m-rounded-lg d4m-shadow-md /* Appearance */
        d4m-text-white ${typeStyles[type]} /* Color */
        ${isExiting ? exitAnimation : enterAnimation} /* Animation */
        d4m-ease-in-out
      `}
    >
      <div className="d4m-flex d4m-items-center d4m-justify-between">
        <span className="d4m-text-sm d4m-font-medium">{message}</span>
        <button
          onClick={handleCloseClick}
          className="d4m-ml-4 d4m-text-white hover:d4m-opacity-75 d4m-transition-opacity"
          aria-label="Close notification"
        >
          {/* X icon */}
          <svg
            className="d4m-w-4 d4m-h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            ></path>
          </svg>
        </button>
      </div>
    </div>
    // --- End Updated Classes ---
  );
}
