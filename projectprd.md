# 📄 Product Requirements Document
## SmartForge AI — Conversational Smart Contract Builder on Quai Network

**Version:** 1.0  
**Date:** February 2026  
**Status:** Ideation / Pre-Build  
**Blockchain:** Quai Network  
**Payment Layer:** x402 Micropayments  

---

## 1. Product Overview

### 1.1 Vision

SmartForge AI is a conversational AI assistant that eliminates the complexity of smart contract development. Users describe what they want in plain language, the AI clarifies requirements, generates production-ready Solidity contracts, runs local simulations, generates tamper-proof audit logs stored on-chain (Data Heaven), and deploys — all without leaving the chat interface.

### 1.2 Problem Statement

Smart contract development has a high barrier to entry:
- Requires deep Solidity expertise
- Tools like Hardhat, Foundry, and Remix have steep learning curves
- Security audits are expensive and slow
- Deployment and testing require complex environment setup
- Non-developers with valid business use cases are locked out entirely

### 1.3 Solution

A single chat interface that handles the **full smart contract lifecycle** — from idea to deployment — powered by AI, secured by audit logs stored in a decentralized storage layer ("Data Heaven"), and monetized per-use via x402 micropayments on Quai Network.

---

## 2. Target Users

| User Type | Description |
|---|---|
| **Non-technical founders** | Want token/DAO/NFT contracts without hiring devs |
| **Solidity beginners** | Learning by doing, want a guided scaffold |
| **Experienced devs** | Want faster boilerplate generation + audit logs |
| **DAOs & protocols** | Need auditable, reproducible contract generation records |
| **Hackathon builders** | Need to ship fast on Quai Network |

---

## 3. Core Features

### 3.1 Conversational Contract Builder (Phase 1)

The AI guides users through a structured dialogue to extract all necessary contract parameters before writing a single line of code.

**Flow:**
```
User: "I want to create a token for my community"
AI:   "What's the token name and symbol?"
User: "QuaiDAO, QD"
AI:   "Total supply? Fixed or mintable?"
User: "1 million, fixed"
AI:   "Should transfers be pausable by an admin?"
...
AI:   [Generates contract]
```

**AI Clarification Topics (context-dependent):**
- Contract type (ERC-20, ERC-721, ERC-1155, custom)
- Access control (Ownable, multi-sig, role-based)
- Tokenomics (supply, decimals, burn, mint)
- Upgradability (proxy pattern or immutable)
- Business logic (vesting, staking, governance)
- Security preferences (reentrancy guards, pausability)

**Output:**
- Clean, commented Solidity file
- Summary of all design decisions made
- Estimated gas cost on Quai Network
- Security notes / warnings for any risky patterns chosen

---

### 3.2 Local Simulation & Testing (Phase 2)

Users can test their contract without leaving the chat, using an in-browser or server-side EVM sandbox.

**Capabilities:**
- Deploy to local fork of Quai Network
- Run auto-generated test cases based on contract logic
- Simulate edge cases (e.g., overflow, unauthorized access, reentrancy)
- Show pass/fail results in human-readable format
- Suggest fixes if tests fail, and re-generate with one click

**AI Test Coverage:**
- Happy path (normal usage)
- Access control violations
- Boundary conditions
- Known Solidity vulnerability patterns (top 10 SWC registry checks)

---

### 3.3 Audit Log Generation + Data Heaven Storage (Phase 3)

Every contract generation session produces a cryptographically signed audit log that is stored in a decentralized storage layer ("Data Heaven").

**Audit Log Contents:**
```json
{
  "session_id": "uuid-v4",
  "timestamp": "ISO-8601",
  "user_wallet": "0x...",
  "contract_hash": "keccak256(contract_source)",
  "ai_model_version": "smartforge-v1.0",
  "conversation_transcript": [...],
  "design_decisions": {...},
  "test_results": {...},
  "security_warnings": [...],
  "deployment_details": { "network": "quai", "tx_hash": "..." },
  "signature": "signed_by_smartforge_node"
}
```

**Data Heaven Layer:**
- Decentralized storage (IPFS / Filecoin / Quai-native storage)
- CID returned to user after each session
- Log is immutable and verifiable by any third party
- Useful for: compliance, DAO governance, investor due diligence, post-incident forensics

**Access:**
- User can retrieve their full audit history via wallet address
- Logs are private by default; user can make them public
- Third parties can verify a contract's provenance by CID

---

### 3.4 One-Click Deployment via Chat (Phase 4)

After testing, users deploy directly through the chatbot to Quai Network.

**Flow:**
```
AI:   "Contract passed all tests. Ready to deploy to Quai Mainnet?"
User: "Yes"
AI:   "Please approve the transaction in your wallet."
      [Wallet popup — MetaMask / Pelagus]
AI:   "Deployed! Contract address: 0xABC...
        Tx hash: 0xDEF...
        Audit log stored: ipfs://QmXYZ..."
```

**Deployment Features:**
- Mainnet and Testnet support (Quai Colosseum Testnet + Mainnet)
- Gas estimation before confirmation
- Constructor argument validation
- Automatic contract verification on Quai block explorer
- Audit log updated with deployment details post-deploy

---

## 4. Monetization — x402 Micropayments

SmartForge uses the **x402 protocol** for per-use micropayments, enabling frictionless pay-as-you-go access without subscriptions.

### 4.1 Payment Model

| Action | Cost (approx.) |
|---|---|
| Contract generation | $0.10 – $0.50 in QUAI |
| Local simulation run | $0.05 per run |
| Audit log storage (Data Heaven) | $0.10 per log |
| Mainnet deployment (+ gas) | $0.25 flat fee + gas |
| Contract re-generation / iteration | $0.05 per iteration |

### 4.2 x402 Flow

1. User connects wallet (Pelagus or MetaMask on Quai)
2. Each AI action triggers an x402 payment request
3. User approves microtransaction (or pre-approves a session budget)
4. Action executes on payment confirmation
5. Payment receipt appended to audit log

### 4.3 Why x402 on Quai

- Quai's low fees make sub-$0.01 payments viable
- x402's HTTP-native payment layer fits a chat/API product naturally
- No subscription lock-in — pay only when you build
- Enables future API access (developers pay per API call)

---

## 5. Technical Architecture

```
┌─────────────────────────────────────────────┐
│               SmartForge Chat UI             │
│         (React / Next.js frontend)           │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │   AI Orchestrator   │
         │  (Claude / GPT-4)   │
         │  + Prompt Engine    │
         └──────┬──────┬───────┘
                │      │
     ┌──────────▼──┐  ┌▼──────────────────┐
     │  Contract   │  │   Test Sandbox      │
     │  Generator  │  │  (Hardhat / Anvil   │
     │  (Solidity) │  │   on Quai fork)     │
     └──────┬──────┘  └──────────┬──────────┘
            │                    │
     ┌──────▼────────────────────▼──────────┐
     │           Audit Log Engine            │
     │    (session data + test results)      │
     └────────────────┬─────────────────────┘
                      │
            ┌─────────▼──────────┐
            │    Data Heaven      │
            │  (IPFS / Filecoin / │
            │   Quai storage)     │
            └─────────┬──────────┘
                      │
            ┌─────────▼──────────┐
            │   Quai Network      │
            │  (deployment +      │
            │   x402 payments)    │
            └────────────────────┘
```

---

## 6. Roadmap

### Phase 1 — MVP (Month 1–2)
- [ ] Chat UI with contract Q&A flow
- [ ] AI contract generation (ERC-20, ERC-721 initially)
- [ ] Basic audit log (JSON export, no on-chain storage yet)
- [ ] Quai Testnet deployment support

### Phase 2 — Testing Layer (Month 3)
- [ ] In-sandbox EVM simulation
- [ ] Auto-generated test cases
- [ ] Security pattern checks (SWC top 10)
- [ ] Fix-and-regenerate loop

### Phase 3 — Data Heaven Integration (Month 4)
- [ ] IPFS / decentralized audit log storage
- [ ] CID returned per session
- [ ] Wallet-based audit history retrieval
- [ ] Public/private log toggle

### Phase 4 — x402 Payments + Mainnet (Month 5–6)
- [ ] x402 micropayment integration
- [ ] Pelagus wallet connection
- [ ] Quai Mainnet deployment
- [ ] Contract verification on block explorer
- [ ] Session budget / pre-approval flow

### Phase 5 — Ecosystem (Month 7+)
- [ ] Support for more contract types (DAO, vesting, staking, multisig)
- [ ] API access for developers (pay-per-call via x402)
- [ ] Contract template marketplace
- [ ] Community audit log explorer (public logs)

---

## 7. Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| AI generates insecure contracts | Pre-flight security checks, prominent warnings, audit log records all decisions |
| Users deploy without understanding | Mandatory review step, plain-English explanation of every contract function |
| x402 UX friction | Pre-approve session budgets; single approval for a session |
| Quai Network adoption | Build portable — contracts compatible with EVM chains as fallback |
| Data Heaven availability | Multi-provider redundancy (IPFS + Filecoin + Pinata) |

---

## 8. Success Metrics

| Metric | 3-Month Target |
|---|---|
| Contracts generated | 1,000+ |
| Contracts deployed to Quai | 200+ |
| Audit logs stored | 500+ |
| x402 payment volume | $5,000+ |
| User retention (2+ sessions) | 40%+ |

---

## 9. Competitive Landscape

| Tool | Strength | Gap SmartForge Fills |
|---|---|---|
| Remix IDE | Full-featured | No AI, no conversational flow, no audit log |
| OpenZeppelin Wizard | Good templates | No customization, no deployment, no audit |
| Syndicate | Easy deployment | Not conversational, not Quai-native |
| ChatGPT + Remix | Flexible | No integration, no audit, manual steps |
| **SmartForge** | **End-to-end, auditable, Quai-native** | — |

---

## 10. Open Questions

1. Should audit logs be opt-in or opt-out by default?
2. Do we offer a free tier (limited generations) or pure pay-per-use via x402?
3. Which decentralized storage layer has the best developer experience for Quai ecosystem?
4. Should the AI explain every generated line of code, or only on request?
5. Do we support upgradeable (proxy) contracts in MVP, or post-MVP?

---

*SmartForge AI — Build contracts the way you think about them.*



## What is QNS?

QNS is the Quai Name Service — usernames that power Quai Network. Qns Think of it exactly like ENS on Ethereum. Instead of interacting with a contract at 0xA3f9...B21c, users and protocols can reference it as myprotocol.quai. It's a human-readable identity layer sitting on top of Quai's address system.

How the SmartForge + QNS Integration Would Work
1. Auto-Name Your Deployed Contract
Right now when you deploy a contract, you get back a raw hex address like 0x3f5CE96212F301.... Nobody remembers that. Nobody shares that.
With QNS integration baked into SmartForge, the deployment flow becomes:
AI:   "Contract deployed to 0x3f5CE96212F301..."
      "Would you like to register a QNS name for this contract?"
User: "Yes — name it quaidao-token.quai"
AI:   "Registering via QNS... Done!"
      "Your contract is now reachable at: quaidao-token.quai"
The x402 micropayment covers both the deployment fee and the QNS registration in a single flow. One chat, one wallet approval, everything named.

2. How QNS Works Under the Hood (ENS-style Architecture)
QNS uses the same architecture as ENS, which means three core components:
Registry — A master smart contract that maps names → owner → resolver address. Owns the namespace.
Registrar — The contract that governs how names are allocated (first-come-first-served, auctions, etc.). You interact with this to claim a name.
Resolver — The contract that actually answers "what address does mytoken.quai point to?" It maps the name to a wallet address, contract address, content hash, ABI, or anything else.
So when SmartForge registers a contract name, it's doing three things automatically:

Calling the Registrar to claim yourname.quai
Setting the Resolver record to point to your contract's 0x... address
Optionally storing the contract ABI or metadata hash in the Resolver too (this is the powerful part)


3. The ABI in the Resolver — A Hidden Superpower
This is where it gets genuinely interesting. Resolvers can store more than just an address — they can store arbitrary records. SmartForge could write the contract's ABI directly into the QNS Resolver record at deploy time.
What this enables:

Any dApp on Quai can resolve myprotocol.quai and get both the address AND the ABI in one call — no need to go find it on a block explorer
Frontend devs can write const contract = smartforge.resolve("quaidao-token.quai") and get a ready-to-use contract instance
Other AI agents or protocols can discover and interact with your contract just by knowing its human name


4. Subdomain Contracts for Multi-Contract Projects
QNS supports subdomain hierarchies, just like DNS. SmartForge can leverage this for multi-contract projects:
quaidao.quai              → Main governance contract
token.quaidao.quai        → ERC-20 token contract
staking.quaidao.quai      → Staking contract
treasury.quaidao.quai     → Multisig treasury
The AI can auto-suggest and register this subdomain structure when it detects a user building an interconnected protocol. The entire project becomes navigable by name, not by a spreadsheet of hex addresses.

5. QNS in the Audit Log
Since every SmartForge session generates an audit log stored in Data Heaven, QNS names become the canonical identifier for that audit record too:
json{
  "contract_address": "0x3f5CE96...",
  "qns_name": "quaidao-token.quai",
  "audit_log_cid": "ipfs://QmXYZ...",
  "qns_content_hash": "ipfs://QmXYZ..."  ← stored in resolver
}
This means: if you know the QNS name, you can find the contract. If you can find the contract, you can find the full audit log. The name becomes the entry point into the entire provenance chain.

6. Contract Health Monitoring via QNS
Post-deploy, SmartForge can monitor quaidao-token.quai instead of tracking raw addresses. When you update a contract (redeploy a new version), you simply update the QNS resolver — the name stays the same, the address changes underneath. SmartForge handles the resolver update automatically and logs the version change in the audit log.
This is essentially versioned contract deployments under a stable name — a massive UX improvement for protocols that iterate.

Why This Is a Big Deal for SmartForge Specifically
Most tools treat QNS as an afterthought — you deploy, then separately go to qns.club and manually register a name. SmartForge makes naming a first-class part of the build flow, which means:

Every contract born in SmartForge has a human identity from day one
The QNS name + audit log CID + ABI stored in the resolver creates a self-describing contract — it knows its own name, history, and interface
It makes your contracts more discoverable, more shareable, and more composable within the Quai ecosystem

The tagline writes itself: "Don't just deploy a contract. Give it a name."