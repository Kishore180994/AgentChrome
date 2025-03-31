import React, { useState, useEffect } from "react";

interface ToastNotificationProps {
  message: string;
  type?: "success" | "info" | "error";
  duration?: number;
  onClose: () => void;
}

export function ToastNotification({
  message,
  type = "info",
  duration = 1000,
  onClose,
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const typeStyles = {
    success: "d4m-bg-green-500",
    info: "d4m-bg-blue-500",
    error: "d4m-bg-red-500",
  };

  return (
    <div
      className={`d4m-fixed d4m-top-4 d4m-right-4 d4m-max-w-xs d4m-w-full d4m-p-2 d4m-rounded-lg d4m-shadow-lg d4m-text-white ${typeStyles[type]} d4m-animate-slide-in d4m-z-50 d4m-opacity-50`}
    >
      <div className="d4m-flex d4m-items-center d4m-justify-between">
        <span className="d4m-text-sm">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            onClose();
          }}
          className="d4m-ml-2 d4m-text-white hover:d4m-opacity-80 d4m-transition-opacity"
        >
          <svg
            className="d4m-w-4 d4m-h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
