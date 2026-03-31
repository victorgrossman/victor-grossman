"use client"

import React, { useRef, useState, useEffect } from 'react';

interface ScrollRevealParagraphProps {
  text: string;
  className?: string;
}

export const ScrollRevealParagraph: React.FC<ScrollRevealParagraphProps> = ({ text, className }) => {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const [progress, setProgress] = useState(0);
  const words = text.split(/\s+/);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      const triggerStart = windowHeight * 0.85;
      const triggerEnd = windowHeight * 0.35;
      
      const totalDistance = triggerStart - triggerEnd;
      const currentPos = rect.top;
      
      let newProgress = (triggerStart - currentPos) / (totalDistance + rect.height * 0.2);
      
      newProgress = Math.max(0, Math.min(1, newProgress));
      setProgress(newProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    requestAnimationFrame(handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <p ref={containerRef} className={`${className} flex flex-wrap gap-x-[0.25em] gap-y-0`}>
      {words.map((word, i) => {
        const wordProgress = i / words.length;
        const isActive = progress > wordProgress;
        
        return (
          <span
            key={i}
            className={`inline-block transition-all duration-700 ease-[cubic-bezier(0.2,0,0,1)] ${
              isActive ? 'text-slate-900' : 'text-slate-200'
            }`}
            style={{ 
              opacity: isActive ? 1 : 0.4,
              filter: isActive ? 'blur(0px)' : 'blur(1px)',
              transform: isActive ? 'translateY(0)' : 'translateY(4px)',
            }}
          >
            {word}
          </span>
        );
      })}
    </p>
  );
};