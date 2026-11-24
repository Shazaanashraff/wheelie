import React from 'react';

export type AppId =
  | 'calc' | 'alarm' | 'notes' | 'reminders' | 'timer' | 'converter' | 'clipboard' | 'colorpicker'
  | 'calendar' | 'todo' | 'weather' | 'stopwatch' | 'passwords' | 'translate' | 'chat'
  | 'browser' | 'code' | 'music' | 'folder' | 'pomodoro';

export const APPS: Record<AppId, {name: string; c1: string; c2: string}> = {
  calc: {name: 'Calculator', c1: '#FF9A4D', c2: '#F26B1D'},
  alarm: {name: 'Alarm', c1: '#FF6B6B', c2: '#E03A4E'},
  notes: {name: 'Notes', c1: '#FFD45C', c2: '#F5A623'},
  reminders: {name: 'Reminders', c1: '#5B9BFF', c2: '#2F6BEA'},
  timer: {name: 'Timer', c1: '#A07BFF', c2: '#7046E8'},
  converter: {name: 'Converter', c1: '#4ADE80', c2: '#16A34A'},
  clipboard: {name: 'Clipboard', c1: '#94A3B8', c2: '#56657A'},
  colorpicker: {name: 'Color Picker', c1: '#F472B6', c2: '#D9277D'},
  calendar: {name: 'Calendar', c1: '#FB7185', c2: '#E11D48'},
  todo: {name: 'To-do', c1: '#34D399', c2: '#059669'},
  weather: {name: 'Weather', c1: '#60C8FA', c2: '#1E95D6'},
  stopwatch: {name: 'Stopwatch', c1: '#FBBF24', c2: '#E08A0B'},
  passwords: {name: 'Passwords', c1: '#818CF8', c2: '#4F46E5'},
  translate: {name: 'Translate', c1: '#2DD4BF', c2: '#0F9488'},
  chat: {name: 'Chat', c1: '#38BDF8', c2: '#0284C7'},
  browser: {name: 'Browser', c1: '#60A5FA', c2: '#1D4ED8'},
  code: {name: 'Code Editor', c1: '#6366F1', c2: '#312E81'},
  music: {name: 'Music', c1: '#F87171', c2: '#BE123C'},
  folder: {name: 'Files', c1: '#FCD34D', c2: '#D99A06'},
  pomodoro: {name: 'Pomodoro', c1: '#FF7A59', c2: '#E5402A'},
};

const S = {fill: 'none', stroke: '#fff', strokeWidth: 3.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};

export const Glyph: React.FC<{app: AppId; color?: string}> = ({app, color = '#fff'}) => {
  const s = {...S, stroke: color};
  const f = {fill: color};
  switch (app) {
    case 'calc':
      return (<g>
        <rect x="14" y="10" width="36" height="44" rx="6" {...s} />
        <rect x="20" y="16" width="24" height="9" rx="2" {...f} />
        {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={23 + c * 9} cy={33 + r * 8} r="2.4" {...f} />))}
      </g>);
    case 'alarm':
      return (<g><circle cx="32" cy="35" r="17" {...s} /><path d="M32 25v10l7 5" {...s} /><path d="M15 17l7-6M49 17l-7-6" {...s} /></g>);
    case 'notes':
      return (<g><rect x="16" y="11" width="32" height="42" rx="5" {...s} /><path d="M23 23h18M23 31h18M23 39h11" {...s} /></g>);
    case 'reminders':
      return (<g>{[0, 1, 2].map((i) => <g key={i}><circle cx="20" cy={20 + i * 12} r="3.5" {...f} /><path d={`M28 ${20 + i * 12}h18`} {...s} /></g>)}</g>);
    case 'timer':
      return (<g><path d="M20 12h24M20 52h24M22 12c0 12 20 14 20 20s-20 8-20 20M42 12c0 12-20 14-20 20s20 8 20 20" {...s} /></g>);
    case 'converter':
      return (<g><path d="M16 24h30l-8-8M48 40H18l8 8" {...s} /></g>);
    case 'clipboard':
      return (<g><rect x="16" y="14" width="32" height="40" rx="5" {...s} /><rect x="25" y="10" width="14" height="8" rx="3" {...f} /><path d="M23 30h18M23 38h12" {...s} /></g>);
    case 'colorpicker':
      return (<g><circle cx="32" cy="32" r="18" {...s} /><circle cx="25" cy="27" r="3.5" {...f} /><circle cx="36" cy="23" r="3.5" {...f} /><circle cx="41" cy="33" r="3.5" {...f} /><circle cx="27" cy="39" r="3.5" {...f} /></g>);
    case 'calendar':
      return (<g><rect x="13" y="16" width="38" height="36" rx="6" {...s} /><path d="M13 26h38M23 11v9M41 11v9" {...s} /><rect x="22" y="33" width="7" height="6" rx="1.5" {...f} /></g>);
    case 'todo':
      return (<g><rect x="14" y="14" width="36" height="36" rx="8" {...s} /><path d="M22 32l7 7 13-14" {...s} /></g>);
    case 'weather':
      return (<g><circle cx="26" cy="26" r="8" {...s} /><path d="M26 10v3M12 26h3M16 16l2 2M36 16l-2 2" {...s} /><path d="M24 48h22a8 8 0 0 0 0-16 11 11 0 0 0-21 3 7 7 0 0 0-1 13z" fill={app === 'weather' ? 'rgba(255,255,255,.95)' : color} stroke="none" /></g>);
    case 'stopwatch':
      return (<g><circle cx="32" cy="36" r="16" {...s} /><path d="M32 36l6-7M28 12h8M32 12v8M46 22l3-3" {...s} /></g>);
    case 'passwords':
      return (<g><rect x="15" y="29" width="34" height="23" rx="5" {...s} /><path d="M22 29v-6a10 10 0 0 1 20 0v6" {...s} /><circle cx="32" cy="40" r="3" {...f} /></g>);
    case 'translate':
      return (<g><path d="M12 18h22M23 14v4M16 18c2 8 8 14 14 16M30 18c-2 8-8 14-14 16" {...s} /><path d="M34 52l9-22 9 22M37 45h12" {...s} /></g>);
    case 'chat':
      return (<g><path d="M14 18a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v16a6 6 0 0 1-6 6H28l-9 8v-8h1a6 6 0 0 1-6-6z" {...s} /><path d="M23 24h18M23 31h11" {...s} /></g>);
    case 'browser':
      return (<g><circle cx="32" cy="32" r="19" {...s} /><path d="M13 32h38M32 13c-7 7-7 31 0 38M32 13c7 7 7 31 0 38" {...s} /></g>);
    case 'code':
      return (<g><path d="M24 20L12 32l12 12M40 20l12 12-12 12M35 14l-6 36" {...s} /></g>);
    case 'music':
      return (<g><path d="M26 44V16l22-4v28" {...s} /><circle cx="21" cy="45" r="6" {...f} /><circle cx="43" cy="41" r="6" {...f} /></g>);
    case 'folder':
      return (<g><path d="M12 20a4 4 0 0 1 4-4h11l5 5h16a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" {...s} /></g>);
    case 'pomodoro':
      return (<g><circle cx="32" cy="36" r="16" {...f} /><path d="M32 20c-2-5-7-6-10-5M32 20c3-5 8-5 10-3" {...s} stroke={color === '#fff' ? '#2E7D32' : color} /><path d="M32 30v7l5 3" stroke="#E5402A" strokeWidth="3" fill="none" strokeLinecap="round" /></g>);
  }
};

export const AppIcon: React.FC<{app: AppId; size: number; hot?: number; style?: React.CSSProperties}> = ({app, size, hot = 0, style}) => {
  const a = APPS[app];
  const id = `g-${app}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{overflow: 'visible', ...style}}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a.c1} />
          <stop offset="1" stopColor={a.c2} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill={`url(#${id})`} />
      <rect x="2" y="2" width="60" height="30" rx="15" fill="rgba(255,255,255,0.12)" />
      <Glyph app={app} />
      {hot > 0 && <rect x="2" y="2" width="60" height="60" rx="15" fill="#FF3B1F" opacity={hot * 0.75} />}
    </svg>
  );
};
