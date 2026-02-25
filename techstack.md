# 🛠️ SmartForge AI — Technical Stack
**Project:** Conversational Smart Contract Builder on Quai Network  
**Version:** 1.0  
**Date:** February 2026  

---

## Overview

SmartForge AI is built on a modern, blockchain-native stack optimized for conversational contract building, decentralized storage, and micropayment monetization on Quai Network.

---

## 1. Frontend Layer

### Core Framework
- **Next.js** (React-based)
  - Server-side rendering for optimal performance
  - Built-in API routes for backend integration
  - Modern React 18+ features (Server Components, Streaming)
  - Excellent SEO and initial load performance

### UI/UX Libraries
- **React 18+**
  - Component-based chat interface
  - Real-time state management for conversational flow
- **TypeScript**
  - Type safety for contract generation logic
  - Better developer experience and fewer runtime errors
- **Tailwind CSS** (recommended)
  - Rapid UI development
  - Consistent design system
  - Mobile-responsive chat interface

### Chat Interface
- **Streaming AI Responses**
  - Real-time token streaming for natural conversation feel
  - Incremental contract generation visibility
- **Code Syntax Highlighting**
  - Prism.js or Highlight.js for Solidity display
  - Interactive code blocks with copy functionality

---

## 2. AI & Language Models

### Primary AI Engine
- **Groq API** (llama)

  - Superior long-context reasoning
  - Excellent at structured code generation

### Prompt Engineering Layer
- **LangChain** or **Custom Orchestrator**
  - Multi-turn conversation management
  - Context window optimization
  - Tool/function calling for contract actions
  - Memory management across sessions

### Specialized Components
- **Solidity-Specific Fine-tuning**
  - Contract pattern templates
  - Security vulnerability knowledge base
  - Gas optimization heuristics
- **Retrieval-Augmented Generation (RAG)**
  - OpenZeppelin contract library indexing
  - Quai Network documentation embedding
  - SWC vulnerability registry integration

---

## 3. Blockchain Infrastructure

### Primary Network
- **Quai Network**
  - Mainnet deployment target
  - EVM-compatible (Solidity support)
  - Low transaction fees enable micropayments
  - Multi-threaded PoW architecture

### Testnet Environment
- **Quai Colosseum Testnet**
  - Pre-production contract testing
  - Free gas for development iterations

### Smart Contract Development
- **Solidity ^0.8.x**
  - Primary contract language
  - Latest security features (overflow protection, custom errors)
  - Full EVM compatibility across chains

### Development Frameworks
- **Hardhat**
  - Local blockchain simulation
  - Contract compilation and deployment
  - Extensive plugin ecosystem
  - TypeScript support

### Contract Libraries
- **OpenZeppelin Contracts**
  - Battle-tested ERC implementations (ERC-20, ERC-721, ERC-1155)
  - Access control patterns (Ownable, AccessControl)
  - Security modules (Pausable, ReentrancyGuard)
  - Proxy patterns for upgradability

---

## 4. Wallet Integration

### Supported Wallets
- **Pelagus Wallet** (primary)
  - Native Quai Network wallet
  - x402 micropayment support
  - Best UX for Quai ecosystem
- **MetaMask**
  - Broader ecosystem support
  - Custom network configuration for Quai
  - Fallback for users without Pelagus

### Connection Libraries
- **Wagmi** or **ethers.js v6**
  - Wallet connection management
  - Transaction signing
  - Contract interaction helpers
- **RainbowKit** (optional)
  - Beautiful wallet connection UI
  - Multi-wallet support out of the box

---

## 5. Payment Layer — x402 Protocol

### Micropayment Infrastructure
- **x402 HTTP Payment Protocol**
  - Pay-per-action model ($0.05 - $0.50 per operation)
  - HTTP-native payment requests
  - Sub-second payment confirmation
  - No subscription overhead

### Integration Pattern
```javascript
// Simplified x402 flow
1. User initiates contract generation
2. Backend returns HTTP 402 Payment Required + payment details
3. Frontend triggers wallet payment (QUAI tokens)
4. Backend verifies payment on Quai Network
5. Action executes, receipt stored in audit log
```

### Payment Tracking
- **On-chain receipts**
  - Every payment recorded in user's audit log
  - CID-linked to specific action timestamp
  - Verifiable payment history

---

## 6. Decentralized Storage — Data Heaven

### Primary Storage Layer
- **IPFS** (InterPlanetary File System)
  - Content-addressed storage (CID-based)
  - Immutable audit log records
  - Distributed retrieval via public gateways

### Pinning Services
- **Pinata** (primary)
  - Reliable pinning for critical audit logs
  - API for automated uploads
  - Usage-based pricing aligns with x402 model
- **Filecoin** (optional long-term archival)
  - Cryptographic storage proofs
  - Economic incentives for persistent storage

### Storage Schema
```json
{
  "session_id": "uuid-v4",
  "timestamp": "2026-02-25T10:30:00Z",
  "user_wallet": "0x742d35Cc6634C0532925a3b8...",
  "contract_source_hash": "keccak256(...)",
  "conversation_transcript": [...],
  "test_results": {...},
  "deployment_tx": "0xDEF...",
  "x402_receipt": "0xABC..."
}
```

---

## 7. Testing & Security

### Local Simulation
- **Hardhat Network**
  - Forked Quai Network state
  - Mainnet-simulated environment
  - Debug traces and stack traces
- **Anvil** (Foundry)
  - Fast EVM simulation
  - Cheatcodes for edge case testing

### Security Scanning
- **Slither** (Static Analysis)
  - Automated vulnerability detection
  - SWC registry pattern matching
  - Pre-deployment security reports
- **Mythril** (Symbolic Execution)
  - Deeper vulnerability analysis
  - Integer overflow/underflow detection
  - Reentrancy attack scenarios

### Test Generation
- **AI-Generated Test Suites**
  - Based on contract logic patterns
  - Coverage for access control, boundaries, edge cases
  - Auto-fix suggestions when tests fail

---

## 8. Backend Infrastructure

### API Server
- **Node.js + Express** or **Next.js API Routes**
  - RESTful API for contract operations
  - WebSocket support for real-time chat
  - Serverless deployment option (Vercel, AWS Lambda)

### Background Jobs
- **Bull Queue** (Redis-backed)
  - Async contract compilation
  - Test execution jobs
  - IPFS upload queuing
  - Deployment transaction monitoring

### Database
- **PostgreSQL** or **Supabase**
  - User session management
  - Audit log metadata indexing (CID → session mapping)
  - Payment reconciliation records
  - Contract deployment history

### Caching Layer
- **Redis**
  - LLM response caching (reduce API costs)
  - Compiled contract bytecode caching
  - Rate limiting per user wallet

---

## 9. Name Service Integration

### QNS (Quai Name Service)
- **Architecture:** ENS-equivalent on Quai Network
  - Registry contract (namespace ownership)
  - Registrar contract (name allocation)
  - Resolver contract (address/ABI/content hash mapping)

### SmartForge Integration
- **Auto-registration Flow**
  - Deploy contract → Register QNS name → Store ABI in Resolver
  - Single x402 payment covers deployment + naming
- **Resolver Records**
  - `addr` → Contract address (0x...)
  - `abi` → Contract ABI (JSON)
  - `contenthash` → Audit log CID (ipfs://...)

### Benefits
- Human-readable contract addresses (`quaidao-token.quai`)
- Self-describing contracts (name → address + ABI in one call)
- Subdomain support for multi-contract projects

---

## 10. DevOps & Infrastructure

### Hosting
- **Vercel** (Frontend + API)
  - Edge network for global low latency
  - GitHub integration for CI/CD
  - Serverless function scaling
- **AWS** or **GCP** (Heavy compute)
  - Contract compilation workers
  - IPFS node hosting (optional)
  - Redis/PostgreSQL managed instances

### Monitoring
- **Sentry**
  - Error tracking for frontend + backend
  - Real-time alerts for failed deployments
- **Datadog** or **Grafana**
  - x402 payment volume metrics
  - Contract generation success rate
  - Test pass/fail rate dashboard

### CI/CD
- **GitHub Actions**
  - Automated testing on push
  - Solidity contract linting (solhint)
  - Deployment to staging/production environments

---

## 11. Development Tools

### Code Quality
- **ESLint + Prettier** (JavaScript/TypeScript)
- **Solhint** (Solidity linting)
- **Husky** (Git hooks for pre-commit checks)

### Version Control
- **Git + GitHub**
  - Monorepo structure (frontend + contracts + backend)
  - Branch protection for mainnet deployment code

### Package Management
- **pnpm** or **npm**
  - Fast, space-efficient dependency management
  - Workspaces for monorepo structure

---

## 12. Third-Party APIs

### Blockchain Data
- **Quai Network RPC**
  - Transaction broadcasting
  - Contract deployment
  - Gas price estimation
- **Block Explorer API**
  - Contract verification
  - Transaction status lookup

### AI Services
- **Anthropic API** (Claude)
- **OpenAI API** (GPT-4 fallback)

### Analytics
- **Mixpanel** or **PostHog**
  - User behavior tracking
  - Conversion funnel analysis (contract → deploy → payment)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│            Frontend (Next.js + React)                │
│  - Chat UI  - Code Display  - Wallet Connect         │
└──────────────────┬──────────────────────────────────┘
                   │ (WebSocket + HTTP)
         ┌─────────▼──────────────────┐
         │   Backend API (Node.js)     │
         │  - Session Manager          │
         │  - Payment Verifier (x402)  │
         └──────┬──────────┬───────────┘
                │          │
     ┌──────────▼──┐   ┌──▼──────────────────┐
     │ AI Engine   │   │ Contract Toolchain   │
     │ (Claude)    │   │ (Hardhat + Slither)  │
     │ + RAG Layer │   │ + Solidity Compiler  │
     └──────┬──────┘   └──────┬───────────────┘
            │                 │
     ┌──────▼─────────────────▼─────────────────┐
     │       Audit Log Generator                 │
     │  (session data + test results + receipt)  │
     └────────────────┬─────────────────────────┘
                      │
            ┌─────────▼──────────────┐
            │   Data Heaven (IPFS)   │
            │   + Pinata Pinning     │
            └─────────┬──────────────┘
                      │
            ┌─────────▼──────────────┐
            │   Quai Network          │
            │  - Contract Deployment  │
            │  - x402 Payments        │
            │  - QNS Registration     │
            └────────────────────────┘
```

---

## Technology Decision Rationale

| Technology | Why Chosen |
|---|---|
| **Next.js** | Full-stack React with SSR, perfect for chat UX + SEO |
| **Claude 3.5** | Best-in-class for code generation + long context (200k tokens) |
| **Hardhat** | Industry standard for EVM testing, battle-tested ecosystem |
| **IPFS + Pinata** | Decentralized + reliable pinning, audit log immutability |
| **x402 Protocol** | Native micropayments on Quai, aligns with pay-per-use model |
| **QNS** | Human-readable contract identity, composable ecosystem |
| **PostgreSQL** | Relational data for sessions/receipts, proven scalability |
| **Vercel** | Zero-config deploys, edge network, Next.js native platform |

---

## Future Stack Additions (Post-MVP)

- **GraphQL API** for advanced contract querying
- **Ceramic Network** for decentralized user profiles
- **The Graph** for indexing deployed contracts
- **ZK Proofs** for privacy-preserving audit logs
- **WebAssembly** for client-side contract simulation

---

*Stack optimized for speed, security, and Quai Network ecosystem integration.*
