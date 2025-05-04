import React, { useState } from "react";
import { MemoryState, Phase, Step } from "../../types/memoryTypes";
import { StatusIcon } from "./StatusIcon";
import { CollapsibleSection } from "./CollapsibleSection";
import { ChevronDown, Target } from "lucide-react";
import { OutcomeDisplay } from "./OutcomeDisplay";

interface TaskProgressDisplayProps {
  memory: MemoryState | null; // Allow null if state might not be ready
  mode: "light" | "dark";
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const StepListItem: React.FC<{ step: Step; mode: "light" | "dark" }> = ({
  step,
  mode,
}) => (
  <li
    className={`d4m-flex d4m-items-start d4m-py-1.5 d4m-px-2 d4m-border-t ${
      mode === "light" ? "d4m-border-gray-200/80" : "d4m-border-gray-600/60"
    }`}
  >
    <StatusIcon
      status={step.status}
      size={18}
      className="d4m-mr-2 d4m-mt-0.5"
    />
    <div className="d4m-flex-grow d4m-text-xs">
      <span
        className={`${
          mode === "light" ? "d4m-text-gray-700" : "d4m-text-gray-300"
        }`}
      >
        <strong className="d4m-font-mono d4m-mr-1">{step.step_number}</strong>{" "}
        {step.description}
      </span>
      {step.error_info && (
        <p className={`d4m-mt-0.5 d4m-text-red-500 d4m-text-[10px] d4m-italic`}>
          Error: {step.error_info}
        </p>
      )}
    </div>
  </li>
);

const PhaseItem: React.FC<{
  phase: Phase;
  isLast: boolean;
  mode: "light" | "dark";
  phaseIndex: number;
}> = ({ phase, isLast, mode, phaseIndex }) => {
  const [isExpanded, setIsExpanded] = useState(phase.status === "IN_PROGRESS"); // Expand in-progress phases by default

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  const getPhaseBgColor = () => {
    if (phase.status === "PASS")
      return mode === "light" ? "d4m-bg-green-50/60" : "d4m-bg-green-900/20";
    if (phase.status === "FAIL")
      return mode === "light" ? "d4m-bg-red-50/60" : "d4m-bg-red-900/20";
    if (phase.status === "IN_PROGRESS")
      return mode === "light" ? "d4m-bg-blue-50/60" : "d4m-bg-blue-900/20";
    return mode === "light" ? "d4m-bg-gray-50/60" : "d4m-bg-gray-700/20";
  };

  const getConnectorColor = () => {
    if (phase.status === "PASS")
      return mode === "light" ? "d4m-border-green-300" : "d4m-border-green-600";
    if (phase.status === "FAIL")
      return mode === "light" ? "d4m-border-red-300" : "d4m-border-red-600";
    if (phase.status === "IN_PROGRESS")
      return mode === "light" ? "d4m-border-blue-300" : "d4m-border-blue-600";
    return mode === "light" ? "d4m-border-gray-300" : "d4m-border-gray-600";
  };

  return (
    <div className="d4m-flex">
      {/* Stepper Visual */}
      <div className="d4m-flex d4m-flex-col d4m-items-center d4m-mr-4 d4m-flex-shrink-0">
        <StatusIcon status={phase.status} size={24} className="d4m-z-10" />
        {!isLast && (
          <div
            className={`d4m-w-px d4m-h-full d4m-border-l-2 ${getConnectorColor()} ${
              phase.status === "PENDING" ? "d4m-border-dashed" : ""
            }`}
          ></div>
        )}
      </div>

      {/* Phase Content */}
      <div
        className={`d4m-flex-grow d4m-mb-4 d4m-rounded-lg d4m-border ${
          mode === "light" ? "d4m-border-gray-200/80" : "d4m-border-gray-700/50"
        } ${getPhaseBgColor()} d4m-overflow-hidden`}
      >
        <button
          className="d4m-w-full d4m-flex d4m-items-center d4m-justify-between d4m-text-left d4m-cursor-pointer hover:d4m-brightness-95 d4m-transition"
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
        >
          <span
            className={`d4m-text-sm d4m-font-semibold ${
              mode === "light" ? "d4m-text-gray-800" : "d4m-text-gray-100"
            }`}
          >
            Phase {phaseIndex + 1}: {phase.name}
          </span>
          <ChevronDown
            size={18}
            className={`d4m-transition-transform d4m-duration-300 ${
              isExpanded ? "d4m-rotate-180" : ""
            } ${mode === "light" ? "d4m-text-gray-600" : "d4m-text-gray-400"}`}
          />
        </button>

        {/* Collapsible Steps */}
        <CollapsibleSection isExpanded={isExpanded}>
          {phase.steps.length > 0 ? (
            <ul
              className={`d4m-list-none d4m-p-0 d4m-m-0 d4m-border-t ${
                mode === "light"
                  ? "d4m-border-gray-200/80"
                  : "d4m-border-gray-600/60"
              }`}
            >
              {phase.steps.map((step) => (
                <StepListItem key={step.step_number} step={step} mode={mode} />
              ))}
            </ul>
          ) : (
            <p
              className={`d4m-px-3 d4m-pb-3 d4m-text-xs ${
                mode === "light" ? "d4m-text-gray-500" : "d4m-text-gray-400"
              }`}
            >
              No steps executed for this phase yet.
            </p>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
};

export const TaskProgressDisplay: React.FC<TaskProgressDisplayProps> = ({
  memory,
  mode,
  isExpanded,
  onToggleExpand,
}) => {
  if (!memory || !memory.phases || memory.phases.length === 0) {
    // Optionally show a placeholder or loading state
    return null;
  }

  const { overall_goal, phases, final_outcome } = memory;

  return (
    <div
      className={`d4m-p-3 d4m-rounded-lg d4m-text-xs d4m-mb-4 d4m-max-h-48 d4m-overflow-y-auto d4m-scrollbar-thin ${
        mode === "light"
          ? "d4m-bg-gray-100 d4m-shadow-sm d4m-border d4m-border-gray-300 d4m-scrollbar-thumb-gray-300 hover:d4m-scrollbar-thumb-gray-400"
          : "d4m-bg-gray-700 d4m-shadow-md d4m-border d4m-border-gray-600 d4m-scrollbar-thumb-gray-600 hover:d4m-scrollbar-thumb-gray-500"
      }`} // Added max-height, overflow, scrollbar, and distinct background/border
    >
      {/* Header */}
      <button
        className={`d4m-w-full d4m-flex d4m-items-center d4m-justify-between d4m-text-left d4m-cursor-pointer d4m-transition d4m-pb-2 ${
          mode === "light" ? "hover:d4m-bg-gray-100" : "hover:d4m-bg-gray-700"
        }`} // Added hover background color
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
      >
        <div className="d4m-flex d4m-items-center">
          <Target
            size={18}
            className={`d4m-mr-2 d4m-flex-shrink-0 ${
              mode === "light" ? "d4m-text-blue-600" : "d4m-text-blue-400"
            }`}
          />
          <h2
            className={`d4m-text-sm d4m-font-semibold ${
              mode === "light" ? "d4m-text-gray-700" : "d4m-text-gray-200"
            }`}
          >
            Task Progress
          </h2>
        </div>
        <ChevronDown
          size={18}
          className={`d4m-transition-transform d4m-duration-300 ${
            isExpanded ? "d4m-rotate-180" : ""
          } ${mode === "light" ? "d4m-text-gray-600" : "d4m-text-gray-400"}`}
        />
      </button>

      {/* Collapsible Content */}
      <CollapsibleSection isExpanded={isExpanded}>
        {/* Overall Goal */}
        <div className="d4m-mb-4">
          <h3
            className={`d4m-text-xs d4m-font-semibold ${
              mode === "light" ? "d4m-text-gray-600" : "d4m-text-gray-300"
            }`}
          >
            Goal:
          </h3>
          <p
            className={`d4m-text-xs ${
              mode === "light" ? "d4m-text-gray-700" : "d4m-text-gray-200"
            }`}
          >
            {overall_goal}
          </p>
        </div>

        {/* Phases Stepper */}
        <div>
          {phases.map((phase, index) => (
            <PhaseItem
              key={phase.id}
              phase={phase}
              isLast={index === phases.length - 1}
              mode={mode}
              phaseIndex={index}
            />
          ))}
        </div>

        {/* Final Outcome */}
        {final_outcome && (
          <OutcomeDisplay
            title={`Task ${
              final_outcome.status === "PASS" ? "Completed" : "Failed"
            }`}
            message={final_outcome.message}
            type={final_outcome.status === "PASS" ? "success" : "fail"}
            mode={mode}
            output={final_outcome.output}
            // Icon will be handled by the component based on type
          />
        )}
      </CollapsibleSection>
    </div>
  );
};
