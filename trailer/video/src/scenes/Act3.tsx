import React from 'react';
import {AbsoluteFill} from 'remotion';
import {AppIcon, AppId} from '../components/AppIcon';
import {AppBody} from '../components/AppBody';
import {AppWindow} from '../components/AppWindow';
import {ClickRipple, Cursor, Taskbar, TaskIcon, Wallpaper} from '../components/Desktop';
import {Flash, Vignette} from '../components/Effects';
import {ToolPanel} from '../components/ToolPanel';
import {Wheelie} from '../components/Wheelie';
import {DEFAULT_SLOTS, Slot, WheelUI} from '../components/WheelUI';
import {C, EASE, FONT, H, TL, W, WHEELIE_RAM_MB, clamp, ease, kf, lerp, noise, sp, wheelTilt} from '../lib';

const A = TL.act3;
const blinkAt = (f: number, off = 0) => {
  const p = (f + off) % 170;
  return p < 8 ? Math.sin((p / 8) * Math.PI) : 0;
};

const Cam: React.FC<{cx?: number; cy?: number; s?: number; rot?: number; children: React.ReactNode}> = ({cx = 960, cy = 540, s = 1, rot = 0, children}) => (
  <AbsoluteFill style={{transform: `translate(${W / 2}px, ${H / 2}px) rotate(${rot}deg) scale(${s}) translate(${-cx}px, ${-cy}px)`, transformOrigin: '0 0'}}>{children}</AbsoluteFill>
);

const WHEELIE_ONLY: TaskIcon[] = [{app: 'wheelie', at: -10}];

/* ------------------------------------------------------------------ */
/* 1620–2280: wheel hero, tools, offline (one continuous desktop)       */
/* ------------------------------------------------------------------ */
export const WheelTools: React.FC<{f: number}> = ({f}) => {
  // wheel placement
  const toLeft = ease(f, [A.toolsStart, A.toolsStart + 34], [0, 1], EASE.inOut);
  const wx = lerp(960, 600, toLeft);
  const wy = lerp(500, 500, toLeft);
  const R = lerp(300, 270, toLeft);
  const reveal = ease(f, [1578, 1650], [0, 1], EASE.out);
  const lit = f < 1650 ? 0 : (f - 1650) / A.slotEvery;
  // tool selection + rotation
  let sel = -1;
  let rotT = 0;
  if (f >= 1888) sel = 0;
  if (f >= A.toolSwitch[1]) sel = 1;
  if (f >= A.toolSwitch[2]) sel = 2;
  if (f >= A.offlineStart) sel = 1;
  rotT = kf(f, [[A.toolSwitch[1] - 8, 0], [A.toolSwitch[1] + 10, -45], [A.toolSwitch[2] - 8, -45], [A.toolSwitch[2] + 10, -90], [A.offlineStart, -90], [A.offlineStart + 16, -45]], EASE.out);

  // panel
  const panelIn = sp(f, 1892, {damping: 17, stiffness: 150});
  const panelX = 1010;
  const panelY = 170;
  const PW = 600, PH = 660;
  const switchK = (at: number) => (f >= at - 8 && f < at + 10 ? 1 - Math.abs(f - at) / 10 : 0);
  const whip = Math.max(switchK(A.toolSwitch[1]), switchK(A.toolSwitch[2]), switchK(A.offlineStart + 6));
  const panelApp: AppId = sel === 0 ? 'calc' : sel === 1 ? 'notes' : 'alarm';

  // calc value
  const calcVal = (() => {
    const t = ease(f, [1905, 1930], [0, 1], EASE.out);
    const v = 1284.5 + 312.75 * t;
    return v.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  })();
  const notesText = f < A.offlineStart
    ? 'Groceries: milk, eggs, coffee\nCall mum at 6'
    : 'Groceries: milk, eggs, coffee\nCall mum at 6\n' + 'Works offline. Saved locally.'.slice(0, Math.max(0, Math.floor((f - 2180) * 0.9)));

  // offline: cable + snip
  const snip = A.snip;
  const cableIn = ease(f, [2104, 2130], [0, 1], EASE.out);
  const cut = f >= snip;
  const cutT = f - snip;
  const wifiOff = f >= snip + 6;
  const savedT = f - A.saved;

  // Wheelie (offline)
  const wVis = f >= 2112;
  let wX = 2050, wY = 900, wSpin = 0, wSq = 1;
  if (wVis) {
    const roll = ease(f, [2112, 2140], [0, 1], EASE.out);
    wX = lerp(2050, 1660, roll);
    wSpin = -roll * 260;
    const jump = f >= 2140 ? (f < 2178 ? Math.sin(((f - 2140) / 38) * Math.PI) : 0) : 0;
    wY = 900 - jump * 400;
    const land = f >= 2178 ? f - 2178 : -1;
    if (land >= 0) wSq = 1 - 0.2 * Math.exp(-land / 6) * Math.cos(land / 3);
  }

  // camera
  const s = kf(f, [[1620, 1.0], [1840, 1.05], [1860, 1.05], [1900, 1.0], [2100, 1.0], [2140, 1.04], [2262, 1.04], [2282, 4.5]], EASE.inOut);
  const cx = kf(f, [[1620, 960], [2100, 960], [2140, 1000], [2262, 1000], [2282, 1606]], EASE.inOut);
  const cy = kf(f, [[1620, 540], [2100, 540], [2140, 560], [2262, 560], [2282, 1048]], EASE.inOut);

  const curShow = f >= 1868 && f < 2090;
  const curX = kf(f, [[1868, 900], [1886, wx + 10], [1930, wx + 10], [1940, wx + 160], [2010, wx + 160], [2020, wx + 200]], EASE.out);
  const curY = kf(f, [[1868, 820], [1886, wy - R * 0.72], [1930, wy - R * 0.72], [1940, wy - R * 0.6], [2010, wy - R * 0.6], [2020, wy - R * 0.4]], EASE.out);

  const wordmark = ease(f, [1745, 1780], [0, 1], EASE.out) * (1 - ease(f, [A.toolsStart, A.toolsStart + 20], [0, 1]));
  const ram = 12;

  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
      <Cam cx={cx} cy={cy} s={s}>
        <Wallpaper f={f} />
        {/* wheel */}
        <div style={{position: 'absolute', left: wx, top: wy}}>
          <div style={{transform: wheelTilt(f)}}>
            <WheelUI R={R} reveal={reveal} lit={lit} selected={sel} rotation={rotT} hubBlink={blinkAt(f)} hubMood={f >= 1740 && f < 1800 ? 'proud' : 'happy'} pulse={sel} pulseAmt={sel >= 0 ? 0.6 : 0} />
          </div>
        </div>
        {/* wordmark */}
        {wordmark > 0 && (
          <div style={{position: 'absolute', left: 0, width: W, top: 850, textAlign: 'center', opacity: wordmark, transform: `translateY(${(1 - wordmark) * 20}px)`, fontFamily: FONT.display, fontWeight: 800, fontSize: 84, color: '#fff', letterSpacing: lerp(18, -1, wordmark)}}>
            Wheelie
          </div>
        )}
        {/* tool panel */}
        {f >= 1892 && (
          <div style={{position: 'absolute', left: panelX, top: panelY, transform: `translateX(${(1 - panelIn) * -340}px) scale(${0.6 + 0.4 * panelIn}) translateX(${whip * -40}px)`, transformOrigin: '0% 50%', opacity: clamp(panelIn * 1.5), filter: whip > 0 ? `blur(${whip * 6}px)` : undefined}}>
            <ToolPanel
              app={panelApp}
              w={PW}
              h={PH}
              footer={
                sel === 1 && f >= A.offlineStart ? (
                  <div style={{display: 'flex', alignItems: 'center', gap: 12, color: C.glassText, fontSize: 17, opacity: clamp(savedT / 10)}}>
                    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth={2}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 15h.01M11 15h6" strokeLinecap="round" /></svg>
                    <div style={{width: 120, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden'}}><div style={{width: `${clamp(savedT / 22) * 100}%`, height: '100%', background: C.teal}} /></div>
                    <span style={{fontWeight: 600}}>Saved on this PC</span>
                    {savedT > 22 && <svg width={22} height={22} viewBox="0 0 24 24" style={{transform: `scale(${sp(f, A.saved + 22, {damping: 10})})`}}><circle cx="12" cy="12" r="11" fill={C.teal} /><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" /></svg>}
                  </div>
                ) : (
                  <div style={{color: '#8C98AA', fontSize: 15}}>{sel === 0 ? '1,284.50 + 312.75' : sel === 2 ? 'Repeats weekdays' : 'Autosaved'}</div>
                )
              }
            >
              <AppBody app={panelApp} f={sel === 2 ? f - A.toolSwitch[2] : 999} w={PW} h={PH - 128} dark calc={calcVal} typed={notesText} />
            </ToolPanel>
          </div>
        )}
        {/* cable */}
        {cableIn > 0 && (
          <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            <defs>
              <linearGradient id="cable" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#2C3646" />
                <stop offset="0.5" stopColor="#4A586D" />
                <stop offset="1" stopColor="#2C3646" />
              </linearGradient>
            </defs>
            {!cut ? (
              <path d={`M1760 ${-40 - (1 - cableIn) * 400} C 1760 250, 1700 700, 1700 1012`} stroke="url(#cable)" strokeWidth={16} fill="none" strokeLinecap="round" />
            ) : (
              <>
                <path d={`M1760 ${-40 - ease(cutT, [10, 40], [0, 500], EASE.in)} C 1760 150, 1752 ${280 - cutT * 2}, ${1750 + Math.sin(cutT * 0.4) * 10 * Math.exp(-cutT / 20)} ${350 - Math.min(cutT * 3, 60)}`} stroke="url(#cable)" strokeWidth={16} fill="none" strokeLinecap="round" />
                <path d={`M${1744 - Math.min(cutT, 30) * 1.2} ${378 + Math.min(cutT * cutT * 0.35, 560)} C 1725 700, 1700 800, 1700 1012`} stroke="url(#cable)" strokeWidth={16} fill="none" strokeLinecap="round" opacity={1 - ease(cutT, [30, 50], [0, 1])} />
                {cutT < 16 && Array.from({length: 10}, (_, i) => {
                  const a = (i / 10) * Math.PI * 2;
                  const d = cutT * (6 + (i % 3) * 3);
                  return <circle key={i} cx={1748 + Math.cos(a) * d} cy={364 + Math.sin(a) * d} r={4 - cutT * 0.2} fill="#FFC53D" />;
                })}
              </>
            )}
            {/* signal pulses travelling down the cable before the cut */}
            {!cut && cableIn >= 1 && [0, 1, 2].map((k) => {
              const t = ((f - 2130 + k * 12) % 36) / 36;
              const y = t * 1000;
              return <circle key={k} cx={1760 - 60 * Math.sin(t * Math.PI) * 0.6} cy={y} r={7} fill={C.teal} opacity={0.8} />;
            })}
          </svg>
        )}
        {f >= snip && f < snip + 16 && (
          <div style={{position: 'absolute', left: 1790, top: 230, fontFamily: FONT.display, fontWeight: 800, fontSize: 64, color: '#fff', transform: `rotate(-8deg) scale(${sp(f, snip, {damping: 9, stiffness: 300})})`, textShadow: '0 4px 20px rgba(0,0,0,0.5)', opacity: 1 - clamp((f - snip - 10) / 6)}}>SNIP</div>
        )}
        {wVis && (
          <div style={{position: 'absolute', left: wX, top: wY}}>
            <Wheelie r={92} spin={wSpin} squash={wSq} prop={f < 2200 ? 'scissors' : 'none'} armR={f >= 2150 && f < 2172 ? [70, -150] : [118, 40]} mood={f < 2170 ? 'determined' : 'happy'} blink={f > 2190 ? blinkAt(f, 40) : 0} shadow={wY > 880} lookX={-0.6} />
          </div>
        )}
        <Taskbar f={f} icons={WHEELIE_ONLY} ram={ram} wifiOff={wifiOff} />
        {/* offline toast */}
        {f >= snip + 10 && (
          <div style={{position: 'absolute', right: 24 - (1 - sp(f, snip + 10, {damping: 16})) * 420, bottom: 84, width: 360, padding: '16px 20px', borderRadius: 14, background: 'rgba(250,251,253,0.98)', boxShadow: '0 18px 50px rgba(0,0,0,0.38)', fontFamily: FONT.ui, display: 'flex', gap: 14, alignItems: 'center', opacity: 1 - clamp((f - 2250) / 12)}}>
            <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#1B2230" strokeWidth={2} strokeLinecap="round"><path d="M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0" opacity={0.35} /><path d="M4 3l17 18" stroke="#E5402A" strokeWidth={2.6} /></svg>
            <div><div style={{fontSize: 17, fontWeight: 700, color: C.text}}>No internet</div><div style={{fontSize: 15, color: C.textMuted}}>Wheelie keeps working.</div></div>
          </div>
        )}
        {curShow && (
          <>
            <ClickRipple f={f} at={1888} x={wx + 10} y={wy - R * 0.72} color={C.teal} />
            <Cursor x={curX} y={curY} press={(f >= 1886 && f < 1894) || (f >= 1936 && f < 1944) || (f >= 2016 && f < 2024) ? 1 : 0} />
          </>
        )}
      </Cam>
      <Vignette amt={0.35} />
      <Flash amt={ease(f, [2272, 2284], [0, 1], EASE.in)} color="#0B0F17" />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 2280–2520: for the nerds                                            */
/* ------------------------------------------------------------------ */
export const Nerds: React.FC<{f: number}> = ({f}) => {
  const t0 = A.nerdsStart;
  const inT = sp(f, t0 + 2, {damping: 18, stiffness: 140});
  const draw = ease(f, [t0 + 14, t0 + 120], [0, 1], EASE.inOut);
  const cliff = 0.56;
  const GX = 120, GY = 150, GW = 1160, GH = 430;
  const maxMB = 2600;
  const yOf = (mb: number) => GY + GH - (mb / maxMB) * GH;
  // build line points
  const pts: [number, number][] = [];
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    if (u > draw) break;
    let mb: number;
    if (u < cliff) mb = 1900 + 380 * (0.5 + 0.5 * Math.sin(u * 40) * Math.sin(u * 13 + 1)) + u * 300;
    else if (u < cliff + 0.015) mb = lerp(2350, WHEELIE_RAM_MB, (u - cliff) / 0.015);
    else mb = WHEELIE_RAM_MB + Math.sin(u * 30) * 4;
    pts.push([GX + u * GW, yOf(mb)]);
  }
  const before = pts.filter((p) => p[0] <= GX + (cliff + 0.015) * GW);
  const after = pts.filter((p) => p[0] >= GX + (cliff + 0.015) * GW - 1);
  const toPath = (ps: [number, number][]) => ps.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const countT = ease(f, [t0 + 82, t0 + 140], [0, 1], EASE.out);
  const mbNow = lerp(2400, WHEELIE_RAM_MB, countT);
  const counter = mbNow >= 1000 ? `${(mbNow / 1000).toFixed(1)} GB` : `${Math.round(mbNow)} MB`;
  const peek = sp(f, t0 + 150, {damping: 13, stiffness: 120});
  const glint = f >= t0 + 178 ? Math.max(0, 1 - Math.abs(f - (t0 + 186)) / 8) : 0;
  const glasses = ease(f, [t0 + 160, t0 + 176], [0, 1], EASE.out);
  const sticky = sp(f, t0 + 20, {damping: 11, stiffness: 180});
  const s = kf(f, [[t0, 1.12], [t0 + 30, 1.0], [t0 + 220, 1.04]], EASE.out);
  const out = ease(f, [2506, 2522], [0, 1], EASE.in);
  return (
    <AbsoluteFill style={{background: '#0B0F17', overflow: 'hidden'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 30% 20%, rgba(25,195,166,0.16), transparent 60%), radial-gradient(ellipse at 90% 90%, rgba(111,92,255,0.18), transparent 55%)'}} />
      <Cam s={s * (1 + out * 0.3)}>
        <div style={{position: 'absolute', left: 230, top: 150, width: 1460, height: 760, borderRadius: 24, background: 'rgba(20,27,40,0.96)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 100px rgba(0,0,0,0.6)', fontFamily: FONT.ui, opacity: clamp(inT * 1.5), transform: `scale(${0.92 + 0.08 * inT})`}}>
          <div style={{height: 70, display: 'flex', alignItems: 'center', gap: 14, padding: '0 28px', borderBottom: '1px solid rgba(255,255,255,0.07)'}}>
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth={1.8}><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" strokeLinecap="round" /></svg>
            <div style={{fontSize: 22, fontWeight: 600, color: C.glassText}}>Memory</div>
            <div style={{fontSize: 16, color: '#8C98AA', marginLeft: 12}}>Last 60 seconds</div>
          </div>
          <svg width={1460} height={690} style={{position: 'absolute', top: 70, left: 0}}>
            {[0, 500, 1000, 1500, 2000, 2500].map((mb) => (
              <g key={mb}>
                <line x1={GX} x2={GX + GW} y1={yOf(mb)} y2={yOf(mb)} stroke="rgba(255,255,255,0.06)" />
                <text x={GX - 16} y={yOf(mb) + 5} fill="#6B7686" fontSize={15} textAnchor="end" fontFamily={FONT.mono}>{mb >= 1000 ? `${mb / 1000} GB` : `${mb} MB`}</text>
              </g>
            ))}
            <defs>
              <linearGradient id="redfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF5A36" stopOpacity="0.35" /><stop offset="1" stopColor="#FF5A36" stopOpacity="0" /></linearGradient>
            </defs>
            {before.length > 1 && <path d={`${toPath(before)} L${before[before.length - 1][0]} ${GY + GH} L${GX} ${GY + GH} Z`} fill="url(#redfill)" />}
            {before.length > 1 && <path d={toPath(before)} stroke="#FF5A36" strokeWidth={4} fill="none" strokeLinejoin="round" />}
            {after.length > 1 && <path d={toPath(after)} stroke={C.teal} strokeWidth={5} fill="none" strokeLinejoin="round" style={{filter: 'drop-shadow(0 0 8px rgba(25,195,166,0.8))'}} />}
            {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={8} fill={after.length > 1 ? C.teal : '#FF5A36'} />}
            <text x={GX + 20} y={yOf(2350) - 22} fill="#FF8A6B" fontSize={18} fontWeight={600} fontFamily={FONT.ui} opacity={ease(f, [t0 + 30, t0 + 45], [0, 1])}>15 separate apps</text>
            <text x={GX + cliff * GW + 40} y={yOf(WHEELIE_RAM_MB) - 22} fill={C.teal} fontSize={18} fontWeight={600} fontFamily={FONT.ui} opacity={ease(f, [t0 + 90, t0 + 105], [0, 1])}>Wheelie, all 8 tools</text>
          </svg>
          {/* counter */}
          <div style={{position: 'absolute', right: 40, top: 150, width: 300, textAlign: 'right'}}>
            <div style={{fontSize: 18, color: '#8C98AA', fontWeight: 500}}>In use</div>
            <div style={{fontFamily: FONT.mono, fontWeight: 600, fontSize: 30, color: '#FF8A6B', textDecoration: countT > 0.05 ? 'line-through' : undefined, opacity: countT > 0 ? 0.7 : 1}}>2.4 GB</div>
            <div style={{fontFamily: FONT.mono, fontWeight: 700, fontSize: 84, color: countT > 0 ? C.teal : '#FF8A6B', letterSpacing: -2, marginTop: 6, opacity: ease(f, [t0 + 70, t0 + 84], [0, 1])}}>{counter}</div>
          </div>
        </div>
        {/* sticky label */}
        <div style={{position: 'absolute', left: 170, top: 92, padding: '14px 26px', background: '#FFD45C', color: '#3A2A00', fontFamily: FONT.display, fontWeight: 800, fontSize: 38, borderRadius: 6, transform: `rotate(-5deg) scale(${sticky})`, boxShadow: '0 12px 30px rgba(0,0,0,0.4)'}}>For the nerds</div>
        {/* Wheelie peeking */}
        <div style={{position: 'absolute', left: 1640, top: 1180 - peek * 330}}>
          <Wheelie r={120} glasses={glasses} glint={glint} mood={f >= t0 + 176 ? 'proud' : 'happy'} armL={[-110, -70]} armR={null} lookX={-0.8} lookY={-0.3} blink={blinkAt(f, 90)} />
        </div>
      </Cam>
      <Flash amt={1 - ease(f, [t0, t0 + 10], [0, 1])} color="#0B0F17" />
      <Flash amt={out} color="#0B0F17" />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 2520–2700: launch anything                                          */
/* ------------------------------------------------------------------ */
const LAUNCH: {app: AppId; x: number; y: number; w: number; h: number}[] = [
  {app: 'browser', x: 980, y: 70, w: 880, h: 400},
  {app: 'code', x: 980, y: 490, w: 430, h: 470},
  {app: 'music', x: 1430, y: 490, w: 430, h: 470},
];

const LaunchBody: React.FC<{app: AppId; f: number}> = ({app, f}) => {
  if (app === 'browser')
    return (
      <div style={{position: 'absolute', inset: 0, background: '#fff', fontFamily: FONT.ui}}>
        <div style={{margin: 14, height: 36, borderRadius: 18, background: '#EEF2F6', display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 15, color: '#56657A'}}>docs.example.com/getting-started</div>
        <div style={{display: 'flex', gap: 20, padding: '10px 24px'}}>
          <div style={{flex: 2}}>
            <div style={{height: 26, width: '60%', borderRadius: 6, background: '#1B2230'}} />
            {[90, 80, 95, 60, 85].map((w, i) => <div key={i} style={{height: 12, width: `${w}%`, borderRadius: 6, background: '#E3E8EF', marginTop: 16}} />)}
          </div>
          <div style={{flex: 1, height: 200, borderRadius: 14, background: 'linear-gradient(135deg,#60A5FA,#6F5CFF)'}} />
        </div>
      </div>
    );
  if (app === 'code') {
    const lines = [['#C792EA', 'export'], ['#82AAFF', 'function'], ['#FFCB6B', 'launch()'], ['#89DDFF', '{'], ['#C3E88D', "  open('music')"], ['#C3E88D', "  open('browser')"], ['#89DDFF', '}']];
    return (
      <div style={{position: 'absolute', inset: 0, background: '#1A1F2E', padding: 18, fontFamily: FONT.mono, fontSize: 17, lineHeight: 1.9}}>
        {lines.map(([c, t], i) => <div key={i} style={{color: c as string}}><span style={{color: '#4B5568', marginRight: 16}}>{i + 1}</span>{t}</div>)}
      </div>
    );
  }
  return (
    <div style={{position: 'absolute', inset: 0, background: '#151B27', padding: 24, fontFamily: FONT.ui, color: '#E8EEF6', display: 'flex', flexDirection: 'column', gap: 16}}>
      <div style={{height: 220, borderRadius: 16, background: 'conic-gradient(from 200deg, #F87171, #6F5CFF, #19C3A6, #F87171)'}} />
      <div style={{fontSize: 22, fontWeight: 700}}>Deep Focus</div>
      <div style={{fontSize: 16, color: '#8C98AA'}}>Lo-fi for working</div>
      <div style={{height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.12)'}}><div style={{height: 6, width: `${30 + (f % 600) / 20}%`, borderRadius: 3, background: '#F87171'}} /></div>
    </div>
  );
};

export const Launch: React.FC<{f: number}> = ({f}) => {
  const t0 = A.launchStart;
  const inT = ease(f, [t0, t0 + 16], [0, 1], EASE.out);
  const wx = 470, wy = 500, R = 250;
  const fan = sp(f, t0 + 20, {damping: 14, stiffness: 160});
  const bubbles = LAUNCH.map((l, i) => {
    const ang = (-34 + i * 34) * (Math.PI / 180);
    return {x: wx + Math.cos(ang) * (R + 110) * (0.6 + 0.4 * fan), y: wy + Math.sin(ang) * (R + 110) * (0.6 + 0.4 * fan)};
  });
  const icons: TaskIcon[] = [{app: 'wheelie', at: -10}, ...LAUNCH.map((l, i) => ({app: l.app, at: A.launches[i] + 14}))];
  const curT = A.launches;
  const curX = kf(f, [[t0 + 10, 700], [curT[0] - 4, bubbles[0].x], [curT[1] - 4, bubbles[1].x], [curT[2] - 4, bubbles[2].x], [t0 + 175, bubbles[2].x + 40]], EASE.inOut);
  const curY = kf(f, [[t0 + 10, 900], [curT[0] - 4, bubbles[0].y], [curT[1] - 4, bubbles[1].y], [curT[2] - 4, bubbles[2].y], [t0 + 175, bubbles[2].y + 60]], EASE.inOut);
  const out = ease(f, [2688, 2706], [0, 1], EASE.in);
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000', opacity: inT}}>
      <Cam s={kf(f, [[t0, 1.06], [t0 + 30, 1.0]], EASE.out)}>
        <Wallpaper f={f} />
        <div style={{position: 'absolute', left: wx, top: wy}}>
          <WheelUI R={R} reveal={1} hubBlink={blinkAt(f, 30)} />
        </div>
        {/* arc + launch bubbles */}
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          <path d={`M${wx + Math.cos(-0.75) * (R + 110)} ${wy + Math.sin(-0.75) * (R + 110)} A${R + 110} ${R + 110} 0 0 1 ${wx + Math.cos(0.75) * (R + 110)} ${wy + Math.sin(0.75) * (R + 110)}`} stroke="rgba(25,195,166,0.35)" strokeWidth={2} strokeDasharray="6 8" fill="none" opacity={fan} />
        </svg>
        {LAUNCH.map((l, i) => {
          const b = bubbles[i];
          const press = f >= curT[i] && f < curT[i] + 8 ? 1 : 0;
          return (
            <div key={l.app} style={{position: 'absolute', left: b.x - 46, top: b.y - 46, width: 92, height: 92, borderRadius: 26, background: 'rgba(17,23,35,0.92)', border: `2px solid ${f >= curT[i] ? C.teal : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${fan * (1 - press * 0.1)})`, boxShadow: f >= curT[i] ? '0 0 30px rgba(25,195,166,0.5)' : '0 10px 30px rgba(0,0,0,0.4)'}}>
              <AppIcon app={l.app} size={58} />
            </div>
          );
        })}
        {/* windows */}
        {LAUNCH.map((l, i) => {
          const s = sp(f, curT[i] + 2, {damping: 16, stiffness: 150});
          if (f < curT[i] + 2) return null;
          const b = bubbles[i];
          const x = lerp(b.x - l.w / 2, l.x, s);
          const y = lerp(b.y - l.h / 2, l.y, s);
          return (
            <div key={l.app} style={{position: 'absolute', left: x, top: y, transform: `scale(${0.15 + 0.85 * s})`, opacity: clamp(s * 2)}}>
              <AppWindow app={l.app} w={l.w} h={l.h}>
                <LaunchBody app={l.app} f={f} />
              </AppWindow>
            </div>
          );
        })}
        <Taskbar f={f} icons={icons} ram={14} />
        {curT.map((t, i) => <ClickRipple key={i} f={f} at={t} x={bubbles[i].x} y={bubbles[i].y} color={C.teal} />)}
        <Cursor x={curX} y={curY} press={curT.some((t) => f >= t - 2 && f < t + 6) ? 1 : 0} />
      </Cam>
      <Vignette amt={0.3} />
      <Flash amt={out} color="#0B0F17" />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/* 2700–3000: make it yours                                            */
/* ------------------------------------------------------------------ */
const JSON_SRC = `{
  "name": "Pomodoro",
  "icon": "tomato.svg",
  "hotkey": "P",
  "run": "./pomodoro.js"
}`;

export const Custom: React.FC<{f: number}> = ({f}) => {
  const t0 = A.customStart;
  const inT = 1 - ease(f, [t0 + 2, t0 + 16], [1, 0]);
  const wx = 600, wy = 500, R = 290;
  const ghostW = ease(f, [t0 + 20, t0 + 60], [0, 1], EASE.inOut);
  const snapped = f >= A.snap;
  const slots: Slot[] = [...DEFAULT_SLOTS, snapped ? {app: 'pomodoro', label: 'Pomodoro', weight: 1} : {app: 'pomodoro', label: '', weight: ghostW, ghost: true}];
  const ninthAngle = (() => {
    // center angle of the 9th slot (last) — mirrors WheelUI math
    const total = 8 + (snapped ? 1 : ghostW);
    const first = 1 / total;
    const start = -Math.PI / 2 - first * Math.PI;
    const span9 = ((snapped ? 1 : ghostW) / total) * Math.PI * 2;
    return start + (8 / total) * Math.PI * 2 + span9 / 2;
  })();
  const slotPos = {x: wx + Math.cos(ninthAngle) * R * 0.71, y: wy + Math.sin(ninthAngle) * R * 0.71};
  const typed = JSON_SRC.slice(0, Math.max(0, Math.floor((f - (t0 + 40)) * 1.15)));
  const edIn = sp(f, t0 + 24, {damping: 16, stiffness: 150});
  // Wheelie with wrench
  const wIn = ease(f, [t0 + 80, t0 + 112], [0, 1], EASE.out);
  const wX = lerp(2100, 1240, wIn);
  const hammer = (f >= t0 + 120 && f < t0 + 128) || (f >= t0 + 140 && f < t0 + 148) || (f >= t0 + 160 && f < t0 + 168);
  // icon build
  const build = ease(f, [t0 + 118, t0 + 172], [0, 1], EASE.out);
  const fly = ease(f, [t0 + 178, A.snap], [0, 1], EASE.inOut);
  const iconStart = {x: 1240, y: 640};
  const ix = lerp(iconStart.x, slotPos.x, fly);
  const iy = lerp(iconStart.y, slotPos.y, fly) - Math.sin(fly * Math.PI) * 180;
  const snapRing = f >= A.snap ? (f - A.snap) / 24 : -1;
  const burst = sp(f, A.snap + 22, {damping: 12, stiffness: 140});
  const s = kf(f, [[t0, 1.0], [t0 + 170, 1.02], [A.snap - 10, 1.08], [A.snap + 6, 1.1], [2995, 1.04]], EASE.inOut);
  const cx = kf(f, [[t0, 960], [A.snap - 10, 860], [2995, 900]], EASE.inOut);
  const out = ease(f, [2984, 3000], [0, 1], EASE.in);
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#0B0F17', opacity: inT}}>
      <Cam s={s} cx={cx}>
        <Wallpaper f={f} />
        <div style={{position: 'absolute', left: wx, top: wy}}>
          <WheelUI R={R} slots={slots} reveal={1} hubBlink={blinkAt(f, 60)} selected={snapped && f < A.snap + 40 ? 8 : -1} hubMood={snapped ? 'proud' : 'happy'} pulse={8} pulseAmt={snapped ? Math.max(0, 1 - (f - A.snap) / 20) * 2 : 0} />
        </div>
        {/* code editor */}
        <div style={{position: 'absolute', left: 1060, top: 140, transform: `translateY(${(1 - edIn) * 60}px)`, opacity: clamp(edIn * 1.5)}}>
          <AppWindow app="code" w={760} h={420} title="tools / pomodoro.json">
            <div style={{position: 'absolute', inset: 0, background: '#1A1F2E', padding: '22px 26px', fontFamily: FONT.mono, fontSize: 24, lineHeight: 1.65, color: '#C3E88D', whiteSpace: 'pre'}}>
              {typed.split('\n').map((ln, i) => (
                <div key={i}><span style={{color: '#4B5568', marginRight: 22}}>{i + 1}</span>{ln.split(/("[^"]*")/).map((tok, k) => <span key={k} style={{color: tok.startsWith('"') ? (k % 4 === 1 ? '#82AAFF' : '#C3E88D') : '#89DDFF'}}>{tok}</span>)}</div>
              ))}
              <span style={{display: 'inline-block', width: 12, height: 28, background: C.teal, opacity: Math.floor(f / 15) % 2 ? 0 : 1, verticalAlign: -5}} />
            </div>
          </AppWindow>
        </div>
        {/* building icon */}
        {f >= t0 + 112 && fly < 1 && (
          <div style={{position: 'absolute', left: ix - 48, top: iy - 48, width: 96, height: 96}}>
            {build < 1 ? (
              <>
                {[0, 1, 2, 3].map((k) => {
                  const a = (k / 4) * Math.PI * 2 + 0.6;
                  const d = (1 - build) * 120;
                  return (
                    <div key={k} style={{position: 'absolute', left: Math.cos(a) * d, top: Math.sin(a) * d, width: 96, height: 96, clipPath: `inset(${k < 2 ? 0 : 50}% ${k % 2 ? 0 : 50}% ${k < 2 ? 50 : 0}% ${k % 2 ? 50 : 0}%)`, transform: `rotate(${(1 - build) * (k % 2 ? 90 : -90)}deg)`, opacity: clamp(build * 3)}}>
                      <AppIcon app="pomodoro" size={96} />
                    </div>
                  );
                })}
              </>
            ) : (
              <AppIcon app="pomodoro" size={96} style={{filter: 'drop-shadow(0 10px 24px rgba(255,90,54,0.5))'}} />
            )}
          </div>
        )}
        {hammer && <div style={{position: 'absolute', left: 1215, top: 600, width: 50, height: 50}}>{[0, 1, 2, 3, 4, 5].map((k) => <div key={k} style={{position: 'absolute', left: 25 + Math.cos(k) * 40, top: 25 + Math.sin(k) * 40, width: 8, height: 8, borderRadius: 4, background: '#FFC53D'}} />)}</div>}
        {/* Wheelie */}
        <div style={{position: 'absolute', left: wX, top: 800}}>
          <Wheelie r={95} spin={-wIn * 300} prop="wrench" armR={hammer ? [70, -60] : [110, 0]} mood={f < A.snap ? 'determined' : 'proud'} shadow lookX={-0.4} lookY={-0.6} blink={blinkAt(f, 10)} />
        </div>
        {/* snap ring */}
        {snapRing >= 0 && snapRing <= 1 && (
          <div style={{position: 'absolute', left: slotPos.x - 60 - snapRing * 120, top: slotPos.y - 60 - snapRing * 120, width: 120 + snapRing * 240, height: 120 + snapRing * 240, borderRadius: '50%', border: `${6 * (1 - snapRing)}px solid ${C.teal}`, opacity: 1 - snapRing}} />
        )}
        {/* open-source burst */}
        {f >= A.snap + 22 && (
          <div style={{position: 'absolute', left: 1060, top: 600, display: 'flex', alignItems: 'center', gap: 18, padding: '18px 28px', borderRadius: 40, background: 'rgba(17,23,35,0.94)', border: '1px solid rgba(25,195,166,0.5)', boxShadow: '0 20px 50px rgba(0,0,0,0.45)', transform: `scale(${burst})`, transformOrigin: '0 50%', fontFamily: FONT.ui}}>
            <svg width={34} height={34} viewBox="0 0 24 24"><path d="M12 2l3 6.6 7 .7-5.3 4.8 1.6 7L12 17.4 5.7 21l1.6-7L2 9.3l7-.7z" fill="#FFD45C" /></svg>
            <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth={2.2} strokeLinecap="round"><circle cx="6" cy="5" r="2.5" /><circle cx="18" cy="5" r="2.5" /><circle cx="12" cy="19" r="2.5" /><path d="M6 7.5v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-2M12 12.5v4" /></svg>
            <div style={{color: '#fff', fontSize: 30, fontWeight: 700}}>Open source</div>
            <div style={{color: '#8C98AA', fontSize: 24}}>· build your own tools</div>
          </div>
        )}
        <Taskbar f={f} icons={WHEELIE_ONLY} ram={12} />
      </Cam>
      <Vignette amt={0.32} />
      <Flash amt={out} color="#05070B" />
    </AbsoluteFill>
  );
};

export {noise};
