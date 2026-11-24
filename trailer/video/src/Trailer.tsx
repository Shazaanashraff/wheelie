import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Chaos} from './scenes/Chaos';
import {Custom, Launch, Nerds, WheelTools} from './scenes/Act3';
import {EndCard, Hotkey, More} from './scenes/Act4';
import {TL} from './lib';

export const Trailer: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => {
  const f = useCurrentFrame();
  const A3 = TL.act3;
  const A4 = TL.act4;
  let scene: React.ReactNode;
  if (f < A3.start) scene = <Chaos f={f} />;
  else if (f < A3.nerdsStart) scene = <WheelTools f={f} />;
  else if (f < A3.launchStart) scene = <Nerds f={f} />;
  else if (f < A3.customStart) scene = <Launch f={f} />;
  else if (f < A4.start) scene = <Custom f={f} />;
  else if (f < A4.moreStart) scene = <Hotkey f={f} />;
  else if (f < A4.endStart) scene = <More f={f} />;
  else scene = <EndCard f={f} />;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {scene}
      {withAudio && <Audio src={staticFile('soundtrack.wav')} />}
    </AbsoluteFill>
  );
};
