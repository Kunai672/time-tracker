"use client";

import { useEffect } from "react";

import { formatDocumentTitle } from "../lib/documentTitle";
import { useAppData } from "./AppDataProvider";
import { useNowSeconds } from "./useNow";

/**
 * Keeps `document.title` in sync with the running timer. Renders nothing; the
 * once-per-second clock only ticks while a timer is active.
 */
export function DocumentTitle() {
  const { data } = useAppData();
  const running = data.runningTimer;
  const seconds = useNowSeconds(Boolean(running));

  useEffect(() => {
    const now = new Date((seconds ?? Math.floor(Date.now() / 1000)) * 1000);
    document.title = formatDocumentTitle(running, now);
  }, [running, seconds]);

  return null;
}
