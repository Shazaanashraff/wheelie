import React, {useEffect, useState} from 'react';
import {Composition, continueRender, delayRender} from 'remotion';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/300.css';
import '@fontsource/bricolage-grotesque/600.css';
import '@fontsource/bricolage-grotesque/800.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import {Trailer} from './Trailer';

const FontGate: React.FC = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const faces = ['300 20px Inter', '400 20px Inter', '500 20px Inter', '600 20px Inter', '700 20px Inter', '600 20px "Bricolage Grotesque"', '800 20px "Bricolage Grotesque"', '500 20px "JetBrains Mono"', '600 20px "JetBrains Mono"', '700 20px "JetBrains Mono"'];
    Promise.all(faces.map((x) => document.fonts.load(x))).then(() => continueRender(handle));
  }, [handle]);
  return <Trailer />;
};

export const Root: React.FC = () => (
  <Composition id="Trailer" component={FontGate} durationInFrames={3600} fps={60} width={1920} height={1080} />
);
