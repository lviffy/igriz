import React, { useState } from 'react';

interface LandingPageProps {
  onLaunch: (prompt?: string) => void;
}

const FEATURES = [
  {
    icon: 'i-ph:hexagon',
    color: '',
    title: 'Smart Contract Generation',
    desc: 'Describe your contract logic in plain English — Igriz writes production-ready Solidity.',
  },
  {
    icon: 'i-ph:lightning',
    color: 'green',
    title: 'Instant Deployment',
    desc: 'Deploy to testnets and mainnets directly from the builder. No CLI needed.',
  },
  {
    icon: 'i-ph:shield-check',
    color: 'purple',
    title: 'Security First',
    desc: 'Built-in audit checks and best practices applied to every contract generated.',
  },
  {
    icon: 'i-ph:link',
    color: 'orange',
    title: 'Full-Stack dApps',
    desc: 'Generate complete frontends that connect wallets, read state, and call functions.',
    wide: true,
  },
  {
    icon: 'i-ph:diamond',
    color: 'cyan',
    title: 'DeFi & NFT Templates',
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

export function LandingPage({ onLaunch }: LandingPageProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    onLaunch(prompt.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="landing">
      {/* Navigation */}
      <nav className="landing-nav">
        <a href="/" className="landing-nav-logo">Igriz</a>
        <div className="landing-nav-links">
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#usecases" className="landing-nav-link">Use Cases</a>
          <button className="landing-nav-cta" onClick={() => onLaunch()}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        {/* 3D floating shapes */}
        <div className="landing-3d-shapes">
          <div className="shape shape-cube" />
          <div className="shape shape-hexagon" />
          <div className="shape shape-diamond" />
          <div className="shape shape-ring" />
          <div className="shape shape-pyramid" />
        </div>
        <h1 className="landing-title">
          Build on-chain, <span className="landing-title-accent">effortlessly</span>
        </h1>
        <p className="landing-network-label">on Quai Networks</p>
        <p className="landing-subtitle">
          Create decentralized applications by chatting with AI. Smart contracts, frontends, and deployment — all in one flow.
        </p>

        {/* Chat input */}
        <div className="landing-input-box">
          <textarea
            className="landing-input-textarea"
            placeholder="Build me a staking dApp with reward distribution..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <div className="landing-input-actions">
            <button className="landing-btn-build" onClick={handleSubmit}>
              Build now ▶
            </button>
          </div>
        </div>

        {/* Glowing arc */}
        <div className="landing-arc" />

      </section>



      {/* Features - Bento Grid */}
      <section id="features" className="landing-features">
        <div className="landing-features-header">
          <h2 className="landing-features-title">Everything you need to ship</h2>
          <p className="landing-features-subtitle">
            From smart contracts to deployed frontends, Igriz handles every layer of the stack.
          </p>
        </div>
        <div className="landing-bento">
          {FEATURES.map((f) => (
            <div key={f.title} className={`landing-bento-card${f.wide ? ' wide' : ''}`}>
              <div className={`landing-bento-icon${f.color ? ' ' + f.color : ''}`}>
                <div className={f.icon} />
              </div>
              <h3 className="landing-bento-title">{f.title}</h3>
              <p className="landing-bento-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section id="usecases" className="landing-usecases">
        <div className="landing-usecases-header">
          <h2 className="landing-usecases-title">Built for every builder</h2>
          <p className="landing-usecases-subtitle">
            Whether you're a solo dev or a team, Igriz accelerates your workflow.
          </p>
        </div>
        <div className="landing-usecases-grid">
          {USE_CASES.map((uc) => (
            <div key={uc.title} className="landing-usecase">
              <h3 className="landing-usecase-title">{uc.title}</h3>
              <p className="landing-usecase-desc">{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="landing-bottom-cta">
        <h2 className="landing-bottom-cta-title">Ready to build something on-chain?</h2>
        <button className="landing-bottom-cta-btn" onClick={() => onLaunch()}>
          Launch Builder →
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div>
            <div className="landing-footer-brand">Igriz</div>
            <div className="landing-footer-tagline">
              AI-powered dApp builder.<br />
              Ship Web3 apps in minutes.
            </div>
          </div>
          <div>
            <div className="landing-footer-col-title">Product</div>
            <ul className="landing-footer-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#usecases">Use Cases</a></li>
            </ul>
          </div>
          <div>
            <div className="landing-footer-col-title">Resources</div>
            <ul className="landing-footer-links">
              <li><a href="#">Documentation</a></li>
              <li><a href="#">Examples</a></li>
            </ul>
          </div>
          <div>
            <div className="landing-footer-col-title">Social</div>
            <ul className="landing-footer-links">
              <li><a href="#">Twitter</a></li>
              <li><a href="#">GitHub</a></li>
              <li><a href="#">Discord</a></li>
            </ul>
          </div>
        </div>
        <div className="landing-footer-bottom">
          © 2026 Igriz. Build the decentralized future.
        </div>
      </footer>
    </div>
  );
}
