# Ollama local setup — Roman Urdu guide (Premium Developers blog automation)

**Note:** Koi model ya software automatic install nahi hota. Pehle aap ki approval, phir manual steps.

## 1. Aap ke PC ka summary (inspection date par)

- **RAM:** ~8 GB total (is waqt free kam ho sakta hai — doosri apps band karke Ollama chalayein)
- **CPU:** Intel Core i5-3320M (2 core / 4 thread) — purana lekin chhote models ke liye theek
- **GPU:** AMD FirePro M2000 (~1 GB VRAM) — Ollama aksar **CPU** par chalega; speed slow ho sakti hai
- **Disk:** C: par kam jagah ho to pehle space khali karein; models ki size 2 GB ke qareeb ho sakti hai
- **Ollama abhi:** PATH mein nahi mila, `http://127.0.0.1:11434` par service bhi nahi chal rahi

## 2. Model recommendation (aap ke hardware ke mutabiq)

| Model | RAM (approx) | Speed (aap ke PC) | Quality |
|-------|----------------|-------------------|---------|
| **llama3.2:3b** (primary) | ~6–8 GB system | Medium on CPU | Daily blog drafts ke liye best balance |
| **gemma2:2b** (fallback, manual) | ~4–6 GB | Faster | Chhota; zyada editing lag sakti hai |
| phi3:mini | ~6–8 GB | Medium | Alternative |
| mistral / llama 8B | 10 GB+ | **Not recommended** | Aap ke 8 GB RAM par fit nahi |

**Primary:** `llama3.2:3b`  
**Fallback (sirf config mein likhein, auto-switch nahi):** `gemma2:2b`

Download tab karein jab aap likh kar approve karein:

```text
ollama pull llama3.2:3b
```

## 3. Ollama install (manual)

1. https://ollama.com se Windows installer download karein.
2. Install karein (default localhost `11434` par chalega).
3. PC restart ya Ollama app open karein taake service start ho.
4. **Public internet par port forward mat karein** — sirf 127.0.0.1.

## 4. Project config

```text
copy automation\config.example.json automation\config.local.json
```

`config.local.json` git mein commit nahi hoti (gitignored).

`model` wahi rakhein jo `ollama list` mein dikhe.

## 5. Health check

```text
node automation/scripts/hardware-report.js
node automation/scripts/health-check.js
node automation/scripts/ollama-smoke-test.js
```

Smoke test sirf chhota local text generate karta hai — **blog par publish nahi karta**.

## 6. Code location

- Provider: `automation/ai/provider.js`
- Errors: `automation/ai/errors.js`
- Hardware: `automation/ai/hardware.js`

Agar Ollama band ho ya model missing ho to clear error milega — **koi aur model automatically use nahi hoga**.
