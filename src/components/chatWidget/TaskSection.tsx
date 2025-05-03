import React, { useRef, useEffect, useState } from "react";
import { StepState } from "../../types/responseFormat";
import { ChevronUp, ChevronDown, Check, X, HelpCircle } from "lucide-react";
import { AccentColor } from "../../utils/themes";

interface TaskSectionProps {
  taskHistories: StepState[];
  textColor: string;
  accentColor: AccentColor;
  mode: "light" | "dark";
  isExpanded: boolean;
  toggleExpanded: () => void;
}

// Separate component for the animated container
const TaskDetailsContainer: React.FC<{
  isExpanded: boolean;
  taskHistories: StepState[];
  textColor: string;
  mode: "light" | "dark";
}> = ({ isExpanded, taskHistories, textColor, mode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  // Store the full height when expanded
  useEffect(() => {
    if (containerRef.current && isExpanded) {
      setHeight(containerRef.current.scrollHeight);
    }
  }, [isExpanded, taskHistories]);

  return (
    <div
      className="d4m-overflow-hidden d4m-transition-all d4m-duration-300"
      style={{
        maxHeight: isExpanded ? (height ? `${height}px` : "500px") : "0px",
        opacity: isExpanded ? 1 : 0,
      }}
    >
      <div
        ref={containerRef}
        className={`d4m-mt-2 d4m-overflow-auto d4m-max-h-[200px] ${
          mode === "light"
            ? "d4m-bg-black/10 d4m-border-gray-200/30"
            : "d4m-bg-white/5 d4m-border-gray-700/30"
        } d4m-rounded-md d4m-backdrop-blur-sm d4m-border`}
        id="task-details"
      >
        <table className={`d4m-w-full d4m-text-[11px] ${textColor}`}>
          <thead
            className={`d4m-border-b ${
              mode === "light"
                ? "d4m-border-gray-300/30"
                : "d4m-border-gray-600/30"
            }`}
          >
            <tr>
              <th className="d4m-py-1.5 d4m-px-2 d4m-text-left d4m-font-medium d4m-tracking-wider">
                #
              </th>
              <th className="d4m-py-1.5 d4m-px-2 d4m-text-left d4m-font-medium d4m-tracking-wider">
                Description
              </th>
              <th className="d4m-py-1.5 d4m-px-2 d4m-text-center d4m-font-medium d4m-tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {taskHistories.map((task, taskIdx) => (
              <tr
                key={taskIdx}
                className={`d4m-border-b ${
                  mode === "light"
                    ? "d4m-border-gray-200/30"
                    : "d4m-border-gray-700/30"
                } d4m-last:border-b-0 d4m-transition-colors ${
                  task.status === "PASS" || task.status === "passed"
                    ? mode === "light"
                      ? "d4m-bg-green-50/30"
                      : "d4m-bg-green-900/20"
                    : task.status === "FAIL" || task.status === "failed"
                    ? mode === "light"
                      ? "d4m-bg-red-50/30"
                      : "d4m-bg-red-900/20"
                    : mode === "light"
                    ? "hover:d4m-bg-black/5"
                    : "hover:d4m-bg-white/5"
                }`}
              >
                <td className="d4m-py-1.5 d4m-px-2 d4m-font-mono">
                  {taskIdx + 1}
                </td>
                <td className="d4m-py-1.5 d4m-px-2">
                  {task.description || task.step_number || "N/A"}
                </td>
                <td className="d4m-py-1.5 d4m-px-2 d4m-text-center">
                  {/* Status Icons */}
                  {(task.status === "PASS" || task.status === "passed") && (
                    <div className="d4m-flex d4m-justify-center d4m-items-center d4m-w-6 d4m-h-6 d4m-rounded-full d4m-bg-green-500/20 d4m-mx-auto">
                      <Check
                        size={14}
                        className={
                          mode === "light"
                            ? "d4m-text-green-500"
                            : "d4m-text-green-400"
                        }
                      />
                    </div>
                  )}
                  {(task.status === "FAIL" || task.status === "failed") && (
                    <div className="d4m-flex d4m-justify-center d4m-items-center d4m-w-6 d4m-h-6 d4m-rounded-full d4m-bg-red-500/20 d4m-mx-auto">
                      <X
                        size={14}
                        className={
                          mode === "light"
                            ? "d4m-text-red-500"
                            : "d4m-text-red-400"
                        }
                      />
                    </div>
                  )}
                  {(task.status === "PENDING" || task.status === "pending") && (
                    <div className="d4m-flex d4m-justify-center d4m-items-center d4m-w-6 d4m-h-6 d4m-rounded-full d4m-bg-gray-500/20 d4m-mx-auto">
                      <div className="d4m-w-3.5 d4m-h-3.5 d4m-border-2 d4m-border-gray-400 d4m-border-t-transparent d4m-rounded-full d4m-animate-spin"></div>
                    </div>
                  )}
                  {(task.status === "IN_PROGRESS" ||
                    task.status === "in_progress") && (
                    <div className="d4m-flex d4m-justify-center d4m-items-center d4m-w-6 d4m-h-6 d4m-rounded-full d4m-bg-blue-500/20 d4m-mx-auto">
                      <div className="d4m-w-3.5 d4m-h-3.5 d4m-border-2 d4m-border-blue-400 d4m-border-t-transparent d4m-rounded-full d4m-animate-spin"></div>
                    </div>
                  )}
                  {![
                    "PASS",
                    "passed",
                    "FAIL",
                    "failed",
                    "PENDING",
                    "pending",
                    "IN_PROGRESS",
                    "in_progress",
                  ].includes(task.status) && (
                    <div className="d4m-flex d4m-justify-center d4m-items-center d4m-w-6 d4m-h-6 d4m-rounded-full d4m-bg-gray-500/10 d4m-mx-auto">
                      <HelpCircle
                        size={14}
                        className={
                          mode === "light"
                            ? "d4m-text-gray-500"
                            : "d4m-text-gray-400"
                        }
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TaskSection: React.FC<TaskSectionProps> = ({
  taskHistories,
  textColor,
  accentColor,
  mode,
  isExpanded,
  toggleExpanded,
}) => {
  // Only render if there are tasks to display
  if (!taskHistories || taskHistories.length === 0) {
    return null;
  }

  return (
    <div
      className={`d4m-flex-shrink-0 d4m-w-full d4m-p-2 d4m-rounded-b-lg d4m-border-b ${
        mode === "light"
          ? "d4m-bg-gray-50/80 d4m-border-gray-200"
          : "d4m-bg-gray-700/80 d4m-border-gray-600"
      } d4m-transition-all d4m-duration-300 d4m-relative d4m-z-10 d4m-text-xs`}
    >
      <div
        className="d4m-flex d4m-justify-between d4m-items-center d4m-cursor-pointer d4m-select-none"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        aria-controls="task-details"
      >
        <h6
          className={`d4m-text-xs d4m-font-semibold ${
            accentColor === "white"
              ? "d4m-text-orange-500"
              : `d4m-text-${accentColor}-500`
          }`}
        >
          Task Steps ({taskHistories.length})
        </h6>
        <div
          className="d4m-transition-transform d4m-duration-300"
          style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(180deg)" }}
        >
          <ChevronUp size={14} className={textColor} />
        </div>
      </div>

      <TaskDetailsContainer
        isExpanded={isExpanded}
        taskHistories={taskHistories}
        textColor={textColor}
        mode={mode}
      />
    </div>
  );
};

export default TaskSection;
