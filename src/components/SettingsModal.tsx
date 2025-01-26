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
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
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
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Provider
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="aiProvider"
                  value="gemini"
                  checked={aiProvider === "gemini"}
                  onChange={(e) =>
                    setAiProvider(e.target.value as Settings["aiProvider"])
                  }
                  className="mr-2"
                />
                Gemini
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="aiProvider"
                  value="openai"
                  checked={aiProvider === "openai"}
                  onChange={(e) =>
                    setAiProvider(e.target.value as Settings["aiProvider"])
                  }
                  className="mr-2"
                />
                OpenAI
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter your ${
                aiProvider === "gemini" ? "Gemini" : "OpenAI"
              } API key`}
            />
          </div>

          {aiProvider === "gemini" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vision API Key
              </label>
              <input
                type="password"
                value={visionKey}
                onChange={(e) => setVisionKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Vision API key"
              />
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={saveKeys}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save Keys
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>Get your API keys from:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Google AI Studio (Gemini)
              </a>
            </li>
            <li>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
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
