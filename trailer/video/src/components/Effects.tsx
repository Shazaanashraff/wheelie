import React from 'react';
import {AbsoluteFill} from 'remotion';
import {H, W, clamp, noise, rand} from '../lib';

export const Flames: React.FC<{f: number; amt: number; y: number}> = ({f, amt, y}) => {
  if (amt <= 0.01) return null;
  const n = 46;
  return (
    <>
      <div style={{position: 'absolute', left: -100, top: y - 260 * amt, width: W + 200, height: 420, background: `radial-gradient(ellipse at 50% 100%, rgba(255,120,30,${0.55 * amt}) 0%, rgba(255,60,20,${0.25 * amt}) 40%, rgba(255,40,0,0) 70%)`, filter: 'blur(10px)'}} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <linearGradient id="fl-o" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#FF3D12" />
            <stop offset="0.55" stopColor="#FF7A1A" />
            <stop offset="1" stopColor="#FFB13B" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fl-i" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#FFF3B0" />
            <stop offset="0.6" stopColor="#FFC53D" />
            <stop offset="1" stopColor="#FFC53D" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({length: n}, (_, i) => {
          const x = (i / (n - 1)) * W + noise(f * 0.13, i) * 12;
          const hh = (70 + 90 * rand(i)) * amt * (0.75 + 0.35 * noise(f * 0.35, i + 3));
          const ww = 46 + 30 * rand(i + 7);
          const lean = noise(f * 0.2, i + 11) * 18;
          const d = (h: number, w: number) => `M${x - w / 2} ${y} C${x - w / 2} ${y - h * 0.45} ${x + lean * 0.4 - w * 0.15} ${y - h * 0.7} ${x + lean} ${y - h} C${x + lean * 0.4 + w * 0.15} ${y - h * 0.7} ${x + w / 2} ${y - h * 0.45} ${x + w / 2} ${y} Z`;
          return (
            <g key={i}>
              <path d={d(hh, ww)} fill="url(#fl-o)" />
              <path d={d(hh * 0.55, ww * 0.5)} fill="url(#fl-i)" />
            </g>
          );
        })}
        {Array.from({length: 40}, (_, i) => {
          const life = 50 + 40 * rand(i + 50);
          const t = ((f + rand(i) * 200) % life) / life;
          const ex = rand(i + 90) * W + noise(f * 0.05, i) * 30;
          const ey = y - 20 - t * 360 * amt;
          return <circle key={`e${i}`} cx={ex} cy={ey} r={2.2 + rand(i + 3) * 2} fill="#FFC53D" opacity={(1 - t) * amt} />;
        })}
      </svg>
    </>
  );
};

export const Smoke: React.FC<{f: number; amt: number}> = ({f, amt}) => {
  if (amt <= 0.01) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: 18}, (_, i) => {
        const life = 160 + rand(i) * 80;
        const t = ((f + rand(i + 4) * 300) % life) / life;
        const x = rand(i + 8) * W + noise(f * 0.02, i) * 60;
        const y = H - 80 - t * 700;
        const r = 120 + t * 260;
        return <div key={i} style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: 'radial-gradient(circle, rgba(60,50,48,0.5) 0%, rgba(60,50,48,0) 70%)', opacity: Math.sin(t * Math.PI) * amt * 0.8}} />;
      })}
    </AbsoluteFill>
  );
};

/** foam particles sprayed from (ox, oy) */
export const Foam: React.FC<{f: number; start: number; end: number; ox: number; oy: number; fade: number}> = ({f, start, end, ox, oy, fade}) => {
  if (f < start || fade <= 0) return null;
  const count = 240;
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: fade}}>
      <defs>
        <radialGradient id="foam" cx="0.4" cy="0.35" r="0.65">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.75" stopColor="#F2F6FA" />
          <stop offset="1" stopColor="#D5DEE8" />
        </radialGradient>
      </defs>
      {Array.from({length: count}, (_, i) => {
        const b = start + (i / count) * (end - start);
        const a = f - b;
        if (a < 0) return null;
        const sweep = -0.25 + 0.75 * ((b - start) / (end - start));
        const th = sweep + (rand(i) - 0.5) * 0.55;
        const dist = (520 + 900 * rand(i + 3)) * (1 - Math.exp(-a / 14));
        const x = ox + Math.cos(th) * dist;
        const y = oy + Math.sin(th) * dist + 0.03 * a * a * (0.4 + rand(i + 5));
        const r = Math.min(30 + a * 3.2 * (0.6 + rand(i + 9)), 180 + 120 * rand(i + 2));
        return <circle key={i} cx={x} cy={Math.min(y, H + 60)} r={r} fill="url(#foam)" />;
      })}
    </svg>
  );
};

/** SVG heat-haze filter definition; reference with filter: url(#haze) */
export const HazeDefs: React.FC<{f: number; amt: number}> = ({f, amt}) => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <filter id="haze" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency={`0.004 ${0.012 + 0.002 * Math.sin(f * 0.2)}`} numOctaves={2} seed={Math.floor(f / 2) % 50} result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={amt * 7} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);

export const Vignette: React.FC<{amt: number; color?: string}> = ({amt, color = '0,0,0'}) =>
  amt > 0 ? <AbsoluteFill style={{background: `radial-gradient(ellipse at center, rgba(${color},0) 45%, rgba(${color},${amt}) 100%)`}} /> : null;

export const Flash: React.FC<{amt: number; color?: string}> = ({amt, color = '#fff'}) =>
  amt > 0 ? <AbsoluteFill style={{background: color, opacity: clamp(amt)}} /> : null;
