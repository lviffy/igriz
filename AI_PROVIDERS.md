# AI Providers Configuration Guide

This application now supports multiple AI providers, giving you flexibility to choose between cloud-based and local LLM options.

## Supported Providers

### 1. OpenRouter (Cloud-based) - Default

**OpenRouter** provides access to multiple AI models through a unified API, including Google Gemini, Meta Llama, DeepSeek, and more.

#### Setup

1. Get your API key from [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Add to your `.env.local` file:
   ```env
   AI_PROVIDER=openrouter
   OPEN_ROUTER_API_KEY=your-api-key-here
   ```

#### Popular Models

- `google/gemini-2.5-flash` - Powerful and affordable (default)
- `google/gemini-2.0-flash-001` - Very cheap and fast
- `deepseek/deepseek-chat` - Very cheap and capable
- `meta-llama/llama-3.1-70b-instruct` - Open-source, solid performance
- `mistralai/mistral-large-latest` - Balanced
- `anthropic/claude-3.5-sonnet` - High quality

Full model list: [https://openrouter.ai/models](https://openrouter.ai/models)

#### Pros
- Access to latest AI models
- No local hardware requirements
- Reliable and fast
- Wide selection of models

#### Cons
- Requires API key and costs per use
- Needs internet connection
- Data sent to external servers

---

### 2. LM Studio (Local) - Private & Free

**LM Studio** allows you to run AI models locally on your own machine with complete privacy and no API costs.

#### Setup

1. **Download LM Studio**
   - Visit [https://lmstudio.ai/](https://lmstudio.ai/)
   - Download and install for your operating system

2. **Load a Model**
   - Open LM Studio
   - Browse and download a model (recommendations below)
   - Load the model into memory

3. **Start the Server**
   - In LM Studio, go to "Local Server" tab
   - Click "Start Server"
   - Server will run on `ws://localhost:1234` by default (WebSocket protocol)

4. **Configure Your App**
   - Add to your `.env.local` file:
   ```env
   AI_PROVIDER=lmstudio
   # Note: Must use WebSocket protocol (ws:// not http://)
   LMSTUDIO_BASE_URL=ws://localhost:1234
   # Optional: only if running on different port or remote server
   # LMSTUDIO_BASE_URL=ws://10.1.7.66:1234
   ```

#### Recommended Models for LM Studio

**For 8GB+ RAM:**
- Llama 3.2 (3B) - Fast, good for coding
- Phi-3 Mini (3.8B) - Efficient, good quality
- Mistral 7B - Balanced performance

**For 16GB+ RAM:**
- Llama 3.1 (8B) - Great for code generation
- CodeLlama (7B/13B) - Specialized for coding
- Mistral 7B Instruct - Excellent balance

**For 32GB+ RAM:**
- Llama 3.1 (70B) - High quality responses
- DeepSeek Coder (33B) - Excellent for code
- Mixtral 8x7B - Great general performance

#### Pros
- ✅ **100% Private** - Your data never leaves your machine
- ✅ **Zero API Costs** - Completely free to use
- ✅ **No Internet Required** - Works offline
- ✅ **Full Control** - Choose any compatible model

#### Cons
- ❌ Requires local hardware (RAM, GPU optional but recommended)
- ❌ Initial setup needed
- ❌ Model quality depends on your hardware
- ❌ Slower than cloud-based models on lower-end hardware

---

## Switching Between Providers

Simply change the `AI_PROVIDER` value in your `.env.local` file:

```env
# For OpenRouter (cloud)
AI_PROVIDER=openrouter

# For LM Studio (local)
AI_PROVIDER=lmstudio
```

Then restart your development server.

---

## Advanced Configuration

### Custom LM Studio Port

If you're running LM Studio on a different port or remote server:

```env
AI_PROVIDER=lmstudio
# Note: Must use WebSocket protocol (ws:// or wss://)
LMSTUDIO_BASE_URL=ws://localhost:8080
# For remote server:
# LMSTUDIO_BASE_URL=ws://192.168.1.100:1234
```

### Custom Model Selection

The application uses default models for each provider, but you can customize this in:
- `app/lib/.server/llm/provider.ts` - Update `DEFAULT_MODELS`
- Or programmatically pass a model name when calling the API

---

## Troubleshooting

### LM Studio Connection Issues

**Error: "Failed to construct LMStudioClient. The baseUrl passed in must have protocol 'ws' or 'wss'"**

1. Ensure you're using WebSocket protocol (`ws://` or `wss://`), not HTTP
2. Correct format: `LMSTUDIO_BASE_URL=ws://localhost:1234`
3. Incorrect: `http://localhost:1234` or `http://localhost:1234/v1`

**Error: "Failed to connect to LM Studio"**

1. Verify LM Studio server is running (check the "Local Server" tab)
2. Check the server URL (default: ws://localhost:1234)
3. Ensure a model is loaded in LM Studio
4. Check firewall settings aren't blocking localhost connections
5. For remote connections, ensure the port is accessible on your network

**Error: "Model not loaded"**

1. Open LM Studio
2. Load a model from the downloaded models
3. Ensure it shows as "Loaded" in the UI
4. Try the "Test" feature in LM Studio to verify it's working

### OpenRouter Issues

**Error: "OPEN_ROUTER_API_KEY is not set"**

1. Create `.env.local` file in project root
2. Add your API key: `OPEN_ROUTER_API_KEY=your-key`
3. Restart the development server

**Error: "Invalid API key"**

1. Verify your API key at [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Check for extra spaces or newlines in `.env.local`
3. Ensure you're using the correct key format (starts with `sk-or-`)

---

## Performance Comparison

| Feature | OpenRouter | LM Studio |
|---------|-----------|-----------|
| Response Speed | ⚡⚡⚡ Fast | ⚡⚡ Moderate (depends on hardware) |
| Setup Time | 🟢 2 minutes | 🟡 15-30 minutes |
| Privacy | 🔴 Data sent to cloud | 🟢 100% local |
| Cost | 💰 Pay per use | 🟢 Free |
| Model Selection | 🌟 50+ models | 🟡 Depends on downloads |
| Internet Required | ✅ Yes | ❌ No |
| Hardware Needs | 🟢 None | 🟡 8GB+ RAM recommended |

---

## Which Should You Choose?

**Choose OpenRouter if:**
- You want the fastest and most reliable experience
- You need access to the latest models
- You don't have powerful local hardware
- You're okay with API costs (usually very cheap)

**Choose LM Studio if:**
- Privacy is paramount
- You want zero ongoing costs
- You have decent local hardware (8GB+ RAM)
- You want to work offline
- You're working on sensitive projects

---

## Need Help?

- OpenRouter Documentation: [https://openrouter.ai/docs](https://openrouter.ai/docs)
- LM Studio Discord: [https://discord.gg/lmstudio](https://discord.gg/lmstudio)
- LM Studio Documentation: Available in the app

---

*Last updated: 2026*
