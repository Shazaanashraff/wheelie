import React from 'react';
import {AppIcon, AppId, APPS} from './AppIcon';
import {C, FONT} from '../lib';

export const AppWindow: React.FC<{
  app: AppId;
  w: number;
  h: number;
  children?: React.ReactNode;
  title?: string;
  tint?: number; // 0..1 heat tint
  frozen?: number; // 0..1 desaturate
}> = ({app, w, h, children, title, tint = 0, frozen = 0}) => (
  <div style={{width: w, height: h, borderRadius: 12, background: C.winBg, boxShadow: '0 24px 60px rgba(0,0,0,0.42), 0 0 0 1px rgba(0,0,0,0.08)', overflow: 'hidden', fontFamily: FONT.ui, position: 'relative', filter: frozen > 0 ? `grayscale(${frozen * 0.85}) brightness(${1 - frozen * 0.08})` : undefined}}>
    <div style={{height: 42, background: C.winBar, borderBottom: `1px solid ${C.winLine}`, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10}}>
      <AppIcon app={app} size={22} />
      <div style={{fontSize: 14, fontWeight: 600, color: C.text, flex: 1, whiteSpace: 'nowrap'}}>{title ?? APPS[app].name}</div>
      <svg width={96} height={14} viewBox="0 0 96 14" stroke="#5B6575" strokeWidth={1.6} fill="none" strokeLinecap="round">
        <path d="M6 7h12" /><rect x="40" y="1.5" width="11" height="11" rx="2" /><path d="M76 2l10 10M86 2L76 12" />
      </svg>
    </div>
    <div style={{position: 'absolute', top: 42, left: 0, right: 0, bottom: 0}}>{children}</div>
    {tint > 0 && <div style={{position: 'absolute', inset: 0, background: `linear-gradient(to top, rgba(255,70,20,${tint * 0.38}), rgba(255,120,40,${tint * 0.08}) 75%)`}} />}
  </div>
);
