# <img src="public/logo.svg" width="36" height="36" style="vertical-align: middle; margin-right: 12px; margin-bottom: 4px;" alt="Infera Notebook Logo"> Infera Notebook

<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/demo/dark.png">
  <source media="(prefers-color-scheme: light)" srcset="public/demo/light.png">
  <img alt="Infera Notebook Demo" src="public/demo/dark.png" width="100%">
</picture>

**AI-Powered Knowledge Management, Semantic RAG & Multimedia Content Generation Platform**

_Transform diverse documents into interactive knowledge bases with AI-powered chat, multi-speaker audio podcasts, programmatic video recaps, and interactive visual notes._

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.0-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.2.0-2D3748)](https://www.prisma.io/)
[![Inngest](https://img.shields.io/badge/Inngest-Durable_Execution-green)](https://www.inngest.com/)

</div>

---

## 🌟 Overview

**Infera Notebook** is a modern, open-source AI knowledge assistant and content generation platform inspired by Google NotebookLM, engineered for speed, flexibility, and production scale.

Connect files, videos, websites, or code repositories to your personal notebooks. Infera automatically processes, chunks, and embeds your materials into a vector database, enabling grounded semantic search, citation-backed chat, interactive voice conversations, and automated synthesis across 12 distinct multimedia formats.

---

## ✨ Key Features

### 📚 Multi-Format Source Ingestion (16 Formats Supported)

Upload and index virtually any knowledge format:

- **Documents**: PDF (`.pdf`), Word (`.docx`), PowerPoint (`.pptx`), EPUB (`.epub`), Plain Text (`.txt`)
- **Structured Data**: CSV (`.csv`), JSON (`.json`), JSON Lines (`.jsonl`)
- **Audio & Video**: MP3 (`.mp3`), M4A (`.m4a`), MP4 (`.mp4`), WebM (`.webm`) with automatic speech-to-text transcription via Deepgram and AssemblyAI
- **Web & Code**: Web URLs (via Tavily Extract), YouTube videos (automated transcript extraction), GitHub repositories
- **Subtitles**: SubRip subtitle files (`.srt`)

### 🧠 Dynamic AI Model Router & Multi-Tier Fallback

An intelligent, bounded syntax-based task classifier that dynamically directs prompts through specialized fallback chains with automatic in-memory cooldown:

- **Flagship Reasoning**: Gemini 3.8 Flash & Gemini 3.6 Flash for deep synthesis, complex analysis, and structured outputs
- **High-Throughput Chat**: Gemini 3.5 Flash-Lite & Gemini 3.1 Flash-Lite (up to 500 RPD) for responsive streaming conversations
- **Quota Workhorses**: Gemma 4 (26B & 31B) for high-frequency operations like title generation (14,400 RPD)
- **Multi-Speaker TTS**: Gemini 2.5 Flash Preview TTS and Gemini 3.1 Flash TTS Preview with structured multi-speaker dialogue turns and voice configs
- **Multimodal Vector Embeddings**: Google `gemini-embedding-2` with 768-dimensional Matryoshka Representation Learning (MRL), batched with rate-limit backoff

### 🎙️ Real-Time Voice Agent & Gemini Live API

Experience low-latency, interruptible voice interactions with your documents:

- **Deepgram Flux & Aura-2**: WebSocket-streamed live speech recognition with natural end-of-thought detection (`eot_threshold=0.7`), grounded multi-speaker conversational reasoning, and immediate interruption (barge-in) support
- **Gemini Live API**: Bidirectional multimodal audio streaming over WebSockets powered by ephemeral session tokens for real-time natural dialogue

### 📝 12 Rich Content & Note Generation Formats

Generate studio-grade summaries, study materials, and interactive media from your sources:

| Format                 | Description                                                                           | Powered By                              |
| ---------------------- | ------------------------------------------------------------------------------------- | --------------------------------------- |
| **📄 Editable Notes**  | Full-featured block-based rich text editor with markdown import/export                | [BlockNote](https://www.blocknote.dev/) |
| **💬 Chat Notes**      | Saved conversations and insights directly captured from chat sessions                 | AI Markdown                             |
| **🎙️ Audio Overviews** | Multi-speaker, studio-quality podcast conversations with customizable character hosts | Gemini Multi-Speaker TTS / Deepgram     |
| **🗺️ Mind Maps**       | Interactive node graphs visually mapping concepts and relationships                   | [@xyflow/react](https://reactflow.dev/) |
| **❓ FAQs**            | Auto-generated question-and-answer pairs synthesizing core themes                     | Structured JSON                         |
| **📅 Timelines**       | Chronological ordering of historical, project, or conceptual milestones               | Structured JSON                         |
| **📊 Briefing Docs**   | Executive-ready research summaries, key findings, and decision briefs                 | Structured JSON                         |
| **🧠 Quizzes**         | Interactive knowledge assessments with instant scoring and explanations               | Structured JSON                         |
| **🎴 Flash Cards**     | Interactive double-sided study cards for active recall and spaced repetition          | Structured JSON                         |
| **📽️ Slide Decks**     | Presentation decks complete with titles, bullets, and speaker notes *(Coming Soon)*   | Structured JSON                         |
| **📈 Infographics**    | Visually categorized statistical, thematic, and hierarchical cards *(Coming Soon)*    | Structured JSON                         |
| **🎬 Video Overviews** | Synchronized video recaps with animated slides and audio *(Coming Soon)*              | [Remotion](https://www.remotion.dev/)   |

### 🔍 Production-Grade RAG Architecture

- **Native Pinecone Documents API**: High-dimensional vector search powered by Pinecone's native Documents API (`2026-07`) with flat document chunks, integrated text storage, and namespace-level metadata isolation
- **Extracted Text Caching**: Extracted source text is cached directly in S3/R2 storage (`extracted-text/{sourceId}.txt`) to eliminate re-scraping penalties and enable instant note generation
- **Grounded Citations**: Real-time streaming chat with inline source references and clickable context expansion
- **Event-Driven Background Workers**: Asynchronous processing with Inngest and Server-Sent Events (SSE) for instantaneous UI status updates
- **Secure Media Storage**: Cloudflare R2 / AWS S3 storage with short-lived presigned URLs for media privacy and performance

---

## 🛠️ Tech Stack

### Core & Framework

- **[Next.js 16.1](https://nextjs.org/)** (App Router, Server Actions, Route Handlers)
- **[React 19.2](https://react.dev/)**
- **[TypeScript 5](https://www.typescriptlang.org/)**
- **[Tailwind CSS 4](https://tailwindcss.com/)** with `tw-animate-css`

### Database & Authentication

- **[PostgreSQL](https://www.postgresql.org/)** (Neon Serverless PostgreSQL)
- **[Prisma 7.2](https://www.prisma.io/)** with `@prisma/adapter-pg`
- **[Better Auth](https://better-auth.com/)** (Session management and Google OAuth)

### AI, Speech & Search

- **[Google Gemini](https://ai.google.dev/)** (Gemini 3.5 Flash-Lite, Gemini 2.5 Flash Preview TTS, Gemini 3.1 Flash TTS Preview)
- **[Google Embeddings](https://ai.google.dev/)** (`gemini-embedding-2` 768-dim MRL)
- **[Deepgram](https://www.deepgram.com/)** (Flux ASR, Nova-3 STT, Aura-2 TTS)
- **[AssemblyAI](https://www.assemblyai.com/)** (Audio intelligence and transcription)
- **[Pinecone](https://www.pinecone.io/)** (Serverless vector database with native Documents API `2026-07`)
- **[LangChain](https://www.langchain.com/)** (Document splitters and text parsers)
- **[Tavily](https://tavily.com/)** (Web scraping, URL content extraction, and real-time AI search)

### Media, Workflow & UI

- **[Remotion 4.0](https://www.remotion.dev/)** (Programmatic video synthesis)
- **[BlockNote 0.45](https://www.blocknote.dev/)** (Notion-style block text editor)
- **[@xyflow/react](https://reactflow.dev/)** (Interactive node graphs and mind maps)
- **[Inngest 3.48](https://www.inngest.com/)** (Durable background workflows & realtime pub/sub)
- **[AWS SDK S3](https://aws.amazon.com/s3/)** (Cloudflare R2 / AWS S3 object storage)
- **[shadcn/ui](https://ui.shadcn.com/)** & **[Radix UI](https://www.radix-ui.com/)**
- **[Motion](https://motion.dev/)** (Fluid micro-interactions and transitions)
- **[Lucide React](https://lucide.dev/)** & **[Iconify](https://iconify.design/)**

---

## 📁 Project Structure

```
infera-notebook/
├── prisma/                     # Database schema, migrations, and Prisma configuration
│   ├── schema.prisma           # Relational schema (User, Notebook, Source, File, Note, Chat)
│   └── migrations/             # SQL migration files
├── public/                     # Static public assets, logo, demo previews
├── remotion/                   # Remotion video synthesis compositions and root player
│   ├── Composition.tsx         # Slide-synchronized video layout
│   └── Root.tsx                # Remotion composition registry
├── scripts/                    # Operational automation scripts
│   ├── setup-bucket.ts         # S3/R2 bucket provisioning and CORS configuration
│   ├── teardown-bucket.ts      # Bucket cleanup and teardown utility
│   └── reset-pinecone.ts       # Pinecone vector index wipe and reset
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Authentication routes (sign-in, sign-up, verify)
│   │   ├── (main)/             # Application workspace routes
│   │   │   ├── account/        # User profile and account settings
│   │   │   ├── billing/        # Usage and billing dashboard
│   │   │   └── notebooks/      # Notebook dashboard and active workspace ([notebookId])
│   │   ├── api/                # API Route Handlers
│   │   │   ├── auth/           # Better Auth endpoints
│   │   │   ├── chat/           # RAG streaming chat & audio transcription
│   │   │   ├── inngest/        # Inngest durable function execution webhook
│   │   │   ├── live/           # Gemini Live API ephemeral session token generator
│   │   │   ├── notebooks/      # Notebook CRUD endpoints
│   │   │   ├── s3/             # S3 presigned upload URL generator
│   │   │   ├── sources/        # Source creation, deletion, and file handling
│   │   │   └── voice-agent/    # Interactive voice chat turn endpoints
│   │   ├── globals.css         # Tailwind CSS design system tokens
│   │   └── layout.tsx          # Root HTML layout and ThemeProvider
│   ├── components/             # Reusable UI component modules
│   │   ├── ai-elements/        # Specialized AI UI widgets (message, reasoning, prompt-input)
│   │   ├── asr/                # Voice recognition components (Flux ASR hook & widget)
│   │   ├── auth/               # Authentication dialogs and forms
│   │   ├── chat/               # Conversational panels and chat inputs
│   │   ├── layout/             # Navigation bars, sidebar, and workspace shell
│   │   ├── notes/              # Note viewers & editors (Mindmap, Slides, Quiz, Flashcards, etc.)
│   │   └── ui/                 # shadcn/ui primitive component library
│   ├── generated/              # Locally generated Prisma client
│   ├── hooks/                  # Custom React hooks (useFlux, useTheme, useDebounce)
│   ├── inngest/                # Inngest workflows and background functions
│   │   ├── client.ts           # Inngest client initialization with realtime middleware
│   │   ├── functions.ts        # processSource and createNote background jobs
│   │   └── helpers.ts          # Text extraction, vectorization, and S3 caching helpers
│   ├── lib/                    # Core utilities and business logic
│   │   ├── auth.ts             # Better Auth server configuration
│   │   ├── constants.ts        # Global constants and default limits
│   │   ├── credits.ts          # Credit deduction and daily quota reset logic
│   │   ├── env.ts              # Centralized environment variable validation
│   │   ├── llm/                # Model routing, streaming, and LLM integrations
│   │   │   ├── model-router.ts # Dynamic task classifier & multi-tier fallback chains
│   │   │   ├── stream-text.ts  # Token-by-token streaming implementation
│   │   │   ├── live-api-client.ts # Gemini Live WebSocket client
│   │   │   └── generate-tts.ts # Multi-speaker TTS generator
│   │   ├── notes/              # Note handlers and UI component registries
│   │   ├── s3.ts               # AWS S3 / Cloudflare R2 presigned URL and upload client
│   │   └── vectorizers/        # Specialized parsers (PDF, DOCX, EPUB, YouTube, GitHub, etc.)
│   ├── types/                  # TypeScript interface definitions
│   └── validators/             # Zod validation schemas
├── .env.example                # Example environment configuration template
├── eslint.config.mjs           # ESLint configuration
├── next.config.ts              # Next.js configuration
├── package.json                # Project dependencies and operational scripts
└── tsconfig.json               # TypeScript compiler options
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 22.x or higher
- **pnpm** 9.x or higher
- **PostgreSQL** (version 16+ or Neon serverless database)
- Cloudflare R2 or AWS S3 bucket for file storage
- Pinecone index (768 dimensions, cosine metric)

### Environment Configuration

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Populate the configuration values:

```env
# --- APP CONFIGURATION ---
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# --- DATABASE (Neon / PostgreSQL) ---
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"

# --- AUTHENTICATION (Better Auth) ---
BETTER_AUTH_SECRET=your_better_auth_secret_minimum_32_characters
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# --- AI MODELS & SPEECH SERVICES ---
GEMINI_API_KEY=your_gemini_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
ASSEMBLY_API_KEY=your_assembly_api_key

# --- DATA SOURCES & AI SEARCH ---
TAVILY_API_KEY=your_tavily_api_key

# --- VECTOR DATABASE (Pinecone) ---
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=infera-notebook
PINECONE_HOST=your-pinecone-host.pinecone.io

# --- OBJECT STORAGE (Cloudflare R2 / AWS S3) ---
AWS_REGION=auto
AWS_ENDPOINT_URL_S3=https://your_account_id.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=your_r2_access_key_id
AWS_SECRET_ACCESS_KEY=your_r2_secret_access_key
AWS_S3_BUCKET_NAME=infera-notebook

```

### Installation & Database Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/shakibzcv/infera-notebook.git
   cd infera-notebook
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Initialize the database:**

   ```bash
   pnpm run db:migrate
   ```

4. **(Optional) Configure Storage Bucket & CORS:**

   ```bash
   pnpm run bucket:setup
   ```

5. **Start the Next.js development server:**

   ```bash
   pnpm run dev
   ```

6. **Start the Inngest background worker dev server (in a second terminal):**

   ```bash
   pnpm run inngest:dev
   # or run directly: inngest dev (dashboard on http://localhost:8288)
   ```

7. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to access Infera Notebook.

---

## 📖 Available Scripts

| Command                    | Purpose                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `pnpm run dev`             | Start the Next.js local development server                         |
| `pnpm run inngest:dev`     | Start the local Inngest dev server on port 8288 (`inngest dev`)    |
| `pnpm run build`           | Build the production application bundle                            |
| `pnpm run start`           | Run the Next.js production server                                  |
| `pnpm run lint`            | Run ESLint checks across the codebase                              |
| `pnpm run typecheck`       | Validate TypeScript types with `tsc --noEmit`                      |
| `pnpm run format`          | Auto-format codebase using Prettier                                |
| `pnpm run format:check`    | Verify formatting consistency with Prettier                        |
| `pnpm run db:generate`     | Generate the Prisma client into `src/generated/prisma`             |
| `pnpm run db:migrate`      | Execute database migrations in development mode                    |
| `pnpm run db:studio`       | Launch Prisma Studio UI for database inspection                    |
| `pnpm run db:reset`        | Reset the database and re-apply all migrations                     |
| `pnpm run bucket:setup`    | Create S3/R2 bucket and apply CORS configuration                   |
| `pnpm run bucket:teardown` | Delete S3/R2 bucket and clean up storage assets                    |
| `pnpm run pinecone:reset`  | Wipe all documents and namespaces from the configured Pinecone index using Documents API |

---

## 🤝 Contributing

Contributions are warmly welcomed! Please read our [Contributing Guide](CONTRIBUTING.md) and adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.

---

## 👤 Author & Maintainer

**Shakib Khan**

- GitHub: [@shakibzcv](https://github.com/shakibzcv)
- Email: [shakibzcv@gmail.com](mailto:shakibzcv@gmail.com)

---

<div align="center">

Made with ❤️ by [shakibzcv](https://github.com/shakibzcv)

⭐ If you find this project valuable, please consider starring the repository!

</div>
