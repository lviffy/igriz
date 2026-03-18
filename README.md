<p align="center">
  <img src="imgs/logo.png" alt="Igriz Logo" width="280" />
</p>

# Igriz

Igriz is an AI-driven dApp builder focused on **Polkadot Hub EVM** workflows.  
It converts natural language prompts into Solidity contracts, frontend code, and shell/file actions, then executes those actions inside an in-browser **WebContainer** workspace.

<table>
  <tr>
    <td><img src="imgs/home.png" alt="Home Interface" width="400" /></td>
    <td><img src="imgs/home2.png" alt="Chat Interface" width="400" /></td>
  </tr>
  <tr>
    <td><img src="imgs/home3.png" alt="Code Editor" width="400" /></td>
    <td><img src="imgs/home4.png" alt="Live Preview" width="400" /></td>
  </tr>
</table>

## Table of Contents

- [What This Project Does](#what-this-project-does)
- [Core Capabilities](#core-capabilities)
- [Architecture](#architecture)
- [How x402 Payments Work](#how-x402-payments-work)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Security Notes](#security-notes)
- [Deployment Notes](#deployment-notes)
- [Troubleshooting](#troubleshooting)

## What This Project Does

Igriz provides a chat-to-code loop:

1. User sends a prompt in chat.
2. LLM streams a response that can include `<igrizArtifact>` + `<igrizAction>` tags.
3. The parser extracts actions and sends them to an action runner.
4. File actions write to WebContainer FS, shell actions run in sequence.
5. Generated project appears in the integrated file tree/editor/terminal/preview.
6. Solidity code can be audited and automatically fixed/redeployed from the UI.

Primary dApp target:

- Network: `Polkadot Hub TestNet`
- RPC: `https://services.polkadothub-rpc.com/testnet`
- Chain ID: `420420417` (`0x1910E881`)
- Explorer: `https://blockscout-testnet.polkadot.io/`

## Core Capabilities

### 1) AI Generation with Provider/Model Selection

- Provider options: `Groq`, `OpenRouter`, `Google Gemini`
- Server-side key fallback: `*_API_KEY` then `*_API_KEY_2`
- Streaming responses with continuation when max token segment is reached

### 2) In-Browser IDE

- File tree + editor + terminal + preview panes
- Live WebContainer filesystem syncing
- Multiple preview ports and terminal tabs
- Diff-aware prompt augmentation when user modifies files before next message

### 3) Solidity Audit Workflow

- `POST /api/audit` runs an LLM-based contract audit
- Returns structured severity buckets:
  - `critical`
  - `high`
  - `medium`
  - `low`
  - `polkadot`
- Audit panel auto-runs after generation settles and supports manual re-audit

### 4) Fix and Redeploy

- `POST /api/audit-fix` returns revised Solidity source from findings
- UI action applies fix and queues:
  1. `node scripts/compile.cjs`
  2. `rm -f src/contracts/deployedContract.json && node scripts/deploy.cjs`

### 5) Export and Deployment Integrations

- GitHub token validation + repository/template operations
- Vercel token validation + direct deployment
- Deploy button can be blocked by unresolved audit acknowledgment state

## Architecture

### Frontend

- Remix + React + TypeScript
- Nanostores for state (`chat`, `provider`, `workbench`, `wallet`, `audit`, `github`, `vercel`)
- UI modules:
  - `app/components/chat`
  - `app/components/workbench`
  - `app/components/header`
  - `app/components/landing`
  - `app/components/sidebar`

### Runtime (WebContainer)

- `StreamingMessageParser` parses assistant output and extracts actions
- `ActionRunner` executes shell/file actions sequentially
- `FilesStore` watches filesystem changes and tracks user edits
- `PreviewsStore` listens for open ports and populates preview dropdown

### Server

- Remix action routes in `app/routes/api.*.ts`
- Chat handler in `app/lib/.server/actions/chat.ts`
- LLM abstraction in `app/lib/.server/llm/*`
- x402 enforcement in `app/lib/.server/x402.ts`

### Persistence

- IndexedDB chat history (`igrizHistory` DB, `chats` store)
- Route-based session restore via `/chat/:id`

## How x402 Payments Work

This app can gate `POST /api/chat` behind x402 payment verification and settlement.

### Client Side

1. User enters a private key in `WalletButton`.
2. Key is stored in memory only (`walletStore`) and cleared on refresh.
3. `getX402PaymentFetch(privateKey)`:
   - normalizes key format (`0x` + 64 hex)
   - builds signer via `privateKeyToAccount`
   - wraps `fetch` using `wrapFetchWithPayment(...)`
4. Chat requests use this wrapped fetch when available.

### Server Side

`chatAction` calls `enforceX402ForChat(request, env)` before processing messages.

Flow inside `enforceX402ForChat`:

1. Resolve config from runtime env and `.env.local`/`.env`.
2. If `X402_ENABLED` is false, allow request.
3. If enabled:
   - Initialize x402 HTTP resource server
   - Register payment requirements for `POST /api/chat`
   - Validate payment header (`PAYMENT-SIGNATURE` or `X-PAYMENT`)
4. If payment is missing/invalid, return payment-required response.
5. If valid, process settlement and return settlement headers.
6. Chat stream response includes settlement headers.

### x402 Defaults in This Codebase

- Chat route identifier: `POST /api/chat`
- Default price: `$0.001`
- Default network: `eip155:84532` (Base Sepolia)
- Default facilitator: `https://x402.org/facilitator`

Important implementation note:

- **Payment rail default network** (`eip155:84532`, Base Sepolia) is independent from
  **generated dApp target network** (Polkadot Hub TestNet `420420417`).
- This is why payment errors in chat mention Base Sepolia USDC requirements.

## API Endpoints

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/chat` | `POST` | Main generation stream, x402-gated when enabled |
| `/api/enhancer` | `POST` | Prompt enhancement stream |
| `/api/check-env-key` | `GET` | Checks whether a provider API key is configured |
| `/api/configured-providers` | `GET` | Returns providers that are currently configured |
| `/api/models` | `GET` | Returns provider/model catalog for the model picker |
| `/api/models/:provider` | `GET` | Returns models for a specific provider |
| `/api/audit` | `POST` | Audits Solidity source and returns structured report |
| `/api/audit-fix` | `POST` | Generates fixed Solidity source from report |
| `/api/github-user` | `GET`, `POST` | Validates GitHub token and serves repo-related actions |
| `/api/github-branches` | `GET`, `POST` | Fetches repository branches for GitHub workflows |
| `/api/github-template` | `GET` | Fetches template repository files |
| `/api/vercel-user` | `GET`, `POST` | Validates Vercel token and lists projects |
| `/api/vercel-deploy` | `GET`, `POST` | Creates deployments and fetches deployment details |
| `/api/export-api-keys` | `GET` | Exports locally stored API keys |

## Project Structure

```text
app/
  components/
    chat/            # chat UI, parser integration, provider selector
    workbench/       # editor, file tree, preview, terminal, audit panel
    header/          # deploy/export controls
    landing/         # marketing + launch UI
    sidebar/         # chat history
    wallet/          # in-memory private key input
  lib/
    .server/
      actions/       # chat, enhancer, audit, audit-fix
      llm/           # model/provider/key handling, system prompts
      x402.ts        # payment gate and settlement
    runtime/         # message parser + action runner
    stores/          # nanostore state modules
    persistence/     # IndexedDB chat history
    webcontainer/    # boot + prebuilt dependency mounting
    x402/            # client payment fetch wrapper
  routes/            # Remix routes and API endpoints
  styles/
  types/
  utils/

functions/
  [[path]].ts        # Cloudflare Pages adapter
```

## Getting Started

### Prerequisites

- Node.js `>= 18.18.0`
- Bun `>= 1.2.0` (root project package manager)

### Install

```bash
bun install
```

### Run Development Server

```bash
bun run dev
```

Then open the local Remix URL shown in terminal.

## Environment Variables

Create `.env.local` (or `.env`) in project root.

### LLM Providers

```env
GROQ_API_KEY=
GROQ_API_KEY_2=
OPENROUTER_API_KEY=
OPENROUTER_API_KEY_2=
GOOGLE_GENERATIVE_AI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY_2=
```

### x402

```env
X402_ENABLED=true
X402_PAY_TO=
X402_CHAT_PRICE_USD=$0.001
X402_NETWORK=eip155:84532
X402_FACILITATOR_URL=https://x402.org/facilitator
X402_FACILITATOR_BEARER_TOKEN=
```

Notes:

- `X402_PAY_TO` is required when `X402_ENABLED=true`.
- If using Coinbase CDP facilitator URL, bearer auth may be required; code falls back to public facilitator when missing.

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start Remix dev server |
| `bun run build` | Build app |
| `bun run start` | Run built server |
| `bun run test` | Run Vitest suite |
| `bun run lint` | Run ESLint |
| `bun run typecheck` | Run TypeScript check |

## Security Notes

- Wallet private key in `WalletButton` is memory-only and not persisted to disk.
- GitHub and Vercel tokens are persisted in `localStorage` to keep sessions connected.
- Deploy actions can be blocked by unresolved audit acknowledgment state.
- Server returns explicit error surfaces for auth/quota/rate-limit/payment failures.

## Deployment Notes

- `vercel.json` is configured with Remix framework and COEP/COOP headers.
- `functions/[[path]].ts` provides a Cloudflare Pages handler, so codebase supports edge-oriented runtimes.
- Local project scripts use `bun`; Vercel config also uses `bun` commands for install/build.

## Troubleshooting

- `402 Payment required` on chat:
  - add a valid wallet private key in the UI
  - ensure the wallet can settle x402 on the configured network (default Base Sepolia)
- `x402_config_error`:
  - set `X402_PAY_TO` and confirm x402 env values
- Provider errors (`401`, `402`, `429`):
  - verify provider key(s)
  - check usage limits
  - use secondary key fallback vars
- No chat history:
  - browser may block IndexedDB (private mode/policy)
