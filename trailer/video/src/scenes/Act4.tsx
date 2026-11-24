import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Taskbar, Wallpaper} from '../components/Desktop';
import {Flash, Vignette} from '../components/Effects';
import {Wheelie} from '../components/Wheelie';
import {DEFAULT_SLOTS, Slot, WheelUI} from '../components/WheelUI';
import {C, EASE, FONT, H, TL, W, clamp, ease, kf, lerp, sp} from '../lib';

const A = TL.act4;
const blinkAt = (f: number, off = 0) => {
  const p = (f + off) % 160;
  return p < 8 ? Math.sin((p / 8) * Math.PI) : 0;
};

const Key: React.FC<{label: string; w: number; press: number; sub?: string}> = ({label, w, press, sub}) => (
  <div style={{position: 'relative', width: w, height: 200}}>
    <div style={{position: 'absolute', inset: 0, top: 26, borderRadius: 30, background: '#B9C2CE', filter: 'blur(0.5px)', boxShadow: `0 ${40 - press * 26}px ${60 - press * 30}px rgba(0,0,0,0.55)`}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: press * 22, height: 178, borderRadius: 30, background: 'linear-gradient(180deg, #FFFFFF 0%, #E8EDF3 100%)', boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.06), inset 0 2px 0 #fff', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', padding: '26px 34px', fontFamily: FONT.ui}}>
      <div style={{fontSize: 64, fontWeight: 600, color: '#1B2230', letterSpacing: -1}}>{label}</div>
      {sub && <div style={{fontSize: 20, color: '#8C98AA', marginTop: 4}}>{sub}</div>}
    </div>
  </div>
);

/* 3000–3240 */
export const Hotkey: React.FC<{f: number}> = ({f}) => {
  const altIn = sp(f, A.keyDrop, {damping: 12, stiffness: 120});
  const spIn = sp(f, A.keyDrop + 10, {damping: 12, stiffness: 120});
  const pressT = f - A.keyPress;
  const press = pressT < 0 ? ease(f, [A.keyPress - 6, A.keyPress], [0, 1], EASE.in) : 1 - ease(f, [A.keyPress + 10, A.keyPress + 22], [0, 1], EASE.out);
  const pop = f >= A.keyPress ? sp(f, A.keyPress, {damping: 11, stiffness: 170}) : 0;
  const wipe = f >= A.keyPress ? ease(f, [A.keyPress, A.keyPress + 26], [0, 1], EASE.out) : 0;
  const keysAway = ease(f, [A.keyPress + 40, A.keyPress + 80], [0, 1], EASE.inOut);
  const keyScale = lerp(1, 0.36, keysAway);
  const keyY = lerp(620, 900, keysAway);
  const tilt = lerp(30, 0, keysAway);
  const ring = f >= A.keyPress ? (f - A.keyPress) / 30 : -1;
  // wheel continues into next scene: center (960,430), R 260
  return (
    <AbsoluteFill style={{background: '#05070B', overflow: 'hidden'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 80%, rgba(25,195,166,0.12), transparent 60%)'}} />
      {wipe > 0 && (
        <AbsoluteFill style={{clipPath: `circle(${wipe * 1400}px at 960px 430px)`}}>
          <Wallpaper f={f} />
          <Taskbar f={f} icons={[{app: 'wheelie', at: -10}]} ram={12} />
        </AbsoluteFill>
      )}
      {ring >= 0 && ring <= 1 && <div style={{position: 'absolute', left: 960 - 300 - ring * 300, top: 430 - 300 - ring * 300, width: 600 + ring * 600, height: 600 + ring * 600, borderRadius: '50%', border: `${8 * (1 - ring)}px solid ${C.teal}`, opacity: 1 - ring}} />}
      {pop > 0 && (
        <div style={{position: 'absolute', left: 960, top: 430, transform: `scale(${pop})`}}>
          <WheelUI R={260} reveal={clamp(pop * 1.2)} hubBlink={blinkAt(f)} />
        </div>
      )}
      {/* keys */}
      <div style={{position: 'absolute', left: 960, top: keyY, transform: `translate(-50%, -50%) perspective(1400px) rotateX(${tilt}deg) scale(${keyScale})`, display: 'flex', alignItems: 'center', gap: 46}}>
        <div style={{transform: `translateY(${(1 - altIn) * -900}px)`}}><Key label="Alt" w={290} press={press} /></div>
        <div style={{fontFamily: FONT.display, fontSize: 90, fontWeight: 800, color: '#fff', opacity: clamp(spIn), transform: `translateY(${(1 - spIn) * -40}px)`}}>+</div>
        <div style={{transform: `translateY(${(1 - spIn) * -900}px)`}}><Key label="Space" w={760} press={press} /></div>
      </div>
      <Vignette amt={0.4} />
      <Flash amt={1 - ease(f, [3000, 3010], [0, 1])} color="#05070B" />
    </AbsoluteFill>
  );
};

/* 3240–3420 */
export const More: React.FC<{f: number}> = ({f}) => {
  const t0 = A.moreStart;
  const k = ease(f, [t0, t0 + 40], [0, 1], EASE.inOut);
  const cy = lerp(430, 480, k);
  const R = lerp(260, 300, k);
  const rot = Math.pow(Math.max(0, f - t0), 1.2) * 0.45;
  const soon = [0, 1, 2].map((i) => ease(f, [t0 + 30 + i * 22, t0 + 60 + i * 22], [0, 1], EASE.out));
  const slots: Slot[] = [...DEFAULT_SLOTS, ...soon.map((w) => ({app: 'calc' as const, label: 'Soon', weight: w, soon: true}))];
  const pill = sp(f, t0 + 50, {damping: 14, stiffness: 140});
  const collapse = ease(f, [3392, 3418], [0, 1], EASE.in);
  const keysHint = 1 - ease(f, [t0, t0 + 20], [0, 1]);
  return (
    <AbsoluteFill style={{background: '#05070B', overflow: 'hidden'}}>
      <Wallpaper f={f} dim={collapse * 0.9} />
      <Taskbar f={f} icons={[{app: 'wheelie', at: -10}]} ram={12} />
      <div style={{position: 'absolute', left: 960, top: cy, transform: `scale(${1 - collapse * 0.6})`}}>
        <WheelUI R={R} slots={slots} reveal={1 - collapse} rotation={rot} hubBlink={blinkAt(f, 20)} />
      </div>
      {/* trailing key hint from previous shot */}
      {keysHint > 0 && <div style={{position: 'absolute', left: 0, width: W, top: 860, textAlign: 'center', opacity: keysHint, fontFamily: FONT.ui, fontSize: 30, color: '#fff'}} />}
      <div style={{position: 'absolute', left: W / 2, top: 870, transform: `translate(-50%, 0) scale(${pill})`, opacity: clamp(pill * 1.4) * (1 - collapse), padding: '16px 30px', borderRadius: 40, background: 'rgba(17,23,35,0.9)', border: '1px solid rgba(255,255,255,0.12)', fontFamily: FONT.ui, fontSize: 30, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', display: 'flex', gap: 14, alignItems: 'center'}}>
        <span style={{width: 12, height: 12, borderRadius: 6, background: C.teal, boxShadow: `0 0 12px ${C.teal}`}} />
        More tools rolling in
      </div>
      <Vignette amt={0.35} />
      <Flash amt={collapse} color="#0A0E16" />
    </AbsoluteFill>
  );
};

/* 3420–3600 */
export const EndCard: React.FC<{f: number}> = ({f}) => {
  const t0 = A.endStart;
  const roll = ease(f, [t0 + 6, t0 + 92], [0, 1], EASE.out);
  const wx = lerp(-200, 1610, roll);
  const wy = 470;
  const stopT = f - (t0 + 92);
  const sq = stopT >= 0 ? 1 - 0.12 * Math.exp(-stopT / 8) * Math.cos(stopT / 3) : 1;
  const spin = roll * 1100;
  const revealX = wx - 40;
  const cta = sp(f, t0 + 96, {damping: 15, stiffness: 140});
  const soon = ease(f, [t0 + 112, t0 + 130], [0, 1], EASE.out);
  const wink = f >= A.wink && f < A.wink + 26;
  const fadeOut = ease(f, [3584, 3600], [0, 1], EASE.in);
  return (
    <AbsoluteFill style={{background: '#0A0E16', overflow: 'hidden'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(25,195,166,0.20), transparent 55%), radial-gradient(ellipse at 85% 10%, rgba(111,92,255,0.18), transparent 50%)'}} />
      {/* tire tracks */}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <defs>
          <pattern id="tread" width="34" height="26" patternUnits="userSpaceOnUse">
            <rect x="4" y="3" width="14" height="20" rx="4" fill="rgba(255,255,255,0.07)" />
          </pattern>
          <clipPath id="trackclip"><rect x={0} y={0} width={Math.max(0, revealX)} height={H} /></clipPath>
        </defs>
        <rect x={0} y={552} width={W} height={26} fill="url(#tread)" clipPath="url(#trackclip)" />
      </svg>
      {/* wordmark */}
      <div style={{position: 'absolute', left: 0, top: 330, width: W, textAlign: 'center', clipPath: `inset(0 ${Math.max(0, W - revealX)}px 0 0)`}}>
        <span style={{fontFamily: FONT.display, fontWeight: 800, fontSize: 230, color: '#fff', letterSpacing: -6, lineHeight: 1}}>Wheelie</span>
      </div>
      {/* Wheelie */}
      <div style={{position: 'absolute', left: wx, top: wy}}>
        {roll < 0.98 && <div style={{position: 'absolute', left: -260, top: -40, width: 200, height: 80, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08))', borderRadius: 40, opacity: 1 - roll}} />}
        <Wheelie r={100} spin={spin} squash={sq} mood={wink ? 'wink' : 'happy'} armL={roll > 0.95 ? [-118, 40] : [-120, 20]} armR={roll > 0.95 ? [120, -60 + Math.sin(f * 0.25) * 10] : [120, 20]} blink={wink ? 0 : blinkAt(f, 70)} shadow />
      </div>
      {/* CTA */}
      <div style={{position: 'absolute', left: W / 2, top: 660, transform: `translate(-50%, ${(1 - cta) * 30}px)`, opacity: clamp(cta * 1.5), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, fontFamily: FONT.ui}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '22px 40px', borderRadius: 60, background: 'linear-gradient(180deg, #2BDDBD, #12A88F)', color: '#04221D', fontSize: 34, fontWeight: 700, boxShadow: '0 18px 50px rgba(25,195,166,0.45)'}}>
          <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#04221D" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 20h14" /></svg>
          Download free for Windows
        </div>
        <div style={{fontSize: 26, color: '#8C98AA', opacity: soon, fontWeight: 500}}>macOS and Linux coming soon</div>
      </div>
      <Flash amt={1 - ease(f, [t0, t0 + 10], [0, 1])} color="#0A0E16" />
      <Flash amt={fadeOut} color="#000" />
    </AbsoluteFill>
  );
};

export {kf};
