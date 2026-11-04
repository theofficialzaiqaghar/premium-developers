# Ollama installation paths (Premium Developers)

| Item | Path |
| --- | --- |
| **Application (default)** | `%LOCALAPPDATA%\Programs\Ollama\` (typically `C:\Users\<you>\AppData\Local\Programs\Ollama\ollama.exe`) |
| **Model storage (configured)** | `D:\OllamaModels` via user environment variable `OLLAMA_MODELS` |
| **Installer download (optional)** | `D:\OllamaInstall\OllamaSetup.exe` |
| **Automation config (local, gitignored)** | `automation/config.local.json` |

After changing `OLLAMA_MODELS`, restart the Ollama app/service so new pulls use `D:\OllamaModels`.

No other user environment variables were modified.
