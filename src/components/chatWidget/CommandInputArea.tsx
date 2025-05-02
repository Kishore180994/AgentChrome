// src/components/CommandInputArea.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, CornerDownLeft } from "lucide-react"; // Icons used
import { AccentColor } from "../../utils/themes"; // Adjust path as needed

// Define HubSpot Slash Commands (Keep as is)
const hubspotSlashCommands = [
  {
    command: "contact",
    description: "Manage Contacts (Get, Create, Update...)",
  },
  {
    command: "company",
    description: "Manage Companies (Get, Create, Update...)",
  },
  { command: "deal", description: "Manage Deals (Get, Create, Update...)" },
  { command: "ticket", description: "Manage Tickets (Get, Create...)" },
  { command: "task", description: "Manage Tasks (Get, Create...)" },
  { command: "note", description: "Add Notes to records" },
  { command: "meeting", description: "Schedule or Log Meetings" },
  { command: "call", description: "Log Calls" },
  {
    command: "search",
    description: "Advanced Search (Contacts, Companies...)",
  },
  { command: "list", description: "Get details of Contact/Company Lists" },
  { command: "workflow", description: "Trigger Workflows or Enroll records" },
  {
    command: "associate",
    description: "Associate records (e.g., Contact to Deal)",
  },
];

// Props expected from the parent ChatWidget component (Keep as is)
interface CommandInputAreaProps {
  input: string;
  setInput: (value: string) => void;
  selectedCommand: string | null;
  setSelectedCommand: (command: string | null) => void;
  onSubmit: () => void;
  onFocus: () => void;
  onBlur: () => void;
  isLoading: boolean;
  hubspotMode: boolean;
  hasHubspotApiKey: boolean;
  currentTheme: any;
  accentColor: AccentColor;
  textColor: string;
  mode: "light" | "dark";
  showCommandPopup: boolean;
  commandHistory: string[];
  historyIndex: number | null;
  selectedCommandRef: React.RefObject<HTMLDivElement>;
  onPopupSelect: (command: string) => void;
}

// CSS class constants (Keep as is)
const CHIP_SPAN_CLASS = "d4m-command-chip-span";
const EDITABLE_DIV_CLASS = "d4m-editable-div";

export function CommandInputArea({
  input,
  setInput,
  selectedCommand,
  setSelectedCommand,
  onSubmit,
  onFocus,
  onBlur,
  isLoading,
  hubspotMode,
  hasHubspotApiKey,
  currentTheme,
  accentColor,
  textColor,
  mode,
  showCommandPopup,
  commandHistory,
  historyIndex,
  selectedCommandRef,
  onPopupSelect,
}: CommandInputAreaProps) {
  // --- Refs (Keep as is) ---
  const editableDivRef = useRef<HTMLDivElement>(null);
  const slashPopupRef = useRef<HTMLDivElement>(null);
  const selectedSlashCommandRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  // --- State for Slash Command Popup (Keep as is) ---
  const [showSlashPopup, setShowSlashPopup] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [filteredCommands, setFilteredCommands] =
    useState(hubspotSlashCommands);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  // --- Effects ---

  // Filter slash commands (Keep as is)
  useEffect(() => {
    if (hubspotMode && showSlashPopup && slashFilter) {
      const lowerFilter = slashFilter.toLowerCase();
      const filtered = hubspotSlashCommands.filter((cmd) =>
        cmd.command.toLowerCase().startsWith(lowerFilter)
      );
      setFilteredCommands(filtered);
      setSlashSelectedIndex(0);
    } else {
      setFilteredCommands(hubspotSlashCommands);
      setSlashSelectedIndex(0);
      if (!hubspotMode || !showSlashPopup) {
        // Hide if not in HS mode or explicitly closed
        setShowSlashPopup(false);
      }
    }
  }, [slashFilter, showSlashPopup, hubspotMode]);

  // Scroll selected slash command (Keep as is)
  useEffect(() => {
    if (showSlashPopup && selectedSlashCommandRef.current) {
      selectedSlashCommandRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [slashSelectedIndex, showSlashPopup, filteredCommands]); // Add filteredCommands dependency

  // Sync contentEditable div's innerHTML with React state (REVISED LOGIC)
  useEffect(() => {
    const element = editableDivRef.current;
    if (!element) return;

    // --- Track if Chip Structure Changes ---
    const wasChipPresent = !!element.querySelector(`.${CHIP_SPAN_CLASS}`);
    const shouldChipBePresent = hubspotMode && !!selectedCommand;
    const structureChanged = wasChipPresent !== shouldChipBePresent;

    // --- Build desired HTML ---
    let desiredHTML = "";
    if (shouldChipBePresent) {
      const chipBg = mode === "light" ? "#E5E7EB" : "#374151";
      const chipTextColor = textColor;
      const clearButtonColor = mode === "light" ? "#6B7280" : "#9CA3AF";

      // IMPORTANT: Ensure chip span itself is NOT editable
      let chipHTML = `<span contentEditable="false" class="${CHIP_SPAN_CLASS}" style="display: inline-flex; align-items: center; vertical-align: baseline; margin-right: 0.25em; padding: 2px 8px; border-radius: 4px; background-color: ${chipBg}; font-size: 0.9em; opacity: 0.95; cursor: default; user-select: none;">`;
      chipHTML += `<span style="color: ${chipTextColor};">${selectedCommand}</span>`; // Command name
      // Clear button inside the chip
      chipHTML += `<button type="button" contentEditable="false" data-clear-chip="true" title="Clear command" aria-label="Clear command" style="margin-left: 6px; padding: 1px; border-radius: 99px; background: transparent; border: none; cursor: pointer; color: ${clearButtonColor}; line-height: 0; opacity: 0.7; hover: { opacity: 1; }"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`;
      chipHTML += `</span>`;
      desiredHTML += chipHTML;
      // Add a non-breaking space AFTER the chip. Crucial for cursor placement.
      desiredHTML += "\u00A0"; // &nbsp;
    }

    // Append Prompt Text State (Basic sanitization)
    const sanitizedInput = input //.replace(/</g, "&lt;"); // Let contentEditable handle <> conversion for now, monitor if issues arise
      .replace(/&/g, "&amp;") // Basic entity encoding if needed
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Add text content. Use a zero-width space if input is empty to help rendering/cursor.
    // desiredHTML += (sanitizedInput || !shouldChipBePresent) ? sanitizedInput : '&#8203;';
    desiredHTML += sanitizedInput;

    // --- Check if DOM update is needed ---
    // Let browser normalize HTML for comparison to prevent unnecessary updates
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = desiredHTML;
    const normalizedDesiredHTML = tempDiv.innerHTML;
    const currentHTML = element.innerHTML;

    // Only update if the normalized HTML differs
    if (currentHTML !== normalizedDesiredHTML) {
      let savedRangeData: {
        startContainerPath: number[];
        startOffset: number;
        endContainerPath: number[];
        endOffset: number;
      } | null = null;
      const selection = window.getSelection();

      // --- Save Selection --- (Only if structure isn't changing significantly and focus is inside)
      if (
        !structureChanged &&
        selection &&
        selection.rangeCount > 0 &&
        element.contains(selection.anchorNode)
      ) {
        try {
          const range = selection.getRangeAt(0);
          // Function to get a path of indices to a node relative to the element
          const getNodePath = (node: Node): number[] => {
            const path: number[] = [];
            let current: Node | null = node;
            while (current && current !== element) {
              const parent: Node | null = current.parentNode;
              if (!parent) break;
              path.unshift(
                Array.prototype.indexOf.call(parent.childNodes, current)
              );
              current = parent;
            }
            return path;
          };
          savedRangeData = {
            startContainerPath: getNodePath(range.startContainer),
            startOffset: range.startOffset,
            endContainerPath: getNodePath(range.endContainer),
            endOffset: range.endOffset,
          };
          // Special case: If selection was inside the non-editable chip, adjust it to be after the chip+space
          const chipNode = element.querySelector(`.${CHIP_SPAN_CLASS}`);
          if (
            chipNode &&
            range.collapsed &&
            chipNode.contains(range.startContainer)
          ) {
            const nodeAfterChip = chipNode.nextSibling; // Should be the &nbsp; text node
            if (nodeAfterChip) {
              savedRangeData.startContainerPath = getNodePath(nodeAfterChip);
              savedRangeData.startOffset =
                nodeAfterChip.textContent?.length ?? 1; // End of the space
              savedRangeData.endContainerPath =
                savedRangeData.startContainerPath;
              savedRangeData.endOffset = savedRangeData.startOffset;
            }
          }
        } catch (error) {
          console.warn("Failed to save selection:", error);
          savedRangeData = null;
        }
      }

      // --- Update DOM ---
      element.innerHTML = desiredHTML;

      // --- Restore Selection / Set Cursor Position ---
      if (structureChanged && shouldChipBePresent) {
        // If chip was just added, focus and move cursor reliably to the end
        // Use timeout to ensure this runs after the DOM update cycle completes
        setTimeout(() => {
          if (document.activeElement !== element) {
            element.focus(); // Ensure focus is set
          }
          setCursorToEnd(element); // Place cursor after chip and space
        }, 0);
      } else if (
        savedRangeData &&
        selection &&
        document.activeElement === element
      ) {
        // Try restoring saved selection if structure didn't change
        try {
          // Function to find node from path
          const getNodeFromPath = (path: number[]): Node | null => {
            let node: Node | null = element;
            for (const index of path) {
              if (!node || !node.childNodes[index]) return null;
              node = node.childNodes[index];
            }
            return node;
          };

          const startContainer = getNodeFromPath(
            savedRangeData.startContainerPath
          );
          const endContainer = getNodeFromPath(savedRangeData.endContainerPath);

          if (startContainer && endContainer) {
            // Validate offsets
            const validStartOffset = Math.min(
              savedRangeData.startOffset,
              startContainer.textContent?.length ?? 0
            );
            const validEndOffset = Math.min(
              savedRangeData.endOffset,
              endContainer.textContent?.length ?? 0
            );

            const newRange = document.createRange();
            newRange.setStart(startContainer, validStartOffset);
            newRange.setEnd(endContainer, validEndOffset);

            selection.removeAllRanges();
            selection.addRange(newRange);
          } else {
            console.warn(
              "Failed to find nodes for selection restore, placing cursor at end."
            );
            setCursorToEnd(element); // Fallback
          }
        } catch (e) {
          console.warn("Error restoring selection range:", e);
          setCursorToEnd(element); // Fallback
        }
      } else if (document.activeElement === element && !structureChanged) {
        // Focused, but no valid saved range (or structure changed), move to end only if structure didn't just change
        // (because the structureChanged case handles its own cursor placement)
        setCursorToEnd(element);
      }
      // If structure changed and chip was *removed*, also ensure cursor is sensible (usually end is fine)
      else if (
        structureChanged &&
        !shouldChipBePresent &&
        document.activeElement === element
      ) {
        setCursorToEnd(element);
      }
    }
  }, [selectedCommand, input, hubspotMode, mode, textColor]); // Dependencies

  // --- Helper Functions ---

  // Utility to place the cursor at the end of the contentEditable element (Revised slightly for robustness)
  const setCursorToEnd = (element: HTMLElement | null) => {
    if (!element) return;
    const range = document.createRange();
    const sel = window.getSelection();
    try {
      // Try selecting the very end of the last child node
      if (element.childNodes.length > 0) {
        const lastChild = element.lastChild;
        // Check if lastChild exists before accessing properties
        if (lastChild) {
          range.setStart(
            lastChild,
            lastChild.nodeType === Node.TEXT_NODE
              ? lastChild.textContent?.length ?? 0
              : lastChild.childNodes.length
          );
        } else {
          // Fallback if lastChild is null for some reason
          range.selectNodeContents(element);
        }
      } else {
        // If no children, select the element itself
        range.selectNodeContents(element);
      }
      range.collapse(true); // Collapse to the end point
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      element.scrollTop = element.scrollHeight; // Ensure end is visible if scrolled
    } catch (e) {
      console.error("Error setting cursor to end:", e);
      // Fallback attempt
      try {
        range.selectNodeContents(element);
        range.collapse(false);
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch (fallbackError) {
        console.error("Fallback setCursorToEnd failed:", fallbackError);
      }
    }
  };

  // --- Event Handlers ---

  // Clears the command chip and the text input (Keep as is, but refocus is handled by useEffect)
  const clearSelectedCommand = useCallback(() => {
    setSelectedCommand(null);
    setInput("");
    // No explicit refocus here, let the useEffect handle it based on state change
  }, [setSelectedCommand, setInput]);

  // Handles selecting a command from the slash popup (REVISED - Removed focus logic)
  const handleSlashCommandSelect = useCallback(
    (command: string) => {
      if (!command) return;
      setSelectedCommand(command); // Set the command chip state
      setInput(""); // Clear the prompt input area
      setShowSlashPopup(false); // Hide the slash popup
      setSlashFilter(""); // Clear the filter text
      // Focus and cursor positioning are now handled by the main useEffect
      // when 'selectedCommand' changes.
    },
    [setSelectedCommand, setInput] // Dependencies
  );

  // Handles user input within the contentEditable div (Revised Text Extraction)
  const handleContentEditableInput = useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      if (isComposing.current) return;

      const element = event.currentTarget;
      let currentText = "";
      const chipNode = element.querySelector(`.${CHIP_SPAN_CLASS}`);

      if (selectedCommand && !chipNode) {
        // Chip was manually deleted (e.g., select all + delete)
        clearSelectedCommand();
        return; // State change will trigger useEffect for re-render
      }

      // Extract text content *after* the chip and its trailing space
      if (chipNode) {
        let node: Node | null = chipNode.nextSibling; // Could be the space node or null
        let textContent = "";

        // Iterate through sibling nodes after the chip to gather all text
        while (node) {
          if (node.nodeType === Node.TEXT_NODE) {
            textContent += node.textContent;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Handle potential nested elements if necessary (e.g., line breaks <br>)
            // For simple text, recursively getting textContent might suffice
            textContent +=
              (node as HTMLElement).innerText || node.textContent || ""; // innerText respects line breaks better
          }
          node = node.nextSibling;
        }

        // Remove the leading non-breaking space (\u00A0) added by useEffect
        if (textContent.startsWith("\u00A0")) {
          currentText = textContent.substring(1);
        } else {
          currentText = textContent;
        }
      } else {
        // No chip, get the entire text content, try innerText for better newline handling
        currentText = element.innerText || element.textContent || "";

        // Handle slash command triggering (logic remains similar)
        if (hubspotMode) {
          if (currentText === "/") {
            if (slashFilter !== "") setSlashFilter("");
            if (!showSlashPopup) setShowSlashPopup(true);
          } else if (
            currentText.startsWith("/") &&
            !currentText.includes(" ", 1)
          ) {
            const potentialFilter = currentText.substring(1);
            setSlashFilter(potentialFilter);
            if (!showSlashPopup) setShowSlashPopup(true);
          } else {
            if (showSlashPopup) setShowSlashPopup(false);
            if (slashFilter !== "") setSlashFilter("");
          }
        } else {
          if (showSlashPopup) setShowSlashPopup(false);
          if (slashFilter !== "") setSlashFilter("");
        }
      }

      // Prevent state update if text hasn't actually changed
      // This comparison needs to be accurate. Using innerText might normalize whitespace differently.
      // Compare with the raw 'input' state.
      if (input !== currentText) {
        setInput(currentText);
      }
    },
    [
      selectedCommand,
      hubspotMode,
      showSlashPopup,
      slashFilter,
      input, // Compare against the current state value
      setInput,
      clearSelectedCommand,
    ]
  );

  // Handles keydown events (Keep mostly as is, Backspace logic might need tweak if cursor isn't exactly at start of text)
  const handleContentEditableKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const element = e.currentTarget;
      // --- Slash Popup Navigation --- (Keep as is)
      if (hubspotMode && showSlashPopup) {
        const numFiltered = filteredCommands.length;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSlashSelectedIndex((prev) => (prev + 1) % (numFiltered || 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSlashSelectedIndex(
            (prev) => (prev - 1 + (numFiltered || 1)) % (numFiltered || 1)
          );
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          if (numFiltered > 0 && filteredCommands[slashSelectedIndex]) {
            handleSlashCommandSelect(
              filteredCommands[slashSelectedIndex].command
            );
          } else {
            setShowSlashPopup(false); // Close if no selection/match
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowSlashPopup(false);
          return;
        }
        if (e.key === " " && slashFilter.length > 0) {
          setShowSlashPopup(false); /* Allow space */
        }
      }

      // --- History Popup Navigation (Keep placeholder logic as is) ---
      if (showCommandPopup && !showSlashPopup) {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          /* TODO: Implement history up */ return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          /* TODO: Implement history down */ return;
        }
      }

      // --- Backspace to Clear Chip ---
      if (
        hubspotMode &&
        selectedCommand &&
        e.key === "Backspace" &&
        !isComposing.current
      ) {
        const selection = window.getSelection();
        // Check if the cursor is immediately after the chip+space
        if (selection && selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          const chipNode = element.querySelector(`.${CHIP_SPAN_CLASS}`);
          // Check if startContainer is the text node *after* the chip (the space)
          // and the offset is 0 (start of that space node) OR
          // if startContainer is the chip itself (less likely but possible)
          if (
            chipNode &&
            chipNode.nextSibling &&
            range.startContainer === chipNode.nextSibling &&
            range.startOffset === 0
          ) {
            e.preventDefault();
            clearSelectedCommand();
            return;
          }
          // Alternative check: Is the total text content (input state) empty?
          if (input === "") {
            e.preventDefault();
            clearSelectedCommand();
            return;
          }
        }
        // Fallback: if input state is empty, allow backspace to clear chip
        else if (input === "") {
          e.preventDefault();
          clearSelectedCommand();
          return;
        }
      }

      // --- Submit on Enter (Keep as is) ---
      if (e.key === "Enter" && !e.shiftKey && !isComposing.current) {
        e.preventDefault();
        if (!isLoading && (selectedCommand || input.trim())) {
          if (historyIndex !== null && commandHistory[historyIndex]) {
            const historyText = commandHistory[historyIndex];
            onPopupSelect(historyText);
            setTimeout(() => onSubmit(), 0);
          } else {
            onSubmit();
          }
        }
        return;
      }
    },
    [
      hubspotMode,
      showSlashPopup,
      filteredCommands,
      slashSelectedIndex,
      selectedCommand,
      input,
      isLoading,
      showCommandPopup,
      historyIndex,
      commandHistory,
      handleSlashCommandSelect,
      clearSelectedCommand,
      onSubmit,
      onPopupSelect, // Added input
    ]
  );

  // Wrapper Click Handler (Keep as is)
  const handleWrapperClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const clearButton = (e.target as HTMLElement).closest(
        '[data-clear-chip="true"]'
      );
      if (clearButton) {
        e.stopPropagation();
        clearSelectedCommand();
      } else if (
        editableDivRef.current &&
        !editableDivRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest(`.${CHIP_SPAN_CLASS}`) // Also don't refocus if chip itself clicked
      ) {
        editableDivRef.current.focus();
        // Move cursor to end on wrapper click if focused
        setCursorToEnd(editableDivRef.current);
      }
      // Clicks inside editable div or on chip text handled natively/by selection logic
    },
    [clearSelectedCommand]
  );

  // IME Composition Handlers (Keep as is, ensure input handler is called correctly)
  const handleCompositionStart = () => {
    isComposing.current = true;
  };
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLDivElement>) => {
    isComposing.current = false;
    // Use requestAnimationFrame to ensure the DOM has settled after composition
    requestAnimationFrame(() => {
      // Directly trigger the input handler to sync state
      // Need to cast the event type potentially, or create a compatible one
      handleContentEditableInput({
        currentTarget: e.currentTarget,
        type: "input",
      } as React.FormEvent<HTMLDivElement>);
    });
  };

  // --- Dynamic Styling and Content (Keep as is) ---
  const focusRingColor = hubspotMode
    ? "d4m-focus-within:ring-orange-500"
    : `d4m-focus-within:ring-${accentColor}-500`;
  const placeholderText = hubspotMode
    ? selectedCommand
      ? `Enter details for ${selectedCommand}...`
      : "Type / for commands or enter prompt..."
    : "Enter command or prompt...";
  const sendButtonBg = hubspotMode
    ? "hover:d4m-bg-white focus-visible:d4m-ring-orange-500" // Specific HubSpot orange button
    : currentTheme.sendButton?.replace("amber", accentColor) ||
      `d4m-bg-${accentColor}-500 hover:d4m-bg-${accentColor}-600 focus-visible:d4m-ring-${accentColor}-500`;
  const isDisabled = isLoading || (hubspotMode && !hasHubspotApiKey);
  const canSubmit =
    !isDisabled && (!!selectedCommand || input.trim().length > 0);

  // --- Render (Structure remains the same) ---
  return (
    <div className="d4m-relative d4m-px-3 d4m-pb-4 d4m-pt-1 d4m-w-full d4m-box-border d4m-z-20">
      {/* Slash Command Popup */}
      {hubspotMode &&
        showSlashPopup &&
        filteredCommands.length > 0 && ( // Only render if commands exist
          <div
            ref={slashPopupRef}
            className={`d4m-absolute d4m-bottom-[calc(100%+5px)] d4m-left-3 d4m-right-3 d4m-max-h-[180px] d4m-overflow-y-auto d4m-rounded-lg d4m-shadow-lg d4m-z-50 d4m-border ${
              mode === "light"
                ? "d4m-bg-white d4m-border-gray-200"
                : "d4m-bg-gray-800 d4m-border-gray-700"
            } ${currentTheme.commandPopup || ""} d4m-scrollbar-thin ${
              mode === "light"
                ? "d4m-scrollbar-thumb-gray-300"
                : "d4m-scrollbar-thumb-gray-600"
            }`}
            role="listbox" // Add role
            aria-label="Slash Commands" // Add label
          >
            {filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.command}
                ref={
                  idx === slashSelectedIndex ? selectedSlashCommandRef : null
                }
                onClick={() => handleSlashCommandSelect(cmd.command)}
                onMouseDown={(e) => e.preventDefault()} // Prevent blur
                className={`d4m-flex d4m-items-center d4m-justify-between d4m-px-3 d4m-py-2 d4m-cursor-pointer ${
                  mode === "light"
                    ? "hover:d4m-bg-gray-100"
                    : "hover:d4m-bg-gray-700"
                } ${
                  idx === slashSelectedIndex
                    ? mode === "light"
                      ? "d4m-bg-gray-200"
                      : "d4m-bg-gray-600"
                    : ""
                }`}
                role="option"
                aria-selected={idx === slashSelectedIndex}
                id={`slash-command-${cmd.command}`} // Add ID for potential aria-activedescendant
              >
                {/* ... content ... */}
                <div className="d4m-flex d4m-items-center">
                  <span className={`d4m-font-medium d4m-text-sm ${textColor}`}>
                    /{cmd.command}
                  </span>
                  <span
                    className={`d4m-ml-3 d4m-text-xs ${
                      mode === "light"
                        ? "d4m-text-gray-500"
                        : "d4m-text-gray-400"
                    }`}
                  >
                    {cmd.description}
                  </span>
                </div>
                {idx === slashSelectedIndex && (
                  <CornerDownLeft
                    size={14}
                    className={`${textColor} d4m-opacity-70`}
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
            {/* No matching commands message */}
            {filteredCommands.length === 0 && slashFilter && (
              <div
                className={`d4m-px-3 d4m-py-2 d4m-text-sm ${
                  mode === "light" ? "d4m-text-gray-500" : "d4m-text-gray-400"
                }`}
              >
                No matching commands for "{slashFilter}"
              </div>
            )}
          </div>
        )}

      {/* Command History Popup (Keep as is) */}
      {showCommandPopup && commandHistory.length > 0 && (
        <div>
          {[...commandHistory].reverse().map((cmd, revIdx) => (
            <div key={revIdx} className="d4m-command-history-item">
              {cmd}
            </div>
          ))}
        </div>
      )}

      {/* Input Area Wrapper */}
      <div
        onClick={handleWrapperClick}
        className={`d4m-flex d4m-items-end d4m-w-full d4m-rounded-xl d4m-px-3 d4m-py-2 d4m-space-x-2 ${
          currentTheme.textarea || ""
        } d4m-transition-shadow d4m-duration-150 d4m-focus-within:ring-2 ${focusRingColor} d4m-min-h-[44px]`}
      >
        {/* ContentEditable Div */}
        <div
          ref={editableDivRef}
          contentEditable={!isDisabled}
          suppressContentEditableWarning={true}
          onInput={handleContentEditableInput}
          onKeyDown={handleContentEditableKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          data-placeholder={placeholderText} // Used by CSS for ::before pseudo-element
          className={`${EDITABLE_DIV_CLASS} d4m-flex-1 d4m-bg-transparent focus:d4m-outline-none ${textColor} d4m-text-sm d4m-max-h-32 d4m-overflow-y-auto d4m-scrollbar-thin ${
            mode === "light"
              ? "d4m-scrollbar-thumb-gray-400"
              : "d4m-scrollbar-thumb-gray-600"
            // Add 'is-empty' class based on *visible* content for placeholder
          } ${
            (!input && !selectedCommand) || (selectedCommand && !input)
              ? "is-empty"
              : ""
          }`}
          style={{
            minHeight: "24px",
            whiteSpace: "pre-wrap", // Important for preserving spaces/newlines
            wordBreak: "break-word",
            outline: "none",
            WebkitUserModify: !isDisabled
              ? "read-write-plaintext-only"
              : undefined,
          }}
          role="textbox"
          aria-multiline="true"
          aria-placeholder={placeholderText}
          aria-disabled={isDisabled ? "true" : "false"}
          aria-label={
            selectedCommand
              ? `Prompt for command ${selectedCommand}`
              : "Command or prompt input"
          }
          // Consider aria-controls for popups if needed
          // aria-activedescendant={ showSlashPopup && filteredCommands[slashSelectedIndex] ? `slash-command-${filteredCommands[slashSelectedIndex].command}` : undefined }
        >
          {/* Content managed by useEffect */}
        </div>

        {/* Send Button (Keep as is) */}
        <button /* ... props ... */>
          {hubspotMode ? (
            <img
              src="/icons/hubspot/hubspot48.png"
              alt="Hubspot Send"
              className="d4m-w-5 d4m-h-5"
            />
          ) : (
            <Send className="d4m-w-5 d4m-h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
