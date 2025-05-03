import React, { useState } from "react";
import { Calendar, List, CheckCircle2 } from "lucide-react";
import ComponentHeader, {
  commonButtons,
  HeaderButtonOption,
} from "./common/ComponentHeader";
import { AccentColor, themeStyles } from "../utils/themes";

interface TasksPageProps {
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: AccentColor;
  mode: "light" | "dark";
}

export function TasksPage({ theme, accentColor, mode }: TasksPageProps) {
  const [activeView, setActiveView] = useState<"list" | "calendar">("list");
  const [filterCompleted, setFilterCompleted] = useState(false);

  // Custom buttons specific to the tasks page
  const taskButtons: HeaderButtonOption[] = [
    {
      id: "toggleView",
      icon: activeView === "list" ? <Calendar size={18} /> : <List size={18} />,
      label: activeView === "list" ? "Calendar View" : "List View",
      onClick: () => setActiveView(activeView === "list" ? "calendar" : "list"),
      showForTabs: ["tasks"],
    },
    {
      id: "toggleCompleted",
      icon: <CheckCircle2 size={18} />,
      label: filterCompleted ? "Show All Tasks" : "Show Completed Only",
      onClick: () => setFilterCompleted(!filterCompleted),
      showForTabs: ["tasks"],
    },
    {
      ...commonButtons.refresh,
      onClick: () => console.log("Refreshing tasks..."),
    },
  ];

  // Always use the current theme from our themes.ts file for consistency
  const currentTheme = themeStyles[theme][mode];
  // Extract text color from the currentTheme's container
  const textColorClass = currentTheme.container.includes("d4m-text-gray-800")
    ? "d4m-text-gray-800"
    : "d4m-text-gray-200";

  return (
    <div
      className={`d4m-overflow-y-auto d4m-h-full d4m-flex d4m-flex-col ${currentTheme.container}`}
    >
      <ComponentHeader
        title="Tasks"
        subtitle={activeView === "list" ? "List View" : "Calendar View"}
        activeTab="tasks"
        mode={mode}
        accentColor={accentColor}
        onModeToggle={() => {
          // Mode toggle logic would go here
          console.log("Toggle mode in Tasks page");
        }}
        additionalButtons={taskButtons}
      />

      <div className="d4m-p-4">
        <div className={`d4m-space-y-6 ${textColorClass}`}>
          {/* Task content would go here */}
          <div className="d4m-text-center d4m-py-10 d4m-text-gray-500">
            <p className="d4m-text-lg d4m-mb-2">Task Management Interface</p>
            <p>
              This is a placeholder for the{" "}
              {activeView === "list" ? "list" : "calendar"} view of tasks.
            </p>
            <p>
              Currently{" "}
              {filterCompleted
                ? "showing completed tasks only"
                : "showing all tasks"}
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TasksPage;
