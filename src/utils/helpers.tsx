import React from "react";

interface StarfallCascadeAnimationProps {
  accentColor: string;
  textColor: string;
}

const StarfallCascadeAnimation: React.FC<StarfallCascadeAnimationProps> = ({
  accentColor,
  textColor,
}) => {
  return (
    <div className="d4m-relative d4m-w-full d4m-h-[48px] d4m-overflow-hidden d4m-flex d4m-items-center d4m-justify-center">
      <div className="d4m-w-full d4m-h-full d4m-relative">
        <div
          className={`d4m-absolute d4m-left-[25%] d4m-w-4 d4m-h-4 d4m-bg-${accentColor}-400 d4m-animate-starfall-cascade-1 d4m-shadow-[0_0_10px_rgba(251,191,36,0.7)]`}
          style={{
            clipPath:
              "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          }}
        ></div>
        <div
          className={`d4m-absolute d4m-left-[50%] d4m-w-4 d4m-h-4 d4m-bg-${accentColor}-400 d4m-animate-starfall-cascade-2 d4m-shadow-[0_0_10px_rgba(251,191,36,0.7)]`}
          style={{
            clipPath:
              "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          }}
        ></div>
        <div
          className={`d4m-absolute d4m-right-[25%] d4m-w-4 d4m-h-4 d4m-bg-${accentColor}-400 d4m-animate-starfall-cascade-3 d4m-shadow-[0_0_10px_rgba(251,191,36,0.7)]`}
          style={{
            clipPath:
              "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          }}
        ></div>
      </div>
      <span
        className={`d4m-absolute d4m-top-1/2 d4m-left-1/2 d4m-transform d4m--translate-x-1/2 d4m--translate-y-1/2 ${textColor} d4m-text-sm d4m-font-medium`}
      >
        Processing...
      </span>
    </div>
  );
};

/**
 * Finds URLs in a string and replaces them with clickable anchor tags.
 * @param text The input string.
 * @returns An array of React nodes (strings and <a> elements).
 */
export const linkifyUrls = (text: string): React.ReactNode[] => {
  // Regular expression to find URLs (handles http, https, ftp, www)
  const urlRegex =
    /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const index = match.index;
    const url = match[0];
    const urlWithProto = url.startsWith("www.") ? `http://${url}` : url; // Add http:// if missing for www. links

    // Add the text before the URL
    if (index > lastIndex) {
      parts.push(text.substring(lastIndex, index));
    }

    // Add the link
    parts.push(
      <a
        key={index}
        href={urlWithProto}
        target="_blank"
        rel="noopener noreferrer"
        className="d4m-text-blue-400 hover:d4m-underline d4m-break-all" // Added break-all for long URLs
      >
        {url}
      </a>
    );

    lastIndex = index + url.length;
  }

  // Add any remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};

export default StarfallCascadeAnimation;

export const getGoogleDocUrlFromId = (fileId: string) => {
  return `https://docs.google.com/document/d/${fileId}`;
};
export const getGoogleSheetUrlFromId = (fileId: string) => {
  return `https://docs.google.com/spreadsheets/d/${fileId}`;
};
