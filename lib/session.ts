"use client";

import { v4 as uuidv4 } from "uuid";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  
  let sessionId = localStorage.getItem("undercover_session_id");
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem("undercover_session_id", sessionId);
  }
  return sessionId;
}
