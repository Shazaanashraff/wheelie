import React from 'react';
import {AbsoluteFill} from 'remotion';
import {AppIcon, AppId, APPS} from './AppIcon';
import {WheelieMark} from './Wheelie';
import {C, FONT, H, TASKBAR_H, W, clamp, noise, sp, taskbarSlots} from '../lib';

export const Wallpaper: React.FC<{f: number; heat?: number; dim?: number}> = ({f, heat = 0, dim = 0}) => {
  const d = f / 60;
  return (
    <AbsoluteFill style={{background: 'linear-gradient(160deg, #0C1628 0%, #12213D 55%, #0D1A30 100%)', overflow: 'hidden'}}>
      <div style={{position: 'absolute', width: 1400, height: 1400, left: -380 + Math.sin(d * 0.2) * 40, top: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(25,195,166,0.38) 0%, rgba(25,195,166,0) 62%)'}} />
      <div style={{position: 'absolute', width: 1500, height: 1500, left: 900, top: -720 + Math.cos(d * 0.17) * 40, borderRadius: '50%', background: 'radial-gradient(circle, rgba(111,92,255,0.40) 0%, rgba(111,92,255,0) 60%)'}} />
      <div style={{position: 'absolute', width: 900, height: 900, left: 620, top: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(64,140,255,0.22) 0%, rgba(64,140,255,0) 65%)'}} />
      {/* soft wave */}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: 0.22}}>
        <path d={`M0 ${760 + Math.sin(d * 0.3) * 10} C 500 ${640} 900 ${900} 1920 ${700}`} stroke="#7FE7D6" strokeWidth={2} fill="none" />
        <path d={`M0 ${800 + Math.sin(d * 0.3 + 1) * 10} C 520 ${690} 940 ${950} 1920 ${750}`} stroke="#A99BFF" strokeWidth={1.5} fill="none" />
      </svg>
      {heat > 0 && (
        <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 100%, rgba(255,90,40,${0.55 * heat}) 0%, rgba(255,60,20,${0.25 * heat}) 45%, rgba(120,20,0,${0.15 * heat}) 100%)`}} />
      )}
      {dim > 0 && <AbsoluteFill style={{background: `rgba(5,8,14,${dim})`}} />}
    </AbsoluteFill>
  );
};

export type TaskIcon = {app: AppId | 'wheelie'; at: number};

export const Taskbar: React.FC<{
  f: number;
  icons: TaskIcon[];
  heat?: number;
  ram?: number;
  wifiOff?: boolean;
  wheelieGlow?: number;
  time?: string;
  hideBefore?: boolean;
}> = ({f, icons, heat = 0, ram, wifiOff = false, wheelieGlow = 0, time = '9:02 AM'}) => {
  const visible = icons.filter((i) => f >= i.at);
  const {slot, xs} = taskbarSlots(visible.length);
  const iconSize = Math.min(44, slot - 10);
  return (
    <div style={{position: 'absolute', left: 0, top: H - TASKBAR_H, width: W, height: TASKBAR_H, background: 'rgba(16,21,32,0.94)', borderTop: '1px solid rgba(255,255,255,0.07)'}}>
      {visible.map((ic, i) => {
        const s = sp(f, ic.at, {damping: 12, stiffness: 200});
        const isW = ic.app === 'wheelie';
        const hot = isW ? 0 : heat;
        const jx = hot > 0.3 ? noise(f * 0.9, i) * 3 * hot : 0;
        const jy = hot > 0.3 ? noise(f * 1.1, i + 9) * 2 * hot : 0;
        return (
          <div key={`${ic.app}-${i}`} style={{position: 'absolute', left: xs[i] - iconSize / 2 + jx, top: (TASKBAR_H - iconSize) / 2 - 3 + jy + (1 - s) * 30, width: iconSize, height: iconSize, opacity: clamp(s * 1.5), transform: `scale(${0.6 + 0.4 * s})`}}>
            {isW ? (
              <>
                {wheelieGlow > 0 && (
                  <div style={{position: 'absolute', left: -iconSize * 0.6, top: -iconSize * 0.6, width: iconSize * 2.2, height: iconSize * 2.2, borderRadius: '50%', background: `radial-gradient(circle, rgba(25,195,166,${0.75 * wheelieGlow}) 0%, rgba(25,195,166,0) 65%)`}} />
                )}
                <WheelieMark size={iconSize} />
              </>
            ) : (
              <AppIcon app={ic.app as AppId} size={iconSize} hot={hot} />
            )}
            <div style={{position: 'absolute', left: iconSize / 2 - 4, top: iconSize + 5, width: 8, height: 3, borderRadius: 2, background: isW ? C.teal : 'rgba(255,255,255,0.45)'}} />
          </div>
        );
      })}
      {/* tray */}
      <div style={{position: 'absolute', right: 22, top: 0, height: TASKBAR_H, display: 'flex', alignItems: 'center', gap: 18, color: '#E6ECF4', fontFamily: FONT.ui}}>
        {ram !== undefined && <RamChip pct={ram} />}
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#E6ECF4" strokeWidth={2} strokeLinecap="round">
          <path d="M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0" opacity={wifiOff ? 0.35 : 1} />
          <circle cx="12" cy="20" r="1.3" fill="#E6ECF4" />
          {wifiOff && <path d="M4 3l17 18" stroke="#FF6B57" strokeWidth={2.6} />}
        </svg>
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#E6ECF4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" />
        </svg>
        <svg width={26} height={22} viewBox="0 0 26 24" fill="none" stroke="#E6ECF4" strokeWidth={2}>
          <rect x="2" y="6" width="19" height="12" rx="3" /><rect x="4.5" y="8.5" width="11" height="7" rx="1" fill="#E6ECF4" stroke="none" /><path d="M23 10v4" strokeLinecap="round" />
        </svg>
        <div style={{textAlign: 'right', lineHeight: 1.25}}>
          <div style={{fontSize: 15, fontWeight: 500}}>{time}</div>
          <div style={{fontSize: 13, color: '#AEB8C6'}}>Mon 24/11</div>
        </div>
      </div>
    </div>
  );
};

export const RamChip: React.FC<{pct: number}> = ({pct}) => {
  const hot = pct > 80;
  const col = pct > 80 ? '#FF5A36' : pct > 55 ? '#FFB13B' : C.teal;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 10, background: hot ? 'rgba(255,90,54,0.16)' : 'rgba(255,255,255,0.06)', border: `1px solid ${hot ? 'rgba(255,90,54,0.6)' : 'rgba(255,255,255,0.08)'}`}}>
      <span style={{fontSize: 12, fontWeight: 600, letterSpacing: 0.6, color: '#AEB8C6'}}>RAM</span>
      <div style={{width: 74, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.12)', overflow: 'hidden'}}>
        <div style={{width: `${pct}%`, height: '100%', background: col, borderRadius: 4}} />
      </div>
      <span style={{fontFamily: FONT.mono, fontSize: 14, fontWeight: 600, color: col, width: 40, textAlign: 'right'}}>{Math.round(pct)}%</span>
    </div>
  );
};

export const Toast: React.FC<{f: number; at: number; app: AppId; title: string; body: string; y?: number; out?: number}> = ({f, at, app, title, body, y = 0, out}) => {
  if (f < at) return null;
  const s = sp(f, at, {damping: 16, stiffness: 170});
  const o = out !== undefined ? clamp((out - f) / 12) : 1;
  return (
    <div style={{position: 'absolute', right: 24 - (1 - s) * 460, bottom: TASKBAR_H + 20 + y, width: 420, padding: '18px 20px', borderRadius: 14, background: 'rgba(250,251,253,0.98)', boxShadow: '0 18px 50px rgba(0,0,0,0.38)', display: 'flex', gap: 16, fontFamily: FONT.ui, opacity: o}}>
      <AppIcon app={app} size={44} />
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontSize: 13, color: C.textMuted, fontWeight: 500, display: 'flex', justifyContent: 'space-between'}}><span>{APPS[app].name}</span><span>now</span></div>
        <div style={{fontSize: 17, fontWeight: 700, color: C.text, marginTop: 3}}>{title}</div>
        <div style={{fontSize: 16, color: '#3A4456', marginTop: 2}}>{body}</div>
      </div>
    </div>
  );
};

export const Cursor: React.FC<{x: number; y: number; spinner?: boolean; f?: number; scale?: number; press?: number}> = ({x, y, spinner, f = 0, scale = 1.35, press = 0}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: `scale(${scale * (1 - press * 0.12)})`, transformOrigin: '0 0', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.45))'}}>
    {spinner ? (
      <svg width={34} height={34} viewBox="0 0 34 34" style={{position: 'absolute', left: -6, top: -6}}>
        <circle cx={17} cy={17} r={12} stroke="rgba(255,255,255,0.35)" strokeWidth={4} fill="none" />
        <circle cx={17} cy={17} r={12} stroke="#fff" strokeWidth={4} fill="none" strokeDasharray="22 60" strokeLinecap="round" transform={`rotate(${f * 12} 17 17)`} />
      </svg>
    ) : (
      <svg width={26} height={36} viewBox="0 0 26 36">
        <path d="M2 2 L2 28 L8.5 22 L13 32.5 L17.5 30.5 L13 20.5 L21.5 20.5 Z" fill="#fff" stroke="#111" strokeWidth={1.8} strokeLinejoin="round" />
      </svg>
    )}
  </div>
);

export const ClickRipple: React.FC<{f: number; at: number; x: number; y: number; color?: string}> = ({f, at, x, y, color = '#fff'}) => {
  const t = (f - at) / 18;
  if (t < 0 || t > 1) return null;
  return <div style={{position: 'absolute', left: x - 30 * t - 6, top: y - 30 * t - 6, width: 60 * t + 12, height: 60 * t + 12, borderRadius: '50%', border: `3px solid ${color}`, opacity: 1 - t}} />;
};
