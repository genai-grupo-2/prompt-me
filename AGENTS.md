<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 1. Project Structure

```
prompt-me/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts        # Next.js API route handling OpenRouter streaming completion requests
│   ├── chat/
│   │   └── page.tsx            # Main chat interface page
│   ├── globals.css             # Global CSS styles
│   └── layout.tsx              # Root application layout
├── components/
│   ├── banner/
│   │   └── ErrorBanner.tsx     # Alert/error banner component
│   ├── button/
│   │   └── IconButton.tsx      # Reusable button with icons
│   ├── chat/                   # Core chat UI components
│   │   ├── ChatAvatar.tsx      # User/assistant avatar (penguin requirement)
│   │   ├── ChatInput.tsx       # Message input area with submit & options
│   │   ├── ChatLayout.tsx      # Outer layout container for chat and sidebar
│   │   ├── ChatWindow.tsx      # Chat conversation container
│   │   ├── MessageBubble.tsx   # Individual message bubble rendering content & metrics
│   │   ├── MessageList.tsx     # Message list with auto-scrolling
│   │   └── StreamingCursor.tsx # Visual indicator for active streaming response
│   └── sidebar/                # Sidebar navigation components
│       ├── SideBar.tsx         # Collapsible sidebar navigation container
│       └── SideBarItem.tsx     # Conversation item button
├── lib/
│   ├── api/
│   │   └── openrouter.ts       # OpenRouter client provider instance using @openrouter/ai-sdk-provider
│   ├── prompts/
│   │   └── system.ts           # System prompt templates
│   └── utils/
│       └── usage.ts            # Token & cost usage parsing utility
├── types/
│   └── openrouter.ts           # TypeScript interfaces for messages, requests, and usage metrics
├── AGENTS.md                   # Agent instructions and project guide
├── env.example                 # Example environment variable file
├── next.config.ts              # Next.js configuration
├── package.json                # Project dependencies and scripts
└── tsconfig.json               # TypeScript configuration
```

---

# 2. API Client

The application interfaces with OpenRouter using the Vercel AI SDK and `@openrouter/ai-sdk-provider`.

## Architecture & Files
* **Provider Definition** (`lib/api/openrouter.ts`): Instantiates `createOpenRouter` using the `OPENROUTER_API_KEY` environment variable.
* **API Route** (`app/api/chat/route.ts`): Handled by a Next.js `POST` route handler:
  * Receives `messages` (`Message[]`) and `options` (`ChatRequestOptions`) from the request JSON.
  * Calls `streamText` with the configured OpenRouter provider model.
  * Passes extra body parameters including `max_tokens` and optional `reasoning` settings (`effort`, `exclude`).
  * Extracts token & cost metrics from `finalStep.providerMetadata?.openrouter` upon step completion using `parseUsage(...)` (`lib/utils/usage.ts`).
  * Returns a streaming response via `createTextStreamResponse({ stream: result.textStream })` and attaches the calculated `GenerationUsage` metadata as a JSON string in the `X-Usage` response header.
* **Type Definitions** (`types/openrouter.ts`): Defines data models for `Message`, `ChatRequest`, `ChatRequestOptions`, `ReasoningConfig`, `ResponseUsage`, `TokenUsage`, and `GenerationUsage`.

---

# 3. Implementation Requirements

The codebase has initial scaffolding with several empty files and boilerplate components that must be fully implemented.

## A. Empty Components to Implement
The following component files currently exist as empty stubs (or minimal comments) and need implementation:

* **Chat Components** (`components/chat/`):
  * `ChatAvatar.tsx` (`components/chat/ChatAvatar.tsx`): Chat avatar component (**Requirement**: Must render a penguin avatar, no exceptions).
  * `ChatInput.tsx` (`components/chat/ChatInput.tsx`): User input area with submit controls, model options, and text area.
  * `ChatLayout.tsx` (`components/chat/ChatLayout.tsx`): Overall layout container for sidebar and chat area.
  * `ChatWindow.tsx` (`components/chat/ChatWindow.tsx`): Main chat conversation area housing message list and input.
  * `MessageBubble.tsx` (`components/chat/MessageBubble.tsx`): Individual message item rendering roles, avatar, content, and usage metrics.
  * `MessageList.tsx` (`components/chat/MessageList.tsx`): List container for message bubbles with auto-scrolling behavior.
  * `StreamingCursor.tsx` (`components/chat/StreamingCursor.tsx`): Visual indicator for active streaming responses.

* **Sidebar Components** (`components/sidebar/`):
  * `SideBar.tsx` (`components/sidebar/SideBar.tsx`): Main navigation/sidebar panel.
  * `SideBarItem.tsx` (`components/sidebar/SideBarItem.tsx`): Individual sidebar item / conversation selection button.

* **UI Utility Components**:
  * `ErrorBanner.tsx` (`components/banner/ErrorBanner.tsx`): Alert/banner component for displaying API errors or connection failures.
  * `IconButton.tsx` (`components/button/IconButton.tsx`): Reusable action button component with icons.

* **System Prompts**:
  * `system.ts` (`lib/prompts/system.ts`): Default system prompts/instructions for chat completions.

## B. Chat Page (`app/chat/page.tsx`)
* Replace the current Next.js template boilerplate in `app/chat/page.tsx` with a functional chat interface.
* Connect the page state with `/api/chat`, handling message history, streaming response consumption, usage metadata parsing, and error handling using the implemented UI components.


