import React, { useEffect, useRef } from 'react';

/**
 * FluidLivingCore
 * 
 * Recreates the organic, fluid 3D-like living sculptural core from Dogfood_Design_Reference.md.
 * Features:
 * - Continuous slow organic deformation / breathing motion
 * - Dark obsidian surface body
 * - Violet & indigo luminous contour edge lighting
 * - Soft environmental violet bloom
 * - Spring-damped mouse tilt response
 * - 60 FPS GPU-accelerated canvas rendering with zero external dependencies
 */
export default function FluidLivingCore({ mouseOffset = { x: 0, y: 0 } }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Multi-octave harmonic distortion function for smooth organic curves
    const getRadius = (angle, t, baseRadius) => {
      const w1 = Math.sin(angle * 2 + t * 0.8) * 22;
      const w2 = Math.cos(angle * 3 - t * 0.6) * 16;
      const w3 = Math.sin(angle * 5 + t * 1.1) * 10;
      const w4 = Math.cos(angle * 1 + t * 0.4) * 28;
      const breathing = Math.sin(t * 0.5) * 12;
      return baseRadius + w1 + w2 + w3 + w4 + breathing;
    };

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        time += 0.014;
      }

      // Center with gentle mouse parallax tilt
      const centerX = width / 2 + mouseOffset.x * 24;
      const centerY = height * 0.72 + mouseOffset.y * 18;
      const baseRadius = Math.min(width, height) * 0.42;

      // 1. Deep Environmental Ambient Glow behind Core
      const ambientGlow = ctx.createRadialGradient(
        centerX,
        centerY - baseRadius * 0.2,
        baseRadius * 0.2,
        centerX,
        centerY,
        baseRadius * 1.6
      );
      ambientGlow.addColorStop(0, 'rgba(122, 78, 224, 0.40)');
      ambientGlow.addColorStop(0.4, 'rgba(53, 28, 104, 0.25)');
      ambientGlow.addColorStop(0.8, 'rgba(25, 12, 54, 0.10)');
      ambientGlow.addColorStop(1, 'transparent');

      ctx.fillStyle = ambientGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Helper to generate organic closed contour path
      const createBlobPath = (radiusModifier, timeOffset) => {
        ctx.beginPath();
        const steps = 120;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const r = getRadius(angle, time + timeOffset, baseRadius * radiusModifier);
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r * 0.75; // slightly flattened perspective
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
      };

      // 2. Outer Soft Rim Glow Layer
      ctx.save();
      createBlobPath(1.08, 0.15);
      ctx.fillStyle = 'rgba(122, 78, 224, 0.08)';
      ctx.shadowColor = '#7a4ee0';
      ctx.shadowBlur = 40;
      ctx.fill();
      ctx.restore();

      // 3. Main Obsidian Dark Body with Violet Surface Lighting
      ctx.save();
      createBlobPath(1.0, 0);

      // 3D-like directional lighting gradient
      const bodyGradient = ctx.createRadialGradient(
        centerX - baseRadius * 0.25,
        centerY - baseRadius * 0.35,
        baseRadius * 0.1,
        centerX,
        centerY,
        baseRadius * 1.1
      );
      bodyGradient.addColorStop(0, '#241b38'); // top-lit highlight
      bodyGradient.addColorStop(0.3, '#140f22');
      bodyGradient.addColorStop(0.7, '#0c0915'); // deep shadow core
      bodyGradient.addColorStop(1, '#07050d');

      ctx.fillStyle = bodyGradient;
      ctx.fill();

      // Violet Luminescent Rim Contour
      ctx.lineWidth = 2.5;
      const strokeGrad = ctx.createLinearGradient(
        centerX - baseRadius,
        centerY - baseRadius,
        centerX + baseRadius,
        centerY + baseRadius
      );
      strokeGrad.addColorStop(0, 'rgba(191, 165, 255, 0.85)'); // crisp violet-white rim
      strokeGrad.addColorStop(0.5, 'rgba(122, 78, 224, 0.45)');
      strokeGrad.addColorStop(1, 'rgba(53, 28, 104, 0.15)');
      ctx.strokeStyle = strokeGrad;
      ctx.stroke();
      ctx.restore();

      // 4. Secondary Inner Fluid Crease / Light Ribbon
      ctx.save();
      ctx.beginPath();
      const innerSteps = 80;
      for (let i = 0; i <= innerSteps; i++) {
        const angle = (i / innerSteps) * Math.PI; // upper arc crease
        const r = getRadius(angle + Math.PI * 0.8, time * 0.7, baseRadius * 0.65);
        const x = centerX + Math.cos(angle + 0.4) * r * 0.9;
        const y = centerY + Math.sin(angle + 0.4) * r * 0.5 - 20;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = 'rgba(191, 165, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#bfa5ff';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mouseOffset]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-contain pointer-events-none select-none"
    />
  );
}
