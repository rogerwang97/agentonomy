"use client";

import { useEffect, useState } from "react";

interface FlameParticle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

interface PixelFlameProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function PixelFlame({ size = "md", className = "" }: PixelFlameProps) {
  const [particles, setParticles] = useState<FlameParticle[]>([]);

  const sizeConfig = {
    sm: { width: 24, height: 32, particleCount: 5 },
    md: { width: 40, height: 48, particleCount: 8 },
    lg: { width: 60, height: 72, particleCount: 12 },
  };

  const config = sizeConfig[size];

  useEffect(() => {
    // 生成火焰粒子
    const newParticles: FlameParticle[] = Array.from({ length: config.particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * config.width,
      delay: Math.random() * 0.5,
      duration: 0.5 + Math.random() * 0.5,
      size: 2 + Math.random() * 4,
    }));
    setParticles(newParticles);
  }, [config.particleCount, config.width]);

  return (
    <div
      className={`relative ${className}`}
      style={{ width: config.width, height: config.height }}
    >
      {/* 火焰主体 - 像素风格 */}
      <svg
        viewBox="0 0 40 48"
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: "pixelated" }}
      >
        {/* 外层火焰 */}
        <g className="pixel-flame">
          <rect x="16" y="4" width="8" height="4" fill="#ff4500" />
          <rect x="12" y="8" width="16" height="4" fill="#ff6b35" />
          <rect x="8" y="12" width="24" height="4" fill="#ff6b35" />
          <rect x="6" y="16" width="28" height="4" fill="#ffa500" />
          <rect x="4" y="20" width="32" height="4" fill="#ffa500" />
          <rect x="6" y="24" width="28" height="4" fill="#ffd700" />
          <rect x="8" y="28" width="24" height="4" fill="#ffd700" />
          <rect x="12" y="32" width="16" height="4" fill="#ffec8b" />
          <rect x="16" y="36" width="8" height="4" fill="#ffec8b" />
        </g>
        
        {/* 内层火焰 - 更亮 */}
        <g className="pixel-flame" style={{ animationDelay: "0.15s" }}>
          <rect x="18" y="12" width="4" height="4" fill="#fff" opacity="0.8" />
          <rect x="16" y="16" width="8" height="4" fill="#fffacd" opacity="0.9" />
          <rect x="14" y="20" width="12" height="4" fill="#fffacd" />
          <rect x="16" y="24" width="8" height="4" fill="#fff" opacity="0.7" />
        </g>
      </svg>

      {/* 火焰粒子 */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="flame-particle"
          style={{
            left: particle.x,
            bottom: 0,
            width: particle.size,
            height: particle.size,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}

      {/* 底部光晕 */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-4 rounded-full opacity-60"
        style={{
          background: "radial-gradient(ellipse at center, #ffa500 0%, transparent 70%)",
          filter: "blur(4px)",
        }}
      />
    </div>
  );
}

// 热门标签火焰组件
export function HotFlameBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="hot-flame-badge">
      <svg
        viewBox="0 0 12 16"
        width="12"
        height="16"
        className="pixel-flame"
        style={{ imageRendering: "pixelated" }}
      >
        <rect x="4" y="2" width="4" height="2" fill="#fff" />
        <rect x="2" y="4" width="8" height="2" fill="#ffd700" />
        <rect x="4" y="6" width="4" height="2" fill="#ffa500" />
        <rect x="2" y="8" width="8" height="2" fill="#ff6b35" />
        <rect x="4" y="10" width="4" height="2" fill="#ff4500" />
      </svg>
      {children}
    </span>
  );
}
