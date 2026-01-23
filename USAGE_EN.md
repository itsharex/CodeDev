# CtxRun - Detailed Usage Guide

This document provides detailed instructions, configuration guides, and keyboard shortcuts for all core features of CtxRun.

## Table of Contents

1.  [Context Forge (File Assembly)](#1-context-forge-file-assembly)
2.  [Spotlight (Global AI Terminal)](#2-spotlight-global-ai-terminal)
    *   [Search Mode](#-search-mode)
    *   [AI Chat Mode](#-ai-chat-mode)
3.  [Prompt Verse (Prompt Library)](#3-prompt-verse-prompt-library)
4.  [Patch Weaver (AI Completer)](#4-patch-weaver-ai-completer)
5.  [Setup Guide](#5-setup-guide)
6.  [Keyboard Shortcuts](#6-keyboard-shortcuts)

---

### 1. Context Forge (File Assembly)
**Solves the pain point:** Quickly package your project files into LLM-readable formats (ChatGPT/Claude/DeepSeek).

*   **File Selection**: Check the code files or folders you want the AI to understand in the left file tree, or set global filters and select filter rules below.
*   **Smart Statistics**: The bottom dashboard shows real-time total size of selected files, **estimated token count**, and language distribution.
*   **Token Optimization**:
    *   Enable **"Remove Comments"** to automatically strip code comments and save tokens.
    *   Automatically detect and filter binary files (images, PDFs, etc.).
*   **One-Click Export**: Click **Copy** to generate structured XML text with project structure tree and file content. Exporting as .txt file is recommended for sending to AI.

### 2. Spotlight (Global AI Terminal)
**Default Hotkey:** `Alt + S` (Windows) or `Option + S` (macOS). Hotkeys are blocked on Linux by default but can be customized in settings.

Spotlight is an always-on-top floating window with multiple modes. Press **`Tab`** to switch, **`ESC`** to exit:

#### 🔍 Search Mode
Quickly search and use your command library.
*   **Search**: Enter keywords to find local or downloaded Prompts/Commands.
*   **Execute**: For command prompts, press `Enter` to execute via terminal (executed top-to-bottom).
*   **Copy**: Press `Enter` to copy content to clipboard.

#### 🧮 Calculator Mode
Calculate mathematical expressions directly:
*   Type `=1+1` → Result: 2
*   Type `=sin(pi/2)` → Result: 1
*   Supports common math functions: sin, cos, tan, log, sqrt, etc.

#### 💻 Shell Command Mode
Execute terminal commands directly:
*   Type `>ls -la` (Linux/Mac) or `>dir` (Windows)
*   Results are displayed directly in the Spotlight window
*   Run in terminal: Click the "Run in terminal" button

#### 📂 Scope Search
Use prefixes to quickly filter search scope:
*   `/app` - Search installed applications
*   `/cmd` - Search command library
*   `/pmt` - Search prompt library
*   No prefix searches all content

#### ✨ AI Chat Mode
Chat with AI without switching browsers.
*   **Configuration**: Configure API Key in Settings → AI Configuration. Not limited to the named models - any LLM can be used by providing API URL and Model ID. DeepSeek or GLM recommended (GLM has free models).
*   **Switch**: Press `Tab` in search mode to enter AI mode (purple interface), or type `/` to open command menu.
*   **Chat**: Type your question and press Enter for streaming typewriter replies. Supports Markdown rendering and code highlighting.
*   **Thinking Process**: Supports DeepSeek-R1 and other reasoning models. AI's "Thinking Process" can be collapsed/expanded.
*   **Template AI**: Check "Use as chat template" in prompt management to use that prompt as the AI chat system message.
*   **Clear Context**: Press `Ctrl + K` (or `Cmd + K`) to clear current temporary session.
    *   *Note: Spotlight is designed for "use and go". Chat history is only stored in memory and clears on restart.*

#### 📱 App Launcher
Quickly search and launch installed applications:
*   Type application name or keywords
*   Press `Enter` or click "Open" on selected app
*   Shows icons for common applications
*   Rebuild app index in Settings

---

### 3. Prompt Verse (Prompt Library)
Manage your common commands and AI prompts.

*   **Create & Edit**: Support creating custom groups and writing universal templates with variables (`{{variable}}`).
*   **Official Library**: Go to Settings → Library to download offline prompt packs (Linux commands, programming prompts, etc.).
*   **Override Mechanism**: If you favorite and modify official prompts, local modifications override official versions - no conflicts.
*   **Command Execution**: Create executable command prompts. Click to execute via terminal (top-to-bottom). Essentially a script that can theoretically execute any terminal command under user permissions.
*   **Template AI**: Check "Use as chat template" in the prompt editor to use that prompt as the Spotlight AI chat system message for custom AI behavior.

---

### 4. Patch Weaver
Designed to bridge the final gap between "AI-generated code" and "actual file modifications", eliminating manual copy-paste.

#### Core Positioning
**"LLM-Oriented Smart Patch Tool"**
Use fixed sentence patterns to directly merge AI output into code without manual copy-find-paste.

#### Scenario 1: AI Patch Applicator
The most innovative feature, designed for AI-assisted coding.

##### **Workflow:**

1.  **Load Project**: User first selects a local project root directory as the basis for locating and writing files.
2.  **Get Instructions**: Sidebar provides a key **"AI Instruction" (system prompt)**. User copies this prompt and appends their modification requirements (e.g., "Please convert this JS function to TS and add JSDoc comments") before sending to the LLM.
3.  **Paste AI Response**: LLM returns text containing `<<<<<<< SEARCH ... >>>>>>> REPLACE` blocks according to instructions. User pastes this text into Patch Weaver's input box.
4.  **Auto Parse & Preview**:
    *   Instantly parses all modification operations for one or multiple files in the text.
    *   For each file, reads local original content and **simulates applying patches in memory**.
    *   Final diff view based on Monaco Editor clearly shows before/after comparison.

#### Scenario 2: Git Version Comparator (Git Diff Visualizer)
A more traditional but powerful Git visualization tool.
![ScreenShot_2025-12-20_115923_830](./images/ScreenShot_2025-12-20_115923_830.png)

##### **Workflow:**

1.  **Browse Git Repository**: User selects a local project containing `.git` directory.
2.  **Load Commit Records**: App calls Rust backend via `git2` crate to safely read and display recent 50 commits in dropdown.
3.  **Select Versions**: User selects any two commits in "Base Version" and "Compare Version" dropdowns.
4.  **Generate Diff**: Click "Generate Diff", Rust backend calculates all file diffs between commits and returns structured data (file path, status, old/new content) to frontend.
5.  **Review & Export**:
    *   Left list clearly shows all **Added (A)**, **Modified (M)**, **Deleted (D)**, **Renamed (R)** files.
    *   Automatically identifies and marks **binary files** and **oversized files** to prevent lag.
    *   Click any file for detailed review in right diff view.
    *   Powerful **export feature** allows exporting selected file diffs in multiple formats (`Markdown`, `JSON`, `XML`, `TXT`) and layouts (`Split`, `Unified`, `Git Patch`), perfect for Code Review reports or archiving.

---

### 5. Setup Guide

To use Spotlight's AI chat feature, configure your model provider:

1.  Click the **Settings** icon at the bottom of the left sidebar.
2.  Go to **AI Configuration** tab.
3.  Fill in API information:
    *   **Provider**: Select `DeepSeek` / `OpenAI` / `Anthropic` (icons only, not limited to these).
    *   **API Key**: Enter your API key (data stored locally only).
    *   **Base URL**: (Optional) For **SiliconFlow** or other proxy services, enter corresponding Base URL (e.g., `https://api.siliconflow.cn`).
    *   **Model ID**: Enter model name (e.g., `deepseek-chat`).

---

### 6. Keyboard Shortcuts

| Hotkey | Scope | Function |
| :--- | :--- | :--- |
| `Alt + S` | Global | Show/hide Spotlight search box |
| `Tab` | Spotlight | Switch **Search Mode** / **AI Mode** |
| `Enter` | Spotlight | (Search Mode) Copy/execute command / (AI Mode) Send message |
| `Ctrl + K` | Spotlight | (AI Mode) Clear current chat history |
| `Esc` | Global | Close current window or dialog |
| `/` | Spotlight | Open command menu (slash commands) |
| `=` | Spotlight | Switch to calculator mode |
| `>` | Spotlight | Switch to shell command mode |
