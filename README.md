# CareerBot

CareerBot is a full-stack AI-powered career coaching app. Upload your resume or paste your LinkedIn profile, get a 30-dimension profile scorecard, explore tailored career paths, and walk away with a concrete 4-week action plan.

## Live Demo

[https://careerbot.ondigitalocean.app](https://careerbot.ondigitalocean.app)

## What It Does

1. **Upload** — Drop a PDF resume or paste LinkedIn profile text
2. **Scorecard** — Instantly get a 30-dimension profile strength analysis across 5 categories
3. **Coach conversation** — A sharp AI career coach asks focused questions (max 2–3) to understand your constraints and goals
4. **Path cards** — Receive 3 tailored career paths with fit scores, salary ranges, timelines, and radar charts
5. **Action plan** — Pick a path and get a personalized 4-week plan with weekly deliverables, resume rewrites, and an outreach message

## Scorecard — 30 Evaluation Dimensions

Scores are 1–10 per dimension, grouped into 5 categories:

| Category | Dimensions |
|---|---|
| **Profile Presentation** | Profile Clarity, Positioning Sharpness, Keyword Optimization, ATS Compatibility, Achievements Specificity, Personal Branding |
| **Execution & Impact** | Execution Evidence, Impact Quantification, Scope of Influence, Ownership Signals, Leadership Indicators, Project Complexity |
| **Career Trajectory** | Career Narrative, Career Velocity, Title Progression, Tenure Stability, Role Diversity, Gaps Handling |
| **Skills & Market Fit** | Market Readiness, Technical Depth, Domain Expertise, Emerging Skills Alignment, Certifications & Learning, Education Relevance |
| **Growth & Visibility** | Cross-functional Exposure, Network & Visibility, Adaptability Evidence, Interview Readiness, Salary Trajectory, Recommendation Signals |

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Recharts |
| Backend | Node.js, Express |
| AI | OpenAI GPT-4o / GPT-4o-mini with streaming |
| PDF parsing | pdf-parse (in-memory, no disk writes) |
| Deployment | DigitalOcean App Platform |

## Architecture

```
CareerBot/                         ← npm workspace root
├── packages/
│   ├── backend/                   ← Express API (stateless)
│   │   └── src/
│   │       ├── app.js             ← server, static serving, routing
│   │       ├── routes/
│   │       │   ├── upload.js      ← PDF parse → resumeText + snapshot
│   │       │   ├── profile.js     ← LinkedIn text → resumeText + snapshot
│   │       │   ├── chat.js        ← streaming + non-streaming AI chat
│   │       │   └── score.js       ← 30-dimension scorecard generation
│   │       ├── services/
│   │       │   ├── geminiService.js   ← OpenAI client, retry, streaming
│   │       │   ├── pdfParser.js       ← pdf-parse wrapper
│   │       │   └── profileAnalyzer.js ← persona detection, snapshot build
│   │       └── utils/
│   │           └── promptBuilder.js   ← system prompt + scorecard prompt
│   └── frontend/                  ← React + Vite SPA
│       └── src/
│           ├── App.jsx            ← state machine, upload/chat/session flow
│           ├── components/
│           │   ├── UploadScreen.jsx
│           │   ├── ChatWindow.jsx
│           │   ├── ScorecardPanel.jsx  ← 30-dimension grouped display
│           │   ├── PathCardDeck.jsx
│           │   ├── ActionPlan.jsx
│           │   └── ...
│           └── services/api.js    ← all backend calls
```

## Key Design Decisions

**Stateless backend** — No sessions or database. The frontend passes `resumeText` and `conversationHistory` with every request. This means the backend can scale to any number of instances and survives restarts with zero state loss.

**Single-process deployment** — The Express server builds and serves the React frontend as static files, so only one web service component is needed on DigitalOcean App Platform.

**Streaming-first AI** — All chat responses use Server-Sent Events so users see the coach's reply word by word, not after a 5–10 second wait.

**Persona detection** — The backend classifies each profile as `RECENT_GRAD`, `PIVOT`, or `GROW` before the first message, which adjusts the coach's tone and framing for the rest of the conversation.

**Client-side session history** — Past sessions are stored in `localStorage` with the full conversation history and resume text, so users can resume previous coaching sessions without any server-side storage.

## Local Setup

```bash
# 1. Clone
git clone git@github.com:code3002/CareerBot.git
cd CareerBot

# 2. Install all workspace deps
npm install

# 3. Set up environment variables
cp .env.example packages/backend/.env
# Edit packages/backend/.env and add your OPENAI_API_KEY

# 4. Start both services
npm run dev
# Backend → http://localhost:3001
# Frontend → http://localhost:5173
```

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `OPENAI_API_KEY` | backend `.env` | Required. OpenAI API key |
| `PORT` | backend `.env` | Optional. Defaults to 3001 |
| `FRONTEND_URL` | backend `.env` | Optional. Added to CORS allowlist |
| `VITE_API_URL` | frontend `.env` | Optional. Defaults to same origin |

## Deployment (DigitalOcean App Platform)

1. Connect the GitHub repo (`code3002/CareerBot`, branch `main`)
2. Component type: **Web Service**
3. Build command: `npm install --include=dev && npm run build --workspace=packages/frontend`
4. Run command: `node packages/backend/src/app.js`
5. HTTP port: `8080`
6. Environment variable: `OPENAI_API_KEY` = your key (Run time scope)
