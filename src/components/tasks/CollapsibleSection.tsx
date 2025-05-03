import React, { useRef, useEffect, useState } from "react";

interface CollapsibleSectionProps {
  isExpanded: boolean;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  isExpanded,
  children,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<string>(isExpanded ? "auto" : "0px");

  useEffect(() => {
    if (contentRef.current) {
      const scrollHeight = contentRef.current.scrollHeight;
      setHeight(isExpanded ? `${scrollHeight}px` : "0px");
    }
    // Add dependency on children changing in case content loads dynamically
  }, [isExpanded, children]);

  return (
    <div
      className="d4m-overflow-hidden d4m-transition-all d4m-duration-300 d4m-ease-in-out"
      style={{ maxHeight: height, opacity: isExpanded ? 1 : 0 }}
    >
      <div ref={contentRef}>{children}</div>
    </div>
  );
};
