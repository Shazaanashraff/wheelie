import React from 'react';
import {C} from '../lib';

export type Mood = 'happy' | 'wide' | 'determined' | 'wink' | 'proud';
export type Prop = 'none' | 'extinguisher' | 'scissors' | 'wrench';

type Props = {
  r: number; // radius in px
  spin?: number; // tread rotation in degrees
  mood?: Mood;
  blink?: number; // 0 open .. 1 closed
  armL?: [number, number] | null; // hand position in 100-unit space
  armR?: [number, number] | null;
  prop?: Prop;
  glasses?: number; // 0..1
  squash?: number; // 1 = none
  lookX?: number; // pupil offset -1..1
  lookY?: number;
  shadow?: boolean;
  headOnly?: boolean;
  glint?: number; // 0..1 sparkle on glasses
};

const Arm: React.FC<{side: 1 | -1; hand: [number, number]}> = ({side, hand}) => {
  const sx = side * 84;
  const sy = 18;
  const cx = (sx + hand[0]) / 2 + side * 18;
  const cy = Math.max(sy, hand[1]) + 18;
  return (
    <g>
      <path d={`M${sx} ${sy} Q${cx} ${cy} ${hand[0]} ${hand[1]}`} stroke="#0B1018" strokeWidth={19} fill="none" strokeLinecap="round" />
      <path d={`M${sx} ${sy} Q${cx} ${cy} ${hand[0]} ${hand[1]}`} stroke="#5D6B80" strokeWidth={11} fill="none" strokeLinecap="round" />
      <circle cx={hand[0]} cy={hand[1]} r={15} fill={C.face} stroke={C.tire} strokeWidth={5} />
    </g>
  );
};

export const Wheelie: React.FC<Props> = ({
  r, spin = 0, mood = 'happy', blink = 0, armL = [-122, 52], armR = [122, 52], prop = 'none',
  glasses = 0, squash = 1, lookX = 0, lookY = 0, shadow = false, headOnly = false, glint = 0,
}) => {
  const k = r / 100;
  const eyeRy = 13 * (1 - 0.9 * blink);
  const px = lookX * 3.5;
  const py = lookY * 3;
  const eye = (x: number) => (
    <g>
      <ellipse cx={x + px} cy={-8 + py} rx={8.5} ry={mood === 'wide' ? 15 : eyeRy} fill={C.ink} />
      {blink < 0.5 && <circle cx={x + px + 3} cy={-13 + py} r={3} fill="#fff" />}
    </g>
  );
  const hands = !headOnly;
  return (
    <svg
      width={r * 3.2}
      height={r * 3.2}
      viewBox="-160 -160 320 320"
      style={{position: 'absolute', left: -r * 1.6, top: -r * 1.6, overflow: 'visible'}}
    >
      <defs>
        <linearGradient id="wh-rim" x1="0" y1="-1" x2="0" y2="1">
          <stop offset="0" stopColor="#3FE0C3" />
          <stop offset="1" stopColor={C.tealDeep} />
        </linearGradient>
        <radialGradient id="wh-face" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E4ECF2" />
        </radialGradient>
      </defs>
      <g transform={`translate(0 ${(1 - squash) * 100}) scale(${1 / Math.sqrt(squash)} ${squash})`}>
        {shadow && <ellipse cx={0} cy={108} rx={78} ry={11} fill="rgba(0,0,0,0.28)" />}
        {hands && armL && <Arm side={-1} hand={armL} />}
        {hands && armR && prop === 'none' && <Arm side={1} hand={armR} />}
        {hands && armR && prop !== 'none' && <Arm side={1} hand={armR} />}
        {/* tire */}
        <g transform={`rotate(${spin})`}>
          {Array.from({length: 22}, (_, i) => (
            <rect key={i} x={-7} y={-101} width={14} height={14} rx={3.5} fill={C.tire} transform={`rotate(${(i / 22) * 360})`} />
          ))}
        </g>
        <circle r={92} fill={C.tire} />
        <circle r={82} fill="none" stroke={C.tireEdge} strokeWidth={4} />
        <g transform={`rotate(${spin})`}>
          {Array.from({length: 22}, (_, i) => (
            <rect key={i} x={-1.6} y={-90} width={3.2} height={10} rx={1.6} fill={C.tireEdge} transform={`rotate(${(i / 22) * 360 + 8})`} />
          ))}
        </g>
        <circle r={70} fill="url(#wh-rim)" />
        <g transform={`rotate(${spin})`}>
          {Array.from({length: 6}, (_, i) => (
            <circle key={i} cx={0} cy={-63} r={3.2} fill="rgba(255,255,255,0.55)" transform={`rotate(${i * 60})`} />
          ))}
        </g>
        <circle r={57} fill="url(#wh-face)" />
        {/* face */}
        <circle cx={-33} cy={14} r={7} fill="#FF8FA3" opacity={0.4} />
        <circle cx={33} cy={14} r={7} fill="#FF8FA3" opacity={0.4} />
        {mood === 'wink' ? (
          <>
            {eye(-20)}
            <path d="M12 -8 Q20 -16 28 -8" stroke={C.ink} strokeWidth={5} fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            {eye(-20)}
            {eye(20)}
          </>
        )}
        {mood === 'determined' && (
          <path d="M-31 -27 L-11 -21 M31 -27 L11 -21" stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
        )}
        {mood === 'wide' ? (
          <ellipse cx={0} cy={22} rx={7} ry={9} fill={C.ink} />
        ) : mood === 'determined' ? (
          <path d="M-12 20 Q0 26 12 20" stroke={C.ink} strokeWidth={5} fill="none" strokeLinecap="round" />
        ) : (
          <path d={mood === 'proud' ? 'M-17 13 Q0 34 17 13 Z' : 'M-15 14 Q0 30 15 14'} stroke={C.ink} strokeWidth={5} fill={mood === 'proud' ? C.ink : 'none'} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {glasses > 0 && (
          <g opacity={glasses} transform={`translate(0 ${(1 - glasses) * -30})`}>
            <rect x={-35} y={-22} width={28} height={26} rx={7} fill="rgba(160,220,255,0.18)" stroke={C.ink} strokeWidth={4.5} />
            <rect x={7} y={-22} width={28} height={26} rx={7} fill="rgba(160,220,255,0.18)" stroke={C.ink} strokeWidth={4.5} />
            <path d="M-7 -12 Q0 -16 7 -12" stroke={C.ink} strokeWidth={4} fill="none" />
            {glint > 0 && (
              <g transform={`translate(28 -20) scale(${glint})`}>
                <path d="M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3 Z" fill="#fff" />
              </g>
            )}
          </g>
        )}
        {/* props in right hand */}
        {hands && armR && prop === 'extinguisher' && (
          <g transform={`translate(${armR[0]} ${armR[1]})`}>
            <rect x={-6} y={-52} width={36} height={86} rx={14} fill="#E5322B" stroke="#8E1712" strokeWidth={4} />
            <rect x={-2} y={-30} width={28} height={22} rx={4} fill="#fff" opacity={0.9} />
            <rect x={4} y={-66} width={16} height={16} rx={3} fill="#2A303B" />
            <path d="M20 -62 Q56 -82 74 -64" stroke="#2A303B" strokeWidth={7} fill="none" strokeLinecap="round" />
            <rect x={66} y={-74} width={22} height={12} rx={3} fill="#2A303B" transform="rotate(20 77 -68)" />
            <circle cx={0} cy={0} r={15} fill={C.face} stroke={C.tire} strokeWidth={5} />
          </g>
        )}
        {hands && armR && prop === 'scissors' && (
          <g transform={`translate(${armR[0]} ${armR[1]}) rotate(-30)`}>
            <circle cx={-8} cy={14} r={11} fill="none" stroke="#F26B1D" strokeWidth={6} />
            <circle cx={12} cy={16} r={11} fill="none" stroke="#F26B1D" strokeWidth={6} />
            <path d="M-2 4 L30 -58 M6 4 L4 -60" stroke="#C9D2DC" strokeWidth={7} strokeLinecap="round" />
            <circle cx={0} cy={0} r={15} fill={C.face} stroke={C.tire} strokeWidth={5} />
          </g>
        )}
        {hands && armR && prop === 'wrench' && (
          <g transform={`translate(${armR[0]} ${armR[1]}) rotate(-35)`}>
            <path d="M0 0 L0 -62" stroke="#AEB8C5" strokeWidth={12} strokeLinecap="round" />
            <path d="M-14 -66 a16 16 0 1 0 28 0 l-6 6 h-16 z" fill="#AEB8C5" />
            <circle cx={0} cy={0} r={15} fill={C.face} stroke={C.tire} strokeWidth={5} />
          </g>
        )}
      </g>
    </svg>
  );
};

/** Small taskbar mark: tire with face */
export const WheelieMark: React.FC<{size: number; spin?: number}> = ({size, spin = 0}) => (
  <div style={{position: 'relative', width: size, height: size}}>
    <div style={{position: 'absolute', left: size / 2, top: size / 2}}>
      <Wheelie r={size * 0.47} spin={spin} headOnly />
    </div>
  </div>
);
