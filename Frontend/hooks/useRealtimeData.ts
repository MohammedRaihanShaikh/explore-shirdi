"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/live/ws";

// ─── Types ───────────────────────────────────────────────────

export interface QueueStatus {
  gate_number: number;
  wait_time_minutes: number;
  queue_length: number;
  sanctum_occupancy_pct: number;
  is_peak_hours: boolean;
  status_label: string;
  updated_at: string;
}

export interface AartiInfo {
  name: string;
  time: string;
  time_24h: string;
  description: string;
  color: string;
  dot: string;
  minutes_until?: number;
  is_next: boolean;
}

export interface WeatherInfo {
  temperature_c: number;
  feels_like_c: number;
  description: string;
  humidity_pct: number;
  wind_speed_kmh: number;
  icon: string;
  city: string;
  updated_at: string;
}

export interface LiveData {
  queues: QueueStatus[];
  next_aarti: AartiInfo | null;
  weather: WeatherInfo | null;
  sanctum_is_open: boolean;
  total_devotees_today: number;
  timestamp: string;
}

// ─── Hook ────────────────────────────────────────────────────

export function useRealtimeData() {
  const [data, setData] = useState<LiveData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const connect = useCallback(() => {
    if (!mounted.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mounted.current) return;
        setIsConnected(true);
        console.log("[Shirdi] WebSocket connected to live feed");
      };

      ws.onmessage = (event) => {
        if (!mounted.current) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "LIVE_UPDATE" && msg.data) {
            setData(msg.data as LiveData);
            setLastUpdated(new Date());
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!mounted.current) return;
        setIsConnected(false);
        console.log("[Shirdi] WebSocket disconnected — reconnecting in 3s...");
        // Auto-reconnect after 3 seconds
        reconnectTimer.current = setTimeout(() => {
          if (mounted.current) connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error("[Shirdi] WebSocket error:", e);
      // Retry after 5 seconds if connection fails
      reconnectTimer.current = setTimeout(() => {
        if (mounted.current) connect();
      }, 5000);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    connect();

    return () => {
      mounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Send PING to keep connection alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "PING" }));
      }
    }, 25000);

    return () => clearInterval(pingInterval);
  }, []);

  // Derived convenience accessors
  const gate2 = data?.queues?.find((q) => q.gate_number === 2) ?? null;
  const nextAarti = data?.next_aarti ?? null;
  const weather = data?.weather ?? null;
  const sanctumOpen = data?.sanctum_is_open ?? false;
  const devoteeCount = data?.total_devotees_today ?? 0;

  return {
    data,
    isConnected,
    lastUpdated,
    gate2,
    nextAarti,
    weather,
    sanctumOpen,
    devoteeCount,
    allQueues: data?.queues ?? [],
  };
}
