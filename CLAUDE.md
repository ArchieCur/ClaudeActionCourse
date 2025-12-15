# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI to generate React components through a chat interface, displays them in real-time using a virtual file system, and allows users to iterate on designs without writing files to disk.

## Development Commands

### Setup
```bash
npm run setup
```
Installs dependencies, generates Prisma client, and runs database migrations. **Run this first** after cloning.

### Development
```bash
npm run dev              # Start Next.js dev server with Turbopack
npm run dev:daemon       # Start server in background, logs to logs.txt
```

### Testing
```bash
npm test                # Run all tests with Vitest
npm test -- <pattern>   # Run specific test file (e.g., npm test -- file-system)
```

### Database
```bash
npx prisma generate     # Regenerate Prisma client after schema changes
npx prisma migrate dev  # Create and apply migrations
npm run db:reset        # Reset database (destructive)
```

### Build & Lint
```bash
npm run build           # Build for production
npm run lint            # Run ESLint
```

## Architecture

### Virtual File System (VFS)
The core innovation is a **VirtualFileSystem** class ([src/lib/file-system.ts](src/lib/file-system.ts)) that:
- Stores files entirely in memory using a Map-based tree structure
- Provides file operations (create, read, update, delete, rename) without touching disk
- Serializes to/from JSON for persistence in the database
- Implements text editor commands (view, str_replace, insert) for AI tool use

The VFS is:
- Created per-session in `FileSystemProvider` context ([src/lib/contexts/file-system-context.tsx](src/lib/contexts/file-system-context.tsx))
- Serialized and sent to the chat API on each request
- Deserialized server-side to reconstruct the file tree
- Persisted to the database for logged-in users

### AI Chat Integration
The chat system ([src/app/api/chat/route.ts](src/app/api/chat/route.ts)) uses Vercel AI SDK with two custom tools that operate on the VFS:

1. **str_replace_editor** ([src/lib/tools/str-replace.ts](src/lib/tools/str-replace.ts))
   - Commands: `view`, `create`, `str_replace`, `insert`
   - Primary tool for AI to read and edit files

2. **file_manager** ([src/lib/tools/file-manager.ts](src/lib/tools/file-manager.ts))
   - Commands: `rename`, `delete`
   - Handles file/directory operations

The API route:
- Accepts messages + serialized VFS
- Reconstructs the VFS server-side
- Streams AI responses with tool calls
- Saves final state to database (for authenticated users)

### Live Preview System
Preview rendering ([src/lib/transform/jsx-transformer.ts](src/lib/transform/jsx-transformer.ts)):
1. Transform JSX/TSX to JavaScript using Babel standalone
2. Create blob URLs for each transformed module
3. Generate an import map with:
   - Local modules → blob URLs
   - Third-party packages → esm.sh CDN URLs
   - `@/` path alias support
4. Build preview HTML with import map + error boundary
5. Render in sandboxed iframe ([src/components/preview/PreviewFrame.tsx](src/components/preview/PreviewFrame.tsx))

CSS files are collected from the VFS and injected as `<style>` tags.

### Authentication & Persistence
- JWT-based auth using `jose` library ([src/lib/auth.ts](src/lib/auth.ts))
- Bcrypt password hashing
- SQLite database via Prisma
- **Projects** table stores:
  - `messages`: JSON array of chat history
  - `data`: Serialized VFS state
  - `userId`: Optional (null for anonymous)
- Anonymous users get local warning about unsaved work ([src/lib/anon-work-tracker.ts](src/lib/anon-work-tracker.ts))

### Data Flow
```
User Chat Input
  → ChatProvider (src/lib/contexts/chat-context.tsx)
  → POST /api/chat with VFS + messages
  → AI generates tool calls (create/edit files)
  → Tools mutate server-side VFS
  → Response streams back with tool results
  → ChatProvider triggers FileSystemProvider refresh
  → PreviewFrame re-renders with updated VFS
  → Database saved (if authenticated)
```

### Context Architecture
Two React contexts manage state:
1. **FileSystemContext** - Owns the VFS instance, selected file, CRUD operations
2. **ChatContext** - Manages AI chat via Vercel AI SDK's `useChat` hook

Both wrap the main app in [src/app/main-content.tsx](src/app/main-content.tsx).

### Mock Provider
When `ANTHROPIC_API_KEY` is not set, a **MockLanguageModel** ([src/lib/provider.ts](src/lib/provider.ts)) generates static components:
- Detects component type from prompt (counter/form/card)
- Creates component file and App.jsx over multiple steps
- Simulates streaming and tool calls
- Useful for demo/testing without API costs

## Key Files

- [src/lib/file-system.ts](src/lib/file-system.ts) - Virtual file system implementation
- [src/lib/transform/jsx-transformer.ts](src/lib/transform/jsx-transformer.ts) - JSX → JS + import map generation
- [src/app/api/chat/route.ts](src/app/api/chat/route.ts) - AI chat endpoint with tool integration
- [src/lib/provider.ts](src/lib/provider.ts) - Language model selection (Anthropic or Mock)
- [src/lib/contexts/](src/lib/contexts/) - React contexts for VFS and chat
- [prisma/schema.prisma](prisma/schema.prisma) - Database schema (User, Project)

## Testing

Tests use Vitest + Testing Library:
- File system tests: [src/lib/__tests__/file-system.test.ts](src/lib/__tests__/file-system.test.ts)
- JSX transform tests: [src/lib/transform/__tests__/jsx-transformer.test.ts](src/lib/transform/__tests__/jsx-transformer.test.ts)
- Component tests in `__tests__` folders next to components
- Environment: jsdom ([vitest.config.mts](vitest.config.mts))

## Environment Variables

Optional `.env` file:
```
ANTHROPIC_API_KEY=sk-ant-...   # Claude API key (falls back to mock if unset)
```

Database is SQLite at `prisma/dev.db` (auto-created on setup).

## Database Schema

The database schema is in [prisma/schema.prisma](prisma/schema.prisma). Reference this file anytime you need to understand the structure of the data stored in the database.

Key points:
- **User model**: Stores email (unique), hashed password, and has one-to-many relationship with Projects
- **Project model**: Stores `messages` (JSON string of chat history) and `data` (JSON string of VFS state)
- `userId` is nullable to support anonymous projects
- SQLite database at `prisma/dev.db`

## Path Aliases

TypeScript imports use `@/` alias:
- `@/lib/utils` → `src/lib/utils`
- `@/components/ui/button` → `src/components/ui/button`

Configured in [tsconfig.json](tsconfig.json).
