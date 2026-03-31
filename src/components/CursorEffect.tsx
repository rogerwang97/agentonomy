"use client";

import { useState, useEffect, useCallback } from "react";

interface CursorPosition {
  x: number;
  y: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export default function CursorEffect() {
  const [position, setPosition] = useState<CursorPosition>({ x: 0, y: 0 });
  const [dotPosition, setDotPosition] = useState<CursorPosition>({ x: 0, y: 0 });
  const [isClicking, setIsClicking] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // 鼠标移动
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
    // dot 跟随更快
    setDotPosition({ x: e.clientX, y: e.clientY });
    setIsVisible(true);
  }, []);

  // 点击效果
  const handleMouseDown = useCallback((e: MouseEvent) => {
    setIsClicking(true);
    
    // 创建波纹
    const newRipple: Ripple = {
      id: Date.now(),
      x: e.clientX,
      y: e.clientY,
    };
    setRipples((prev) => [...prev, newRipple]);
    
    // 移除波纹
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsClicking(false);
  }, []);

  // 鼠标离开/进入
  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    // 只在客户端启用
    if (typeof window === 'undefined') return;
    
    // 检测是否是触摸设备
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // 设置等待状态（可以外部调用）
    const handleWaitingStart = () => setIsWaiting(true);
    const handleWaitingEnd = () => setIsWaiting(false);
    
    window.addEventListener('cursor-waiting-start', handleWaitingStart);
    window.addEventListener('cursor-waiting-end', handleWaitingEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('cursor-waiting-start', handleWaitingStart);
      window.removeEventListener('cursor-waiting-end', handleWaitingEnd);
    };
  }, [handleMouseMove, handleMouseDown, handleMouseUp, handleMouseLeave, handleMouseEnter]);

  // 不在客户端或触摸设备上不渲染
  if (typeof window === 'undefined') return null;
  if (typeof navigator !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    return null;
  }

  return (
    <>
      {/* 外圈 */}
      <div
        className={`custom-cursor ${isClicking ? 'clicking' : ''} ${isWaiting ? 'waiting' : ''}`}
        style={{
          left: position.x - 10,
          top: position.y - 10,
          opacity: isVisible ? 1 : 0,
        }}
      />
      
      {/* 内点 */}
      <div
        className="cursor-dot"
        style={{
          left: dotPosition.x - 3,
          top: dotPosition.y - 3,
          opacity: isVisible ? 1 : 0,
        }}
      />
      
      {/* 点击波纹 */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="click-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
        />
      ))}
    </>
  );
}
