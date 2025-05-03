// src/components/StatusIcon.tsx
import React from "react";
import { Check, X, Loader, Clock, HelpCircle } from "lucide-react";
import { Status } from "../../types/memoryTypes";

interface StatusIconProps {
  status: Status;
  size?: number;
  className?: string;
}

export const StatusIcon: React.FC<StatusIconProps> = ({
  status,
  size = 16,
  className = "",
}) => {
  const baseClasses = `d4m-flex-shrink-0`;
  const iconSize = size * 0.75; // Make icon slightly smaller than container

  switch (status) {
    case "PASS":
      return (
        <div
          className={`d4m-p-1 d4m-rounded-full d4m-bg-green-500/10 ${className}`}
        >
          <Check
            size={iconSize}
            className={`d4m-text-green-500 ${baseClasses}`}
          />
        </div>
      );
    case "FAIL":
      return (
        <div
          className={`d4m-p-1 d4m-rounded-full d4m-bg-red-500/10 ${className}`}
        >
          <X size={iconSize} className={`d4m-text-red-500 ${baseClasses}`} />
        </div>
      );
    case "IN_PROGRESS":
      return (
        <div
          className={`d4m-p-1 d4m-rounded-full d4m-bg-blue-500/10 ${className}`}
        >
          <Loader
            size={iconSize}
            className={`d4m-text-blue-500 d4m-animate-spin ${baseClasses}`}
          />
        </div>
      );
    case "PENDING":
      return (
        <div
          className={`d4m-p-1 d4m-rounded-full d4m-bg-gray-500/10 ${className}`}
        >
          <Clock
            size={iconSize}
            className={`d4m-text-gray-500 ${baseClasses}`}
          />
        </div>
      );
    default:
      return (
        <div
          className={`d4m-p-1 d4m-rounded-full d4m-bg-gray-500/10 ${className}`}
        >
          <HelpCircle
            size={iconSize}
            className={`d4m-text-gray-400 ${baseClasses}`}
          />
        </div>
      );
  }
};
