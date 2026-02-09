import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { createGame } from '~/functions/games';

export const Route = createFileRoute('/')({
  component: Home,
});

/* ── Local Helper Components ── */

function HexIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  const w = size;
  const h = size * 1.155;
  // Pointy-top hexagon
  const points = [
    [w / 2, 0],
    [w, h * 0.25],
    [w, h * 0.75],
    [w / 2, h],
    [0, h * 0.75],
    [0, h * 0.25],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className} fill="none">
      <polygon points={points} stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function HexBackdrop() {
  // Generate ~30 hex outlines in a honeycomb-ish arrangement
  const hexes: { x: number; y: number; size: number }[] = [];
  const cols = 7;
  const rows = 5;
  const spacing = 120;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * spacing + (row % 2 === 1 ? spacing / 2 : 0);
      const y = row * spacing * 0.866;
      hexes.push({ x, y, size: 50 + Math.random() * 20 });
    }
  }
  const totalW = cols * spacing + spacing;
  const totalH = rows * spacing * 0.866 + spacing;

  return (
    <div
      className="animate-hex-rotate pointer-events-none absolute top-1/2 left-1/2"
      style={{ width: totalW, height: totalH, opacity: 0.07 }}
    >
      <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`}>
        {hexes.map((h, i) => {
          const s = h.size;
          const ht = s * 1.155;
          const points = [
            [s / 2, 0],
            [s, ht * 0.25],
            [s, ht * 0.75],
            [s / 2, ht],
            [0, ht * 0.75],
            [0, ht * 0.25],
          ]
            .map(([px, py]) => `${px},${py}`)
            .join(' ');
          return (
            <polygon
              key={i}
              points={points}
              transform={`translate(${h.x}, ${h.y})`}
              fill="none"
              stroke="white"
              strokeWidth="1"
            />
          );
        })}
      </svg>
    </div>
  );
}

function TradeIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      stroke="var(--gold)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Two arrows crossing — trade symbol */}
      <path d="M6 24h36M34 16l8 8-8 8" />
      <path d="M42 24H6M14 32l-8-8 8-8" opacity="0.5" />
      <circle cx="24" cy="24" r="4" fill="var(--gold)" stroke="none" />
    </svg>
  );
}

function BuildIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      stroke="var(--gold)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Settlement / house shape */}
      <path d="M8 28L24 14l16 14" />
      <rect x="12" y="28" width="24" height="14" rx="1" />
      <rect x="20" y="32" width="8" height="10" />
    </svg>
  );
}

function ConquerIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      stroke="var(--gold)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Flag / banner */}
      <path d="M14 6v36" />
      <path d="M14 6h20l-6 8 6 8H14" fill="var(--gold)" opacity="0.2" />
    </svg>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-8 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]">
      {/* Gold corner brackets on hover */}
      <div
        className="pointer-events-none absolute top-0 left-0 h-8 w-8 rounded-tl-xl border-t-2 border-l-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ borderColor: 'var(--gold)' }}
      />
      <div
        className="pointer-events-none absolute top-0 right-0 h-8 w-8 rounded-tr-xl border-t-2 border-r-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ borderColor: 'var(--gold)' }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-2 border-l-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ borderColor: 'var(--gold)' }}
      />
      <div
        className="pointer-events-none absolute right-0 bottom-0 h-8 w-8 rounded-br-xl border-r-2 border-b-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ borderColor: 'var(--gold)' }}
      />

      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-xl font-bold" style={{ color: 'var(--gold-light)' }}>
        {title}
      </h3>
      <p className="leading-relaxed text-gray-400">{description}</p>
    </div>
  );
}

function StepRow({
  number,
  title,
  description,
  isLast = false,
}: {
  number: number;
  title: string;
  description: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-6">
      {/* Number circle + connecting line */}
      <div className="flex flex-col items-center">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, var(--crimson), var(--crimson-light))',
          }}
        >
          {number}
        </div>
        {!isLast && (
          <div className="my-2 w-px grow" style={{ background: 'var(--crimson-dark)' }} />
        )}
      </div>
      {/* Content */}
      <div className={isLast ? '' : 'pb-10'}>
        <h4 className="text-lg font-semibold text-white">{title}</h4>
        <p className="mt-1 text-gray-400">{description}</p>
      </div>
    </div>
  );
}

/* ── Main Page ── */

function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handlePlayVsBots() {
    setLoading(true);
    try {
      const humanPlayerId = `player-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const result = await createGame({
        data: {
          playerNames: ['You', 'Bot Alice', 'Bot Bob', 'Bot Carol'],
          playerIds: [humanPlayerId, 'bot-alice', 'bot-bob', 'bot-carol'],
        },
      });

      sessionStorage.setItem(`frontier-player-${result.gameId}`, humanPlayerId);

      navigate({ to: '/game/$gameId', params: { gameId: result.gameId } });
    } catch (err) {
      console.error('Failed to create game:', err);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0c0f]">
      {/* ── Hero Section ── */}
      <section className="hex-pattern relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
        {/* Radial crimson glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(120,13,27,0.25) 0%, transparent 65%)',
          }}
        />

        {/* Rotating hex backdrop */}
        <HexBackdrop />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="animate-fade-in-up mb-4 flex items-center gap-3">
            <HexIcon size={28} className="animate-float text-[var(--gold)]" />
            <span
              className="text-sm font-semibold tracking-[0.25em] uppercase"
              style={{ color: 'var(--gold-dim)' }}
            >
              A Strategy Board Game
            </span>
            <HexIcon size={28} className="animate-float text-[var(--gold)]" />
          </div>

          <h1 className="shimmer-text animate-fade-in-up-1 mb-6 text-6xl font-extrabold tracking-tight sm:text-7xl md:text-8xl">
            Frontier Hex
          </h1>

          <p className="animate-fade-in-up-2 mb-12 max-w-xl text-xl text-gray-400 sm:text-2xl">
            Settle new lands. Trade with rivals.
            <br />
            Build an empire.
          </p>

          <div className="animate-fade-in-up-3 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <button onClick={handlePlayVsBots} disabled={loading} className="btn-glow">
              {loading ? 'Creating Game...' : 'Play vs Bots'}
            </button>
            <Link to="/game/$gameId" params={{ gameId: 'demo' }} className="btn-secondary-hex">
              View Demo Board
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="animate-fade-in-up-4 mt-20 flex flex-col items-center gap-2 text-gray-600">
            <span className="text-xs tracking-wider uppercase">Scroll to explore</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              className="animate-float"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 7l6 6 6-6" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
            Master the <span style={{ color: 'var(--gold)' }}>Island</span>
          </h2>
          <p className="mx-auto mb-16 max-w-2xl text-center text-gray-500">
            Three pillars of victory on the frontier
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<TradeIcon />}
              title="Trade"
              description="Barter resources with other players or exchange at maritime ports. Every deal shapes the balance of power."
            />
            <FeatureCard
              icon={<BuildIcon />}
              title="Build"
              description="Place roads, settlements, and cities across the hex grid. Expand your territory to unlock new resources."
            />
            <FeatureCard
              icon={<ConquerIcon />}
              title="Conquer"
              description="Race to 10 victory points. Claim the longest road, raise the largest army, and dominate the frontier."
            />
          </div>
        </div>
      </section>

      {/* ── How to Play Section ── */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
            How to <span style={{ color: 'var(--gold)' }}>Play</span>
          </h2>
          <p className="mx-auto mb-16 max-w-lg text-center text-gray-500">
            Simple to learn, deep to master
          </p>
          <div className="flex flex-col">
            <StepRow
              number={1}
              title="Start a Game"
              description="Jump into a match against bots or friends. Each player places two settlements and roads during the setup draft."
            />
            <StepRow
              number={2}
              title="Gather Resources"
              description="Roll the dice each turn. Hexes matching the roll produce resources for adjacent settlements and cities."
            />
            <StepRow
              number={3}
              title="Build to Victory"
              description="Spend resources to build roads, settlements, cities, and development cards. First to 10 victory points wins!"
              isLast
            />
          </div>
        </div>
      </section>

      {/* ── Final CTA Section ── */}
      <section className="relative flex flex-col items-center justify-center px-6 py-32">
        {/* Radial crimson glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(120,13,27,0.2) 0%, transparent 60%)',
          }}
        />
        <h2 className="relative mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
          Ready to <span style={{ color: 'var(--gold)' }}>Settle?</span>
        </h2>
        <p className="relative mb-10 text-gray-500">Your frontier awaits</p>
        <button
          onClick={handlePlayVsBots}
          disabled={loading}
          className="btn-glow animate-pulse-glow relative"
        >
          {loading ? 'Creating Game...' : 'Play Now'}
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 text-sm text-gray-600 sm:flex-row">
          <span>
            <span style={{ color: 'var(--gold-dim)' }}>Frontier Hex</span> &mdash; A settlement
            strategy game
          </span>
          <span>Built with React, PixiJS &amp; TanStack</span>
        </div>
      </footer>
    </div>
  );
}
