# 🎤 InterviewAI

Your personal AI interview assistant. Paste your resume, add the job description, and get personalized answers to any interview question in real-time.

## Quick Start

### 1. Install dependencies

```bash
cd interviewai
npm install
```

### 2. Set up environment variables

Copy the example env file and add your API keys:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your keys:

```
OPENAI_API_KEY=sk-your-openai-key
TAVILY_API_KEY=tvly-your-tavily-key
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser (Chrome recommended for voice features).

## How It Works

1. **Setup** — Paste your resume (or upload a PDF), add the job description, enter the role title and company name
2. **Company Research** — The app automatically researches the company using Tavily Search API
3. **Interview** — Tap the mic, speak your question, and get a personalized AI answer streamed back in real-time

## Tech Stack

- **Framework:** Next.js 14 with App Router + TypeScript
- **Styling:** Tailwind CSS (dark mode)
- **AI:** OpenAI GPT-4o with streaming
- **Voice (Primary):** Web Speech API (browser-native)
- **Voice (Fallback):** OpenAI Whisper API
- **Company Research:** Tavily Search API
- **PDF Parsing:** pdf-parse (server-side)
- **State Management:** React Context

## API Keys Required

| Key | Service | Where to Get |
|-----|---------|-------------|
| `OPENAI_API_KEY` | GPT-4o + Whisper | [platform.openai.com](https://platform.openai.com) |
| `TAVILY_API_KEY` | Company research | [tavily.com](https://tavily.com) |

## Browser Support

- **Chrome / Edge:** Full support (Web Speech API + all features)
- **Firefox / Safari:** Fallback to hold-to-record mode (Whisper API)

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add your environment variables in Vercel's dashboard under Settings → Environment Variables.

## Project Structure

```
interviewai/
├── app/
│   ├── layout.tsx              # Root layout, dark mode, Inter font
│   ├── page.tsx                # Redirect to /setup
│   ├── setup/page.tsx          # Setup screen
│   ├── interview/page.tsx      # Interview screen
│   └── api/
│       ├── answer/route.ts     # Edge streaming GPT-4o
│       ├── research/route.ts   # Tavily + GPT company summary
│       └── transcribe/route.ts # Whisper fallback
├── components/
│   ├── SetupForm.tsx           # 4-field form + PDF upload
│   ├── MicButton.tsx           # Visual states + animations
│   ├── AnswerDisplay.tsx       # Streaming text renderer
│   ├── TranscriptPreview.tsx   # Editable live transcript
│   └── SessionHistory.tsx      # Collapsible Q&A list
├── hooks/
│   ├── useSpeechRecognition.ts # Web Speech API + silence detection
│   ├── useWhisper.ts           # MediaRecorder + Whisper fallback
│   └── useStreamingAnswer.ts   # Streaming GPT responses
├── lib/
│   ├── types.ts                # TypeScript interfaces
│   ├── buildSystemPrompt.ts    # System prompt template
│   ├── trimContext.ts          # Token budget trimming
│   └── parsePdf.ts             # PDF text extraction
├── store/
│   └── sessionStore.ts         # React Context state
└── .env.local.example          # API keys template
```
