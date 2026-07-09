import { useState, useEffect } from 'react';
import { themeColors } from '../theme';

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/** Animated loading spinner component. */
export function LoadingSpinner() {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % spinnerFrames.length);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return <text fg={themeColors.primary}>{spinnerFrames[frameIndex]} </text>;
}
