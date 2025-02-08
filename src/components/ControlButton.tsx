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
      "ext-bg-gray-700 ext-text-gray-300 ext-ring-1 ext-ring-gray-500/50 ext-hover:bg-gray-600",
    danger:
      "ext-bg-red-700 ext-text-red-100 ext-ring-1 ext-ring-red-500/50 ext-hover:bg-red-600",
    primary:
      "ext-bg-cyan-700/20 ext-text-cyan-200 ext-ring-1 ext-ring-cyan-400 ext-hover:bg-cyan-700/40",
  };

  // Extra flair when the button is "active"
  const activeClasses = active
    ? "ext-brightness-110 ext-scale-105 ext-ring-2 ext-ring-cyan-400"
    : "";

  return (
    <button
      onClick={onClick}
      className={`
        ext-flex ext-items-center ext-gap-2 ext-px-4 ext-py-2 ext-rounded-md ext-font-medium ext-text-sm
        ext-transition-all ext-transform ext-duration-200
        ${variantClasses[variant]}
        ${activeClasses}
      `}
    >
      <Icon className="ext-w-5 ext-h-5" />
      <span>{text}</span>
    </button>
  );
};
