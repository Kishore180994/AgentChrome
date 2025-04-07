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

export default StarfallCascadeAnimation;
