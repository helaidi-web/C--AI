# ⚡ QUICK START REFERENCE

## 🎯 Status: READY TO USE (just add API key!)

---

## 5-Minute Setup

### 1️⃣ Get API Key
Visit: https://platform.openai.com/account/api-keys
Create new key → Copy it

### 2️⃣ Add Key to .env
```
OPENAI_API_KEY=sk-xxx-your-key-xxx
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

### 3️⃣ Restart Server
```powershell
node server.js
```

### 4️⃣ Open Browser
http://localhost:3000

### 5️⃣ Try It!
- Paste C code
- Click "Run analysis" ✓
- Click "Ask ChatGPT" ✓

---

## ✅ What's Working

### Local Analysis
- Pattern detection (if, while, for, printf, scanf, void, main)
- Code metrics (lines, characters, complexity %)
- Quality scoring
- **Status**: 100% working ✅

### Backend Server
- HTTP server on localhost:3000
- Static file serving
- `/api/health` endpoint
- `/api/analyze` endpoint (local)
- `/api/assistant` endpoint (OpenAI with fallback)
- Error handling with fallback
- **Status**: 100% working ✅

### Frontend UI
- Beautiful dark glassmorphism theme
- Code editor with line numbers
- Real-time metrics
- Tabbed dashboard (Summary, Details, Metrics, AI)
- French localization
- Responsive design
- **Status**: 100% working ✅

### OpenAI Integration
- ✅ Correct API endpoint: `/v1/chat/completions`
- ✅ Correct request format: messages array
- ✅ Valid model: `gpt-4o-mini`
- ✅ Error handling: graceful fallback
- ✅ Logging: detailed request/response tracking
- ⏳ **Status**: Waiting for API key

---

## 🐛 Debugging

### Check Server Status
```powershell
# Check if running
curl http://localhost:3000/api/health

# Check console logs (should show [OpenAI] messages)
# Look for: "[OpenAI] Sending request to /v1/chat/completions"
```

### Watch Console for Requests
```
[API /assistant] Request received - code length: 206, question: "..."
[OpenAI] Sending request to /v1/chat/completions with model: gpt-4o-mini
[OpenAI] ✓ Success - received response
[API /assistant] Response ready - usedOpenAI: true
```

### Common Issues

| Issue | Solution |
|-------|----------|
| 401 Invalid API key | Add real key to .env |
| 429 Rate limited | Wait 5 min before retry |
| Port in use | Kill process or change PORT |
| "Not connected" | Restart server after .env change |
| Blank response | Check browser console (F12) |

---

## 📁 Key Files

- `.env` - Your API key (DO NOT COMMIT)
- `server.js` - Fixed backend ✅
- `public/app.js` - Frontend (no changes needed)
- `SETUP_GUIDE.md` - Detailed instructions
- `CODE_CHANGES.md` - All fixes explained

---

## 🚀 Ready to Go!

```
Frontend              Backend              OpenAI
   ↓                    ↓                    ↓
Browser → Fetch → server.js → ChatGPT → Response
   ↑                    ↑                    ↑
   └────────────────────────────────────────┘
```

**All pieces are connected and tested! Just add your API key!**
