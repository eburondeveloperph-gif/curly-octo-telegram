/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState } from 'react';
import cn from 'classnames';

interface MicVisualizerProps {
  volume: number;
  isActive: boolean;
}

const NUM_BARS = 40; // More bars for better visualization

const MicVisualizer: React.FC<MicVisualizerProps> = ({ volume, isActive }) => {
  const [peakVolumes, setPeakVolumes] = useState<number[]>(Array(NUM_BARS).fill(0));
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isActive && volume > 0.01) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 100);
      return () => clearTimeout(timer);
    }
  }, [volume, isActive]);

  useEffect(() => {
    setPeakVolumes(prev => {
      const newPeaks = [...prev];
      for (let i = 0; i < NUM_BARS; i++) {
        const barIndex = i < NUM_BARS / 2 ? i : NUM_BARS - 1 - i;
        const heightFactor = Math.pow(barIndex / (NUM_BARS / 2), 1.5);
        const targetHeight = Math.max(0, volume * 40 * (1.3 - heightFactor));
        
        // Smooth animation with decay
        newPeaks[i] = Math.max(targetHeight, newPeaks[i] * 0.85);
      }
      return newPeaks;
    });
  }, [volume]);

  const bars = Array.from({ length: NUM_BARS }, (_, i) => {
    const barIndex = i < NUM_BARS / 2 ? i : NUM_BARS - 1 - i;
    const heightFactor = Math.pow(barIndex / (NUM_BARS / 2), 1.5);
    const baseHeight = 2;
    const maxHeight = 40;
    const currentHeight = Math.max(0, volume * maxHeight * (1.3 - heightFactor));
    const peakHeight = peakVolumes[i];
    const height = Math.max(baseHeight, currentHeight, peakHeight * 0.7);
    
    // Color based on intensity and activity
    const intensity = Math.min(1, height / maxHeight);
    const color = isActive ? 
      (intensity > 0.7 ? 'high' : intensity > 0.4 ? 'medium' : 'low') : 
      'inactive';
    
    // Interactive hover effect
    const isHovered = isAnimating && intensity > 0.3;
    
    return (
      <div
        key={i}
        className={`mic-visualizer-bar ${color} ${isHovered ? 'hovered' : ''}`}
        style={{
          height: `${height}px`,
        }}
      />
    );
  });

  return (
    <div className={cn('mic-visualizer-container', { active: isActive, animating: isAnimating })}>
      <div className="mic-visualizer-bars">
        {bars}
      </div>
      {isActive && (
        <div className="mic-visualizer-indicator">
          <div className="pulse-dot"></div>
        </div>
      )}
    </div>
  );
};

export default MicVisualizer;
