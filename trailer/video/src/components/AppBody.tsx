import React from 'react';
import {AppId} from './AppIcon';
import {C, FONT, clamp} from '../lib';

const dark = {bg: '#151B27', panel: '#1E2635', line: 'rgba(255,255,255,0.08)', text: '#E8EEF6', muted: '#8C98AA'};
const light = {bg: C.winBg, panel: '#EEF2F6', line: C.winLine, text: C.text, muted: C.textMuted};

export type BodyProps = {app: AppId; f: number; w: number; h: number; dark?: boolean; calc?: string; pressed?: string; typed?: string};

const KEYS = ['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '⌫', '='];

export const AppBody: React.FC<BodyProps> = (p) => {
  const th = p.dark ? dark : light;
  const wrap: React.CSSProperties = {position: 'absolute', inset: 0, padding: 18, fontFamily: FONT.ui, color: th.text, background: p.dark ? 'transparent' : th.bg};
  switch (p.app) {
    case 'calc': {
      const disp = p.calc ?? '0';
      return (
        <div style={{...wrap, display: 'flex', flexDirection: 'column', gap: 12}}>
          <div style={{height: '22%', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', fontFamily: FONT.mono, fontWeight: 500, fontSize: Math.min(56, p.w * 0.13), letterSpacing: -1}}>{disp}</div>
          <div style={{flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8}}>
            {KEYS.map((k) => {
              const op = '÷×−+='.includes(k);
              const on = p.pressed === k;
              return (
                <div key={k} style={{borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: p.w * 0.055, fontWeight: 500, background: on ? C.teal : op ? (p.dark ? 'rgba(25,195,166,0.18)' : '#FFE6D3') : th.panel, color: on ? '#fff' : op ? (p.dark ? C.teal : '#E2640F') : th.text, transform: on ? 'scale(0.94)' : undefined}}>{k}</div>
              );
            })}
          </div>
        </div>
      );
    }
    case 'alarm': {
      const t = clamp(p.f / 40);
      const hh = 10;
      const mm = Math.round(30 * t);
      return (
        <div style={{...wrap, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
          <svg width={p.h * 0.48} height={p.h * 0.48} viewBox="-50 -50 100 100">
            <circle r={46} fill={th.panel} stroke={th.line} strokeWidth={2} />
            {Array.from({length: 12}, (_, i) => <rect key={i} x={-1} y={-42} width={2} height={6} rx={1} fill={th.muted} transform={`rotate(${i * 30})`} />)}
            <path d="M0 0 L0 -24" stroke={th.text} strokeWidth={4} strokeLinecap="round" transform={`rotate(${(hh % 12) * 30 + mm * 0.5})`} />
            <path d="M0 0 L0 -34" stroke={C.hot} strokeWidth={2.5} strokeLinecap="round" transform={`rotate(${mm * 6})`} />
            <circle r={3.5} fill={th.text} />
          </svg>
          <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
            <div style={{fontFamily: FONT.mono, fontSize: p.w * 0.12, fontWeight: 500}}>{`${hh}:${String(mm).padStart(2, '0')}`}<span style={{fontSize: p.w * 0.05, marginLeft: 8, color: th.muted}}>AM</span></div>
            <div style={{width: 58, height: 32, borderRadius: 16, background: t >= 1 ? C.teal : th.panel, position: 'relative'}}>
              <div style={{position: 'absolute', top: 4, left: t >= 1 ? 30 : 4, width: 24, height: 24, borderRadius: 12, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.3)'}} />
            </div>
          </div>
          <div style={{fontSize: 15, color: th.muted}}>Meeting with Sam</div>
        </div>
      );
    }
    case 'notes': {
      const txt = p.typed ?? '';
      return (
        <div style={{...wrap, padding: 26}}>
          <div style={{fontSize: 24, fontWeight: 700, marginBottom: 12}}>Monday</div>
          <div style={{fontSize: 19, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: th.text}}>
            {txt}
            <span style={{display: 'inline-block', width: 2, height: 22, background: C.teal, marginLeft: 2, verticalAlign: -4, opacity: Math.floor(p.f / 16) % 2 ? 0 : 1}} />
          </div>
        </div>
      );
    }
    case 'reminders':
    case 'todo': {
      const items = p.app === 'todo' ? ['Reply to Sam', 'Book flights', 'Pay rent', 'Water plants'] : ['Send invoice totals', 'Call the bank', 'Buy milk', 'Gym at 6 pm', 'Renew passport'];
      return (
        <div style={{...wrap, padding: 22, display: 'flex', flexDirection: 'column', gap: 14}}>
          {items.map((it, i) => {
            const vis = clamp((p.f - i * 5) / 8);
            const done = p.app === 'todo' && i === 0;
            return (
              <div key={it} style={{display: 'flex', alignItems: 'center', gap: 14, opacity: vis, transform: `translateX(${(1 - vis) * 20}px)`}}>
                <div style={{width: 22, height: 22, borderRadius: p.app === 'todo' ? 6 : 11, border: `2px solid ${done ? C.teal : th.muted}`, background: done ? C.teal : 'transparent'}} />
                <div style={{fontSize: 18, textDecoration: done ? 'line-through' : undefined, color: done ? th.muted : th.text}}>{it}</div>
              </div>
            );
          })}
        </div>
      );
    }
    case 'timer':
    case 'stopwatch': {
      const isT = p.app === 'timer';
      const sec = isT ? Math.max(0, 300 - p.f / 60) : p.f / 60 + 12.48;
      const label = isT ? `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}` : `00:${String(Math.floor(sec)).padStart(2, '0')}.${String(Math.floor((sec % 1) * 100)).padStart(2, '0')}`;
      const R = Math.min(p.w, p.h - 42) * 0.36;
      return (
        <div style={{...wrap, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <svg width={R * 2 + 20} height={R * 2 + 20} viewBox={`${-R - 10} ${-R - 10} ${R * 2 + 20} ${R * 2 + 20}`} style={{position: 'absolute'}}>
            <circle r={R} stroke={th.panel} strokeWidth={10} fill="none" />
            <circle r={R} stroke={isT ? '#7046E8' : '#E08A0B'} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * R * (isT ? 0.92 : (sec % 60) / 60)} 9999`} transform="rotate(-90)" />
          </svg>
          <div style={{fontFamily: FONT.mono, fontSize: R * 0.42, fontWeight: 500}}>{label}</div>
        </div>
      );
    }
    case 'converter':
      return (
        <div style={{...wrap, padding: 22, display: 'flex', flexDirection: 'column', gap: 14}}>
          {[['12', 'Kilometres'], ['7.456', 'Miles']].map(([v, u], i) => (
            <div key={u} style={{background: th.panel, borderRadius: 10, padding: '12px 16px'}}>
              <div style={{fontSize: 13, color: th.muted}}>{u}</div>
              <div style={{fontFamily: FONT.mono, fontSize: 30, color: i ? '#16A34A' : th.text}}>{v}</div>
            </div>
          ))}
        </div>
      );
    case 'clipboard':
      return (
        <div style={{...wrap, padding: 18, display: 'flex', flexDirection: 'column', gap: 10}}>
          {['INV-2024-0117', 'https://meet.link/q3-review', 'Sam: 10:30?', '+44 20 7946 0958'].map((t) => (
            <div key={t} style={{background: th.panel, borderRadius: 8, padding: '12px 14px', fontSize: 15, fontFamily: FONT.mono, whiteSpace: 'nowrap', overflow: 'hidden'}}>{t}</div>
          ))}
        </div>
      );
    case 'colorpicker':
      return (
        <div style={{...wrap, padding: 20}}>
          <div style={{height: '55%', borderRadius: 10, background: 'linear-gradient(90deg,#fff,#19C3A6), linear-gradient(0deg,#000,transparent)', backgroundBlendMode: 'multiply'}} />
          <div style={{display: 'flex', gap: 10, marginTop: 14}}>
            {['#19C3A6', '#6F5CFF', '#FF5A36', '#FFC93D', '#0E1420'].map((c) => <div key={c} style={{width: 36, height: 36, borderRadius: 18, background: c}} />)}
          </div>
          <div style={{fontFamily: FONT.mono, fontSize: 20, marginTop: 12}}>#19C3A6</div>
        </div>
      );
    case 'calendar':
      return (
        <div style={{...wrap, padding: 18}}>
          <div style={{fontSize: 18, fontWeight: 700, marginBottom: 10}}>November</div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6}}>
            {Array.from({length: 35}, (_, i) => {
              const d = i - 4;
              const on = d === 24;
              return <div key={i} style={{height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, background: on ? '#E11D48' : 'transparent', color: on ? '#fff' : d < 1 || d > 30 ? 'transparent' : th.text, fontWeight: on ? 700 : 400}}>{d}</div>;
            })}
          </div>
        </div>
      );
    case 'weather':
      return (
        <div style={{...wrap, display: 'flex', alignItems: 'center', gap: 20, padding: 28}}>
          <svg width={90} height={90} viewBox="0 0 64 64"><circle cx="32" cy="32" r="14" fill="#FFC93D" />{Array.from({length: 8}, (_, i) => <rect key={i} x="30.5" y="6" width="3" height="8" rx="1.5" fill="#FFC93D" transform={`rotate(${i * 45} 32 32)`} />)}</svg>
          <div><div style={{fontSize: 56, fontWeight: 300}}>24°</div><div style={{fontSize: 16, color: th.muted}}>Sunny · feels like 26°</div></div>
        </div>
      );
    case 'passwords':
      return (
        <div style={{...wrap, padding: 22, display: 'flex', flexDirection: 'column', gap: 16}}>
          <div style={{background: th.panel, borderRadius: 10, padding: '14px 16px', fontFamily: FONT.mono, fontSize: 20, letterSpacing: 2}}>k7#Qm!2vX9$p</div>
          <div style={{height: 8, borderRadius: 4, background: '#4F46E5', width: '85%'}} />
          <div style={{alignSelf: 'flex-start', background: '#4F46E5', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 15, fontWeight: 600}}>Generate</div>
        </div>
      );
    case 'translate':
      return (
        <div style={{...wrap, padding: 22, display: 'flex', gap: 14}}>
          {[['English', 'Hello'], ['French', 'Bonjour']].map(([l, t]) => (
            <div key={l} style={{flex: 1, background: th.panel, borderRadius: 10, padding: 14}}><div style={{fontSize: 13, color: th.muted}}>{l}</div><div style={{fontSize: 28, marginTop: 6}}>{t}</div></div>
          ))}
        </div>
      );
    default:
      return <div style={wrap} />;
  }
};
