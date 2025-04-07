import React from "react";
import { ChatWidget } from "./components/chatWidget/ChatWidget";

const App = () => {
  return (
    <div className="d4m-h-screen d4m-overflow-auto d4m-from-gray-900 d4m-via-black d4m-to-gray-900 d4m-text-gray-100">
      <div className="d4m-max-w-5xl d4m-mx-auto d4m-space-y-8 d4m-flex-col d4m-h-full d4m-from-gray-900/90 d4m-to-black/90 d4m-border-cyan-500/30 d4m-shadow-2xl d4m-rounded-xl">
        <div className="d4m-flex-1 d4m-h-full">
          <ChatWidget />
        </div>
      </div>
    </div>
  );
};

export default App;
