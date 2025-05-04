import { CheckCircle, HelpCircle, XCircle } from "lucide-react";

interface OutcomeDisplay {
  title: string;
  message: string;
  type: "success" | "fail" | "info"; // Use generic types
  mode: "light" | "dark";
  output?: string | null; // Optional output field, allow null
  icon?: React.ReactNode; // Optional icon prop
}

export const OutcomeDisplay: React.FC<OutcomeDisplay> = ({
  title,
  message,
  type,
  mode,
  output,
  icon,
}) => {
  const isSuccess = type === "success";
  const isFail = type === "fail";

  const bgColor =
    type === "success"
      ? mode === "light"
        ? "d4m-bg-green-50/80 d4m-border-green-200"
        : "d4m-bg-green-900/30 d4m-border-green-700/50"
      : type === "fail"
      ? mode === "light"
        ? "d4m-bg-red-50/80 d4m-border-red-200"
        : "d4m-bg-red-900/30 d4m-border-red-700/50"
      : mode === "light"
      ? "d4m-bg-blue-50/80 d4m-border-blue-200" // Info/Question color
      : "d4m-bg-blue-900/30 d4m-border-blue-700/50"; // Info/Question color

  const textColor =
    type === "success"
      ? mode === "light"
        ? "d4m-text-green-800"
        : "d4m-text-green-300"
      : type === "fail"
      ? mode === "light"
        ? "d4m-text-red-800"
        : "d4m-text-red-300"
      : mode === "light"
      ? "d4m-text-blue-800" // Info/Question color
      : "d4m-text-blue-300"; // Info/Question color

  const defaultIcon = isSuccess ? (
    <CheckCircle
      size={18}
      className="d4m-text-green-500 d4m-mr-2 d4m-flex-shrink-0"
    />
  ) : isFail ? (
    <XCircle
      size={18}
      className="d4m-text-red-500 d4m-mr-2 d4m-flex-shrink-0"
    />
  ) : (
    <HelpCircle
      size={18}
      className="d4m-text-blue-500 d4m-mr-2 d4m-flex-shrink-0"
    />
  );

  return (
    <div className={`d4m-p-3 d4m-rounded-lg d4m-border ${bgColor}`}>
      <div className="d4m-flex d4m-items-center">
        {icon ? icon : defaultIcon}
        <h3 className={`d4m-text-sm d4m-font-semibold ${textColor}`}>
          {title}
        </h3>
      </div>
      <p
        className={`d4m-mt-1 d4m-text-xs ${
          mode === "light" ? "d4m-text-gray-700" : "d4m-text-gray-300"
        }`}
      >
        {message}
      </p>
      {output && (
        <div
          className={`d4m-mt-2 d4m-p-2 d4m-rounded d4m-text-xs d4m-font-mono ${
            mode === "light"
              ? "d4m-bg-gray-100 d4m-text-gray-800"
              : "d4m-bg-gray-800 d4m-text-gray-200"
          }`}
        >
          <span className="d4m-font-semibold">Output:</span> {output}
        </div>
      )}
    </div>
  );
};
