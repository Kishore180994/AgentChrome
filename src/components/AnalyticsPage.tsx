import React, { useState } from "react";
import {
  BarChart,
  LineChart,
  PieChart,
  Calendar,
  Download,
} from "lucide-react";
import ComponentHeader, {
  commonButtons,
  HeaderButtonOption,
} from "./common/ComponentHeader";
import { AccentColor, themeStyles } from "../utils/themes";

interface AnalyticsPageProps {
  theme: "neumorphism" | "glassmorphism" | "claymorphism";
  accentColor: AccentColor;
  mode: "light" | "dark";
}

export function AnalyticsPage({
  theme,
  accentColor,
  mode,
}: AnalyticsPageProps) {
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">(
    "month"
  );

  // Time range options for dropdown
  const timeRangeOptions = [
    { value: "week", label: "Last 7 Days" },
    { value: "month", label: "Last 30 Days" },
    { value: "year", label: "Last 12 Months" },
  ];

  // Custom buttons specific to the analytics page
  const analyticsButtons: HeaderButtonOption[] = [
    {
      id: "barChart",
      icon: <BarChart size={18} />,
      label: "Bar Chart",
      onClick: () => setChartType("bar"),
      showForTabs: ["analytics"],
    },
    {
      id: "lineChart",
      icon: <LineChart size={18} />,
      label: "Line Chart",
      onClick: () => setChartType("line"),
      showForTabs: ["analytics"],
    },
    {
      id: "pieChart",
      icon: <PieChart size={18} />,
      label: "Pie Chart",
      onClick: () => setChartType("pie"),
      showForTabs: ["analytics"],
    },
    {
      ...commonButtons.export,
      onClick: () => {
        console.log(`Exporting ${chartType} chart data...`);
        // Export logic would go here
      },
    },
  ];

  // Always use the current theme from our themes.ts file for consistency
  const currentTheme = themeStyles[theme][mode];
  // Extract text color from the currentTheme's container
  const textColorClass = currentTheme.container.includes("d4m-text-gray-800")
    ? "d4m-text-gray-800"
    : "d4m-text-gray-200";
  const borderColor =
    mode === "light" ? "d4m-border-gray-300" : "d4m-border-gray-700";

  return (
    <div
      className={`d4m-overflow-y-auto d4m-h-full d4m-flex d4m-flex-col ${currentTheme.container}`}
    >
      <ComponentHeader
        title="Analytics"
        subtitle={`${
          chartType.charAt(0).toUpperCase() + chartType.slice(1)
        } Chart View`}
        activeTab="analytics"
        mode={mode}
        accentColor={accentColor}
        onModeToggle={() => {
          // Mode toggle logic would go here
          console.log("Toggle mode in Analytics page");
        }}
        additionalButtons={analyticsButtons}
      />

      <div className="d4m-p-4">
        <div className={`d4m-space-y-6 ${textColorClass}`}>
          {/* Time range selector */}
          <div className="d4m-flex d4m-justify-end d4m-mb-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className={`d4m-px-3 d4m-py-1 d4m-bg-transparent ${textColorClass} d4m-text-sm d4m-rounded-full d4m-border ${borderColor} ${currentTheme.button} d4m-focus:outline-none d4m-focus:ring-1 d4m-focus:ring-${accentColor}-500 d4m-w-40`}
            >
              {timeRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Chart content would go here */}
          <div
            className={`d4m-border ${borderColor} d4m-rounded-lg d4m-p-6 d4m-bg-opacity-50 ${
              mode === "light" ? "d4m-bg-white" : "d4m-bg-gray-800"
            }`}
          >
            <div className="d4m-text-center d4m-py-20">
              <p className="d4m-text-lg d4m-font-medium d4m-mb-2">
                {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart
              </p>
              <p className="d4m-text-gray-500">
                This is a placeholder for the {chartType} chart visualization.
              </p>
              <p className="d4m-text-gray-500">
                Showing data for{" "}
                {timeRangeOptions
                  .find((o) => o.value === timeRange)
                  ?.label.toLowerCase()}
                .
              </p>
            </div>
          </div>

          {/* Data Summary Section */}
          <div className="d4m-grid d4m-grid-cols-3 d4m-gap-4 d4m-mt-4">
            {/* Metric cards would go here */}
            {["Total Views", "Engagement Rate", "Conversion Rate"].map(
              (metric) => (
                <div
                  key={metric}
                  className={`d4m-border ${borderColor} d4m-rounded-lg d4m-p-4 d4m-bg-opacity-50 ${
                    mode === "light" ? "d4m-bg-white" : "d4m-bg-gray-800"
                  }`}
                >
                  <p className="d4m-text-sm d4m-text-gray-500">{metric}</p>
                  <p className="d4m-text-2xl d4m-font-semibold d4m-mt-1">
                    {Math.floor(Math.random() * 100)}%
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
