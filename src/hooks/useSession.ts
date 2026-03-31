"use client";

import { useState, useEffect } from "react";

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Generate or retrieve session ID from localStorage
    let storedSessionId = localStorage.getItem("agentonomy_session");

    if (!storedSessionId) {
      // Generate new session ID
      storedSessionId = "user_" + generateUUID();
      localStorage.setItem("agentonomy_session", storedSessionId);
    }

    setSessionId(storedSessionId);
    setIsLoading(false);
  }, []);

  return { sessionId, isLoading };
}

function generateUUID(): string {
  // Simple UUID generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
