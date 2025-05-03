import React, { useEffect, useState } from "react";

interface AudioVisualizerProps {
  audioLevel: number;
  isActive: boolean;
  barCount?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioLevel,
  isActive,
  barCount = 30,
}) => {
  const [equalizerBars, setEqualizerBars] = useState<number[]>(
    Array(barCount).fill(0)
  );

  // Colors for equalizer bars - each bar gets its own fixed color
  const rainbowColors = [
    "d4m-bg-red-500",
    "d4m-bg-orange-500",
    "d4m-bg-yellow-500",
    "d4m-bg-green-500",
    "d4m-bg-teal-500",
    "d4m-bg-blue-500",
    "d4m-bg-indigo-500",
    "d4m-bg-purple-500",
    "d4m-bg-pink-500",
    "d4m-bg-red-400",
    "d4m-bg-orange-400",
    "d4m-bg-yellow-400",
    "d4m-bg-green-400",
    "d4m-bg-teal-400",
    "d4m-bg-blue-400",
    "d4m-bg-indigo-400",
    "d4m-bg-purple-400",
    "d4m-bg-pink-400",
  ];

  const getBarColor = (index: number) => {
    // Each bar gets its own fixed color, cycling through the rainbow
    return rainbowColors[index % rainbowColors.length];
  };

  // Effect to update visualizer bars based on audio level
  useEffect(() => {
    if (!isActive) {
      setEqualizerBars(Array(barCount).fill(0));
      return;
    }

    const interval = setInterval(() => {
      // Create a dynamic and responsive pattern based on audio level
      const newBars = Array(barCount)
        .fill(0)
        .map((_, index) => {
          // Create center-focused distribution with random variation
          const centerIndex = Math.floor(barCount / 2);
          const distanceFromCenter = Math.abs(index - centerIndex);

          // Base level with distance falloff
          const baseFalloff = Math.exp(
            -(distanceFromCenter * distanceFromCenter) /
              (2 * (barCount / 3) * (barCount / 3))
          );

          // Add sine wave pattern based on time
          const sineWave = Math.sin(Date.now() / 500 + index / 2) * 0.3 + 0.7;

          // Add randomness that depends on audio level (more randomness at higher levels)
          const randomFactor = 0.1 + Math.random() * Math.min(0.4, audioLevel);

          // Calculate final height with all factors
          let height = audioLevel * baseFalloff * sineWave * (1 + randomFactor);

          // Ensure we have some minimal activity even at low audio levels if active
          if (isActive && height < 0.05) {
            height = 0.05 + Math.random() * 0.05;
          }

          return height;
        });

      setEqualizerBars(newBars);
    }, 50);

    return () => clearInterval(interval);
  }, [audioLevel, isActive, barCount]);

  return (
    <div className="d4m-flex d4m-justify-center d4m-items-end d4m-h-24 d4m-bg-gray-900 d4m-bg-opacity-50 d4m-rounded-lg d4m-p-2">
      {equalizerBars.map((height, index) => {
        // Make bar shape vary slightly based on position and audio level
        const isEvenIndex = index % 2 === 0;
        const borderRadius = isEvenIndex
          ? "d4m-rounded-t-md"
          : "d4m-rounded-t-sm";

        // Width varies slightly to create more organic pattern
        const width = isEvenIndex ? "d4m-w-1.5" : "d4m-w-1";

        // More dynamic margins for non-linear spacing
        const margin = index % 3 === 0 ? "d4m-mx-0.5" : "d4m-mx-0.25";

        // Fixed color for each bar based on position
        const barColor = getBarColor(index);

        return (
          <div
            key={index}
            className={`${width} ${margin} ${borderRadius} ${barColor} d4m-transition-all d4m-duration-150`}
            style={{
              height: `${Math.max(3, height * 100)}px`,
              opacity: isActive ? 1 : 0.3,
              transform: `scaleY(${height * 1.2})`,
              transformOrigin: "bottom",
            }}
          ></div>
        );
      })}
    </div>
  );
};
