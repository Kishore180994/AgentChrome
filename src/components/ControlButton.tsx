import React from "react";

interface ControlButtonProps {
  onClick: () => void;
  icon: React.ElementType;
  text: string;
  active?: boolean;
  variant?: "default" | "danger" | "primary";
}

export const ControlButton: React.FC<ControlButtonProps> = ({
  onClick,
  icon: Icon,
  text,
  active = false,
  variant = "default",
}) => {
  const variantClasses = {
    default:
      "d4m-bg-gray-700 d4m-text-gray-300 d4m-ring-1 d4m-ring-gray-500/50 d4m-hover:bg-gray-600",
    danger:
      "d4m-bg-red-700 d4m-text-red-100 d4m-ring-1 d4m-ring-red-500/50 d4m-hover:bg-red-600",
    primary:
      "d4m-bg-cyan-700/20 d4m-text-cyan-200 d4m-ring-1 d4m-ring-cyan-400 d4m-hover:bg-cyan-700/40",
  };

  // Extra flair when the button is "active"
  const activeClasses = active
    ? "d4m-brightness-110 d4m-scale-105 d4m-ring-2 d4m-ring-cyan-400"
    : "";

  return (
    <button
      onClick={onClick}
      className={`
        d4m-flex d4m-items-center d4m-gap-2 d4m-px-4 d4m-py-2 d4m-rounded-md d4m-font-medium d4m-text-sm
        d4m-transition-all d4m-transform d4m-duration-200
        ${variantClasses[variant]}
        ${activeClasses}
      `}
    >
      <Icon className="d4m-w-5 d4m-h-5" />
      <span>{text}</span>
    </button>
  );
};
