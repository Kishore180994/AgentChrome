import { useEffect } from "react";

export function useSiriBorder(isLoading: boolean) {
  useEffect(() => {
    const BORDER_ID = "siri-style-border";

    if (isLoading) {
      // Inject styles and border
      if (!document.getElementById(BORDER_ID)) {
        const borderDiv = document.createElement("div");
        borderDiv.id = BORDER_ID;
        Object.assign(borderDiv.style, {
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 999999,
          pointerEvents: "none",
          boxSizing: "border-box",
          border: "2px solid",
          borderImage: "linear-gradient(90deg, #0ff, #0f0, #00f, #f0f, #0ff) 1",
          animation: "siriGradientAnim 5s linear infinite",
        });

        const styleTag = document.createElement("style");
        styleTag.id = "siri-style-keyframes";
        styleTag.textContent = `
          @keyframes siriGradientAnim {
            0% {
              border-image-source: linear-gradient(0deg, #0ff, #0f0, #00f, #f0f, #0ff);
            }
            25% {
              border-image-source: linear-gradient(90deg, #0f0, #00f, #f0f, #0ff, #0f0);
            }
            50% {
              border-image-source: linear-gradient(180deg, #00f, #f0f, #0ff, #0f0, #00f);
            }
            75% {
              border-image-source: linear-gradient(270deg, #f0f, #0ff, #0f0, #00f, #f0f);
            }
            100% {
              border-image-source: linear-gradient(360deg, #0ff, #0f0, #00f, #f0f, #0ff);
            }
          }
        `;
        document.head.appendChild(styleTag);
        document.body.appendChild(borderDiv);
      }
    } else {
      // Clean up
      document.getElementById(BORDER_ID)?.remove();
      document.getElementById("siri-style-keyframes")?.remove();
    }
  }, [isLoading]);
}
