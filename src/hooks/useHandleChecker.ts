import { useEffect, useMemo, useRef, useState } from "react";
import { isHandleAvailable, RESERVED_HANDLES } from "@/lib/profiles";

export type HandleStatus =
  "empty" | "invalid_format" | "reserved" | "unchanged" | "checking" | "available" | "taken";

export interface UseHandleCheckerOptions {
  handle: string;
  currentHandle?: string | null;
  userId?: string;
  debounceMs?: number;
}

export interface UseHandleCheckerResult {
  status: HandleStatus;
  checking: boolean;
  isValid: boolean;
  errorMessage: string | null;
  sanitizedHandle: string;
}

// TTL-based cache — entries expire after 5 minutes so stale availability
// results don't persist across long sessions or between users.
const CACHE_TTL_MS = 5 * 60 * 1000;
const handleCache = new Map<string, { available: boolean; expiresAt: number }>();

function getCached(handle: string): boolean | null {
  const entry = handleCache.get(handle);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    handleCache.delete(handle);
    return null;
  }
  return entry.available;
}

function setCached(handle: string, available: boolean) {
  handleCache.set(handle, { available, expiresAt: Date.now() + CACHE_TTL_MS });
}

interface SyncValidationResult {
  isAsyncRequired: boolean;
  status: HandleStatus;
  errorMessage: string | null;
  isValid: boolean;
}

function getSyncValidation(normalized: string, normalizedCurrent: string): SyncValidationResult {
  if (!normalized) {
    return {
      isAsyncRequired: false,
      status: "empty",
      errorMessage: null,
      isValid: false,
    };
  }

  if (normalizedCurrent && normalized === normalizedCurrent) {
    return {
      isAsyncRequired: false,
      status: "unchanged",
      errorMessage: null,
      isValid: true,
    };
  }

  if (normalized.length < 4) {
    return {
      isAsyncRequired: false,
      status: "invalid_format",
      errorMessage: "Minimum 4 characters required.",
      isValid: false,
    };
  }

  if (!/^[a-z0-9_]{4,}$/.test(normalized)) {
    return {
      isAsyncRequired: false,
      status: "invalid_format",
      errorMessage: "Lowercase letters, numbers, and underscores only.",
      isValid: false,
    };
  }

  if (RESERVED_HANDLES.has(normalized)) {
    return {
      isAsyncRequired: false,
      status: "reserved",
      errorMessage: "This handle is reserved.",
      isValid: false,
    };
  }

  if (handleCache.has(normalized)) {
    const available = getCached(normalized);
    if (available !== null) {
      return {
        isAsyncRequired: false,
        status: available ? "available" : "taken",
        errorMessage: available ? null : "This handle is already taken.",
        isValid: available,
      };
    }
  }

  return {
    isAsyncRequired: true,
    status: "checking",
    errorMessage: null,
    isValid: false,
  };
}

export function useHandleChecker({
  handle,
  currentHandle,
  userId,
  debounceMs = 220,
}: UseHandleCheckerOptions): UseHandleCheckerResult {
  const normalized = handle.trim().toLowerCase();
  const normalizedCurrent = (currentHandle ?? "").trim().toLowerCase();

  const syncResult = useMemo(
    () => getSyncValidation(normalized, normalizedCurrent),
    [normalized, normalizedCurrent],
  );

  const [asyncState, setAsyncState] = useState<{
    handle: string;
    status: HandleStatus;
    checking: boolean;
    errorMessage: string | null;
  }>({
    handle: normalized,
    status: syncResult.status,
    checking: false,
    errorMessage: syncResult.errorMessage,
  });

  const querySeqRef = useRef(0);

  useEffect(() => {
    let active = true;

    // If synchronous check handled it, no need for debounce or network
    if (!syncResult.isAsyncRequired) {
      return () => {
        active = false;
      };
    }

    const currentSeq = ++querySeqRef.current;

    // Start debounce timer
    const timer = window.setTimeout(() => {
      if (!active || querySeqRef.current !== currentSeq) return;

      setAsyncState((prev) => ({
        ...prev,
        handle: normalized,
        status: "checking",
        checking: true,
      }));

      void isHandleAvailable(normalized, userId)
        .then((available) => {
          setCached(normalized, available);
          if (!active || querySeqRef.current !== currentSeq) return;
          setAsyncState({
            handle: normalized,
            status: available ? "available" : "taken",
            checking: false,
            errorMessage: available ? null : "This handle is already taken.",
          });
        })
        .catch(() => {
          if (!active || querySeqRef.current !== currentSeq) return;
          setAsyncState({
            handle: normalized,
            status: "taken",
            checking: false,
            errorMessage: "Could not check availability.",
          });
        });
    }, debounceMs);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    normalized,
    syncResult.isAsyncRequired,
    syncResult.status,
    syncResult.errorMessage,
    userId,
    debounceMs,
  ]);

  // Determine current effective state
  const isStateCurrent = asyncState.handle === normalized;
  const status: HandleStatus = !syncResult.isAsyncRequired
    ? syncResult.status
    : isStateCurrent
      ? asyncState.status
      : "checking";

  const checking = syncResult.isAsyncRequired && isStateCurrent && asyncState.checking;

  const errorMessage = !syncResult.isAsyncRequired
    ? syncResult.errorMessage
    : isStateCurrent
      ? asyncState.errorMessage
      : null;

  const isValid = status === "available" || status === "unchanged";

  return {
    status,
    checking,
    isValid,
    errorMessage,
    sanitizedHandle: normalized,
  };
}
