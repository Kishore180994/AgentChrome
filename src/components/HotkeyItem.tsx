import React from "react";

interface HotkeyItemProps {
  keys: string[];
  action: string;
}

export const HotkeyItem: React.FC<HotkeyItemProps> = ({ keys, action }) => {
  return (
    <div className="d4m-flex d4m-items-center d4m-space-x-2">
      {/* Key Combination */}
      <div className="d4m-flex d4m-space-x-1">
        {keys.map((key, index) => (
          <kbd
            key={index}
            className="
              d4m-px-2 d4m-py-1
              d4m-bg-gray-700/60
              d4m-text-cyan-200
              d4m-ring-1 ring-gray-500/50
              d4m-rounded
              d4m-text-xs
              d4m-font-medium
              d4m-shadow-sm
            "
          >
            {key}
          </kbd>
        ))}
      </div>

      {/* Description */}
      <span className="d4m-text-sm d4m-text-gray-200">{action}</span>
    </div>
  );
};
