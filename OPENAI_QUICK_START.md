# OpenAI Integration - Quick Start

**Setup time: 5 minutes**

---

## ✅ What's Implemented

- ✓ OpenAI service layer (`openaiService.js`)
- ✓ AI controller with 5 endpoints (`aiController.js`)
- ✓ AI Insights component (frontend)
- ✓ Analysis Chat component (frontend)
- ✓ Routes configured
- ✓ Documentation complete

---

## 🚀 Quick Setup

### Step 1: Get API Key (2 min)
```
1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with sk_)
```

### Step 2: Add to .env (1 min)
```bash
# backend/.env
OPENAI_API_KEY=sk_your_key_here
OPENAI_MODEL=gpt-4o-mini
```

### Step 3: Install & Restart (2 min)
```bash
cd backend
npm install
npm run dev
```

### Done! ✨

---

## 💻 Usage

### In Backend
```javascript
const openai = require('../services/openaiService')

// Generate summary
const summary = await openai.generateAnalysisSummary(analysisData)

// Get recommendations
const recs = await openai.generateRecommendations(finding)

// Estimate savings
const savings = await openai.estimatePotentialSavings(finding)

// Chat
const answer = await openai.chatAboutAnalysis(question, context)
```

### In Frontend
```typescript
import { AIInsights } from "@/components/ai-insights"
import { AnalysisChat } from "@/components/analysis-chat"

// Show insights
<AIInsights analysisData={data} />

// Show chat
<AnalysisChat analysisData={data} />
```

---

## 📊 API Endpoints

```
POST /api/ai/analyze                 → Full analysis with AI
POST /api/ai/chat                    → Chat about analysis
POST /api/ai/summary                 → Just the summary
POST /api/ai/recommendations         → Specific recommendations
POST /api/ai/estimate-savings        → Savings estimates
```

All require authentication (`requireAuth`).

---

## 💰 Costs

- Per analysis: ~$0.01-0.05
- Per chat: ~$0.01-0.02
- Monthly for 100 analyses: ~$5-10
- Chat is unlimited (no additional cost)

**Monitor:**
- https://platform.openai.com/account/billing/overview

---

## 🧪 Test It

### With Frontend Component
```typescript
import { AIInsights } from "@/components/ai-insights"

export default function TestAI() {
  const testData = {
    summary: {
      totalInvoices: 100,
      totalAmount: 50000,
      duplicatePayments: [],
      unusualAmounts: []
    },
    findings: []
  }

  return <AIInsights analysisData={testData} />
}
```

### With cURL
```bash
curl -X POST http://localhost:4000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "analysisData": {
      "summary": { "totalInvoices": 100 },
      "findings": []
    }
  }'
```

---

## 🔧 Files Changed

**Backend:**
- ✓ `package.json` - added axios
- ✓ `env.example.backend.txt` - added OpenAI vars
- ✓ `src/services/openaiService.js` - NEW
- ✓ `src/controllers/aiController.js` - NEW
- ✓ `src/routes/index.js` - added routes

**Frontend:**
- ✓ `components/ai-insights.tsx` - NEW
- ✓ `components/analysis-chat.tsx` - NEW

---

## 🆘 Troubleshooting

| Issue | Fix |
|-------|-----|
| "Invalid API Key" | Check .env, restart server |
| "Timeout" | Network issue, try again |
| "Empty response" | Check analysisData format |
| "Rate limit" | Wait 1 minute, upgrade plan |
| "No OPENAI_API_KEY" | Set in .env, restart |

See `OPENAI_INTEGRATION_GUIDE.md` for more.

---

## 📖 Full Documentation

Read: `OPENAI_INTEGRATION_GUIDE.md` for:
- Detailed setup
- All features explained
- Code examples
- Cost optimization
- Advanced usage
- FAQ

---

## ✨ Features

- 🤖 AI analysis summaries
- 💡 Smart recommendations
- 💰 Savings estimation
- 💬 Unlimited chat support
- 🎯 Batch processing
- 📊 Context-aware responses

---

## 🎯 Next Steps

1. ✅ Add API key to `.env`
2. ✅ Run `npm install`
3. ✅ Test with `/api/ai/analyze`
4. ✅ Add components to dashboard
5. ✅ Monitor OpenAI usage

---

## 💬 Example Usage

```typescript
// User runs analysis
const analysis = await fetchAnalysis()

// Show AI insights
<AIInsights analysisData={analysis} />

// User can ask questions
<AnalysisChat analysisData={analysis} />

// Output: AI recommendations + savings estimates
```

---

**You're ready!** 🚀

Questions? Check `OPENAI_INTEGRATION_GUIDE.md`
