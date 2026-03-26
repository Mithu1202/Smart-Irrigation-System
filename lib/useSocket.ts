"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface SensorData {
  device_id: string;
  zone: string;
  soilMoisture: number;
  soilMoistureRaw?: number;
  temperature: number;
  humidity: number;
  soilTemp?: number;
  pumpStatus: string;
  timestamp: string;
}

export interface Alert {
  type: "critical" | "warning" | "info";
  title: string;
  message: string;
  zone: string;
  value: number;
  threshold: number;
  timestamp?: Date;
}

export interface DataPoint {
  time: string;
  moisture: number;
  temperature: number;
  humidity: number;
}

const SOCKET_URL = "http://localhost:5000";
const MAX_DATA_POINTS = 20; // Keep last 20 data points for graphs

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestData, setLatestData] = useState<SensorData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dataHistory, setDataHistory] = useState<DataPoint[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pumpStatus, setPumpStatus] = useState<{ zoneId: string; pumpActive: boolean } | null>(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
      setIsConnected(false);
    });

    socket.on("sensorData", (data: SensorData) => {
      console.log("📡 Real-time data:", data);
      setLatestData(data);
      setLastUpdate(new Date());
      
      // Add to history for graphs
      const timeStr = new Date().toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit",
        second: "2-digit",
        hour12: false 
      });
      
      setDataHistory(prev => {
        const newPoint: DataPoint = {
          time: timeStr,
          moisture: data.soilMoisture,
          temperature: data.temperature,
          humidity: data.humidity,
        };
        const updated = [...prev, newPoint];
        // Keep only last MAX_DATA_POINTS
        return updated.slice(-MAX_DATA_POINTS);
      });
    });

    socket.on("alerts", (newAlerts: Alert[]) => {
      console.log("⚠️ Alerts received:", newAlerts);
      setAlerts(prev => {
        const timestampedAlerts = newAlerts.map(a => ({
          ...a,
          timestamp: new Date(),
        }));
        // Keep only last 10 alerts
        return [...timestampedAlerts, ...prev].slice(0, 10);
      });
    });

    socket.on("pumpStatus", (status: { zoneId: string; pumpActive: boolean }) => {
      console.log("🔧 Pump status update:", status);
      setPumpStatus(status);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("sensorData");
      socket.off("alerts");
      socket.off("pumpStatus");
      socket.off("connect_error");
      socket.disconnect();
    };
  }, []);

  const emit = useCallback((event: string, data: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const dismissAlert = useCallback((index: number) => {
    setAlerts(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    latestData,
    lastUpdate,
    dataHistory,
    alerts,
    pumpStatus,
    emit,
    clearAlerts,
    dismissAlert,
  };
}
