import React, { useEffect, useRef } from 'react';

/**
 * SculpturalLivingCore
 * 
 * Recreates the dominant, organic, living 3D sculptural form specified in
 * Sections 8, 9, 10 of Dogfood_Design_Reference.md.
 * 
 * Key Visual & Technical Properties:
 * 1. Physical Material Presence: Deep matte obsidian/carbon center (#05040a to #0d0a18)
 * 2. Fresnel Rim Lighting: Glowing violet & indigo contours (#bfa5ff, #7a4ee0, #351c68) at grazing angles
 * 3. Topological Surface Ridges: Multi-layer internal light creases that undulate as the volume breathes
 * 4. Continuous Organic Motion: Non-looping multi-octave harmonic deformation at 60 FPS
 * 5. Dynamic Light Shifts: Specular highlights and directional shading responsive to pointer coordinates
 * 6. Volumetric Bloom & Atmosphere: Layered back-illumination bleeding into the near-black void
 * 7. Zero external runtime dependencies / 100% offline self-contained HTML5 Canvas
 */
export default function SculpturalLivingCore({ mouseOffset = { x: 0, y: 0 } }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Multi-octave continuous harmonic field (simulates complex 3D surface undulations)
    const computeHarmonicRadius = (angle, t, baseRadius, phaseOffset = 0, roughness = 1) => {
      const a = angle + phaseOffset;
      const o1 = Math.sin(a * 2.0 + t * 0.45) * 28.0 * roughness;
      const o2 = Math.cos(a * 3.0 - t * 0.35 + 1.2) * 20.0 * roughness;
      const o3 = Math.sin(a * 4.0 + t * 0.70 + 2.4) * 14.0 * roughness;
      const o4 = Math.cos(a * 1.0 + t * 0.25 - 0.8) * 34.0 * roughness;
      const o5 = Math.sin(a * 6.0 - t * 0.90) * 8.0 * roughness;
      const breathing = Math.sin(t * 0.3) * 16.0;
      return Math.max(20, baseRadius + o1 + o2 + o3 + o4 + o5 + breathing);
    };

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        time += 0.012; // Slow, majestic, living pace
      }

      // Center calculation with subtle spatial inertia
      const centerX = width * 0.5 + mouseOffset.x * 28;
      const centerY = height * 0.78 + mouseOffset.y * 18;
      const baseRadius = Math.min(width * 0.46, height * 0.62);

      // Light source vector derived from mouse position and default upper-left ambient
      const lightSourceX = centerX - baseRadius * 0.45 + mouseOffset.x * 60;
      const lightSourceY = centerY - baseRadius * 0.60 + mouseOffset.y * 40;

      // =========================================================================
      // 1. LAYER 1: DEEP VOLUMETRIC ATMOSPHERIC BLOOM (BEHIND SCULPTURE)
      // =========================================================================
      const bloomGrad = ctx.createRadialGradient(
        centerX,
        centerY - baseRadius * 0.15,
        baseRadius * 0.1,
        centerX,
        centerY,
        baseRadius * 1.75
      );
      bloomGrad.addColorStop(0.0, 'rgba(122, 78, 224, 0.32)');
      bloomGrad.addColorStop(0.35, 'rgba(77, 39, 168, 0.18)');
      bloomGrad.addColorStop(0.65, 'rgba(35, 17, 74, 0.08)');
      bloomGrad.addColorStop(1.0, 'rgba(7, 6, 9, 0)');

      ctx.save();
      ctx.fillStyle = bloomGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Helper to generate smoothed closed 3D silhouette path
      const buildContourPath = (radiusMultiplier, phaseOffset, roughness, flatten = 0.76) => {
        ctx.beginPath();
        const segments = 160;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const r = computeHarmonicRadius(angle, time, baseRadius * radiusMultiplier, phaseOffset, roughness);
          const px = centerX + Math.cos(angle) * r;
          const py = centerY + Math.sin(angle) * r * flatten;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
      };

      // =========================================================================
      // 2. LAYER 2: SOFT SECONDARY RIM SCATTER
      // =========================================================================
      ctx.save();
      buildContourPath(1.04, 0.1, 0.95);
      ctx.fillStyle = 'rgba(122, 78, 224, 0.06)';
      ctx.shadowColor = '#7a4ee0';
      ctx.shadowBlur = 45;
      ctx.fill();
      ctx.restore();

      // =========================================================================
      // 3. LAYER 3: MAIN OBSIDIAN BODY WITH FRESNEL SHADING
      // =========================================================================
      ctx.save();
      buildContourPath(1.0, 0.0, 1.0);

      // Deep 3D volumetric shading gradient
      const bodyGrad = ctx.createRadialGradient(
        lightSourceX,
        lightSourceY,
        baseRadius * 0.08,
        centerX,
        centerY,
        baseRadius * 1.15
      );
      bodyGrad.addColorStop(0.0, '#1c152a'); // Subtle surface diffuse catch
      bodyGrad.addColorStop(0.25, '#120d1c'); // Midtone obsidian
      bodyGrad.addColorStop(0.65, '#07050d'); // Deep dark core
      bodyGrad.addColorStop(1.0, '#040308'); // Occluded base

      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Razor-sharp & soft luminous Fresnel rim stroke
      ctx.lineWidth = 2.4;
      const rimStroke = ctx.createLinearGradient(
        centerX - baseRadius * 0.9,
        centerY - baseRadius * 0.9,
        centerX + baseRadius * 0.9,
        centerY + baseRadius * 0.9
      );
      rimStroke.addColorStop(0.0, 'rgba(215, 195, 255, 0.90)'); // Specular top rim
      rimStroke.addColorStop(0.35, 'rgba(142, 95, 255, 0.65)'); // Violet mid-rim
      rimStroke.addColorStop(0.70, 'rgba(77, 39, 168, 0.30)');  // Deep indigo transition
      rimStroke.addColorStop(1.0, 'rgba(30, 15, 65, 0.08)');   // Occluded floor

      ctx.strokeStyle = rimStroke;
      ctx.shadowColor = '#bfa5ff';
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();

      // =========================================================================
      // 4. LAYER 4: INTERNAL TOPOLOGICAL SURFACE RIDGES & LIGHT CREASES
      // =========================================================================
      const drawSurfaceCrease = (arcStart, arcEnd, radiusScale, phase, opacity, strokeWidth, shadowGlow) => {
        ctx.save();
        ctx.beginPath();
        const steps = 90;
        for (let i = 0; i <= steps; i++) {
          const progress = i / steps;
          const angle = arcStart + progress * (arcEnd - arcStart);
          const r = computeHarmonicRadius(angle, time * 0.85, baseRadius * radiusScale, phase, 0.85);
          const px = centerX + Math.cos(angle) * r * 0.88;
          const py = centerY + Math.sin(angle) * r * 0.62 - (1.0 - progress) * 25.0;
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.strokeStyle = `rgba(191, 165, 255, ${opacity})`;
        ctx.lineWidth = strokeWidth;
        if (shadowGlow) {
          ctx.shadowColor = '#7a4ee0';
          ctx.shadowBlur = shadowGlow;
        }
        ctx.stroke();
        ctx.restore();
      };

      // Primary upper fluid ridge
      drawSurfaceCrease(Math.PI * 0.75, Math.PI * 2.15, 0.72, 0.8, 0.35, 1.8, 14);

      // Secondary undulating diagonal contour
      drawSurfaceCrease(Math.PI * 1.1, Math.PI * 1.95, 0.52, 1.6, 0.22, 1.4, 8);

      // Deep inner crease
      drawSurfaceCrease(Math.PI * 0.9, Math.PI * 1.7, 0.34, 2.4, 0.16, 1.2, 0);

      // =========================================================================
      // 5. LAYER 5: SPECULAR TRAVELING SURFACE HIGHLIGHT
      // =========================================================================
      const specX = centerX + Math.cos(time * 0.5 + 0.6) * baseRadius * 0.22 + mouseOffset.x * 35;
      const specY = centerY + Math.sin(time * 0.4 - 0.4) * baseRadius * 0.18 - baseRadius * 0.30 + mouseOffset.y * 25;

      const specGrad = ctx.createRadialGradient(specX, specY, 1, specX, specY, baseRadius * 0.24);
      specGrad.addColorStop(0.0, 'rgba(235, 225, 255, 0.38)');
      specGrad.addColorStop(0.4, 'rgba(122, 78, 224, 0.15)');
      specGrad.addColorStop(1.0, 'rgba(7, 6, 9, 0)');

      ctx.save();
      ctx.fillStyle = specGrad;
      ctx.beginPath();
      ctx.arc(specX, specY, baseRadius * 0.24, 0, Math.PI * 2);
      ctx.fill();
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
