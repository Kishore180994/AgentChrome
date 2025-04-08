import { useEffect, useRef } from "react";

// Define IDs outside the hook for consistency
const BORDER_ID = "siri-style-border";
const KEYFRAMES_ID = "siri-style-keyframes";

export function useSiriBorderWithRef(
  isLoading: boolean,
  borderRadius: string = "16px"
) {
  const borderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Function to create/update the keyframes - Stays the same
    const ensureKeyframes = () => {
      if (!document.getElementById(KEYFRAMES_ID)) {
        const styleTag = document.createElement("style");
        styleTag.id = KEYFRAMES_ID;
        // Keyframes remain the same: animate position from 0% to 100%
        styleTag.textContent = `
          @keyframes siriBorderMove {
            to {
              background-position: 100% 0%;
            }
          }
        `;
        document.head.appendChild(styleTag);
      }
    };

    // Function to create/update the border element
    const ensureBorderElement = () => {
      let borderDiv = document.getElementById(
        BORDER_ID
      ) as HTMLDivElement | null;
      if (!borderDiv) {
        borderDiv = document.createElement("div");
        borderDiv.id = BORDER_ID;
        borderRef.current = borderDiv;

        Object.assign(borderDiv.style, {
          position: "fixed",
          top: "0",
          left: "0",
          width: "100vw",
          height: "100vh",
          zIndex: "999999",
          pointerEvents: "none",
          borderRadius,
          boxSizing: "border-box",
          overflow: "hidden",

          // --- Gradient & Animation ---
          // Gradient and size stay the same
          background: `linear-gradient(90deg, #0ff, #0f0, #00f, #f0f, #0ff, #0f0, #00f, #f0f, #0ff)`,
          backgroundSize: "400% 100%",
          backgroundPosition: "0% 0%",
          // ***** CHANGE HERE: Added 'alternate' *****
          animation: "siriBorderMove 5s linear infinite alternate",

          // --- Masking ---
          WebkitMask:
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "2px", // Controls border thickness

          // --- Fade-in/out ---
          opacity: "0",
          transition: "opacity 0.3s ease",
        });

        document.body.appendChild(borderDiv);
      } else {
        if (borderDiv.style.borderRadius !== borderRadius) {
          borderDiv.style.borderRadius = borderRadius;
        }
        // ***** CHANGE HERE: Added 'alternate' *****
        // Ensure animation state includes alternate if element persists
        borderDiv.style.animation =
          "siriBorderMove 5s linear infinite alternate";
        borderRef.current = borderDiv;
      }
      return borderDiv;
    };

    // --- Main Logic (Fade-in/out and Cleanup) ---
    // (This part remains the same as your provided code)
    if (isLoading) {
      ensureKeyframes();
      const borderDiv = ensureBorderElement();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (
            isLoading &&
            borderRef.current &&
            borderRef.current.id === BORDER_ID
          ) {
            borderRef.current.style.opacity = "1";
          }
        });
      });
    } else {
      const borderDiv = borderRef.current;
      if (borderDiv) {
        borderDiv.style.opacity = "0";
        const handleTransitionEnd = (event: TransitionEvent) => {
          if (
            event.propertyName === "opacity" &&
            borderDiv &&
            borderDiv.style.opacity === "0"
          ) {
            borderDiv.removeEventListener("transitionend", handleTransitionEnd);
            if (!isLoading) {
              borderDiv.remove();
              borderRef.current = null;
              // document.getElementById(KEYFRAMES_ID)?.remove(); // Optional
            }
          }
        };
        borderDiv.addEventListener("transitionend", handleTransitionEnd);

        // Fallback cleanup
        setTimeout(() => {
          const currentBorder = borderRef.current;
          if (
            currentBorder &&
            currentBorder.style.opacity === "0" &&
            !isLoading
          ) {
            currentBorder.removeEventListener(
              "transitionend",
              handleTransitionEnd
            );
            currentBorder.remove();
            borderRef.current = null;
            // document.getElementById(KEYFRAMES_ID)?.remove(); // Optional
          }
        }, 350);
      }
    }

    // --- Cleanup on unmount ---
    return () => {
      const borderDiv = borderRef.current;
      borderDiv?.remove();
      borderRef.current = null;
      document.getElementById(KEYFRAMES_ID)?.remove(); // Clean up keyframes
    };
  }, [isLoading, borderRadius]);
}
