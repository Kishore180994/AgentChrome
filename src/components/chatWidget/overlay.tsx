import React, { ReactNode } from "react";
import { AccentColor } from "../../utils/themes";

interface OverlayProps {
  /**
   * Whether the overlay is currently visible
   */
  isVisible: boolean;

  /**
   * Content to be displayed inside the overlay
   */
  children?: ReactNode;

  /**
   * Optional background color, defaults to semi-transparent black/white based on mode
   */
  backgroundColor?: string;

  /**
   * Optional z-index value, defaults to 50
   */
  zIndex?: number;

  /**
   * Light or dark mode for theme-consistent styling
   */
  mode?: "light" | "dark";

  /**
   * Optional accent color to use for highlights
   */
  accentColor?: AccentColor;

  /**
   * Optional custom styles to apply to the overlay container
   */
  style?: React.CSSProperties;

  /**
   * Optional className to apply to the overlay container
   */
  className?: string;

  /**
   * Optional click handler for the overlay background
   */
  onBackgroundClick?: () => void;

  /**
   * Whether clicking on the background closes the overlay, defaults to false
   */
  closeOnBackgroundClick?: boolean;

  /**
   * Optional border radius for the overlay, defaults to 12px
   */
  borderRadius?: string;

  /**
   * Optional padding for the overlay content, defaults to 0
   */
  padding?: string;

  /**
   * Whether to center the content vertically and horizontally, defaults to true
   */
  centerContent?: boolean;
}

/**
 * Overlay component that takes the dimensions of its parent
 * and provides a configurable overlay with animation
 */
const Overlay: React.FC<OverlayProps> = ({
  isVisible,
  children,
  backgroundColor,
  zIndex = 50,
  mode = "light",
  accentColor = "rose",
  style,
  className = "",
  onBackgroundClick,
  closeOnBackgroundClick = false,
  borderRadius = "12px",
  padding = "0",
  centerContent = true,
}) => {
  // Don't render anything when not visible
  if (!isVisible) {
    return null;
  }

  // Default text color based on mode
  const textColorClass =
    mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-200";

  // Default background color based on mode if not provided - now more transparent with blur effect
  const defaultBackgroundColor =
    mode === "light" ? "rgba(255, 255, 255, 0.75)" : "rgba(31, 41, 55, 0.75)";

  const handleBackgroundClick = () => {
    if (closeOnBackgroundClick && onBackgroundClick) {
      onBackgroundClick();
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: centerContent ? "center" : "flex-start",
        justifyContent: centerContent ? "center" : "flex-start",
        zIndex,
        backgroundColor: backgroundColor || defaultBackgroundColor,
        borderRadius,
        padding,
        boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
        ...style,
      }}
      className={`d4m-animate-fade-in ${textColorClass} d4m-text-sm d4m-backdrop-blur-md ${className}`}
      onClick={handleBackgroundClick}
      role="dialog"
      aria-modal="true"
    >
      {/* Content area that stops propagation of clicks to prevent closing when clicking content */}
      {children && (
        <div onClick={(e) => e.stopPropagation()} className="d4m-w-full">
          {children}
        </div>
      )}
    </div>
  );
};

export default Overlay;
