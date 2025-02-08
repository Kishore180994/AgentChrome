import React from "react";

interface HotkeyItemProps {
  keys: string[];
  action: string;
}

export const HotkeyItem: React.FC<HotkeyItemProps> = ({ keys, action }) => {
  return (
    <div className="ext-flex ext-items-center ext-space-x-2">
      {/* Key Combination */}
      <div className="ext-flex ext-space-x-1">
        {keys.map((key, index) => (
          <kbd
            key={index}
            className="
              ext-px-2 ext-py-1
              ext-bg-gray-700/60
              ext-text-cyan-200
              ext-ring-1 ring-gray-500/50
              ext-rounded
              ext-text-xs
              ext-font-medium
              ext-shadow-sm
            "
          >
            {key}
          </kbd>
        ))}
      </div>

      {/* Description */}
      <span className="ext-text-sm ext-text-gray-200">{action}</span>
    </div>
  );
};
