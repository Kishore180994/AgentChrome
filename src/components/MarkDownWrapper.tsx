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

  // Preprocess the content to fix malformed code blocks
  const preprocessContent = (input: string): string => {
    // Split the content into lines
    const lines = input.split("\n");
    let inCodeBlock = false;
    let codeBlockLang = "";
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimEnd(); // Preserve leading whitespace, trim trailing

      // Detect the start of a code block
      if (line.startsWith("```")) {
        if (!inCodeBlock) {
          // Start of a code block
          inCodeBlock = true;
          codeBlockLang = line.slice(3).trim(); // Extract language (e.g., "javascript")
          processedLines.push(line);
        } else {
          // End of a code block
          inCodeBlock = false;
          codeBlockLang = "";
          processedLines.push(line);
        }
      } else if (inCodeBlock) {
        // Inside a code block
        processedLines.push(line);
      } else {
        // Outside a code block
        processedLines.push(line);
      }
    }

    // If we're still in a code block at the end, add closing backticks
    if (inCodeBlock) {
      processedLines.push("```");
    }

    // Join the lines back together
    return processedLines.join("\n");
  };

  const processedContent = preprocessContent(content);

  return (
    <div className="d4m-text-xs">
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
              // Use a more theme-neutral styling for inline code
              return (
                <code className="d4m-bg-opacity-20 d4m-bg-gray-500 d4m-px-1 d4m-py-0.5 d4m-rounded d4m-text-[10px]">
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
        {processedContent}
      </Markdown>
    </div>
  );
};

export default MarkdownWrapper;
