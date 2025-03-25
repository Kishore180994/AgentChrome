import { useState } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Clipboard } from "lucide-react";

const MarkdownWrapper: React.FC<{ content: string }> = ({ content }) => {
  const [isWrapped, setIsWrapped] = useState(false);

  const toggleWrap = () => {
    setIsWrapped((prev) => !prev);
  };

  return (
    <div className="d4m-text-white d4m-text-xs">
      <Markdown
        components={{
          code({ children, className }) {
            const match = /language-(\w+)/.exec(className || "");
            if (match) {
              const language = match[1];
              const codeContent = String(children).replace(/\n$/, "");

              const handleCopy = () => {
                navigator.clipboard.writeText(codeContent).then(
                  () => console.log("Code copied to clipboard"),
                  (err) => console.error("Failed to copy code:", err)
                );
              };

              return (
                <div className="d4m-relative d4m-group">
                  <SyntaxHighlighter
                    codeTagProps={{
                      style: {
                        whiteSpace: isWrapped ? "break-spaces" : "pre",
                        wordBreak: isWrapped ? "break-word" : "normal",
                      },
                    }}
                    wrapLines={isWrapped}
                    wrapLongLines={isWrapped}
                    language={language}
                    style={oneDark}
                    className={`d4m-rounded d4m-text-[10px]`}
                  >
                    {codeContent}
                  </SyntaxHighlighter>
                  <div className="d4m-absolute d4m-top-1 d4m-right-1 d4m-flex d4m-space-x-1">
                    <button
                      onClick={handleCopy}
                      title="Copy code"
                      className="d4m-p-0.5 d4m-bg-gray-700 d4m-text-cyan-400 d4m-rounded d4m-opacity-50 hover:d4m-opacity-100 d4m-transition-opacity"
                    >
                      <Clipboard className="d4m-w-3 d4m-h-3" />
                    </button>
                    <button
                      onClick={toggleWrap}
                      title={isWrapped ? "Unwrap code" : "Wrap code"}
                      className="d4m-p-0.5 d4m-bg-gray-700 d4m-text-cyan-400 d4m-rounded d4m-opacity-50 hover:d4m-opacity-100 d4m-transition-opacity"
                    >
                      {isWrapped ? "↔" : "↵"}
                    </button>
                  </div>
                </div>
              );
            } else {
              return (
                <code className="d4m-bg-gray-800 d4m-px-1 d4m-py-0.5 d4m-rounded d4m-text-cyan-300 d4m-text-[10px]">
                  {children}
                </code>
              );
            }
          },
          p: ({ children }) => (
            <p className="d4m-mt-0.5 d4m-text-xs d4m-leading-tight">
              {children}
            </p>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};

export default MarkdownWrapper;
