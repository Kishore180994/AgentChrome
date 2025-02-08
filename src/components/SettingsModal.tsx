import React, { useState, useEffect, useRef } from "react";
import { X, Key } from "lucide-react";
import { storage } from "../utils/storage";

interface Settings {
  geminiKey: string;
  visionKey: string;
  openaiKey: string;
  aiProvider: "gemini" | "openai";
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [geminiKey, setGeminiKey] = useState("");
  const [visionKey, setVisionKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [aiProvider, setAiProvider] =
    useState<Settings["aiProvider"]>("gemini");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await storage.get([
          "geminiKey",
          "visionKey",
          "openaiKey",
          "aiProvider",
        ]);
        setGeminiKey(settings.geminiKey || "");
        setVisionKey(settings.visionKey || "");
        setOpenaiKey(settings.openaiKey || "");
        setAiProvider(settings.aiProvider || "gemini");
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  const saveKeys = async () => {
    try {
      await storage.set({
        geminiKey,
        visionKey,
        openaiKey,
        aiProvider,
      });
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  if (!isOpen) return null;

  return (
    // Modal Overlay
    <div
      className="
        ext-fixed ext-inset-0 ext-z-50
        ext-bg-black/50 ext-backdrop-blur-sm
        ext-flex ext-items-center ext-justify-center
      "
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Container */}
      <div
        ref={modalRef}
        className="
          ext-relative ext-bg-gray-800/90
          ext-rounded-2xl ext-p-6 ext-w-full ext-max-w-md
          ext-ring-1 ext-ring-inset ext-ring-gray-500/50
          ext-shadow-xl ext-backdrop-blur-md
          ext-text-gray-100
        "
      >
        {/* Header */}
        <div className="ext-flex ext-items-center ext-justify-between ext-mb-6">
          <h2 className="ext-text-lg ext-font-semibold ext-flex ext-items-center gap-2 ext-text-cyan-200">
            <Key className="ext-w-5 ext-h-5" />
            API Settings
          </h2>
          <button
            onClick={onClose}
            className="ext-text-gray-400 ext-hover:text-gray-200 ext-transition-colors"
          >
            <X className="ext-w-5 ext-h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="ext-space-y-4 ext-text-sm">
          {/* AI Provider */}
          <div>
            <label className="ext-block ext-font-medium ext-text-cyan-100 ext-mb-2">
              AI Provider
            </label>
            <div className="ext-flex ext-gap-4 ext-text-gray-200">
              <label className="ext-flex ext-items-center ext-gap-1">
                <input
                  type="radio"
                  name="aiProvider"
                  value="gemini"
                  checked={aiProvider === "gemini"}
                  onChange={(e) =>
                    setAiProvider(e.target.value as Settings["aiProvider"])
                  }
                  className="ext-mr-1 ext-accent-cyan-600"
                />
                Gemini
              </label>
              <label className="ext-flex ext-items-center ext-gap-1">
                <input
                  type="radio"
                  name="aiProvider"
                  value="openai"
                  checked={aiProvider === "openai"}
                  onChange={(e) =>
                    setAiProvider(e.target.value as Settings["aiProvider"])
                  }
                  className="ext-mr-1 ext-accent-cyan-600"
                />
                OpenAI
              </label>
            </div>
          </div>

          {/* Gemini or OpenAI Key */}
          <div>
            <label className="ext-block ext-font-medium ext-text-cyan-100 ext-mb-1">
              {aiProvider === "gemini" ? "Gemini API Key" : "OpenAI API Key"}
            </label>
            <input
              type="password"
              value={aiProvider === "gemini" ? geminiKey : openaiKey}
              onChange={(e) =>
                aiProvider === "gemini"
                  ? setGeminiKey(e.target.value)
                  : setOpenaiKey(e.target.value)
              }
              className="
                ext-w-full ext-px-3 ext-py-2
                ext-bg-gray-900 ext-border ext-border-gray-700
                ext-rounded-lg ext-text-sm ext-text-gray-200
                ext-focus:outline-none ext-focus:ring-2 ext-focus:ring-cyan-500
                ext-placeholder-gray-500
              "
              placeholder={`Enter your ${
                aiProvider === "gemini" ? "Gemini" : "OpenAI"
              } API key`}
            />
          </div>

          {/* Vision Key if Gemini */}
          {aiProvider === "gemini" && (
            <div>
              <label className="ext-block ext-font-medium ext-text-cyan-100 ext-mb-1">
                Vision API Key
              </label>
              <input
                type="password"
                value={visionKey}
                onChange={(e) => setVisionKey(e.target.value)}
                className="
                  ext-w-full ext-px-3 ext-py-2
                  ext-bg-gray-900 ext-border ext-border-gray-700
                  ext-rounded-lg ext-text-sm ext-text-gray-200
                  ext-focus:outline-none ext-focus:ring-2 ext-focus:ring-cyan-500
                  ext-placeholder-gray-500
                "
                placeholder="Enter your Vision API key"
              />
            </div>
          )}

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={saveKeys}
              className="
                ext-w-full ext-bg-cyan-600 ext-text-white ext-py-2 ext-px-4 ext-rounded-lg
                ext-hover:bg-cyan-700 ext-transition-colors
                ext-disabled:bg-gray-600
              "
            >
              Save Keys
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="ext-mt-4 ext-text-xs ext-text-gray-400">
          <p>Get your API keys from:</p>
          <ul className="ext-list-disc ext-list-inside ext-space-y-1 ext-mt-1">
            <li>
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="ext-text-cyan-400 ext-hover:text-cyan-300 ext-underline"
              >
                Google AI Studio (Gemini)
              </a>
            </li>
            <li>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="ext-text-cyan-400 ext-hover:text-cyan-300 ext-underline"
              >
                Google Cloud Console (Vision)
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
