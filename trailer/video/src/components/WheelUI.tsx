import React from 'react';
import {AppIcon, AppId} from './AppIcon';
import {Wheelie, Mood} from './Wheelie';
import {C, FONT, clamp, EASE} from '../lib';

export type Slot = {app: AppId; label: string; weight?: number; ghost?: boolean; soon?: boolean};

export const DEFAULT_SLOTS: Slot[] = [
  {app: 'calc', label: 'Calculator'},
  {app: 'notes', label: 'Notes'},
  {app: 'alarm', label: 'Alarm'},
  {app: 'reminders', label: 'Reminders'},
  {app: 'timer', label: 'Timer'},
  {app: 'converter', label: 'Converter'},
  {app: 'clipboard', label: 'Clipboard'},
  {app: 'todo', label: 'To-do'},
];

const pt = (r: number, a: number) => [r * Math.cos(a), r * Math.sin(a)];

function sector(r0: number, r1: number, a0: number, a1: number, rr = 14) {
  const [x0, y0] = pt(r1, a0);
  const [x1, y1] = pt(r1, a1);
  const [x2, y2] = pt(r0, a1);
  const [x3, y3] = pt(r0, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  void rr;
  return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
}

export const WheelUI: React.FC<{
  R: number;
  slots?: Slot[];
  selected?: number;
  reveal?: number; // 0..1
  lit?: number; // how many segments lit (float), -1 = all lit
  rotation?: number;
  hubMood?: Mood;
  hubBlink?: number;
  hubSpin?: number;
  showLabels?: boolean;
  glow?: number;
  pulse?: number; // index pulsing
  pulseAmt?: number;
}> = ({R, slots = DEFAULT_SLOTS, selected = -1, reveal = 1, lit = -1, rotation = 0, hubMood = 'happy', hubBlink = 0, hubSpin = 0, showLabels = true, glow = 0.6, pulse = -1, pulseAmt = 0}) => {
  const r0 = R * 0.42;
  const total = slots.reduce((s, x) => s + (x.weight ?? 1), 0);
  const gap = 0.022;
  const first = (slots[0].weight ?? 1) / total;
  let acc = -Math.PI / 2 - first * Math.PI;
  const segs = slots.map((s, i) => {
    const span = ((s.weight ?? 1) / total) * Math.PI * 2;
    const a0 = acc;
    acc += span;
    return {s, i, a0: a0 + gap, a1: a0 + span - gap, am: a0 + span / 2};
  });
  const size = R * 2 + 120;
  return (
    <div style={{position: 'absolute', left: -size / 2, top: -size / 2, width: size, height: size, transform: `rotate(${rotation}deg)`}}>
      {/* glow */}
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, rgba(25,195,166,${0.32 * glow}) 30%, rgba(25,195,166,0) 70%)`, opacity: reveal}} />
      <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs>
          <linearGradient id="seg-on" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#24D8B8" />
            <stop offset="1" stopColor="#0E8F7B" />
          </linearGradient>
          <filter id="seg-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#000" floodOpacity="0.45" />
          </filter>
        </defs>
        <circle r={R + 10} fill="rgba(10,14,22,0.55)" stroke={C.glassLine} strokeWidth={1.5} opacity={reveal} filter="url(#seg-shadow)" />
        {segs.map(({s, i, a0, a1}) => {
          const local = clamp(reveal * 1.6 - i * (0.6 / slots.length));
          const e = EASE.out(local);
          const isOn = i === selected;
          const isLit = lit < 0 || lit > i;
          const flash = lit >= 0 && lit > i ? clamp(1 - (lit - i - 0.2) * 1.4) : 0;
          const pr = i === pulse ? pulseAmt : 0;
          const ro = R * (0.75 + 0.25 * e) + pr * 10;
          const ri = r0 * (0.9 + 0.1 * e);
          return (
            <g key={i} opacity={e * (s.weight === undefined ? 1 : clamp((s.weight ?? 1) * 2))}>
              <path
                d={sector(ri, ro, a0, a1)}
                fill={isOn ? 'url(#seg-on)' : s.ghost || s.soon ? 'rgba(255,255,255,0.03)' : isLit ? C.glass : 'rgba(17,23,35,0.55)'}
                stroke={isOn ? '#5FF2D8' : s.ghost || s.soon ? 'rgba(255,255,255,0.35)' : flash > 0 ? `rgba(25,195,166,${0.4 + 0.6 * flash})` : C.glassLine}
                strokeWidth={isOn ? 2.5 : flash > 0 ? 2.5 : 1.5}
                strokeDasharray={s.ghost || s.soon ? '10 8' : undefined}
              />
              {flash > 0 && <path d={sector(ri, ro, a0, a1)} fill={`rgba(25,195,166,${0.28 * flash})`} />}
            </g>
          );
        })}
      </svg>
      {segs.map(({s, i, am}) => {
        const local = clamp(reveal * 1.6 - i * (0.6 / slots.length));
        const e = EASE.out(local);
        const rm = (r0 + R) / 2 + (i === pulse ? pulseAmt * 8 : 0);
        const [x, y] = pt(rm * (0.8 + 0.2 * e), am);
        const isOn = i === selected;
        const isLit = lit < 0 || lit > i;
        const ic = R * 0.2;
        const wgt = s.weight === undefined ? 1 : clamp((s.weight ?? 1) * 1.5);
        return (
          <div key={i} style={{position: 'absolute', left: size / 2 + x, top: size / 2 + y, transform: `translate(-50%,-50%) rotate(${-rotation}deg) scale(${(0.6 + 0.4 * e) * (isOn ? 1.08 : 1)})`, opacity: e * (isLit ? 1 : 0.35) * wgt, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: R * 0.025}}>
            {s.ghost ? (
              <div style={{width: ic, height: ic, borderRadius: ic * 0.24, border: '3px dashed rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.8)', fontSize: ic * 0.7, fontWeight: 300, fontFamily: FONT.ui}}>+</div>
            ) : s.soon ? (
              <div style={{width: ic, height: ic, borderRadius: ic * 0.24, background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.18)'}} />
            ) : (
              <AppIcon app={s.app} size={ic} />
            )}
            {showLabels && (
              <div style={{fontFamily: FONT.ui, fontSize: R * 0.058, fontWeight: 600, color: isOn ? '#fff' : s.soon ? 'rgba(255,255,255,0.55)' : C.glassText, whiteSpace: 'nowrap', letterSpacing: 0.2}}>{s.label}</div>
            )}
          </div>
        );
      })}
      {/* hub */}
      <div style={{position: 'absolute', left: size / 2, top: size / 2, transform: `rotate(${-rotation}deg) scale(${0.5 + 0.5 * EASE.out(clamp(reveal * 1.3))})`, opacity: clamp(reveal * 2)}}>
        <Wheelie r={r0 * 0.9} headOnly mood={hubMood} blink={hubBlink} spin={hubSpin} />
      </div>
    </div>
  );
};
