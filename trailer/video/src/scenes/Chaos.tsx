import React from 'react';
import {AbsoluteFill} from 'remotion';
import {AppIcon, AppId, APPS} from '../components/AppIcon';
import {AppWindow} from '../components/AppWindow';
import {AppBody} from '../components/AppBody';
import {ClickRipple, Cursor, Taskbar, TaskIcon, Toast, Wallpaper} from '../components/Desktop';
import {Flames, Flash, Foam, HazeDefs, Smoke, Vignette} from '../components/Effects';
import {Wheelie} from '../components/Wheelie';
import {WheelUI} from '../components/WheelUI';
import {C, EASE, FONT, H, TL, W, clamp, ease, kf, lerp, noise, sp, taskbarSlots, wheelTilt} from '../lib';

const A1 = TL.act1;
const A2 = TL.act2;
const WINS = A1.windows as {app: AppId; x: number; y: number; w: number; h: number; open: number}[];

const PINNED: TaskIcon[] = [
  {app: 'wheelie', at: -10},
  {app: 'folder', at: -10},
  {app: 'browser', at: -10},
  {app: 'calc', at: -10},
  {app: 'alarm', at: -10},
];
const ICONS: TaskIcon[] = [
  ...PINNED,
  {app: 'chat', at: A1.chatToast},
  ...WINS.filter((w) => w.app !== 'calc' && w.app !== 'alarm').map((w) => ({app: w.app, at: w.open})),
];

const iconPos = (f: number, idx: number) => {
  const n = ICONS.filter((i) => f >= i.at).length;
  return {x: taskbarSlots(n).xs[idx], y: H - 32 - 3};
};

const CALC_SEQ = ['1', '2', '8', '4', '.', '5', '0', '+'];
const CALC_DISP = ['1', '12', '128', '1,284', '1,284.', '1,284.5', '1,284.50', '1,284.50'];
const NOTES = 'Meeting with Sam at 10:30\nAsk about the Q3 numbers\nBring the invoice totals';

export const Chaos: React.FC<{f: number}> = ({f}) => {
  // ---------- global state ----------
  const heat = f < A1.meltdownStart ? 0 : f < A2.foamStart ? ease(f, [A1.meltdownStart, 780], [0, 1], EASE.in) : ease(f, [1115, 1190], [1, 0]);
  const afterFlash = f >= A2.flash;
  const frozen = f >= A2.whiteout ? 1 : 0;
  const openCount = WINS.filter((w) => f >= w.open).length;
  let ram = 22 + openCount * 4.3;
  if (f >= A1.meltdownStart) ram = lerp(ram, 97, ease(f, [A1.meltdownStart, 760], [0, 1]));
  if (f >= 1570) ram = ease(f, [1580, 1615], [97, 12]);

  // ---------- camera ----------
  const kicks = WINS.reduce((s, w) => s + (f >= w.open && f < w.open + 30 ? Math.exp(-(f - w.open) / 5) : 0), 0);
  let cx = 960, cy = 540, cs = 1, rot = 0;
  if (f < 180) {
    cx = kf(f, [[0, 960], [170, 900]]); cy = kf(f, [[0, 540], [170, 520]]); cs = kf(f, [[0, 1.0], [170, 1.12]]);
  } else if (f < 240) {
    cx = kf(f, [[180, 900], [194, 1640], [214, 1640], [238, 1000]], EASE.out);
    cy = kf(f, [[180, 520], [194, 900], [214, 900], [238, 560]], EASE.out);
    cs = kf(f, [[180, 1.12], [194, 1.7], [214, 1.72], [238, 1.06]], EASE.out);
  } else if (f < 470) {
    cx = kf(f, [[240, 1000], [470, 960]]); cy = kf(f, [[240, 560], [470, 540]]); cs = kf(f, [[240, 1.06], [470, 1.0]]);
  } else if (f < A1.meltdownStart) {
    cx = kf(f, [[470, 960], [476, 880], [660, 960]], EASE.out); cy = kf(f, [[470, 540], [476, 430], [660, 540]], EASE.out); cs = kf(f, [[470, 1], [476, 1.38], [660, 1.0]], EASE.inOut);
  } else if (f < A2.crashZoom) {
    cs = kf(f, [[660, 1.0], [900, 1.06]]); rot = kf(f, [[660, 0], [900, -2.4]]);
  } else if (f < 1060) {
    const ip = iconPos(f, 0);
    cx = kf(f, [[900, 960], [926, ip.x], [1000, ip.x + 6], [1050, 760]], EASE.out);
    cy = kf(f, [[900, 540], [926, ip.y - 40], [1000, ip.y - 44], [1050, 620]], EASE.out);
    cs = kf(f, [[900, 1.06], [926, 3.6], [1000, 3.75], [1050, 1.08]], EASE.out);
    rot = kf(f, [[900, -2.4], [926, 0]], EASE.out);
  } else if (f < 1240) {
    cx = kf(f, [[1060, 760], [1100, 900], [1240, 960]]); cy = kf(f, [[1060, 620], [1100, 560], [1240, 540]]); cs = kf(f, [[1060, 1.08], [1100, 1.04], [1240, 1.04]]);
  } else if (f < 1380) {
    cx = kf(f, [[1240, 900], [1380, 1010]], EASE.linear); cs = 1.04;
  } else {
    cx = kf(f, [[1380, 1010], [1430, 960]]); cy = kf(f, [[1380, 540], [1430, 520], [1560, 520], [1600, 540]]);
    cs = kf(f, [[1380, 1.04], [1560, 1.16], [1576, 1.0], [1620, 1.0]], EASE.inOut);
  }
  if (cs >= 1) {
    cx = Math.min(Math.max(cx, W / 2 / cs), W - W / 2 / cs);
    cy = Math.min(Math.max(cy, H / 2 / cs), H - H / 2 / cs);
  }
  const shake = heat * 7 + (f >= A2.foamStart && f < 1190 ? 4 : 0) + kicks * 5 + (f >= 1576 && f < 1600 ? (1600 - f) * 0.8 : 0);
  const sx = noise(f * 0.9, 1) * shake;
  const sy = noise(f * 1.1, 2) * shake;
  cs *= 1 + kicks * 0.012;
  const camT = `translate(${W / 2 + sx}px, ${H / 2 + sy}px) rotate(${rot}deg) scale(${cs}) translate(${-cx}px, ${-cy}px)`;

  // ---------- Wheelie ----------
  const ip0 = iconPos(Math.min(f, 899), 0);
  let wx = 0, wy = 0, wr = 0, wSpin = 0, wSquash = 1, wLean = 0, wMood: 'happy' | 'determined' | 'wide' = 'happy';
  let wArmR: [number, number] | null = [122, 52];
  let wArmL: [number, number] | null = [-122, 52];
  let wProp: 'none' | 'extinguisher' = 'none';
  const wVisible = f >= A2.emerge && f < 1565;
  if (f >= A2.emerge) {
    const t = ease(f, [A2.emerge, 1036], [0, 1], EASE.out);
    wx = lerp(ip0.x, 600, t);
    wy = lerp(ip0.y, 690, t) - Math.sin(t * Math.PI) * 240;
    wr = lerp(18, 115, ease(f, [A2.emerge, 1030], [0, 1], EASE.out));
    wSpin = (f - A2.emerge) * 14;
    if (f >= 1036) {
      const s = f - 1036;
      wSquash = 1 - 0.22 * Math.exp(-s / 6) * Math.cos(s / 3);
      wx = 600 + ease(f, [1036, 1072], [0, 70], EASE.out);
      wLean = -10 * Math.exp(-s / 12) * Math.cos(s / 6);
      wSpin = (1036 - A2.emerge) * 14 + ease(f, [1036, 1072], [0, 140], EASE.out);
    }
    if (f >= 1072) wMood = 'determined';
    if (f >= A2.extinguisher) {
      wProp = 'extinguisher';
      wArmR = [lerp(122, 112, ease(f, [1080, 1095], [0, 1])), lerp(52, 14, ease(f, [1080, 1095], [0, 1]))];
    }
    if (f >= 1240) {
      // scan pose
      wProp = 'none';
      wMood = 'happy';
      wx = 330; wy = 640; wr = 110; wSquash = 1; wLean = 0;
      wArmR = [128, -40];
      wSpin = 0;
    }
    if (f >= A2.fusionStart) {
      const t2 = ease(f, [A2.fusionStart, 1425], [0, 1]);
      wx = lerp(330, 960, t2); wy = lerp(640, 520, t2) - Math.sin(t2 * Math.PI) * 80;
      wArmR = null; wArmL = null;
      const spinT = Math.max(0, f - 1400);
      wSpin = spinT * spinT * 0.35;
      wr = lerp(110, 120, t2) * (1 - ease(f, [1535, 1562], [0, 1], EASE.in));
      wMood = 'determined';
    }
  }
  const blink = (() => { const p = (f + 20) % 150; return p < 8 ? Math.sin((p / 8) * Math.PI) : 0; })();

  // ---------- fusion orbit ----------
  const orbitR = 400 * (1 - ease(f, [1470, 1556], [0, 1], EASE.in));
  const orbit = (i: number) => {
    const ang = (i / WINS.length) * Math.PI * 2 + Math.pow(Math.max(0, f - 1415), 1.25) * 0.035;
    const k = orbitR / 400;
    const x = 960 + Math.cos(ang) * orbitR;
    const y = 520 + Math.sin(ang) * orbitR * 0.34 + (i / (WINS.length - 1) - 0.5) * 300 * k;
    const z = Math.sin(ang);
    return {x, y, z, sc: 0.72 + 0.32 * (z + 1) / 2};
  };

  // ---------- scan ----------
  const beamA = kf(f, [[1250, -0.75], [1370, 0.38]], EASE.inOut);
  const O = {x: 352, y: 618};
  const tagAt = (w: (typeof WINS)[number]) => {
    const a = Math.atan2(w.y + w.h / 2 - O.y, w.x + w.w / 2 - O.x);
    return a < beamA ? 1 : 0;
  };

  const winEls = WINS.map((w, i) => {
    if (f < w.open || afterFlash) return null;
    const s = sp(f, w.open, {damping: 15, stiffness: 220});
    let x = w.x, y = w.y, scale = 0.86 + 0.14 * s, op = clamp(s * 2.2), r = 0;
    const flight = ease(f, [1420 + i * 4, 1466 + i * 4], [0, 1], EASE.inOut);
    const o = orbit(i);
    // wobble in heat
    r = heat * noise(f * 0.06, i) * 3;
    x += heat * noise(f * 0.5, i + 20) * 5;
    y += heat * noise(f * 0.5, i + 40) * 5 - (1 - s) * 26;
    let cxw = x + w.w / 2, cyw = y + w.h / 2;
    if (flight > 0) {
      cxw = lerp(cxw, o.x, flight);
      cyw = lerp(cyw, o.y, flight);
      scale = lerp(1, (72 / w.w) * o.sc, flight);
      r = lerp(r, 360 * flight * (i % 2 ? 1 : -1) * 0.2, flight);
    }
    const winOp = op * (1 - clamp(flight * 1.4));
    const iconOp = clamp(flight * 1.6 - 0.3);
    const behind = flight > 0.5 && o.z < 0;
    const z = flight > 0.5 ? (o.z < 0 ? 5 : 40) + o.z * 5 : 10 + i;
    const keyIdx = A1.keystrokes.filter((k) => f >= k).length - 1;
    const pressed = w.app === 'calc' && keyIdx >= 0 && f - A1.keystrokes[keyIdx] < 6 ? CALC_SEQ[keyIdx] : undefined;
    const typed = w.app === 'notes' ? NOTES.slice(0, Math.max(0, Math.floor((f - 312) * 1.15))) : undefined;
    const tagged = f >= 1250 && f < 1440 ? tagAt(w) : 0;
    const tagS = tagged ? sp(f, 1250 + Math.round(((Math.atan2(w.y + w.h / 2 - O.y, w.x + w.w / 2 - O.x) + 0.75) / 1.13) * 120), {damping: 11, stiffness: 260}) : 0;
    return {
      z,
      behind,
      el: (
        <div key={w.app} style={{position: 'absolute', left: cxw, top: cyw, zIndex: Math.round(z * 10)}}>
          <div style={{position: 'absolute', left: -w.w / 2, top: -w.h / 2, width: w.w, height: w.h, transform: `rotate(${r}deg) scale(${scale})`, opacity: winOp}}>
            <AppWindow app={w.app} w={w.w} h={w.h} tint={heat} frozen={frozen}>
              <AppBody app={w.app} f={Math.min(f, 1200) - w.open} w={w.w} h={w.h} calc={keyIdx >= 0 ? CALC_DISP[keyIdx] : '0'} pressed={pressed} typed={typed} />
            </AppWindow>
            {tagS > 0 && (
              <div style={{position: 'absolute', left: 18, top: 56, transform: `scale(${tagS})`, transformOrigin: '0 50%', background: C.teal, color: '#fff', fontFamily: FONT.mono, fontWeight: 700, fontSize: 18, letterSpacing: 1, padding: '8px 16px', borderRadius: 30, boxShadow: '0 6px 20px rgba(25,195,166,0.5)', whiteSpace: 'nowrap', opacity: 1 - clamp(flight * 3)}}>
                {APPS[w.app].name.toUpperCase()} ✓
              </div>
            )}
          </div>
          {iconOp > 0 && (
            <div style={{position: 'absolute', left: -36 * o.sc, top: -36 * o.sc, opacity: iconOp * (1 - ease(f, [1548, 1560], [0, 1]))}}>
              <AppIcon app={w.app} size={72 * o.sc} />
            </div>
          )}
        </div>
      ),
    };
  });

  // dialogs
  const dialogs = A1.dialogs.map((at, i) => {
    if (f < at || f >= A2.whiteout) return null;
    const s = sp(f, at, {damping: 13, stiffness: 260});
    const names = ['Calendar', 'Weather', 'Clipboard', 'Timer', 'Notes'];
    return (
      <div key={i} style={{position: 'absolute', left: 640 + i * 34, top: 330 + i * 34, width: 600, zIndex: 300 + i, transform: `scale(${0.8 + 0.2 * s}) rotate(${heat * noise(f * 0.07, i + 60) * 2}deg)`, opacity: clamp(s * 2), background: '#FBFCFD', borderRadius: 12, boxShadow: '0 30px 70px rgba(0,0,0,0.5)', fontFamily: FONT.ui, overflow: 'hidden', border: '1px solid rgba(255,90,54,0.5)'}}>
        <div style={{height: 40, background: '#F1F4F8', display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 14, fontWeight: 600, color: C.text}}>{names[i]} (Not Responding)</div>
        <div style={{padding: '18px 22px', display: 'flex', gap: 16}}>
          <svg width={40} height={40} viewBox="0 0 40 40"><path d="M20 3 L38 35 H2 Z" fill="#FFB13B" /><rect x="18" y="14" width="4" height="11" rx="2" fill="#fff" /><circle cx="20" cy="30" r="2.4" fill="#fff" /></svg>
          <div>
            <div style={{fontSize: 18, fontWeight: 700, color: C.text}}>{names[i]} is not responding</div>
            <div style={{fontSize: 15, color: C.textMuted, marginTop: 4}}>If you close it, you might lose unsaved work.</div>
            <div style={{display: 'flex', gap: 10, marginTop: 16}}>
              <div style={{padding: '9px 16px', borderRadius: 8, background: '#E9EDF2', fontSize: 14, fontWeight: 600, color: C.text}}>Close the app</div>
              <div style={{padding: '9px 16px', borderRadius: 8, background: '#E9EDF2', fontSize: 14, fontWeight: 600, color: C.text}}>Wait</div>
            </div>
          </div>
        </div>
      </div>
    );
  });

  // ---------- cursor ----------
  const calcIcon = iconPos(84, 3);
  const alarmIcon = iconPos(232, 4);
  const cur = (() => {
    if (f < 90) return {x: kf(f, [[0, 1260], [30, 1230], [84, calcIcon.x - 4]]), y: kf(f, [[0, 640], [30, 660], [84, calcIcon.y - 8]]), press: f >= 86 && f < 94 ? 1 : 0};
    if (f < 176) {
      const k = A1.keystrokes.filter((x) => f >= x).length;
      const tx = 760 + ((k * 3) % 4) * 80, ty = 560 + ((k * 7) % 4) * 60;
      const press = A1.keystrokes.some((x) => f >= x && f < x + 5) ? 1 : 0;
      if (f < 108) return {x: kf(f, [[90, calcIcon.x - 4], [108, 760]], EASE.out), y: kf(f, [[90, calcIcon.y - 8], [108, 560]], EASE.out), press};
      return {x: tx, y: ty, press};
    }
    if (f < 240) return {x: kf(f, [[176, 880], [214, 900], [232, alarmIcon.x - 4]]), y: kf(f, [[176, 680], [214, 760], [232, alarmIcon.y - 8]]), press: f >= A1.alarmClick && f < A1.alarmClick + 6 ? 1 : 0};
    if (f < A1.meltdownStart) {
      const hop = [[240, alarmIcon.x], [290, 1300], [330, 540], [380, 640], [430, 1500], [500, 1200], [560, 520], [620, 900], [660, 960]] as [number, number][];
      const hopY = [[240, alarmIcon.y], [290, 420], [330, 330], [380, 700], [430, 700], [500, 300], [560, 400], [620, 720], [660, 620]] as [number, number][];
      return {x: kf(f, hop, EASE.out), y: kf(f, hopY, EASE.out), press: 0};
    }
    if (f < A2.crashZoom) return {x: 960 + noise(f * 0.05, 3) * 30, y: 620 + noise(f * 0.05, 4) * 20, press: 0, spin: true};
    const ip = iconPos(899, 0);
    return {x: kf(f, [[900, ip.x + 150], [940, ip.x + 120], [992, ip.x - 4]], EASE.inOut), y: kf(f, [[900, ip.y - 160], [940, ip.y - 120], [992, ip.y - 6]], EASE.inOut), press: f >= A2.click - 3 && f < A2.click + 5 ? 1 : 0};
  })();
  const curOp = f < A2.click + 10 ? 1 : 1 - clamp((f - A2.click - 10) / 15);

  // ---------- render ----------
  const back = winEls.filter((x) => x && x.behind).map((x) => x!.el);
  const front = winEls.filter((x) => x && !x.behind).map((x) => x!.el);
  const flash = f >= 1565 ? Math.max(0, 1 - Math.abs(f - 1576) / 14) : 0;
  const white = f >= 1165 && f < 1250 ? (f < 1200 ? ease(f, [1165, 1198], [0, 1], EASE.in) : 1 - ease(f, [1204, 1248], [0, 1], EASE.out)) : 0;
  const ballR = f >= 1525 && f < 1590 ? ease(f, [1525, 1566], [0, 150], EASE.in) * (1 - ease(f, [1576, 1590], [0, 1])) : 0;
  const wheelReveal = ease(f, [1578, 1650], [0, 1], EASE.out);
  const zoomed = f >= A2.crashZoom && f < 1040 ? ease(f, [900, 926], [0, 1]) * (1 - ease(f, [1000, 1040], [0, 1])) : 0;
  const tbIcons = afterFlash ? [{app: 'wheelie' as const, at: -10}] : ICONS;

  return (
    <AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
      <HazeDefs f={f} amt={heat} />
      <AbsoluteFill style={{transform: camT, transformOrigin: '0 0', filter: heat > 0.05 ? 'url(#haze)' : undefined}}>
        <Wallpaper f={f} heat={heat} />
        {/* beam */}
        {f >= 1245 && f < 1385 && (
          <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, zIndex: 520, mixBlendMode: 'screen'}}>
            <defs>
              <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#5FF2D8" stopOpacity="0.85" />
                <stop offset="1" stopColor="#19C3A6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g transform={`translate(${O.x} ${O.y}) rotate(${(beamA * 180) / Math.PI})`} opacity={ease(f, [1245, 1258], [0, 1]) * (1 - ease(f, [1372, 1385], [0, 1]))}>
              <path d="M0 0 L1900 -150 L1900 150 Z" fill="url(#beam)" opacity={0.45} />
              <path d="M0 0 L1900 -4 L1900 4 Z" fill="#B8FFF2" />
            </g>
          </svg>
        )}
        <div style={{position: 'absolute', inset: 0, zIndex: 2}}>{back}</div>
        {/* Wheelie */}
        {wVisible && (
          <div style={{position: 'absolute', left: wx, top: wy, zIndex: f < A2.fusionStart ? 850 : 400, transform: `rotate(${wLean}deg)`}}>
            {f >= 1400 && <div style={{position: 'absolute', left: -wr * 1.5, top: -wr * 1.5, width: wr * 3, height: wr * 3, borderRadius: '50%', background: `radial-gradient(circle, rgba(25,195,166,${0.5 * ease(f, [1400, 1500], [0, 1])}) 0%, rgba(25,195,166,0) 65%)`}} />}
            <Wheelie r={wr} spin={wSpin} mood={wMood} blink={wMood === 'happy' ? blink : 0} armR={wArmR} armL={wArmL} prop={wProp} squash={wSquash} shadow={f < 1380} lookX={f >= 1250 && f < 1380 ? 1 : 0} />
          </div>
        )}
        <div style={{position: 'absolute', inset: 0, zIndex: 500}}>{front}</div>
        {ballR > 0 && (
          <div style={{position: 'absolute', left: 960 - ballR, top: 520 - ballR, width: ballR * 2, height: ballR * 2, borderRadius: '50%', zIndex: 600, background: 'radial-gradient(circle, #FFFFFF 0%, #9BFBEA 35%, #19C3A6 70%, rgba(25,195,166,0) 100%)', boxShadow: `0 0 ${ballR}px rgba(25,195,166,0.9)`}} />
        )}
        {wheelReveal > 0 && (
          <div style={{position: 'absolute', left: 960, top: 500, zIndex: 650}}>
            <div style={{transform: wheelTilt(f)}}><WheelUI R={300} reveal={wheelReveal} lit={0} /></div>
          </div>
        )}
        <div style={{position: 'absolute', inset: 0, zIndex: 700}}>{dialogs}</div>
        <Smoke f={f} amt={heat * 0.8} />
        <div style={{position: 'absolute', inset: 0, zIndex: 800}}>
          <Flames f={f} amt={heat} y={H - 64} />
          <Taskbar f={f} icons={tbIcons} heat={heat} ram={ram} wheelieGlow={f >= 880 && f < 1010 ? 0.6 + 0.4 * Math.sin(f * 0.12) : 0} />
          <Toast f={f} at={A1.invoiceToast} out={176} app="reminders" title="Invoice totals due 10:00" body="Finance needs the Q3 numbers today." />
          <Toast f={f} at={A1.chatToast} out={300} app="chat" title="Sam" body="did you make it to the meeting??" />
          <ClickRipple f={f} at={90} x={calcIcon.x} y={calcIcon.y} />
          <ClickRipple f={f} at={A1.alarmClick} x={alarmIcon.x} y={alarmIcon.y} />
          <ClickRipple f={f} at={A2.click} x={iconPos(899, 0).x} y={iconPos(899, 0).y} color={C.teal} />
          {curOp > 0 && f < 1060 && (
            <div style={{opacity: curOp}}>
              <Cursor x={cur.x} y={cur.y} press={cur.press} spinner={(cur as {spin?: boolean}).spin} f={f} scale={f >= 900 ? 1.35 / Math.max(1, cs / 1.6) : 1.35} />
            </div>
          )}
        </div>
        <div style={{position: 'absolute', inset: 0, zIndex: 900}}><Foam f={f} start={A2.foamStart} end={1188} ox={wx + 200 * (wr / 100)} oy={wy - 54 * (wr / 100)} fade={f < 1205 ? 1 : 0} /></div>
      </AbsoluteFill>
      {/* screen-space overlays */}
      <Vignette amt={0.35 + heat * 0.35 + zoomed * 0.45} color={heat > 0 ? '40,6,0' : '0,0,0'} />
      {zoomed > 0 && <AbsoluteFill style={{background: `rgba(0,0,0,${0.3 * zoomed})`, maskImage: 'radial-gradient(circle at 50% 54%, transparent 120px, black 420px)', WebkitMaskImage: 'radial-gradient(circle at 50% 54%, transparent 120px, black 420px)'}} />}
      <Flash amt={white} color="#F7FAFC" />
      <Flash amt={flash} color="#E9FFFB" />
      <Flash amt={1 - ease(f, [0, 24], [0, 1])} color="#000" />
    </AbsoluteFill>
  );
};
