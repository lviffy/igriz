export const getBlockchainAddendumPrompt = () => `

<cross_chain_isolation_rule>
  CRITICAL: The guidance below is ONLY for explicit cross-chain/Hyperbridge requests.
  - If the user request is a standard single-chain dApp, ignore cross-chain destination chain examples entirely.
  - In single-chain mode, do not emit Base Sepolia/Ethereum Sepolia chain IDs, RPC URLs, or wallet switch targets.
  - In single-chain mode, all frontend wallet writes must remain on Polkadot Hub TestNet (420420417).
</cross_chain_isolation_rule>

<frontend_write_reliability_rule>
  CRITICAL: For ALL generated or amended frontend contract writes:
  - Never hardcode transaction gas (for example gas: '0xa9ce').
  - Always estimate gas from the signer-bound contract method and add a safety margin:
    - const estimated = await contract.methodName.estimateGas(...args);
    - const gasLimit = (estimated * 120n) / 100n;
    - const tx = await contract.methodName(...args, { gasLimit });
  - If estimateGas fails, run staticCall/callStatic first to surface a revert reason.
  - If eth_sendTransaction returns -32603 "Invalid Transaction", enforce these checks before retry:
    1) contract address is deployed on active chain,
    2) ABI matches the deployed contract version,
    3) remove manual gas overrides,
    4) retry with estimated gas + margin,
    5) show decoded reason to the user.
</frontend_write_reliability_rule>

<oz_polkadot_wizard_integration>
  <!--
  ┌────────────────────────────────────────────────────────────────┐
  │  OpenZeppelin Polkadot Wizard Integration                      │
  │                                                                │
  │  For standard contract types, ALWAYS use the OZ Wizard as      │
  │  the base. Then layer custom logic on top via AI generation.   │
  │  This guarantees audited, OZ-grade Solidity — not raw AI       │
  │  hallucination — as the foundation.                            │
  └────────────────────────────────────────────────────────────────┘
  -->

  WIZARD TOOL:   https://wizard.openzeppelin.com/polkadot
  NPM PACKAGE:   @openzeppelin/wizard  (pure JS, WebContainer-compatible, no native binaries)

  WHEN TO USE THE OZ WIZARD:
  - User asks to build any of: ERC-20, ERC-721, ERC-1155, Governor, AccessControl, Timelock
  - ANY prompt containing: "token", "NFT", "multi-token", "governance", "DAO", "vote", "timelock"
  - Do NOT use the wizard for purely custom contracts (escrow, AMM logic, etc.) — hand-write those

  DEPENDENCY (add to package.json only when wizard is used):
  - "@openzeppelin/wizard": "^0.7.0"   — pure JS API, safe in WebContainer

  NOTE: SOLC + OPENZEPPELIN VERSION PAIRING — CRITICAL:
  @openzeppelin/contracts v5.x internally uses pragma solidity ^0.8.24 or higher.
  solc 0.8.20 CANNOT compile it. You MUST use matching versions:

  CORRECT pair (always use this):
    devDependencies: { "solc": "0.8.27" }        ← exact version, no caret
    dependencies:    { "@openzeppelin/contracts": "^5.0.0" }

  The solc package in devDependencies must be the EXACT string "0.8.27" — no "^" prefix.
  Using "^0.8.20" or "^0.8.27" will resolve to the wrong version via npm semver.

  NOTE: The base blockchain system prompt references solc "0.8.20" — when the OZ Wizard
  is used, this addendum overrides that. Always use "0.8.27" (exact) in package.json
  and pragma solidity ^0.8.27 in all .sol files whenever @openzeppelin/wizard is active.

  In compile.cjs the pragma rewrite must target ^0.8.27 (not ^0.8.20):
    wizardSource = wizardSource.replace(
      /pragma solidity\s+\^0\.\d+\.\d+;/,
      'pragma solidity ^0.8.27;'
    );

  And ALL hand-written .sol files (custom contract, ISMP interfaces, etc.) must also use:
    pragma solidity ^0.8.27;

  HOW TO USE THE WIZARD PROGRAMMATICALLY IN compile.cjs:
  The @openzeppelin/wizard package exposes a CommonJS/JS API.
  Use it inside compile.cjs to auto-generate the base Solidity source,
  then write it to contracts/ BEFORE the solc compilation step runs.

  NOTE: MANDATORY findImport FIX — replace the existing findImport function in compile.cjs:
  The default findImport in getBlockchainSystemPrompt looks for imports relative to contractsDir.
  This breaks @openzeppelin imports because it searches in /contracts/@openzeppelin/...
  instead of /node_modules/@openzeppelin/...
  You MUST replace findImport with this corrected version whenever the OZ Wizard is used:

  \`\`\`js
  function findImport(importPath) {
    // Try node_modules first (handles @openzeppelin/contracts, etc.)
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules', importPath);
    if (fs.existsSync(nodeModulesPath)) {
      return { contents: fs.readFileSync(nodeModulesPath, 'utf8') };
    }
    // Then try relative to contracts/
    const contractsRelPath = path.join(__dirname, '..', 'contracts', importPath);
    if (fs.existsSync(contractsRelPath)) {
      return { contents: fs.readFileSync(contractsRelPath, 'utf8') };
    }
    // Then try the path as-is relative to project root
    const rootPath = path.join(__dirname, '..', importPath);
    if (fs.existsSync(rootPath)) {
      return { contents: fs.readFileSync(rootPath, 'utf8') };
    }
    return { error: 'File not found: ' + importPath };
  }
  \`\`\`

  The critical difference: node_modules is checked FIRST before contracts/.
  Without this, solc tries to open /contracts/@openzeppelin/... which does not exist.

  WIZARD CONTRACT TYPE → API IMPORT MAPPING:
  - ERC-20        → const { erc20 }     = require('@openzeppelin/wizard');
  - ERC-721       → const { erc721 }    = require('@openzeppelin/wizard');
  - ERC-1155      → const { erc1155 }   = require('@openzeppelin/wizard');
  - Governor      → const { governor }  = require('@openzeppelin/wizard');
  - AccessControl → const { custom }    = require('@openzeppelin/wizard');

  WIZARD API PATTERN (insert at the TOP of compile.cjs, before the solc block):
  \`\`\`js
  'use strict';
  const { erc20 } = require('@openzeppelin/wizard');
  const fs   = require('fs');
  const path = require('path');

  const contractsDir = path.join(__dirname, '..', 'contracts');

  // Generate the OZ-grade base contract from the wizard
  let wizardSource = erc20.print({
    name: 'MyToken',      // replace with user-specified token name
    symbol: 'MTK',        // replace with user-specified symbol
    mintable: true,
    burnable: false,
    pausable: false,
    premint: '',          // '' = no premint; or e.g. '1000000' for 1M tokens
    access: 'ownable',    // 'ownable' | 'roles' | 'managed'
    upgradeable: false,   // always false for Polkadot Hub
  });

  // NOTE: CRITICAL: The OZ Wizard may output pragma solidity ^0.8.27 or higher.
  // solc must be pinned to exact version "0.8.27" in devDependencies (no caret).
  // Rewrite any pragma the wizard outputs to exactly ^0.8.27 before writing to disk.
  wizardSource = wizardSource.replace(
    /pragma solidity\s+\^0\.\d+\.\d+;/,
    'pragma solidity ^0.8.27;'
  );

  // NOTE: CRITICAL: The OZ Wizard names the contract using the \`name\` option you pass
  // (e.g. "MyToken"). But the custom contract imports it as BaseToken.
  // You MUST rename the contract definition inside the wizard output to "BaseToken"
  // so that "import './BaseToken.sol'" and "is BaseToken" both resolve correctly.
  // This regex replaces ONLY the contract declaration line, not occurrences inside
  // constructor calls or string literals.
  wizardSource = wizardSource.replace(
    /^contract\s+\w+\s+is\s+/m,
    'contract BaseToken is '
  );

  // Write the wizard base to contracts/ — solc will pick it up automatically
  fs.writeFileSync(
    path.join(contractsDir, 'BaseToken.sol'),
    wizardSource
  );
  console.log('OZ Wizard base written: BaseToken.sol (pragma ^0.8.27, contract renamed to BaseToken)');

  // ... rest of existing compile.cjs solc block follows unchanged ...
  \`\`\`

  WIZARD → AI LAYERING PATTERN:
  1. Wizard generates the audited OZ base (written to contracts/BaseToken.sol).
     The contract declaration inside is ALWAYS renamed to "BaseToken" by compile.cjs.
  2. AI generates the CUSTOM contract that imports and extends the base:
     \`\`\`solidity
     // SPDX-License-Identifier: MIT
     pragma solidity ^0.8.27;

     import "./BaseToken.sol";  // wizard-generated OZ base — DO NOT modify this file

     /// @notice Custom logic layered on top of the OZ Wizard base
     contract MyCustomToken is BaseToken {
         // BaseToken constructor args must match what the wizard generated exactly.
         // Check BaseToken.sol constructor signature and mirror it here.
         // Example if wizard generated: constructor(address initialOwner)
         constructor(address initialOwner) BaseToken(initialOwner) {}

         // Only add domain-specific logic here.
         // NEVER re-implement what OZ already provides (transfer, mint, approve, etc.)
     }
     \`\`\`
  3. deploy.cjs targets the CUSTOM contract (e.g. MyCustomToken), NOT the base
  4. If constructor args mismatch, open BaseToken.sol, read its constructor, mirror exactly.

  WIZARD OPTIONS FOR POLKADOT HUB (safe defaults — always apply):
  - upgradeable: false  — proxy patterns add complexity; skip unless explicitly asked
  - access: 'ownable'  — default; use 'roles' only if user asks for multi-role access
  - Never use UUPS/Transparent proxy unless user explicitly requests upgradeability
  - pragma solidity ^0.8.27 must be used in all .sol files — always matches solc version

  ERC TYPE → WIZARD FUNCTION → KEY OPTIONS:
  | Contract  | Function       | Key Options                                       |
  |-----------|----------------|---------------------------------------------------|
  | ERC-20    | erc20.print    | mintable, burnable, pausable, premint, votes       |
  | ERC-721   | erc721.print   | mintable, burnable, pausable, uriStorage, votes    |
  | ERC-1155  | erc1155.print  | mintable, burnable, pausable, supply               |
  | Governor  | governor.print | votes, timelock, quorumMode, quorumPercent         |

  HARD RULES FOR WIZARD USAGE:
  - NEVER modify the wizard-generated base file — extend it only via inheritance
  - NEVER re-implement OZ functions in the custom contract (transfer, approve, mint, etc.)
  - ALWAYS write wizardSource to disk in compile.cjs before the solc step
  - ALWAYS use solc exact version "0.8.27" in devDependencies — never "^0.8.20" or "^0.8.27"
  - ALWAYS rewrite the wizard pragma to ^0.8.27 immediately after calling .print():
    wizardSource = wizardSource.replace(/pragma solidity\s+\^0\.\d+\.\d+;/, 'pragma solidity ^0.8.27;');
  - ALWAYS rename the wizard contract declaration to "BaseToken" after calling .print():
    wizardSource = wizardSource.replace(/^contract\s+\w+\s+is\s+/m, 'contract BaseToken is ');
    This is required because the wizard names the contract from the \`name\` option (e.g. "MyToken"),
    but the file is saved as BaseToken.sol and the custom contract inherits from "BaseToken".
    Without this rename, solc throws: Identifier not found or not unique --> BaseToken
  - ALWAYS replace the findImport function in compile.cjs with the corrected version above.
    The default findImport resolves imports relative to contracts/ which breaks @openzeppelin.
    Without the fix, solc throws: ENOENT /contracts/@openzeppelin/contracts/token/ERC20/ERC20.sol
    The fix checks node_modules FIRST so @openzeppelin resolves correctly.
  - ALWAYS use pragma solidity ^0.8.27 in ALL hand-written .sol files too
  - If @openzeppelin/wizard is not installed, add it to package.json and rerun pnpm install
  - Do NOT use the wizard for non-standard contracts — OZ defaults won't apply
</oz_polkadot_wizard_integration>

<hyperbridge_cross_chain_integration>
  <!--
  ┌────────────────────────────────────────────────────────────────┐
  │  Hyperbridge Cross-Chain Feature (Bonus)                       │
  │                                                                │
  │  Activated ONLY when user selects "Cross-chain" category OR    │
  │  explicitly mentions Hyperbridge / cross-chain bridging.       │
  │                                                                │
  │  Hyperbridge is a hackathon SPONSOR — very high judge impact.  │
  │  Protocol: ISMP (Interoperable State Machine Protocol)         │
  │  Security: zk-light client proofs, no trusted multisig         │
  └────────────────────────────────────────────────────────────────┘
  -->

  WHAT HYPERBRIDGE IS:
  Hyperbridge is a cross-chain interoperability coprocessor built on Polkadot.
  It lets Solidity contracts on Polkadot Hub send/receive verifiable messages
  to/from Ethereum, Base, Arbitrum, Optimism, BNB Chain, and more.
  Security model: cryptographic state proofs + zk-light clients (no trusted relayer).
  Protocol: ISMP — POST requests for messages, GET requests for state reads.

  ─────────────────────────────────────────────────────────────
  VERIFIED TESTNET CONTRACT ADDRESSES  (Gargantua V3 / Paseo)
  NOTE: Use ONLY these. V1 / V2 / Rococo addresses are deprecated — NEVER use them.
  ─────────────────────────────────────────────────────────────

  POLKADOT HUB TESTNET (Chain ID: 420420417 | StateMachine: EVM-420420417):
    IsmpHost        = 0xbb26e04a71e7c12093e82b83ba310163eac186fa
    HandlerV1       = 0x8b31a195c98ead34cf463a66f52942b6145a68a2
    HostManager     = 0xeccdcaf12bf989aff388dd5f23dce6457635c34a
    TokenGateway    = 0x1c1e5be83df4a54c7a2230c337e4a3e8b7354b1c
    PingModule      = 0x11e24eb75b27a4a48ada1c5fb036fa8e718b32b4
    FeeToken(USD.h) = 0x0dc440cf87830f0af564eb8b62b454b7e0c68a4b
    ConsensusStateId = PAS0

  ETHEREUM SEPOLIA (Chain ID: 11155111 | StateMachine: EVM-11155111):
    IsmpHost        = 0x2EdB74C269948b60ec1000040E104cef0eABaae8
    HandlerV1       = 0x4638945E120846366cB7Abc08DB9c0766E3a663F
    TokenGateway    = 0xFcDa26cA021d5535C3059547390E6cCd8De7acA6
    PingModule      = 0xFE9f23F0F2fE83b8B9576d3FC94e9a7458DdDD35
    FeeToken(USD.h) = 0xA801da100bF16D07F668F4A49E1f71fc54D05177
    TokenFaucet     = 0x1794aB22388303ce9Cb798bE966eeEBeFe59C3a3
    ConsensusStateId = ETH0

  BASE SEPOLIA (Chain ID: 84532 | StateMachine: EVM-84532):
    IsmpHost        = 0xD198c01839dd4843918617AfD1e4DDf44Cc3BB4a
    HandlerV1       = 0x4638945E120846366cB7Abc08DB9c0766E3a663F
    TokenGateway    = 0xFcDa26cA021d5535C3059547390E6cCd8De7acA6
    FeeToken(USD.h) = 0xA801da100bF16D07F668F4A49E1f71fc54D05177
    ConsensusStateId = BASE (Messaging: ETH0)

  ARBITRUM SEPOLIA (Chain ID: 421614 | StateMachine: EVM-421614):
    IsmpHost        = 0x3435bD7e5895356535459D6087D1eB982DAd90e7
    HandlerV1       = 0x4638945E120846366cB7Abc08DB9c0766E3a663F
    TokenGateway    = 0xFcDa26cA021d5535C3059547390E6cCd8De7acA6
    FeeToken(USD.h) = 0xA801da100bF16D07F668F4A49E1f71fc54D05177
    ConsensusStateId = ARB0 (Messaging: ETH0)

  OPTIMISM SEPOLIA (Chain ID: 11155420 | StateMachine: EVM-11155420):
    IsmpHost        = 0x6d51b678836d8060d980605d2999eF211809f3C2
    HandlerV1       = 0x4638945E120846366cB7Abc08DB9c0766E3a663F
    TokenGateway    = 0xFcDa26cA021d5535C3059547390E6cCd8De7acA6
    FeeToken(USD.h) = 0xA801da100bF16D07F668F4A49E1f71fc54D05177
    ConsensusStateId = OPT0 (Messaging: ETH0)

  BSC TESTNET (Chain ID: 97 | StateMachine: EVM-97):
    IsmpHost        = 0x8Aa0Dea6D675d785A882967Bf38183f6117C09b7
    HandlerV1       = 0x4638945E120846366cB7Abc08DB9c0766E3a663F
    TokenGateway    = 0xFcDa26cA021d5535C3059547390E6cCd8De7acA6
    FeeToken(USD.h) = 0xA801da100bF16D07F668F4A49E1f71fc54D05177
    ConsensusStateId = BSC0

  HYPERBRIDGE RELAY CHAIN (Gargantua V3 testnet):
    StateMachineId   = KUSAMA-4009
    WSS              = wss://gargantua.polytope.technology
    Hasher           = Keccak
    ConsensusStateId = PAS0
    Indexer URL      = https://indexer.gargantua.polytope.technology

  ─────────────────────────────────────────────────────────────
  WEBCONTAINER COMPATIBILITY — READ BEFORE WRITING ANY CODE
  ─────────────────────────────────────────────────────────────

  - @polytope-labs/hyperclient  → Rust/WASM native binary → CANNOT run in WebContainer → NEVER USE
  - @hyperbridge/sdk            → Pure JS/TS npm package  → WebContainer-compatible WITH Vite plugin → USE THIS
  - The Vite plugin handles all WASM deps automatically in the dev preview
  - The Solidity contracts (ISMP interfaces + CrossChain contracts) are the primary deliverable
  - The frontend SDK component is secondary — for message status tracking only

  DEPENDENCIES (add ONLY when cross-chain is requested):
  - "@hyperbridge/sdk": "^1.0.0"   — message status tracking in React frontend
  - Do NOT add @polytope-labs/hyperclient (native binary, WebContainer-incompatible)
  - Do NOT add any hardhat Hyperbridge plugins

  VITE CONFIG (required when @hyperbridge/sdk is used in frontend):
  \`\`\`js
  // vite.config.js
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import hyperbridge from '@hyperbridge/sdk/plugins/vite';

  export default defineConfig({
    plugins: [
      react(),
      hyperbridge({ logLevel: 'warn' }),  // handles all WASM deps automatically
    ],
  });
  \`\`\`

  ─────────────────────────────────────────────────────────────
  ISMP SOLIDITY INTERFACES (inline into contracts/interfaces/)
  NOTE: There is NO npm package for these — always copy them verbatim.
  ─────────────────────────────────────────────────────────────

  \`\`\`solidity
  // contracts/interfaces/IIsmpHost.sol
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.27;

  struct PostRequest {
      bytes source;            // source state machine ID as bytes e.g. "EVM-420420417"
      bytes dest;              // destination state machine ID as bytes e.g. "EVM-11155111"
      uint64 nonce;            // assigned by ISMP host — always pass 0
      bytes from;              // sender address as bytes: abi.encodePacked(address)
      bytes to;                // recipient contract address as bytes
      uint64 timeoutTimestamp; // unix timestamp; 0 = no timeout
      bytes body;              // ABI-encoded message payload
      uint256 gaslimit;        // gas limit on destination chain
  }

  struct PostResponse {
      PostRequest request;
      bytes response;
      uint64 timeoutTimestamp;
  }

  struct HostParams {
      uint256 defaultTimeout;
      uint256 baseGetRequestFee;
      uint256 perByteFee;
      uint256 stateCommitmentFee;
      address hyperbridge;
      address admin;
      address handler;
      address hostManager;
      address uniswapV2;
      uint256 challengePeriod;
      uint256 consensusUpdateTimestamp;
      uint256 defaultGasLimit;
      uint256 unStakingPeriod;
      bytes latestStateMachineHeight;
  }

  interface IIsmpHost {
      /// @notice Dispatch a cross-chain POST request — attach dispatch fee as msg.value
      function dispatch(PostRequest memory request) external payable returns (bytes32 commitment);
      /// @notice Get current host parameters including fee rates
      function hostParams() external view returns (HostParams memory);
  }

  interface IIsmpModule {
      /// @notice Called by ISMP handler when an inbound cross-chain message arrives
      function onAccept(PostRequest calldata request) external;
      /// @notice Called when a cross-chain response arrives
      function onPostResponse(PostResponse calldata response) external;
      /// @notice Called when an outbound request times out
      function onPostRequestTimeout(PostRequest calldata request) external;
  }
  \`\`\`

  ─────────────────────────────────────────────────────────────
  CONTRACT A — CROSS-CHAIN SENDER (deploy on Polkadot Hub TestNet)
  ─────────────────────────────────────────────────────────────

  \`\`\`solidity
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.27;

  import "@openzeppelin/contracts/access/Ownable.sol";
  import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
  import "./interfaces/IIsmpHost.sol";

  /// @notice Sends cross-chain messages from Polkadot Hub to another EVM chain via Hyperbridge
  contract CrossChainSender is Ownable, ReentrancyGuard, IIsmpModule {

      /// @notice Hyperbridge ISMP Host on Polkadot Hub TestNet
      /// @dev Verified Gargantua V3 address: 0xbb26e04a71e7c12093e82b83ba310163eac186fa
      IIsmpHost public immutable ismpHost;

      /// @notice Destination state machine ID as bytes e.g. bytes("EVM-11155111")
      bytes public destStateMachine;

      /// @notice Recipient contract address on the destination chain
      address public destContract;

      event MessageSent(bytes32 indexed commitment, bytes payload);
      event MessageReceived(bytes indexed source, bytes payload);
      event ResponseReceived(bytes indexed source);

      error UnauthorizedCaller();
      error InsufficientFee();

      /// @param _ismpHost      IsmpHost on Polkadot Hub TestNet:
      ///                       0xbb26e04a71e7c12093e82b83ba310163eac186fa
      /// @param _destMachine   Destination e.g. "EVM-11155111" for Ethereum Sepolia
      /// @param _destContract  Receiver contract on the destination chain
      /// @param _owner         Initial owner (pass deployer wallet address)
      constructor(
          address _ismpHost,
          string memory _destMachine,
          address _destContract,
          address _owner
      ) Ownable(_owner) {
          ismpHost = IIsmpHost(_ismpHost);
          destStateMachine = bytes(_destMachine);
          destContract = _destContract;
      }

      /// @notice Send a cross-chain message to destContract on the destination chain
      /// @dev Attach PAS (msg.value > 0) to cover the ISMP dispatch fee
      /// @param payload ABI-encoded data — decoded by onAccept() on the receiving contract
      function sendCrossChain(bytes calldata payload)
          external
          payable
          nonReentrant
      {
          if (msg.value == 0) revert InsufficientFee();

          PostRequest memory request = PostRequest({
              source: abi.encodePacked(address(this)),
              dest: destStateMachine,
              nonce: 0,
              from: abi.encodePacked(address(this)),
              to: abi.encodePacked(destContract),
              timeoutTimestamp: uint64(block.timestamp + 3600), // 1 hour timeout
              body: payload,
              gaslimit: 200_000
          });

          bytes32 commitment = ismpHost.dispatch{value: msg.value}(request);
          emit MessageSent(commitment, payload);
      }

      /// @notice IIsmpModule: called by ISMP Host when a message is received here
      function onAccept(PostRequest calldata request) external override {
          if (msg.sender != address(ismpHost)) revert UnauthorizedCaller();
          emit MessageReceived(request.source, request.body);
          // Add custom inbound message handling logic here
      }

      function onPostResponse(PostResponse calldata response) external override {
          if (msg.sender != address(ismpHost)) revert UnauthorizedCaller();
          emit ResponseReceived(response.request.source);
      }

      function onPostRequestTimeout(PostRequest calldata) external override {
          if (msg.sender != address(ismpHost)) revert UnauthorizedCaller();
          // Optionally handle timeout: refund sender, retry, etc.
      }

      /// @notice Update destination after Contract B is deployed — owner only
      function setDestination(string calldata _destMachine, address _destContract)
          external onlyOwner
      {
          destStateMachine = bytes(_destMachine);
          destContract = _destContract;
      }

      /// @notice Withdraw PAS balance — owner only
      function withdraw() external onlyOwner {
          (bool ok,) = owner().call{value: address(this).balance}("");
          require(ok, "Withdraw failed");
      }

      receive() external payable {}
  }
  \`\`\`

  ─────────────────────────────────────────────────────────────
  CONTRACT B — CROSS-CHAIN RECEIVER (deploy on destination chain)
  NOTE: Deployed via scripts/deploy-receiver.cjs using PRIVATE_KEY directly.
      No MetaMask involved — ethers.Wallet signs directly from .env key.
  ─────────────────────────────────────────────────────────────

  \`\`\`solidity
  // SPDX-License-Identifier: MIT
  pragma solidity ^0.8.27;

  import "./interfaces/IIsmpHost.sol";

  /// @notice Receives cross-chain messages from Polkadot Hub via Hyperbridge
  /// @dev Deploy on Ethereum Sepolia with IsmpHost = 0x2EdB74C269948b60ec1000040E104cef0eABaae8
  contract CrossChainReceiver is IIsmpModule {

      address public immutable ismpHost;

      event CrossChainMessageReceived(address indexed sender, bytes payload);

      error UnauthorizedCaller();

      /// @param _ismpHost IsmpHost on the destination chain
      ///   Ethereum Sepolia: 0x2EdB74C269948b60ec1000040E104cef0eABaae8
      ///   Base Sepolia:     0xD198c01839dd4843918617AfD1e4DDf44Cc3BB4a
      ///   Arbitrum Sepolia: 0x3435bD7e5895356535459D6087D1eB982DAd90e7
      ///   Optimism Sepolia: 0x6d51b678836d8060d980605d2999eF211809f3C2
      constructor(address _ismpHost) {
          ismpHost = _ismpHost;
      }

      /// @notice Called by Hyperbridge ISMP Host when the cross-chain message arrives
      function onAccept(PostRequest calldata request) external override {
          if (msg.sender != ismpHost) revert UnauthorizedCaller();

          // Decode sender address from source bytes
          address sender;
          bytes memory fromBytes = request.from;
          assembly { sender := mload(add(fromBytes, 20)) }

          emit CrossChainMessageReceived(sender, request.body);

          // Add your custom logic here:
          // e.g. (address recipient, uint256 amount) = abi.decode(request.body, (address, uint256));
          //      _mint(recipient, amount);
      }

      function onPostResponse(PostResponse calldata) external override {
          if (msg.sender != ismpHost) revert UnauthorizedCaller();
      }

      function onPostRequestTimeout(PostRequest calldata) external override {
          if (msg.sender != ismpHost) revert UnauthorizedCaller();
      }
  }
  \`\`\`

  ─────────────────────────────────────────────────────────────
  DEPLOYMENT STRATEGY — TWO SEPARATE SCRIPTS, TWO DIFFERENT SIGNERS
  ─────────────────────────────────────────────────────────────

  CONTRACT A (CrossChainSender on Polkadot Hub):
  → Uses MetaMask (browser wallet) via window.ethereum + ethers BrowserProvider
  → The user approves the transaction in their MetaMask popup
  → Script: scripts/deploy-sender.cjs  (runs in WebContainer, triggers MetaMask)
  → Chain: Polkadot Hub TestNet (Chain ID: 420420417)

  CONTRACT B (CrossChainReceiver on destination chain):
  → Uses PRIVATE_KEY directly from .env — no MetaMask, no browser interaction
  → ethers.Wallet signs and broadcasts automatically
  → Script: scripts/deploy-receiver.cjs  (fully automated, runs in WebContainer terminal)
  → Chain: destination chain (e.g. Ethereum Sepolia, Base Sepolia, etc.)

  WHY THIS SPLIT:
  - Polkadot Hub uses SubWallet/MetaMask as the primary wallet — consistent with the
    existing wallet integration pattern in getBlockchainSystemPrompt()
  - The destination chain (Sepolia etc.) does not need a browser wallet — the user's
    PRIVATE_KEY is already available in .env and ethers.Wallet handles it cleanly

  ─────────────────────────────────────────────────────────────
  DEPLOY SCRIPT A — Contract A on Polkadot Hub via MetaMask
  File: scripts/deploy-sender.cjs
  ─────────────────────────────────────────────────────────────

  \`\`\`js
  'use strict';
  // Contract A — CrossChainSender — deployed via MetaMask (browser wallet)
  // This script runs in the WebContainer and uses window.ethereum injected by MetaMask/SubWallet.
  // The user will see a MetaMask popup to approve the deployment transaction.

  const { ethers } = require('ethers');
  const fs   = require('fs');
  const path = require('path');

  // ── Verified Gargantua V3 addresses ──────────────────────────
  const ISMP_HOST_POLKADOT_HUB = '0xbb26e04a71e7c12093e82b83ba310163eac186fa';
  const DEST_STATE_MACHINE     = 'EVM-11155111';   // Ethereum Sepolia — change if needed
  // Set DEST_CONTRACT_ADDRESS after deploying Contract B; ZeroAddress is fine until then
  const DEST_CONTRACT_ADDRESS  = process.env.DEST_CONTRACT_ADDRESS || ethers.ZeroAddress;
  // ─────────────────────────────────────────────────────────────

  const CHAIN_ID   = 420420417;
  const CHAIN_HEX  = '0x1910E881';
  const RPC_URL    = 'https://eth-rpc-testnet.polkadot.io/';
  const EXPLORER   = 'https://blockscout-testnet.polkadot.io/';

  const POLKADOT_HUB_NETWORK = {
    chainId:  CHAIN_HEX,
    chainName: 'Polkadot Hub TestNet',
    nativeCurrency: { name: 'PAS', symbol: 'PAS', decimals: 18 },
    rpcUrls: [RPC_URL],
    blockExplorerUrls: [EXPLORER],
  };

  async function deploySender() {
    // ── 1. Detect wallet (SubWallet first, MetaMask fallback) ──
    let ethereumProvider = null;
    if (typeof window !== 'undefined') {
      if (window.injectedWeb3?.['subwallet-js']) {
        ethereumProvider = window.injectedWeb3['subwallet-js'];
        console.log('Using SubWallet');
      } else if (window.ethereum) {
        ethereumProvider = window.ethereum;
        console.log('Using MetaMask');
      }
    }

    if (!ethereumProvider) {
      throw new Error(
        'No browser wallet detected. Please install MetaMask or SubWallet and refresh.'
      );
    }

    // ── 2. Request wallet connection ───────────────────────────
    const accounts = await ethereumProvider.request({ method: 'eth_requestAccounts' });
    console.log('Connected wallet:', accounts[0]);

    // ── 3. Switch to / add Polkadot Hub TestNet ────────────────
    try {
      await ethereumProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_HEX }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await ethereumProvider.request({
          method: 'wallet_addEthereumChain',
          params: [POLKADOT_HUB_NETWORK],
        });
      } else {
        throw switchError;
      }
    }

    // ── 4. Create BrowserProvider signer ──────────────────────
    const provider = new ethers.BrowserProvider(ethereumProvider);
    const signer   = await provider.getSigner();

    // Confirm we're on the right chain
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== CHAIN_ID) {
      throw new Error(\`Wrong network. Expected chainId \${CHAIN_ID}, got \${network.chainId}\`);
    }

    // ── 5. Load artifact and deploy ───────────────────────────
    const artifactPath = path.join(__dirname, '..', 'artifacts', 'CrossChainSender.json');
    const artifact     = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const factory      = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);

    console.log('Deploying CrossChainSender — MetaMask will prompt for approval...');

    async function buildTxOverrides() {
      const feeData = await provider.getFeeData();
      const nonce = await signer.getNonce('pending');
      const fallbackPriority = ethers.parseUnits('2', 'gwei');
      const maxPriorityFeePerGas =
        feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas > 0n
          ? feeData.maxPriorityFeePerGas * 2n
          : fallbackPriority;
      const maxFeePerGas =
        feeData.maxFeePerGas && feeData.maxFeePerGas > maxPriorityFeePerGas
          ? feeData.maxFeePerGas * 2n
          : maxPriorityFeePerGas * 3n;

      return { nonce, maxPriorityFeePerGas, maxFeePerGas };
    }

    async function deployWithRetry() {
      const overrides = await buildTxOverrides();

      try {
        return await factory.deploy(
          ISMP_HOST_POLKADOT_HUB, // arg 1: ISMP Host on Polkadot Hub TestNet
          DEST_STATE_MACHINE, // arg 2: destination state machine string
          DEST_CONTRACT_ADDRESS, // arg 3: receiver on dest chain (ZeroAddress until deployed)
          accounts[0], // arg 4: initial owner = connected wallet
          overrides
        );
      } catch (err) {
        const msg = String(err?.message || err);

        if (msg.includes('Priority is too low') || msg.includes('replacement transaction underpriced')) {
          console.warn('Low tx priority detected, retrying with higher fees...');
          const boosted = {
            ...overrides,
            maxPriorityFeePerGas: overrides.maxPriorityFeePerGas * 2n,
            maxFeePerGas: overrides.maxFeePerGas * 2n,
          };

          return await factory.deploy(
            ISMP_HOST_POLKADOT_HUB,
            DEST_STATE_MACHINE,
            DEST_CONTRACT_ADDRESS,
            accounts[0],
            boosted
          );
        }

        throw err;
      }
    }

    const contract = await deployWithRetry();

    const txHash = contract.deploymentTransaction().hash;
    console.log('Tx submitted:', txHash);
    console.log('Track: ' + EXPLORER + 'tx/' + txHash);
    console.log('Waiting for confirmation...');

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log('');
    console.log('CrossChainSender deployed at:', address);
    console.log('   Explorer:', EXPLORER + 'address/' + address);

    // Save deployment info for frontend use
    const outDir  = path.join(__dirname, '..', 'src', 'contracts');
    const outPath = path.join(outDir, 'deployedContract.json');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({
      address,
      abi: artifact.abi,
      chainId: CHAIN_ID,
      chainIdHex: CHAIN_HEX,
      rpcUrl: RPC_URL,
      explorer: EXPLORER,
      ismpHost: ISMP_HOST_POLKADOT_HUB,
      destStateMachine: DEST_STATE_MACHINE,
      deployed: true,
    }, null, 2));
    console.log('   Saved to src/contracts/deployedContract.json');
    console.log('');
    console.log('NEXT STEP: Run  node scripts/deploy-receiver.cjs  to deploy Contract B.');
  }

  deploySender().catch(err => { console.error('Deploy failed:', err.message); process.exit(1); });
  \`\`\`

  ─────────────────────────────────────────────────────────────
  DEPLOY SCRIPT B — Contract B on destination chain via PRIVATE_KEY
  File: scripts/deploy-receiver.cjs
  ─────────────────────────────────────────────────────────────

  \`\`\`js
  'use strict';
  // Contract B — CrossChainReceiver — deployed via PRIVATE_KEY directly (no browser wallet).
  // This script reads PRIVATE_KEY from .env and signs automatically.
  // Change DEST_CHAIN_CONFIG to deploy to a different destination chain.

  require('dotenv').config();
  const { ethers } = require('ethers');
  const fs   = require('fs');
  const path = require('path');

  // ── Choose your destination chain ────────────────────────────
  // Uncomment the chain you want to deploy Contract B on.
  // Must match the DEST_STATE_MACHINE in deploy-sender.cjs.

  const DEST_CHAIN_CONFIG = {
    name:     'Ethereum Sepolia',
    rpcUrl:   'https://rpc.sepolia.org',
    chainId:  11155111,
    ismpHost: '0x2EdB74C269948b60ec1000040E104cef0eABaae8',  // Gargantua V3 Sepolia
    explorer: 'https://sepolia.etherscan.io/',
  };

  // const DEST_CHAIN_CONFIG = {
  //   name:     'Base Sepolia',
  //   rpcUrl:   'https://sepolia.base.org',
  //   chainId:  84532,
  //   ismpHost: '0xD198c01839dd4843918617AfD1e4DDf44Cc3BB4a',
  //   explorer: 'https://sepolia.basescan.org/',
  // };

  // const DEST_CHAIN_CONFIG = {
  //   name:     'Arbitrum Sepolia',
  //   rpcUrl:   'https://sepolia-rollup.arbitrum.io/rpc',
  //   chainId:  421614,
  //   ismpHost: '0x3435bD7e5895356535459D6087D1eB982DAd90e7',
  //   explorer: 'https://sepolia.arbiscan.io/',
  // };

  // const DEST_CHAIN_CONFIG = {
  //   name:     'Optimism Sepolia',
  //   rpcUrl:   'https://sepolia.optimism.io',
  //   chainId:  11155420,
  //   ismpHost: '0x6d51b678836d8060d980605d2999eF211809f3C2',
  //   explorer: 'https://sepolia-optimism.etherscan.io/',
  // };
  // ─────────────────────────────────────────────────────────────

  async function deployReceiver() {
    if (!process.env.PRIVATE_KEY) {
      console.error('ERROR: PRIVATE_KEY not set in .env');
      process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(
      DEST_CHAIN_CONFIG.rpcUrl,
      { chainId: DEST_CHAIN_CONFIG.chainId, name: DEST_CHAIN_CONFIG.name }
    );
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log('Deploying CrossChainReceiver on', DEST_CHAIN_CONFIG.name);
    console.log('From wallet:', wallet.address);

    const artifactPath = path.join(__dirname, '..', 'artifacts', 'CrossChainReceiver.json');
    if (!fs.existsSync(artifactPath)) {
      console.error('Artifact not found. Run node scripts/compile.cjs first.');
      process.exit(1);
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    async function buildTxOverrides() {
      const feeData = await provider.getFeeData();
      const nonce = await provider.getTransactionCount(wallet.address, 'pending');
      const fallbackPriority = ethers.parseUnits('2', 'gwei');
      const maxPriorityFeePerGas =
        feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas > 0n
          ? feeData.maxPriorityFeePerGas * 2n
          : fallbackPriority;
      const maxFeePerGas =
        feeData.maxFeePerGas && feeData.maxFeePerGas > maxPriorityFeePerGas
          ? feeData.maxFeePerGas * 2n
          : maxPriorityFeePerGas * 3n;

      return { nonce, maxPriorityFeePerGas, maxFeePerGas };
    }

    async function deployWithRetry() {
      const overrides = await buildTxOverrides();

      try {
        return await factory.deploy(
          DEST_CHAIN_CONFIG.ismpHost, // arg 1: ISMP Host on the destination chain
          overrides
        );
      } catch (err) {
        const msg = String(err?.message || err);

        if (msg.includes('Priority is too low') || msg.includes('replacement transaction underpriced')) {
          console.warn('Low tx priority detected, retrying with higher fees...');
          const boosted = {
            ...overrides,
            maxPriorityFeePerGas: overrides.maxPriorityFeePerGas * 2n,
            maxFeePerGas: overrides.maxFeePerGas * 2n,
          };

          return await factory.deploy(DEST_CHAIN_CONFIG.ismpHost, boosted);
        }

        throw err;
      }
    }

    const contract = await deployWithRetry();

    const txHash = contract.deploymentTransaction().hash;
    console.log('Tx submitted:', txHash);
    console.log('Track:', DEST_CHAIN_CONFIG.explorer + 'tx/' + txHash);
    console.log('Waiting for confirmation...');

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log('');
    console.log('CrossChainReceiver deployed at:', address);
    console.log('   Explorer:', DEST_CHAIN_CONFIG.explorer + 'address/' + address);

    // Save receiver deployment info
    const outPath = path.join(__dirname, '..', 'src', 'contracts', 'deployedReceiver.json');
    fs.writeFileSync(outPath, JSON.stringify({
      address,
      abi:      artifact.abi,
      chainId:  DEST_CHAIN_CONFIG.chainId,
      chain:    DEST_CHAIN_CONFIG.name,
      ismpHost: DEST_CHAIN_CONFIG.ismpHost,
      explorer: DEST_CHAIN_CONFIG.explorer,
    }, null, 2));
    console.log('   Saved to src/contracts/deployedReceiver.json');
    console.log('');
    console.log('FINAL STEP:');
    console.log('Call setDestination() on CrossChainSender (Contract A) with:');
    console.log('  _destMachine  =', JSON.stringify('EVM-' + DEST_CHAIN_CONFIG.chainId));
    console.log('  _destContract =', address);
    console.log('Then fund CrossChainSender with PAS before calling sendCrossChain().');
  }

  deployReceiver().catch(err => { console.error('Deploy failed:', err.message); process.exit(1); });
  \`\`\`

  ─────────────────────────────────────────────────────────────
  FRONTEND — MESSAGE STATUS TRACKING (@hyperbridge/sdk)
  NOTE: Correct method: postRequestStatusStream() — NOT postRequestStatus()
  ─────────────────────────────────────────────────────────────

  \`\`\`jsx
  // src/components/CrossChainStatus.jsx
  import React, { useState, useEffect } from 'react';
  import {
    IndexerClient,
    createQueryClient,
    EvmChain,
    SubstrateChain,
    postRequestCommitment,
    RequestStatus,
  } from '@hyperbridge/sdk';

  // Gargantua V3 testnet infrastructure
  const INDEXER_URL     = 'https://indexer.gargantua.polytope.technology';
  const HYPERBRIDGE_WSS = 'wss://gargantua.polytope.technology';

  // Verified ISMP Host addresses — Gargantua V3 / Paseo
  const CHAIN_CONFIG = {
    420420417: {
      rpcUrl: 'https://eth-rpc-testnet.polkadot.io/',
      host: '0xbb26e04a71e7c12093e82b83ba310163eac186fa',
      consensusStateId: 'PAS0',
    },
    11155111: {
      rpcUrl: 'https://rpc.sepolia.org',
      host: '0x2EdB74C269948b60ec1000040E104cef0eABaae8',
      consensusStateId: 'ETH0',
    },
    84532: {
      rpcUrl: 'https://sepolia.base.org',
      host: '0xD198c01839dd4843918617AfD1e4DDf44Cc3BB4a',
      consensusStateId: 'ETH0',
    },
    421614: {
      rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
      host: '0x3435bD7e5895356535459D6087D1eB982DAd90e7',
      consensusStateId: 'ETH0',
    },
    11155420: {
      rpcUrl: 'https://sepolia.optimism.io',
      host: '0x6d51b678836d8060d980605d2999eF211809f3C2',
      consensusStateId: 'ETH0',
    },
    97: {
      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      host: '0x8Aa0Dea6D675d785A882967Bf38183f6117C09b7',
      consensusStateId: 'BSC0',
    },
  };

  const STATUS_LABELS = {
    'Initializing...':                     'Initializing...',
    [RequestStatus.SOURCE_FINALIZED]:      'Finalized on source chain',
    [RequestStatus.HYPERBRIDGE_DELIVERED]: 'Delivered to Hyperbridge relay',
    [RequestStatus.HYPERBRIDGE_FINALIZED]: 'Finalized on Hyperbridge',
    [RequestStatus.DEST_DELIVERED]:        'Delivered to destination!',
  };

  /**
   * Tracks a Hyperbridge cross-chain message in real time.
   * @prop {string}  txHash        - sendCrossChain() transaction hash
   * @prop {number}  sourceChainId - e.g. 420420417 (Polkadot Hub)
   * @prop {number}  destChainId   - e.g. 11155111 (Ethereum Sepolia)
   * @prop {object}  request       - PostRequest object (optional, for commitment)
   */
  export default function CrossChainStatus({ txHash, sourceChainId, destChainId, request }) {
    const [status, setStatus] = useState('Initializing...');
    const [error,  setError]  = useState(null);
    const [done,   setDone]   = useState(false);

    useEffect(() => {
      if (!txHash) return;
      let cancelled = false;

      async function track() {
        try {
          const srcCfg  = CHAIN_CONFIG[sourceChainId];
          const destCfg = CHAIN_CONFIG[destChainId];

          const queryClient = createQueryClient({ url: INDEXER_URL });

          const sourceChain = new EvmChain({
            chainId: sourceChainId,
            rpcUrl:  srcCfg.rpcUrl,
            host:    srcCfg.host,
            consensusStateId: srcCfg.consensusStateId,
          });

          const destChain = new EvmChain({
            chainId: destChainId,
            rpcUrl:  destCfg.rpcUrl,
            host:    destCfg.host,
            consensusStateId: destCfg.consensusStateId,
          });

          const hyperbridgeChain = new SubstrateChain({
            stateMachineId: 'KUSAMA-4009',
            wsUrl:  HYPERBRIDGE_WSS,
            hasher: 'Keccak',
            consensusStateId: 'PAS0',
          });

          await hyperbridgeChain.connect();

          const indexer = new IndexerClient({
            queryClient,
            pollInterval: 3_000,
            source:     sourceChain,
            dest:       destChain,
            hyperbridge: hyperbridgeChain,
          });

          // Derive commitment hash from PostRequest object if provided,
          // otherwise fall back to using txHash directly
          const commitment = request
            ? postRequestCommitment(request)
            : txHash;

          // Correct method: postRequestStatusStream (NOT postRequestStatus)
          for await (const update of indexer.postRequestStatusStream(commitment)) {
            if (cancelled) break;
            setStatus(update.status);
            if (update.status === RequestStatus.DEST_DELIVERED) {
              setDone(true);
              break;
            }
          }
        } catch (err) {
          if (!cancelled) setError(err.message);
        }
      }

      track();
      return () => { cancelled = true; };
    }, [txHash, sourceChainId, destChainId]);

    if (error) return (
      <div style={{ color: 'red', padding: '8px', borderRadius: '6px', border: '1px solid red' }}>
        Tracking error: {error}
      </div>
    );

    return (
      <div style={{ padding: '12px', border: '1px solid #444', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 8px' }}>Cross-Chain Message Status</h4>
        <p style={{ margin: '4px 0', fontSize: '0.82em', wordBreak: 'break-all' }}>
          Tx: <code>{txHash}</code>
        </p>
        <p style={{ margin: '6px 0', fontWeight: 'bold' }}>
          {STATUS_LABELS[status] || status}
        </p>
        {done && (
          <p style={{ color: '#4caf50', margin: '4px 0' }}>
            Message successfully delivered cross-chain!
          </p>
        )}
        <p style={{ fontSize: '0.75em', color: '#888', marginTop: '8px' }}>
          Takes 2–10 minutes · Powered by{' '}
          <a href="https://hyperbridge.network" target="_blank" rel="noreferrer">Hyperbridge</a>
          {' · '}
          <a href="https://explorer.hyperbridge.network" target="_blank" rel="noreferrer">
            View in Explorer
          </a>
        </p>
      </div>
    );
  }
  \`\`\`

  ─────────────────────────────────────────────────────────────
  CROSS-CHAIN PROMPT CATEGORY — TRIGGER RULES
  ─────────────────────────────────────────────────────────────

  Activate cross-chain mode ONLY when:
  - User selects "Cross-chain" prompt category in the UI, OR
  - User prompt contains keywords: "hyperbridge", "cross-chain", "bridge",
    "send to ethereum", "receive from", "ISMP", "interoperability", "multi-chain"

  When cross-chain mode is ACTIVE, ALWAYS generate ALL of:
  1. contracts/interfaces/IIsmpHost.sol     (inline ISMP interfaces verbatim)
  2. contracts/CrossChainSender.sol         (Contract A — Polkadot Hub)
  3. contracts/CrossChainReceiver.sol       (Contract B — destination chain)
  4. scripts/deploy-sender.cjs              (MetaMask BrowserProvider — Polkadot Hub)
  5. scripts/deploy-receiver.cjs            (PRIVATE_KEY direct — destination chain)
  6. @hyperbridge/sdk added to package.json
  7. Hyperbridge Vite plugin added to vite.config.js
  8. src/components/CrossChainStatus.jsx added to frontend
  9. Use VERIFIED addresses from the address table above — never use address(0)

  EXECUTION ORDER (each is a separate shell action — never chain with &&):
  1. [shell] pnpm install
  2. [shell] node scripts/compile.cjs
  3. [shell] node scripts/deploy-sender.cjs      ← triggers MetaMask popup on Polkadot Hub
  4. [shell] node scripts/deploy-receiver.cjs    ← uses PRIVATE_KEY, deploys on dest chain

  ALWAYS TELL THE USER IN THE UI / DEPLOY OUTPUT:
  - Contract A (CrossChainSender) deploys via MetaMask/SubWallet — user approves in wallet popup
  - Contract B (CrossChainReceiver) deploys automatically using PRIVATE_KEY from .env — no popup
  - Both scripts run inside Igriz's WebContainer terminal — no Remix needed
  - After both deploy, call setDestination() on Contract A with Contract B's address
    (the deploy-receiver.cjs output prints the exact setDestination() call to make)
  - Fund CrossChainSender with PAS tokens before calling sendCrossChain()
  - Cross-chain messages take 2–10 minutes to finalize

  EXAMPLE PROMPTS AND WHAT TO GENERATE:
  - "Send tokens from Polkadot Hub to Ethereum"
    → CrossChainSender on Polkadot Hub + ERC-20 mint logic in CrossChainReceiver on Sepolia
  - "Accept ETH on Ethereum, mint tokens on Polkadot Hub"
    → CrossChainReceiver on Sepolia that dispatches back + CrossChainSender/Minter on Polkadot Hub
  - "Cross-chain DAO voting"
    → Governor on Polkadot Hub + vote aggregator receiving results via Hyperbridge

  HARD RULES — VIOLATIONS CAUSE RUNTIME FAILURES:
  - NEVER use @polytope-labs/hyperclient (Rust/WASM binary, breaks WebContainer)
  - ALWAYS inline the ISMP Solidity interfaces — there is no npm package for them
  - ALWAYS use postRequestStatusStream() in SDK — NOT postRequestStatus() (wrong name)
  - ALWAYS verify msg.sender == address(ismpHost) in ALL three IIsmpModule callbacks
  - ALWAYS apply ReentrancyGuard to sendCrossChain() and any payable function
  - ALWAYS use Gargantua V3 addresses from the verified table — never V1/V2/Rococo
  - NEVER claim deployment succeeded without a real tx hash AND deployed address in output
  - Contract A MUST use BrowserProvider + MetaMask/SubWallet — NEVER use PRIVATE_KEY for Polkadot Hub
  - Contract B MUST use ethers.Wallet(PRIVATE_KEY) directly — NEVER use BrowserProvider for dest chain
  - ALWAYS generate TWO separate deploy scripts: deploy-sender.cjs and deploy-receiver.cjs
  - NEVER merge both deployments into a single deploy.cjs script
</hyperbridge_cross_chain_integration>
`;