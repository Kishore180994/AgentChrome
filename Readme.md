# AI Assistant Chrome Extension

**Table of Contents**  
- [Overview](#overview)  
- [Key Features](#key-features)  
- [Tech Stack & Dependencies](#tech-stack--dependencies)  
- [Project Structure](#project-structure)  
- [Setup & Installation](#setup--installation)  
  - [Local Development](#local-development)  
  - [Loading as a Chrome Extension](#loading-as-a-chrome-extension)  
- [Usage](#usage)  
  - [Hotkeys](#hotkeys)  
  - [Listening & Watching](#listening--watching)  
  - [Action Recording](#action-recording)  
  - [Settings](#settings)  
- [Core Files & Their Responsibilities](#core-files--their-responsibilities)  
  - [Components](#components)  
  - [Services](#services)  
  - [Utilities](#utilities)  
  - [Entry Points](#entry-points)  
- [API Keys & Providers](#api-keys--providers)  
- [How it Works](#how-it-works)  
  - [Background Script](#background-script)  
  - [Content Script](#content-script)  
  - [Speech Recognition & Transcription](#speech-recognition--transcription)  
  - [Screen Capture](#screen-capture)  
- [Roadmap & Ideas](#roadmap--ideas)  
- [License](#license)

---

## Overview
This repository contains a **Chrome Extension** that provides an AI Assistant capable of:
1. **Voice-driven commands** (via built-in speech recognition).
2. **Screen analysis** (watching and understanding what’s on the page).
3. **Browser automation** (filling out forms, clicking buttons, etc.).
4. **Connecting to multiple AI providers** (OpenAI GPT-4, Google Gemini, Google Vision, etc.).

The vision is to create a *“Stagehand”* style assistant that can handle tasks like:
- Navigating through complex SaaS apps (HubSpot, Jira, etc.).
- Filtering and emailing a list of recent contacts.
- Generating context-relevant text or content on-the-fly.

---

## Key Features
- **Realtime Screen Capture** for image understanding (via background script).
- **Text-based Chat Widget** (React-based) to converse with the AI.
- **Voice Input** via `OpenAISpeech` class (records user speech, converts to text).
- **Action Recording** using a custom “Stagehand” recorder system.
- **Multiple AI Providers** supported:
  - OpenAI GPT models
  - Google Gemini (Google AI Studio)
  - Google Cloud Vision for image analysis

---

## Tech Stack & Dependencies
- **React + TypeScript** as the UI layer
- **Tailwind CSS** for styling
- **Vite** for bundling
- **lucide-react** for icons
- **Chrome Extension APIs** (background service worker, content script, etc.)
- **OpenAI / Google APIs** for AI features

---

## Project Structure
root
├─ .bolt/                   // Template/Build config from Repomix
│   ├─ config.json
│   └─ prompt
├─ src/
│   ├─ components/          // React UI components
│   │   ├─ ChatWidget.tsx
│   │   ├─ SettingsModal.tsx
│   │   └─ StagehandControls.tsx
│   ├─ services/            // AI services & logic
│   │   ├─ openai/          // OpenAI-specific code
│   │   │   ├─ audio/
│   │   │   │   ├─ converter.ts
│   │   │   │   └─ validation.ts
│   │   │   ├─ audio-utils.ts
│   │   │   ├─ chat.ts
│   │   │   ├─ index.ts
│   │   │   ├─ speech.ts
│   │   │   ├─ types.ts
│   │   │   └─ vision.ts
│   │   ├─ ai.ts
│   │   ├─ gemini.ts
│   │   ├─ openai.ts
│   │   └─ vision.ts        // Google Cloud Vision integration
│   ├─ utils/
│   │   ├─ stagehand.ts     // Action recording utility
│   │   └─ storage.ts       // Unified storage (Chrome sync or localStorage)
│   ├─ App.tsx              // Main React App
│   ├─ background.ts        // Chrome extension background script
│   ├─ content.ts           // Chrome extension content script
│   ├─ index.css
│   ├─ main.tsx             // React entry point
│   └─ vite-env.d.ts
├─ .gitignore
├─ eslint.config.js
├─ index.html
├─ manifest.json            // Chrome extension manifest
├─ package.json
├─ postcss.config.js
├─ tailwind.config.js
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts
---

## Setup & Installation

### Local Development
1. **Clone** this repository.
2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn
3.	Run in development mode:
    npm run dev
    This will start the Vite server, and you can open http://localhost:5173 to see the React application.
    (Note: Some extension features—like background scripts—won’t run in this dev server. This is primarily for UI debugging.)

## Loading as a Chrome Extension
	1.	Build the project:
    npm run build
    This creates a dist/ folder containing the extension assets.
    2.	Open Chrome and go to chrome://extensions.
	3.	Enable Developer Mode.
	4.	Click “Load unpacked” and select the dist/ folder.
    Chrome will load this project as an extension, and you should see its icon in your toolbar.

Note: The extension relies on background and content scripts. If you make changes, you’ll need to rebuild and reload the extension (or use an extension reloader).

Usage

Hotkeys
	•	⌘ + Shift + L: Toggle voice listening (start/stop AI voice transcription).
	•	⌘ + Shift + W: Toggle “Watching” or screen capture.
	•	⌘ + Click: Perform an action on the clicked element (sent to the AI or background for automation).
	•	⌘ + Right Click: Brings up a context menu for advanced AI actions (not fully implemented yet).

Listening & Watching
	•	Listening:
Activates the OpenAISpeech module, recording your voice. Transcripts appear in the Transcript panel of the UI (in App.tsx).
	•	Watching:
Captures frames from your screen using navigator.mediaDevices.getDisplayMedia in the background script. This can be used to analyze or interpret what’s visible on the screen.

Action Recording
	•	The Stagehand controls (StagehandControls.tsx) let you:
	•	Start Recording: Captures user actions, like clicks or typed input.
	•	Stop Recording: Ends recording and shows JSON output of actions.
	•	Clear: Clears all recorded actions.

Settings
	•	Click the gear icon in the header (the Settings icon). It opens SettingsModal.tsx.
	•	Enter your API keys (OpenAI, Gemini, and Vision).
	•	Choose which AI provider (OpenAI or Gemini) to use.
	•	These settings are saved in Chrome sync storage (if in extension mode) or localStorage (if in a normal browser tab).

    Core Files & Their Responsibilities

Components
	1.	ChatWidget.tsx
	•	Renders a chat interface with input box and conversation bubbles.
	•	Uses processWithAI (from ai.ts) to handle user queries and AI responses.
	2.	SettingsModal.tsx
	•	A modal for entering and saving API keys.
	•	Lets you toggle the AI Provider.
	3.	StagehandControls.tsx
	•	UI to start/stop recording user actions via the Stagehand utility.
	•	Displays recorded actions in JSON format.

Services
	1.	ai.ts
	•	Exports processWithAI, a function that calls either OpenAI or Gemini based on user settings.
	2.	gemini.ts
	•	Sends transcripts/screen content to Google’s Gemini API for generation.
	3.	openai/
	•	chat.ts: Communication with the OpenAI Chat Completion API.
	•	speech.ts: OpenAISpeech class for capturing and transcribing user audio (via Whisper).
	•	vision.ts: (Beta) Calls GPT-4 Vision API with an image URL.
	•	audio/: Contains converter.ts and validation.ts for handling audio format conversions.
	•	audio-utils.ts: Additional audio handling utilities.
	4.	openai.ts
	•	Similar to ai.ts, but specifically processes transcripts or images with OpenAI GPT-4 or GPT-4 Vision.
	5.	vision.ts (in the main services folder)
	•	Example integration with Google Cloud Vision API.

Utilities
	1.	stagehand.ts
	•	A simple action recorder that logs user actions (click, type, etc.).
	•	Has start, stop, getActions, and clear methods.
	2.	storage.ts
	•	Abstracts Chrome storage vs browser localStorage.
	•	Automatically detects if chrome.storage.sync is available.

Entry Points
	•	App.tsx:
Main UI container with buttons to toggle listening/watching, the chat widget, and Stagehand controls.
	•	background.ts:
The extension’s background script, which can capture the screen and handle messages from the content script.
	•	content.ts:
The content script injected into all pages, listening for hotkeys (⌘ + Shift + W) and user clicks.
Sends messages back to the background script to start/stop capture or automate actions.
	•	main.tsx:
React entry point. Renders <App /> into the DOM.

API Keys & Providers
	•	OpenAI
Sign up at https://platform.openai.com/ and create an API key. Enter it in the settings modal as openaiKey.
	•	Google Gemini (MakerSuite)
Go to https://makersuite.google.com/ to generate a Gemini key, then paste it in geminiKey.
	•	Google Vision
Enable the Cloud Vision API and create an API key for visionKey.

How it Works

Background Script
	•	In background.ts, the extension uses:
	•	navigator.mediaDevices.getDisplayMedia() to capture the screen.
	•	An ImageCapture object to grab frames from the screen stream.
	•	(Currently planned) Send these frames for analysis to Google Vision or GPT-4 Vision.

Content Script
	•	content.ts:
	•	Responds to keyboard shortcuts (e.g., ⌘ + Shift + W to toggle watching).
	•	Listens for ⌘ + Click events, sending details of the clicked element to the extension (e.g., for AI automation).

Speech Recognition & Transcription
	•	speech.ts:
	•	Uses the MediaRecorder API to record audio in short segments.
	•	Converts WebM/Opus segments to WAV (convertToWAV in audio/converter.ts).
	•	Calls OpenAI’s Whisper API to transcribe audio, returning recognized text.

Screen Capture
	•	Toggled in the main UI or via ⌘ + Shift + W.
	•	The background script captures frames repeatedly and could use them for:
	•	Vision tasks: text detection, object localization, etc.
	•	AI tasks: GPT-4 Vision or Gemini analysis.


    Roadmap & Ideas
	•	UI Enhancements: Show a live feed of recognized text/objects in the UI.
	•	Deeper Automation: Let the AI complete form fields or navigate a website automatically.
	•	Customizable Hotkeys: Let users rebind keyboard shortcuts.
	•	Better Error Handling: Notify users about invalid API keys, network failures, etc.
	•	Cross-browser Support: Adapt for Firefox or other Chromium-based browsers.