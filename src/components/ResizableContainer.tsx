import React, { useState, useRef } from "react";

interface ResizableContainerProps {
  minHeight?: number; // Minimum height the container can have
  maxHeight?: number; // Maximum height the container can have
  initialHeight?: number; // Initial maximum height
  children: React.ReactNode; // Content inside the container
  className?: string; // Optional additional class for styling
}

export const ResizableContainer: React.FC<ResizableContainerProps> = ({
  minHeight = 200,
  maxHeight = 800,
  initialHeight = 400,
  children,
  className = "",
}) => {
  const [height, setHeight] = useState(initialHeight);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();

    const startY = e.clientY;
    const startHeight = height;

    const onMouseMove = (e: MouseEvent) => {
      const newHeight = Math.max(
        minHeight,
        Math.min(maxHeight, startHeight + e.clientY - startY)
      );
      setHeight(newHeight);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ maxHeight: height, overflow: "auto" }}
    >
      {children}
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute bottom-0 left-0 w-full h-2 cursor-row-resize bg-gray-300"
      ></div>
    </div>
  );
};
