# UIGen

An AI-powered React component generator with live preview. Describe what you want in plain language, watch it render instantly, then iterate or export.

Built as a companion project for the [Claude in Action course](https://github.com/ArchieCur/ClaudeActionCourse).

---

## Features

- **Chat-driven generation** — Describe a component in natural language; Claude writes the code
- **Live preview** — Components render in real time in a sandboxed iframe with hot reload
- **Virtual file system** — All files live in memory; nothing is written to disk
- **Code editor** — Switch between preview and source with syntax highlighting
- **Persistence** — Registered users can save and reload projects
- **Export** — Download generated components for use in your own projects
- **Works without an API key** — Falls back to a mock model that generates static examples

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| AI | Anthropic Claude via Vercel AI SDK |
| Database | Prisma + SQLite |
| Testing | Vitest + Testing Library |

---

## Quick Start

**Requirements:** Node.js 18+

```bash
git clone https://github.com/ArchieCur/ClaudeActionCourse.git
cd ClaudeActionCourse
npm run setup    # install deps, generate Prisma client, run migrations
npm run dev      # start dev server at http://localhost:3000
```

**Optional:** Add an Anthropic API key to enable real AI generation:

```
# .env
ANTHROPIC_API_KEY=sk-ant-...
```

Without it, the app runs fine using the built-in mock model.

---

## How It Works

1. Type a description in the chat (e.g. *"a counter with increment and decrement buttons"*)
2. Claude calls two tools — `str_replace_editor` and `file_manager` — to create and edit files in the virtual file system
3. The VFS serializes to JSON and travels with every request; the server reconstructs it, runs the tools, and streams results back
4. JSX is transpiled in the browser via Babel standalone and rendered in a sandboxed iframe with an import map pointing third-party packages to esm.sh

---

## Project Structure

```
src/
  app/
    api/chat/route.ts       # AI chat endpoint with tool integration
  lib/
    file-system.ts          # Virtual file system (Map-based, in-memory)
    transform/
      jsx-transformer.ts    # JSX → JS + import map generation
    tools/
      str-replace.ts        # str_replace_editor tool
      file-manager.ts       # file_manager tool
    contexts/
      file-system-context.tsx
      chat-context.tsx
    provider.ts             # Anthropic or mock model selection
    auth.ts                 # JWT auth (jose + bcrypt)
  components/
    preview/PreviewFrame.tsx
prisma/
  schema.prisma             # User + Project schema
```

---

## Available Scripts

```bash
npm run dev          # Development server (Turbopack)
npm run dev:daemon   # Background server, logs to logs.txt
npm run build        # Production build
npm test             # Run all tests
npm run db:reset     # Reset database (destructive)
```

---

## Database

SQLite via Prisma. Two models:

- **User** — email, hashed password, projects
- **Project** — chat message history (JSON) + VFS state (JSON); `userId` is nullable to support anonymous sessions

Database is auto-created at `prisma/dev.db` on first `npm run setup`.
