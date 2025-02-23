import React from "react";

export const Card = ({ title, isExpanded, onHeaderClick, children }) => {
  return (
    <div
      className="ext-bg-gray-800 ext-rounded-lg ext-shadow-md ext-mb-4"
      style={{
        transition: "max-height 0.3s ease",
        overflow: "hidden",
        maxHeight: isExpanded ? "1000px" : "50px", // Collapsed height matches header
      }}
    >
      <div
        className="ext-bg-gray-700 ext-p-2 ext-cursor-pointer ext-rounded-t-lg ext-text-white"
        onClick={onHeaderClick}
      >
        {title}
      </div>
      <div className="ext-p-4">{children}</div>
    </div>
  );
};
