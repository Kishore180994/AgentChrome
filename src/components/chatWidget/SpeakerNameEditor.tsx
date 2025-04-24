import React, { useState } from "react";
import { SpeakerNameEditorProps } from "./types";

export const SpeakerNameEditor: React.FC<SpeakerNameEditorProps> = ({
  speaker,
  accentColor,
  speakerNames,
  setSpeakerNames,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(
    speakerNames[speaker] || speaker
  );

  const handleSave = () => {
    setSpeakerNames({
      ...speakerNames,
      [speaker]: editingName,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingName(speakerNames[speaker] || speaker);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="d4m-flex d4m-items-center d4m-gap-1">
        <input
          type="text"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="d4m-text-xs d4m-px-1 d4m-py-0.5 d4m-rounded d4m-bg-gray-700 d4m-text-white d4m-border d4m-border-gray-500 d4m-w-24"
          autoFocus
        />
        <button
          onClick={handleSave}
          className="d4m-text-xs d4m-px-1 d4m-py-0.5 d4m-rounded d4m-bg-green-600 d4m-text-white"
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={`d4m-text-xs d4m-font-bold d4m-px-1 d4m-py-0.5 d4m-rounded d4m-bg-${accentColor}-500 d4m-text-white d4m-cursor-pointer hover:d4m-bg-${accentColor}-600`}
      title="Click to edit speaker name"
    >
      {speakerNames[speaker] || speaker}
    </button>
  );
};
