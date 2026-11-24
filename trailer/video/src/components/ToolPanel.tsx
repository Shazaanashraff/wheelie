import React from 'react';
import {AppIcon, AppId, APPS} from './AppIcon';
import {C, FONT} from '../lib';

/** Wheelie's own dark-glass tool surface */
export const ToolPanel: React.FC<{app: AppId; w: number; h: number; children?: React.ReactNode; footer?: React.ReactNode}> = ({app, w, h, children, footer}) => (
  <div style={{width: w, height: h, borderRadius: 22, background: 'linear-gradient(180deg, rgba(26,34,50,0.96), rgba(15,20,31,0.96))', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(25,195,166,0.15), 0 0 60px rgba(25,195,166,0.12)', overflow: 'hidden', position: 'relative', fontFamily: FONT.ui}}>
    <div style={{height: 64, display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderBottom: '1px solid rgba(255,255,255,0.07)'}}>
      <AppIcon app={app} size={32} />
      <div style={{fontSize: 21, fontWeight: 600, color: C.glassText, flex: 1}}>{APPS[app].name}</div>
      <div style={{fontSize: 13, fontWeight: 600, color: C.teal, padding: '5px 12px', borderRadius: 20, background: 'rgba(25,195,166,0.12)', letterSpacing: 0.4}}>WHEELIE</div>
    </div>
    <div style={{position: 'absolute', top: 64, left: 0, right: 0, bottom: footer ? 64 : 0}}>{children}</div>
    {footer && <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', padding: '0 22px'}}>{footer}</div>}
  </div>
);
