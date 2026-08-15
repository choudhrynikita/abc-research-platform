"use client";

/**
 * Dashboard fetch with a hard timeout and non-JSON (gateway) error handling.
 * Strategy/F&O terminals previously hung on the spinner or showed a raw parse error.
 */
export async function fetchDashboardJson(url, { timeoutMs = 90000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        res.ok
          ? "Dashboard returned an invalid response. Retry in a moment."
          : `Dashboard unavailable (${res.status}). Retry — NSE data can be slow on weekends.`
      );
    }
    if (!res.ok) {
      throw new Error(json.message || json.error || `Dashboard unavailable (${res.status})`);
    }
    return json;
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out while loading NSE data. Retry.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
