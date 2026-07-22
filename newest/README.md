# rsod-agent-platform

## Day08 OpenAI Agent Setup

Day08 chat uses LangChain with OpenAI-compatible chat models. For Qwen/DashScope, put your key in `backend/.env`:

```env
LLM_PROVIDER=qwen
QWEN_API_KEY=sk-your-dashscope-api-key
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DEFAULT_MODEL_PATH=runs/train/rain_yolo_multiclass_v1(final)/weights/best.pt
DEFAULT_DATA_YAML=datasets/rsod/raindataset/data.yaml
```

To use Gemini, set:

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
```

To use OpenAI instead, set `LLM_PROVIDER=openai` and configure `OPENAI_API_KEY`.

Do not commit `backend/.env`. If the selected provider key is empty, the shortcut detection buttons still work, but natural-language Agent calls will return a setup reminder.

Run backend:

```powershell
cd backend
.\.venv\Scripts\python.exe main.py
```

Run frontend:

```powershell
cd frontend
npm run dev
```
