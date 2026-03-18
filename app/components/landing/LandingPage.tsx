import { ClientOnly } from 'remix-utils/client-only';
import { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Menu } from '~/components/sidebar/Menu.client';
import { WalletButton } from '~/components/wallet/WalletButton';
import { useSettings } from '~/lib/hooks/useSettings';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PROVIDER_LIST } from '~/utils/constants';
import type { ProviderInfo } from '~/types/model';
import type { ModelInfo } from '~/lib/modules/llm/types';
import { ModelSelector } from '~/components/chat/ModelSelector';
import { APIKeyManager, getApiKeysFromCookies } from '~/components/chat/APIKeyManager';
import Cookies from 'js-cookie';
import { LOCAL_PROVIDERS } from '~/lib/stores/settings';
import { toast } from 'react-toastify';
import { WebSearch } from '~/components/chat/WebSearch.client';
import { defaultDesignScheme } from '~/types/design-scheme';
import { kAccentTheme, setAccentTheme, type AccentTheme } from '~/lib/stores/accentTheme';

interface LandingPageProps {
  onLaunch?: (prompt?: string) => void;
}

const LANDING_PALETTE_KEY = 'igriz_landing_palette';
const BUILDER_COLOR_PALETTE_KEY = 'igriz_builder_color_palette';

type BuilderColorPalette = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
};

type BuilderPalettePreset = {
  id: string;
  name: string;
  palette: BuilderColorPalette;
};

const defaultBuilderPalette: BuilderColorPalette = {
  primary: defaultDesignScheme.palette.primary,
  secondary: defaultDesignScheme.palette.secondary,
  accent: defaultDesignScheme.palette.accent,
  background: defaultDesignScheme.palette.background,
  text: defaultDesignScheme.palette.text,
};

const BUILDER_COLOR_FIELDS: Array<[keyof BuilderColorPalette, string]> = [
  ['primary', 'Primary'],
  ['secondary', 'Secondary'],
  ['accent', 'Accent'],
  ['background', 'Background'],
  ['text', 'Text'],
];

const BUILDER_COLOR_PRESETS: BuilderPalettePreset[] = [
  {
    id: 'arctic-saas',
    name: 'Arctic SaaS',
    palette: {
      primary: '#2563eb',
      secondary: '#38bdf8',
      accent: '#0ea5e9',
      background: '#f8fafc',
      text: '#0f172a',
    },
  },
  {
    id: 'midnight-neon',
    name: 'Midnight Neon',
    palette: {
      primary: '#7c3aed',
      secondary: '#06b6d4',
      accent: '#22d3ee',
      background: '#0b1020',
      text: '#e2e8f0',
    },
  },
  {
    id: 'warm-editorial',
    name: 'Warm Editorial',
    palette: {
      primary: '#b45309',
      secondary: '#f59e0b',
      accent: '#f97316',
      background: '#fff7ed',
      text: '#3f2a13',
    },
  },
  {
    id: 'forest-product',
    name: 'Forest Product',
    palette: {
      primary: '#166534',
      secondary: '#10b981',
      accent: '#34d399',
      background: '#f0fdf4',
      text: '#052e16',
    },
  },
  {
    id: 'charcoal-lux',
    name: 'Charcoal Lux',
    palette: {
      primary: '#111827',
      secondary: '#374151',
      accent: '#f59e0b',
      background: '#030712',
      text: '#f9fafb',
    },
  },
  {
    id: 'rose-creative',
    name: 'Rose Creative',
    palette: {
      primary: '#db2777',
      secondary: '#fb7185',
      accent: '#f43f5e',
      background: '#fff1f2',
      text: '#4a1024',
    },
  },
];

function paletteEquals(a: BuilderColorPalette, b: BuilderColorPalette): boolean {
  return (
    a.primary === b.primary &&
    a.secondary === b.secondary &&
    a.accent === b.accent &&
    a.background === b.background &&
    a.text === b.text
  );
}

type LandingPalette = {
  id: AccentTheme;
  name: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentText: string;
  gradientFrom: string;
  gradientTo: string;
  networkLabel: string;
  arcShadowA: string;
  arcShadowB: string;
  arcShadowC: string;
  arcBorder: string;
};

const LANDING_PALETTES: LandingPalette[] = [
  {
    id: 'ember',
    name: 'Ember Red',
    accent: '#dc2626',
    accentHover: '#ef4444',
    accentSoft: 'rgba(220, 38, 38, 0.1)',
    accentText: '#ef4444',
    gradientFrom: '#ef4444',
    gradientTo: '#fca5a5',
    networkLabel: 'rgba(239, 68, 68, 0.6)',
    arcShadowA: 'rgba(220, 38, 38, 0.25)',
    arcShadowB: 'rgba(220, 38, 38, 0.12)',
    arcShadowC: 'rgba(220, 38, 38, 0.06)',
    arcBorder: 'rgba(239, 68, 68, 0.4)',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    accent: '#2563eb',
    accentHover: '#3b82f6',
    accentSoft: 'rgba(37, 99, 235, 0.12)',
    accentText: '#60a5fa',
    gradientFrom: '#3b82f6',
    gradientTo: '#93c5fd',
    networkLabel: 'rgba(96, 165, 250, 0.7)',
    arcShadowA: 'rgba(37, 99, 235, 0.25)',
    arcShadowB: 'rgba(37, 99, 235, 0.12)',
    arcShadowC: 'rgba(37, 99, 235, 0.06)',
    arcBorder: 'rgba(96, 165, 250, 0.45)',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    accent: '#059669',
    accentHover: '#10b981',
    accentSoft: 'rgba(5, 150, 105, 0.12)',
    accentText: '#34d399',
    gradientFrom: '#10b981',
    gradientTo: '#6ee7b7',
    networkLabel: 'rgba(52, 211, 153, 0.75)',
    arcShadowA: 'rgba(5, 150, 105, 0.24)',
    arcShadowB: 'rgba(5, 150, 105, 0.12)',
    arcShadowC: 'rgba(5, 150, 105, 0.06)',
    arcBorder: 'rgba(52, 211, 153, 0.44)',
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    accent: '#ea580c',
    accentHover: '#f97316',
    accentSoft: 'rgba(234, 88, 12, 0.12)',
    accentText: '#fb923c',
    gradientFrom: '#f97316',
    gradientTo: '#fdba74',
    networkLabel: 'rgba(251, 146, 60, 0.75)',
    arcShadowA: 'rgba(234, 88, 12, 0.25)',
    arcShadowB: 'rgba(234, 88, 12, 0.12)',
    arcShadowC: 'rgba(234, 88, 12, 0.06)',
    arcBorder: 'rgba(251, 146, 60, 0.45)',
  },
];

const FEATURES = [
  {
    icon: 'i-ph:hexagon',
    title: 'Smart Contract Generation',
    desc: 'Describe your contract logic in plain English and Igriz writes production-ready Solidity.',
  },
  {
    icon: 'i-ph:lightning',
    title: 'Instant Deployment',
    desc: 'Deploy to testnets and mainnets directly from the builder. No CLI needed.',
  },
  {
    icon: 'i-ph:shield-check',
    title: 'Security First',
    desc: 'Built-in audit checks and best practices applied to every contract generated.',
  },
  {
    icon: 'i-ph:link',
    title: 'Full-Stack dApps',
    desc: 'Generate complete frontends that connect wallets, read state, and call functions.',
    wide: true,
  },
  {
    icon: 'i-ph:diamond',
    title: 'DeFi and NFT Templates',
    desc: 'Start from battle-tested templates for tokens, marketplaces, staking, and DAOs.',
  },
];

const USE_CASES = [
  {
    title: 'DeFi Builders',
    desc: 'Launch lending protocols, DEXs, and yield farms with AI-assisted smart contracts.',
  },
  {
    title: 'NFT Creators',
    desc: 'Build minting pages, marketplaces, and token-gated experiences in minutes.',
  },
  {
    title: 'Web3 Startups',
    desc: 'Go from idea to deployed dApp faster. Skip the boilerplate, focus on your product.',
  },
];

const BuilderColorPalettePopover = memo(function BuilderColorPalettePopover({
  initialPalette,
  onApply,
  onReset,
}: {
  initialPalette: BuilderColorPalette;
  onApply: (palette: BuilderColorPalette) => void;
  onReset: () => void;
}) {
  const [draftPalette, setDraftPalette] = useState<BuilderColorPalette>(initialPalette);

  return (
    <div className="landing-builder-palette-menu">
      <div className="landing-palette-title">Builder colors</div>
      <div className="landing-builder-presets">
        <div className="landing-builder-presets-label">Quick presets</div>
        <div className="landing-builder-presets-grid">
          {BUILDER_COLOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`landing-builder-preset-item${paletteEquals(draftPalette, preset.palette) ? ' active' : ''}`}
              onClick={() => setDraftPalette(preset.palette)}
            >
              <span className="landing-builder-preset-name">{preset.name}</span>
              <span className="landing-builder-preset-swatches" aria-hidden="true">
                <span style={{ backgroundColor: preset.palette.primary }} />
                <span style={{ backgroundColor: preset.palette.secondary }} />
                <span style={{ backgroundColor: preset.palette.accent }} />
              </span>
            </button>
          ))}
        </div>
      </div>
      {BUILDER_COLOR_FIELDS.map(([key, label]) => (
        <label key={key} className="landing-builder-palette-row">
          <span>{label}</span>
          <input
            type="color"
            value={draftPalette[key]}
            onChange={(event) => {
              const value = event.target.value;
              setDraftPalette((prev) => ({
                ...prev,
                [key]: value,
              }));
            }}
          />
        </label>
      ))}
      <div className="landing-builder-palette-actions">
        <button
          type="button"
          className="landing-builder-palette-btn secondary"
          onClick={() => {
            setDraftPalette(defaultBuilderPalette);
            onReset();
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className="landing-builder-palette-btn primary"
          onClick={() => onApply(draftPalette)}
        >
          Apply
        </button>
      </div>
    </div>
  );
});

export function LandingPage({ onLaunch }: LandingPageProps) {
  const { activeProviders } = useSettings();
  const [prompt, setPrompt] = useState('');
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showModelSettings, setShowModelSettings] = useState(true);
  const [showPalettePicker, setShowPalettePicker] = useState(false);
  const [selectedPaletteId, setSelectedPaletteId] = useState<AccentTheme>('ember');
  const [showBuilderColorPicker, setShowBuilderColorPicker] = useState(false);
  const [builderPalette, setBuilderPalette] = useState<BuilderColorPalette>(defaultBuilderPalette);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const builderPaletteRef = useRef<HTMLDivElement>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(getApiKeysFromCookies());
  const [modelList, setModelList] = useState<ModelInfo[]>([]);
  const [isModelLoading, setIsModelLoading] = useState<string | undefined>('all');
  const [model, setModel] = useState(() => {
    const savedModel = Cookies.get('selectedModel');
    return savedModel || DEFAULT_MODEL;
  });
  const [provider, setProvider] = useState<ProviderInfo>(() => {
    const savedProvider = Cookies.get('selectedProvider');
    return (PROVIDER_LIST.find((p) => p.name === savedProvider) || DEFAULT_PROVIDER) as ProviderInfo;
  });

  const selectedPalette = useMemo(() => {
    return LANDING_PALETTES.find((palette) => palette.id === selectedPaletteId) || LANDING_PALETTES[0];
  }, [selectedPaletteId]);

  useEffect(() => {
    try {
      const storedAccentTheme = localStorage.getItem(kAccentTheme);
      const storedLandingPalette = localStorage.getItem(LANDING_PALETTE_KEY);
      const storedPalette = storedAccentTheme || storedLandingPalette;

      if (storedPalette && LANDING_PALETTES.some((palette) => palette.id === storedPalette)) {
        setSelectedPaletteId(storedPalette as AccentTheme);
      }
    } catch {
      // Ignore localStorage access issues.
    }
  }, []);

  useEffect(() => {
    try {
      const storedBuilderPalette = localStorage.getItem(BUILDER_COLOR_PALETTE_KEY);

      if (storedBuilderPalette) {
        const parsed = JSON.parse(storedBuilderPalette) as Partial<BuilderColorPalette>;
        setBuilderPalette((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch {
      // Ignore localStorage access issues.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LANDING_PALETTE_KEY, selectedPaletteId);
      setAccentTheme(selectedPaletteId);
    } catch {
      // Ignore localStorage access issues.
    }
  }, [selectedPaletteId]);

  useEffect(() => {
    try {
      localStorage.setItem(BUILDER_COLOR_PALETTE_KEY, JSON.stringify(builderPalette));
    } catch {
      // Ignore localStorage access issues.
    }
  }, [builderPalette]);

  useEffect(() => {
    if (!showPalettePicker) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setShowPalettePicker(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showPalettePicker]);

  useEffect(() => {
    if (!showBuilderColorPicker) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (builderPaletteRef.current && !builderPaletteRef.current.contains(event.target as Node)) {
        setShowBuilderColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showBuilderColorPicker]);

  useEffect(() => {
    const providerNames = new Set(activeProviders.map((p) => p.name));

    if (providerNames.size > 0 && !providerNames.has(provider.name)) {
      setProvider(activeProviders[0]);
      Cookies.set('selectedProvider', activeProviders[0].name, { expires: 30 });
    }
  }, [activeProviders, provider]);

  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      setIsModelLoading('all');

      try {
        const response = await fetch('/api/models');
        const data = (await response.json()) as { modelList: ModelInfo[] };

        if (!cancelled) {
          setModelList(data.modelList || []);
        }
      } catch {
        if (!cancelled) {
          setModelList([]);
        }
      } finally {
        if (!cancelled) {
          setIsModelLoading(undefined);
        }
      }
    };

    loadModels();

    return () => {
      cancelled = true;
    };
  }, [activeProviders]);

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    Cookies.set('selectedModel', newModel, { expires: 30 });
  };

  const handleProviderChange = (newProvider: ProviderInfo) => {
    setProvider(newProvider);
    Cookies.set('selectedProvider', newProvider.name, { expires: 30 });

    const firstModel = modelList.find((m) => m.provider === newProvider.name);

    if (firstModel) {
      handleModelChange(firstModel.name);
    }
  };

  const onApiKeysChange = async (providerName: string, apiKey: string) => {
    const newApiKeys = { ...apiKeys, [providerName]: apiKey };
    setApiKeys(newApiKeys);
    Cookies.set('apiKeys', JSON.stringify(newApiKeys));

    setIsModelLoading(providerName);

    try {
      const response = await fetch(`/api/models/${encodeURIComponent(providerName)}`);
      const data = (await response.json()) as { modelList: ModelInfo[] };
      const providerModels = data.modelList || [];

      setModelList((prevModels) => {
        const otherModels = prevModels.filter((m) => m.provider !== providerName);
        return [...otherModels, ...providerModels];
      });
    } catch {
      // Ignore transient model loading errors in landing preview.
    } finally {
      setIsModelLoading(undefined);
    }
  };

  const ctaText = useMemo(() => {
    const trimmed = prompt.trim();
    return trimmed.length > 0 ? 'Build now' : 'Get Started';
  }, [prompt]);

  const applyBuilderPalette = useCallback((palette: BuilderColorPalette) => {
    setBuilderPalette(palette);
    setShowBuilderColorPicker(false);
    toast.success('Builder palette applied');
  }, []);

  const resetBuilderPalette = useCallback(() => {
    setBuilderPalette(defaultBuilderPalette);
    toast.success('Builder palette reset');
  }, []);

  const buildPalettePromptContext = () => {
    return [
      'Use this preferred color palette for the generated dApp UI:',
      `- Primary: ${builderPalette.primary}`,
      `- Secondary: ${builderPalette.secondary}`,
      `- Accent: ${builderPalette.accent}`,
      `- Background: ${builderPalette.background}`,
      `- Text: ${builderPalette.text}`,
      'Apply these colors consistently for buttons, backgrounds, links, and text hierarchy.',
    ].join('\n');
  };

  const handleEnhancePrompt = async () => {
    const input = prompt.trim();

    if (!input) {
      toast.info('Write a prompt first to enhance it');
      return;
    }

    try {
      setEnhancingPrompt(true);

      const response = await fetch('/api/enhancer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `${input}\n\n${buildPalettePromptContext()}`,
          model,
          provider,
        }),
      });

      if (!response.ok) {
        throw new Error(`Enhancer request failed (${response.status})`);
      }

      const enhancedPrompt = (await response.text()).trim();

      if (enhancedPrompt.length > 0) {
        setPrompt(enhancedPrompt);
        toast.success('Prompt enhanced');
      } else {
        toast.info('No enhancement result returned');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enhance prompt');
    } finally {
      setEnhancingPrompt(false);
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleLaunch = useCallback(() => {
    const trimmedPrompt = prompt.trim();

    // Persist the same accent choice before switching from landing to chat.
    setAccentTheme(selectedPaletteId);

    onLaunch?.(trimmedPrompt.length > 0 ? trimmedPrompt : undefined);
  }, [onLaunch, prompt, selectedPaletteId]);

  return (
    <>
      <ClientOnly>{() => <Menu />}</ClientOnly>

      <div
        className="landing"
        style={{
          '--landing-accent': selectedPalette.accent,
          '--landing-accent-hover': selectedPalette.accentHover,
          '--landing-accent-soft': selectedPalette.accentSoft,
          '--landing-accent-text': selectedPalette.accentText,
          '--landing-gradient-from': selectedPalette.gradientFrom,
          '--landing-gradient-to': selectedPalette.gradientTo,
          '--landing-network-label': selectedPalette.networkLabel,
          '--landing-arc-shadow-a': selectedPalette.arcShadowA,
          '--landing-arc-shadow-b': selectedPalette.arcShadowB,
          '--landing-arc-shadow-c': selectedPalette.arcShadowC,
          '--landing-arc-border': selectedPalette.arcBorder,
        } as React.CSSProperties}
      >
        <nav className="landing-nav">
          <a href="/" className="landing-nav-logo ml-14">
            IGRIZ
          </a>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">
              Features
            </a>
            <div ref={paletteRef} className="landing-palette-wrapper landing-nav-palette">
              <button
                type="button"
                className="landing-nav-palette-btn"
                aria-label="Choose color palette"
                onClick={() => setShowPalettePicker((open) => !open)}
              >
                <span className="i-ph:palette" />
              </button>
              {showPalettePicker && (
                <div className="landing-palette-menu">
                  <div className="landing-palette-title">Preferred colors</div>
                  {LANDING_PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      type="button"
                      className={`landing-palette-item${selectedPalette.id === palette.id ? ' active' : ''}`}
                      onClick={() => {
                        setSelectedPaletteId(palette.id);
                        setShowPalettePicker(false);
                        toast.success(`Applied ${palette.name}`);
                      }}
                    >
                      <span className="landing-palette-swatch" style={{ backgroundColor: palette.accent }} aria-hidden="true" />
                      <span>{palette.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ClientOnly>{() => <WalletButton variant="landing" />}</ClientOnly>
            <a href="#hero-box" className="landing-nav-cta">
              Get Started
            </a>
          </div>
        </nav>

        <section className="landing-hero">
          <h1 className="landing-title">
            Build on-chain, <span className="landing-title-accent">effortlessly</span>
          </h1>
          <p className="landing-network-label">on Polkadot Hub</p>
          <p className="landing-subtitle">
            Create decentralized applications by chatting with AI. Smart contracts, frontends, and deployment all in
            one flow.
          </p>

          <div id="hero-box" className="landing-kept-box" aria-label="Chat prompt box">
            {showModelSettings && (
              <>
                <div className="landing-kept-model-row">
                  <ModelSelector
                    model={model}
                    setModel={handleModelChange}
                    provider={provider}
                    setProvider={handleProviderChange}
                    modelList={modelList}
                    providerList={activeProviders}
                    apiKeys={apiKeys}
                    modelLoading={isModelLoading}
                  />
                </div>

                {activeProviders.length > 0 && provider && !LOCAL_PROVIDERS.includes(provider.name) && (
                  <div className="landing-kept-api-manager">
                    <APIKeyManager
                      provider={provider}
                      apiKey={apiKeys[provider.name] || ''}
                      setApiKey={(key) => onApiKeysChange(provider.name, key)}
                    />
                  </div>
                )}
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files || []);

                if (files.length > 0) {
                  setUploadedFiles((prev) => [...prev, ...files]);
                  toast.success(`${files.length} file${files.length > 1 ? 's' : ''} attached`);
                }

                event.currentTarget.value = '';
              }}
            />

            {uploadedFiles.length > 0 && (
              <div className="landing-uploaded-files" role="status" aria-live="polite">
                {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} selected
              </div>
            )}

            <div className="landing-kept-editor">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleLaunch();
                  }
                }}
                className="landing-kept-textarea"
                rows={4}
                placeholder="How can igriz help you today?"
              />

              <div className="landing-kept-actions">
                <div className="landing-kept-tools">
                  <div ref={builderPaletteRef} className="landing-palette-wrapper">
                    <button
                      type="button"
                      className="landing-kept-icon"
                      aria-label="Builder color palette"
                      onClick={() => setShowBuilderColorPicker((open) => !open)}
                    >
                      <span className="i-ph:paint-brush" />
                    </button>
                    {showBuilderColorPicker && (
                      <BuilderColorPalettePopover
                        initialPalette={builderPalette}
                        onApply={applyBuilderPalette}
                        onReset={resetBuilderPalette}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    className="landing-kept-icon"
                    aria-label="Enhance prompt"
                    onClick={handleEnhancePrompt}
                    disabled={enhancingPrompt}
                  >
                    {enhancingPrompt ? (
                      <span className="i-svg-spinners:90-ring-with-bg animate-spin" />
                    ) : (
                      <span className="i-igriz:stars" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="landing-kept-icon"
                    aria-label="Attach"
                    onClick={handleFileUpload}
                  >
                    <span className="i-ph:paperclip" />
                  </button>
                  <WebSearch
                    onSearchResult={(result) => {
                      setPrompt((currentPrompt) => (currentPrompt.length > 0 ? `${result}\n\n${currentPrompt}` : result));
                    }}
                  />
                  <button
                    type="button"
                    className="landing-kept-icon"
                    aria-label="Model settings"
                    onClick={() => setShowModelSettings((value) => !value)}
                  >
                    <span className="i-ph:caret-down" />
                  </button>
                </div>
              </div>
            </div>

            <div className="landing-kept-cta-wrap">
              <button type="button" className="landing-btn-build" onClick={handleLaunch}>
                {ctaText} <span aria-hidden="true">▶</span>
              </button>
            </div>
          </div>

          <div className="landing-arc" />
        </section>

        <section id="features" className="landing-features">
          <div className="landing-features-header">
            <h2 className="landing-features-title">Everything you need to ship</h2>
            <p className="landing-features-subtitle">
              From smart contracts to deployed frontends, Igriz handles every layer of the stack.
            </p>
          </div>
          <div className="landing-bento">
            {FEATURES.map((feature) => (
              <div key={feature.title} className={`landing-bento-card${feature.wide ? ' wide' : ''}`}>
                <div className="landing-bento-icon">
                  <div className={feature.icon} />
                </div>
                <h3 className="landing-bento-title">{feature.title}</h3>
                <p className="landing-bento-desc">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="usecases" className="landing-usecases">
          <div className="landing-usecases-header">
            <h2 className="landing-usecases-title">Built for every builder</h2>
            <p className="landing-usecases-subtitle">
              Whether you are a solo dev or a team, Igriz accelerates your workflow.
            </p>
          </div>
          <div className="landing-usecases-grid">
            {USE_CASES.map((useCase) => (
              <div key={useCase.title} className="landing-usecase">
                <h3 className="landing-usecase-title">{useCase.title}</h3>
                <p className="landing-usecase-desc">{useCase.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-bottom-cta">
          <h2 className="landing-bottom-cta-title">Ready to build something on-chain?</h2>
          <a href="#hero-box" className="landing-bottom-cta-btn">
            Launch Builder →
          </a>
        </section>

        <footer className="landing-footer">
          <div className="landing-footer-grid">
            <div>
              <div className="landing-footer-brand">IGRIZ</div>
              <div className="landing-footer-tagline">
                AI-powered dApp builder.
                <br />
                Ship Web3 apps in minutes.
              </div>
            </div>
            <div>
              <div className="landing-footer-col-title">Product</div>
              <ul className="landing-footer-links">
                <li>
                  <a href="#features">Features</a>
                </li>
                <li>
                  <a href="#usecases">Use Cases</a>
                </li>
              </ul>
            </div>
            <div>
              <div className="landing-footer-col-title">Resources</div>
              <ul className="landing-footer-links">
                <li>
                  <a href="#">Documentation</a>
                </li>
                <li>
                  <a href="#">Examples</a>
                </li>
              </ul>
            </div>
            <div>
              <div className="landing-footer-col-title">Social</div>
              <ul className="landing-footer-links">
                <li>
                  <a href="#">Twitter</a>
                </li>
                <li>
                  <a href="#">GitHub</a>
                </li>
                <li>
                  <a href="#">Discord</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="landing-footer-bottom">© 2026 IGRIZ. Build the decentralized future.</div>
        </footer>
      </div>
    </>
  );
}
