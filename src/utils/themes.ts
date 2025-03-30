export const themeStyles = {
  neumorphism: {
    light: {
      container: "d4m-bg-gray-100 d4m-text-gray-800",
      header:
        "d4m-bg-gray-100 d4m-border-b d4m-border-gray-300 d4m-shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]",
      messageBubble:
        "d4m-bg-gray-100 d4m-rounded-lg d4m-shadow-[2px_2px_5px_rgba(0,0,0,0.1),-2px_-2px_5px_rgba(255,255,255,0.7)]",
      button:
        "d4m-shadow-[2px_2px_5px_rgba(0,0,0,0.1),-2px_-2px_5px_rgba(255,255,255,0.7)] d4m-hover:bg-opacity-90 d4m-transition-colors",
      textarea:
        "d4m-bg-gray-100 d4m-shadow-[4px_4px_8px_rgba(0,0,0,0.15),-4px_-4px_8px_rgba(255,255,255,0.8)] d4m-focus:bg-gray-200 d4m-hover:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.9)]",
      form: "d4m-bg-gray-100 d4m-border-t d4m-border-gray-300 d4m-shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]",
      loading:
        "d4m-bg-gray-100 d4m-border-t d4m-border-gray-300 d4m-shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]",
      executionGroup:
        "d4m-bg-gray-100 d4m-rounded-lg d4m-shadow-[2px_2px_5px_rgba(0,0,0,0.1),-2px_-2px_5px_rgba(255,255,255,0.7)]",
      suggestion:
        "d4m-bg-gray-200 d4m-rounded-full d4m-shadow-[2px_2px_5px_rgba(0,0,0,0.1),-2px_-2px_5px_rgba(255,255,255,0.7)] d4m-hover:bg-gray-300",
      avatar:
        "d4m-bg-gray-200 d4m-shadow-[2px_2px_5px_rgba(0,0,0,0.1),-2px_-2px_5px_rgba(255,255,255,0.7)]",
      sendButton:
        "d4m-bg-amber-400 d4m-shadow-[4px_4px_8px_rgba(0,0,0,0.15),-4px_-4px_8px_rgba(255,255,255,0.8)] d4m-hover:bg-amber-500 d4m-hover:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.9)] d4m-disabled:bg-gray-300 d4m-disabled:shadow-[2px_2px_5px_rgba(0,0,0,0.1),-2px_-2px_5px_rgba(255,255,255,0.7)]",
      stopButton:
        "d4m-bg-red-400 d4m-shadow-[4px_4px_8px_rgba(0,0,0,0.15),-4px_-4px_8px_rgba(255,255,255,0.8)] d4m-hover:bg-red-500 d4m-hover:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.9)]",
    },
    dark: {
      container: "d4m-bg-gray-800 d4m-text-gray-200",
      header:
        "d4m-bg-gray-800 d4m-border-b d4m-border-gray-700 d4m-shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.1)]",
      messageBubble:
        "d4m-bg-gray-800 d4m-rounded-lg d4m-shadow-[2px_2px_5px_rgba(0,0,0,0.3),-2px_-2px_5px_rgba(255,255,255,0.1)]",
      button:
        "d4m-shadow-[2px_2px_5px_rgba(0,0,0,0.3),-2px_-2px_5px_rgba(255,255,255,0.1)] d4m-hover:bg-opacity-90 d4m-transition-colors",
      textarea:
        "d4m-bg-gray-800 d4m-shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.1)] d4m-focus:bg-gray-900 d4m-hover:shadow-[6px_6px_12px_rgba(0,0,0,0.5),-6px_-6px_12px_rgba(255,255,255,0.15)]",
      form: "d4m-bg-gray-800 d4m-border-t d4m-border-gray-700 d4m-shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.1)]",
      loading:
        "d4m-bg-gray-800 d4m-border-t d4m-border-gray-700 d4m-shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.1)]",
      executionGroup:
        "d4m-bg-gray-800 d4m-rounded-lg d4m-shadow-[2px_2px_5px_rgba(0,0,0,0.3),-2px_-2px_5px_rgba(255,255,255,0.1)]",
      suggestion:
        "d4m-bg-gray-700 d4m-rounded-full d4m-shadow-[2px_2px_5px_rgba(0,0,0,0.3),-2px_-2px_5px_rgba(255,255,255,0.1)] d4m-hover:bg-gray-600",
      avatar:
        "d4m-bg-gray-700 d4m-shadow-[2px_2px_5px_rgba(0,0,0,0.3),-2px_-2px_5px_rgba(255,255,255,0.1)]",
      sendButton:
        "d4m-bg-amber-600 d4m-shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.1)] d4m-hover:bg-amber-700 d4m-hover:shadow-[6px_6px_12px_rgba(0,0,0,0.5),-6px_-6px_12px_rgba(255,255,255,0.15)] d4m-disabled:bg-gray-600 d4m-disabled:shadow-[2px_2px_5px_rgba(0,0,0,0.3),-2px_-2px_5px_rgba(255,255,255,0.1)]",
      stopButton:
        "d4m-bg-red-600 d4m-shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.1)] d4m-hover:bg-red-700 d4m-hover:shadow-[6px_6px_12px_rgba(0,0,0,0.5),-6px_-6px_12px_rgba(255,255,255,0.15)]",
    },
  },
  glassmorphism: {
    light: {
      container:
        "d4m-bg-gray-100/20 d4m-backdrop-blur-lg d4m-border d4m-border-gray-300/50 d4m-text-gray-800",
      header:
        "d4m-bg-gray-100/30 d4m-backdrop-blur-lg d4m-border-b d4m-border-gray-300/50",
      messageBubble:
        "d4m-bg-gray-200/20 d4m-backdrop-blur-md d4m-border d4m-border-gray-300/50 d4m-rounded-xl",
      button:
        "d4m-backdrop-blur-md d4m-border d4m-border-gray-300/50 d4m-hover:bg-opacity-30 d4m-transition-colors",
      textarea:
        "d4m-bg-gray-200/20 d4m-backdrop-blur-md d4m-border d4m-border-gray-300/50 d4m-focus:bg-gray-100/30 d4m-hover:bg-gray-300/30 d4m-transition-colors",
      form: "d4m-bg-gray-100/30 d4m-backdrop-blur-lg d4m-border-t d4m-border-gray-300/50",
      loading:
        "d4m-bg-gray-100/30 d4m-backdrop-blur-lg d4m-border-t d4m-border-gray-300/50",
      executionGroup:
        "d4m-bg-gray-200/20 d4m-backdrop-blur-md d4m-border d4m-border-gray-300/50 d4m-rounded-xl",
      suggestion:
        "d4m-bg-gray-300/20 d4m-backdrop-blur-md d4m-border d4m-border-gray-300/50 d4m-rounded-full d4m-hover:bg-gray-400/30 d4m-transition-colors",
      avatar:
        "d4m-bg-gray-300/20 d4m-backdrop-blur-md d4m-border d4m-border-gray-300/50",
      sendButton:
        "d4m-bg-amber-400/80 d4m-backdrop-blur-md d4m-border d4m-border-amber-300/50 d4m-hover:bg-amber-500/80 d4m-transition-colors d4m-disabled:bg-gray-400/50 d4m-disabled:border-gray-300/50",
      stopButton:
        "d4m-bg-red-400/80 d4m-backdrop-blur-md d4m-border d4m-border-red-300/50 d4m-hover:bg-red-500/80 d4m-transition-colors",
    },
    dark: {
      container:
        "d4m-bg-gray-900/20 d4m-backdrop-blur-lg d4m-border d4m-border-gray-500/30 d4m-text-gray-100",
      header:
        "d4m-bg-gray-900/30 d4m-backdrop-blur-lg d4m-border-b d4m-border-gray-500/30",
      messageBubble:
        "d4m-bg-gray-800/20 d4m-backdrop-blur-md d4m-border d4m-border-gray-500/30 d4m-rounded-xl",
      button:
        "d4m-backdrop-blur-md d4m-border d4m-border-gray-500/30 d4m-hover:bg-opacity-30 d4m-transition-colors",
      textarea:
        "d4m-bg-gray-800/20 d4m-backdrop-blur-md d4m-border d4m-border-gray-500/30 d4m-focus:bg-gray-900/30 d4m-hover:bg-gray-700/30 d4m-transition-colors",
      form: "d4m-bg-gray-900/30 d4m-backdrop-blur-lg d4m-border-t d4m-border-gray-500/30",
      loading:
        "d4m-bg-gray-900/30 d4m-backdrop-blur-lg d4m-border-t d4m-border-gray-500/30",
      executionGroup:
        "d4m-bg-gray-800/20 d4m-backdrop-blur-md d4m-border d4m-border-gray-500/30 d4m-rounded-xl",
      suggestion:
        "d4m-bg-gray-700/20 d4m-backdrop-blur-md d4m-border d4m-border-gray-500/30 d4m-rounded-full d4m-hover:bg-gray-600/30 d4m-transition-colors",
      avatar:
        "d4m-bg-gray-700/20 d4m-backdrop-blur-md d4m-border d4m-border-gray-500/30",
      sendButton:
        "d4m-bg-amber-600/80 d4m-backdrop-blur-md d4m-border d4m-border-amber-500/50 d4m-hover:bg-amber-700/80 d4m-transition-colors d4m-disabled:bg-gray-600/50 d4m-disabled:border-gray-500/30",
      stopButton:
        "d4m-bg-red-600/80 d4m-backdrop-blur-md d4m-border d4m-border-red-500/50 d4m-hover:bg-red-700/80 d4m-transition-colors",
    },
  },
  claymorphism: {
    light: {
      container:
        "d4m-bg-gray-200 d4m-text-gray-800 d4m-rounded-3xl d4m-shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.8)]",
      header:
        "d4m-bg-gray-200 d4m-border-b d4m-border-gray-300 d4m-rounded-t-3xl d4m-shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.6)]",
      messageBubble:
        "d4m-bg-gray-100 d4m-rounded-2xl d4m-shadow-[6px_6px_12px_rgba(0,0,0,0.15),-6px_-6px_12px_rgba(255,255,255,0.7)]",
      button:
        "d4m-rounded-xl d4m-shadow-[6px_6px_12px_rgba(0,0,0,0.15),-6px_-6px_12px_rgba(255,255,255,0.7)] d4m-hover:bg-opacity-90 d4m-transition-colors",
      textarea:
        "d4m-bg-gray-100 d4m-rounded-2xl d4m-shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.8)] d4m-focus:bg-gray-200 d4m-hover:shadow-[10px_10px_20px_rgba(0,0,0,0.25),-10px_-10px_20px_rgba(255,255,255,0.9)]",
      form: "d4m-bg-gray-200 d4m-border-t d4m-border-gray-300 d4m-rounded-b-3xl d4m-shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.6)]",
      loading:
        "d4m-bg-gray-200 d4m-border-t d4m-border-gray-300 d4m-rounded-b-3xl d4m-shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.6)]",
      executionGroup:
        "d4m-bg-gray-100 d4m-rounded-2xl d4m-shadow-[6px_6px_12px_rgba(0,0,0,0.15),-6px_-6px_12px_rgba(255,255,255,0.7)]",
      suggestion:
        "d4m-bg-gray-300 d4m-rounded-full d4m-shadow-[4px_4px_8px_rgba(0,0,0,0.15),-4px_-4px_8px_rgba(255,255,255,0.7)] d4m-hover:bg-gray-400",
      avatar:
        "d4m-bg-gray-300 d4m-rounded-full d4m-shadow-[4px_4px_8px_rgba(0,0,0,0.15),-4px_-4px_8px_rgba(255,255,255,0.7)]",
      sendButton:
        "d4m-bg-amber-400 d4m-rounded-xl d4m-shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.8)] d4m-hover:bg-amber-500 d4m-hover:shadow-[10px_10px_20px_rgba(0,0,0,0.25),-10px_-10px_20px_rgba(255,255,255,0.9)] d4m-disabled:bg-gray-400 d4m-disabled:shadow-[4px_4px_8px_rgba(0,0,0,0.15),-4px_-4px_8px_rgba(255,255,255,0.7)]",
      stopButton:
        "d4m-bg-red-400 d4m-rounded-xl d4m-shadow-[8px_8px_16px_rgba(0,0,0,0.2),-8px_-8px_16px_rgba(255,255,255,0.8)] d4m-hover:bg-red-500 d4m-hover:shadow-[10px_10px_20px_rgba(0,0,0,0.25),-10px_-10px_20px_rgba(255,255,255,0.9)]",
    },
    dark: {
      container:
        "d4m-bg-gray-900 d4m-text-gray-200 d4m-rounded-3xl d4m-shadow-[8px_8px_16px_rgba(0,0,0,0.4),-8px_-8px_16px_rgba(255,255,255,0.1)]",
      header:
        "d4m-bg-gray-900 d4m-border-b d4m-border-gray-700 d4m-rounded-t-3xl d4m-shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.1)]",
      messageBubble:
        "d4m-bg-gray-800 d4m-rounded-2xl d4m-shadow-[6px_6px_12px_rgba(0,0,0,0.3),-6px_-6px_12px_rgba(255,255,255,0.1)]",
      button:
        "d4m-rounded-xl d4m-shadow-[6px_6px_12px_rgba(0,0,0,0.3),-6px_-6px_12px_rgba(255,255,255,0.1)] d4m-hover:bg-opacity-90 d4m-transition-colors",
      textarea:
        "d4m-bg-gray-800 d4m-rounded-2xl d4m-shadow-[8px_8px_16px_rgba(0,0,0,0.4),-8px_-8px_16px_rgba(255,255,255,0.1)] d4m-focus:bg-gray-900 d4m-hover:shadow-[10px_10px_20px_rgba(0,0,0,0.5),-10px_-10px_20px_rgba(255,255,255,0.15)]",
      form: "d4m-bg-gray-900 d4m-border-t d4m-border-gray-700 d4m-rounded-b-3xl d4m-shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.1)]",
      loading:
        "d4m-bg-gray-900 d4m-border-t d4m-border-gray-700 d4m-rounded-b-3xl d4m-shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.1)]",
      executionGroup:
        "d4m-bg-gray-800 d4m-rounded-2xl d4m-shadow-[6px_6px_12px_rgba(0,0,0,0.3),-6px_-6px_12px_rgba(255,255,255,0.1)]",
      suggestion:
        "d4m-bg-gray-700 d4m-rounded-full d4m-shadow-[4px_4px_8px_rgba(0,0,0,0.3),-6px_-6px_12px_rgba(255,255,255,0.1)] d4m-hover:bg-gray-600",
      avatar:
        "d4m-bg-gray-700 d4m-rounded-full d4m-shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.1)]",
      sendButton:
        "d4m-bg-amber-600 d4m-rounded-xl d4m-shadow-[8px_8px_16px_rgba(0,0,0,0.4),-8px_-8px_16px_rgba(255,255,255,0.1)] d4m-hover:bg-amber-700 d4m-hover:shadow-[10px_10px_20px_rgba(0,0,0,0.5),-10px_-10px_20px_rgba(255,255,255,0.15)] d4m-disabled:bg-gray-600 d4m-disabled:shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.1)]",
      stopButton:
        "d4m-bg-red-600 d4m-rounded-xl d4m-shadow-[8px_8px_16px_rgba(0,0,0,0.4),-8px_-8px_16px_rgba(255,255,255,0.1)] d4m-hover:bg-red-700 d4m-hover:shadow-[10px_10px_20px_rgba(0,0,0,0.5),-10px_-10px_20px_rgba(255,255,255,0.15)]",
    },
  },
};

export type AccentColor =
  | "rose"
  | "cyan"
  | "fuchsia"
  | "green"
  | "sky"
  | "amber"
  | "violet"
  | "emerald"
  | "red"
  | "blue"
  | "black"
  | "white";
