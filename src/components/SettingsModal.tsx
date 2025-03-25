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
        d4m-fixed d4m-inset-0 d4m-z-50
        d4m-bg-black/50 d4m-backdrop-blur-sm
        d4m-flex d4m-items-center d4m-justify-center
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
          d4m-relative d4m-bg-gray-800/90
          d4m-rounded-2xl d4m-p-6 d4m-w-full d4m-max-w-md
          d4m-ring-1 d4m-ring-inset d4m-ring-gray-500/50
          d4m-shadow-xl d4m-backdrop-blur-md
          d4m-text-gray-100
        "
      >
        {/* Header */}
        <div className="d4m-flex d4m-items-center d4m-justify-between d4m-mb-6">
          <h2 className="d4m-text-lg d4m-font-semibold d4m-flex d4m-items-center gap-2 d4m-text-cyan-200">
            <Key className="d4m-w-5 d4m-h-5" />
            API Settings
          </h2>
          <button
            onClick={onClose}
            className="d4m-text-gray-400 d4m-hover:text-gray-200 d4m-transition-colors"
          >
            <X className="d4m-w-5 d4m-h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="d4m-space-y-4 d4m-text-sm">
          {/* AI Provider */}
          <div>
            <label className="d4m-block d4m-font-medium d4m-text-cyan-100 d4m-mb-2">
              AI Provider
            </label>
            <div className="d4m-flex d4m-gap-4 d4m-text-gray-200">
              <label className="d4m-flex d4m-items-center d4m-gap-1">
                <input
                  type="radio"
                  name="aiProvider"
                  value="gemini"
                  checked={aiProvider === "gemini"}
                  onChange={(e) =>
                    setAiProvider(e.target.value as Settings["aiProvider"])
                  }
                  className="d4m-mr-1 d4m-accent-cyan-600"
                />
                Gemini
              </label>
              <label className="d4m-flex d4m-items-center d4m-gap-1">
                <input
                  type="radio"
                  name="aiProvider"
                  value="openai"
                  checked={aiProvider === "openai"}
                  onChange={(e) =>
                    setAiProvider(e.target.value as Settings["aiProvider"])
                  }
                  className="d4m-mr-1 d4m-accent-cyan-600"
                />
                OpenAI
              </label>
            </div>
          </div>

          {/* Gemini or OpenAI Key */}
          <div>
            <label className="d4m-block d4m-font-medium d4m-text-cyan-100 d4m-mb-1">
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
                d4m-w-full d4m-px-3 d4m-py-2
                d4m-bg-gray-900 d4m-border d4m-border-gray-700
                d4m-rounded-lg d4m-text-sm d4m-text-gray-200
                d4m-focus:outline-none d4m-focus:ring-2 d4m-focus:ring-cyan-500
                d4m-placeholder-gray-500
              "
              placeholder={`Enter your ${
                aiProvider === "gemini" ? "Gemini" : "OpenAI"
              } API key`}
            />
          </div>

          {/* Vision Key if Gemini */}
          {aiProvider === "gemini" && (
            <div>
              <label className="d4m-block d4m-font-medium d4m-text-cyan-100 d4m-mb-1">
                Vision API Key
              </label>
              <input
                type="password"
                value={visionKey}
                onChange={(e) => setVisionKey(e.target.value)}
                className="
                  d4m-w-full d4m-px-3 d4m-py-2
                  d4m-bg-gray-900 d4m-border d4m-border-gray-700
                  d4m-rounded-lg d4m-text-sm d4m-text-gray-200
                  d4m-focus:outline-none d4m-focus:ring-2 d4m-focus:ring-cyan-500
                  d4m-placeholder-gray-500
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
                d4m-w-full d4m-bg-cyan-600 d4m-text-white d4m-py-2 d4m-px-4 d4m-rounded-lg
                d4m-hover:bg-cyan-700 d4m-transition-colors
                d4m-disabled:bg-gray-600
              "
            >
              Save Keys
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="d4m-mt-4 d4m-text-xs d4m-text-gray-400">
          <p>Get your API keys from:</p>
          <ul className="d4m-list-disc d4m-list-inside d4m-space-y-1 d4m-mt-1">
            <li>
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="d4m-text-cyan-400 d4m-hover:text-cyan-300 d4m-underline"
              >
                Google AI Studio (Gemini)
              </a>
            </li>
            <li>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="d4m-text-cyan-400 d4m-hover:text-cyan-300 d4m-underline"
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
