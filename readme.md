# Gemini - OpenRouter Voice (Native Extension)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0-green.svg)

**Seamlessly integrate Voxtral (or any OpenRouter voice model) into Google Gemini.**
This Chrome Extension adds a native-looking microphone button to Gemini's interface that uses high-quality external transcription models via OpenRouter.

## ❓ Why?
Gemini's native voice input is often inaccurate, slow, or struggles with accents and technical terms.
**This extension fixes that.**
Instead of relying on basic Speech-to-Text, this tool sends your audio to state-of-the-art AI models (like Voxtral, Gemini 2.5 Flash, or GPT-Audio). The result is transcription that understands context, punctuation, and multiple languages perfectly.

## 🚀 Features
*   **Stealth Design:** The button looks and feels like a native Google UI element.
*   **High Quality:** Defaults to Mistral's **Voxtral** model for superior transcription.
*   **Customizable:** Use any model ID from OpenRouter.
*   **Privacy-Focused:** Your API Key is stored locally in your browser (`chrome.storage`), never sent to us.
*   **CSP Bypass:** Works natively where UserScripts might fail.

## 📦 Installation (Developer Mode)

Since this modifies the Google interface, it is not on the Chrome Web Store.

1.  **Clone this repository:**
    ```bash
    git clone https://github.com/0n3m0r3/gemini-openrouter-voice.git
    ```
    or download the ZIP.
2.  Open Chrome/Brave/Edge and go to `chrome://extensions`.
3.  Enable **Developer mode** (top right).
4.  Click **Load unpacked**.
5.  Select the folder you just downloaded/cloned.
6.  Refresh Gemini.

## ⚙️ Configuration
1.  **Right-Click** on the new microphone button.
2.  Enter your **[OpenRouter](https://openrouter.ai/) API Key**.
3.  (Optional) Change the Model ID (Default: `mistralai/voxtral-small-24b-2507`).
4.  Click **Save**.

## 🛠️ Usage
1.  Look for the **Microphone Icon** (or Wave icon) next to the chat input in Gemini.
2.  **Left-Click to Record:** The icon will turn red and pulse.
3.  **Left-Click to Stop:** The icon will spin (processing).
4.  The transcribed text will be automatically inserted into the chat box.

## 📜 License
[MIT License](LICENSE)
