import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { Ticket } from "../../types/ticket";
import { useLanguage } from "../../contexts/LanguageContext";

interface UseTicketsOptions {
  activeTab: string;
  currentPage: number;
  criticalCurrentPage: number;
  filterStatus: string;
  filterType: string;
  searchTerm: string;
  startDate: string;
  endDate: string;
  itemsPerPage: number;
  criticalItemsPerPage: number;
  userRole: string;
}

export function useTickets({
  activeTab,
  currentPage,
  criticalCurrentPage,
  filterStatus,
  filterType,
  searchTerm,
  startDate,
  endDate,
  itemsPerPage,
  criticalItemsPerPage,
  userRole
}: UseTicketsOptions) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [criticalTickets, setCriticalTickets] = useState<Ticket[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [totalCriticalTickets, setTotalCriticalTickets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({ total: 0, open: 0, pending: 0, finished: 0, critical: 0, high: 0 });
  const [usersList, setUsersList] = useState<{ id: string, username: string, role: string, matricula: string }[]>([]);
  
  const { t } = useLanguage();

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/tickets/stats");
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (e) {
      console.error("Failed to fetch stats", e);
    }
  }, []);

  const fetchCriticalTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: criticalCurrentPage.toString(),
        limit: criticalItemsPerPage.toString(),
        priority: "Crítico",
        status: "Aberto,Em atendimento"
      });

      const response = await fetch(`/api/tickets?${params.toString()}`);
      const result = await response.json();
      
      if (result.data && Array.isArray(result.data)) {
        setCriticalTickets(result.data);
        setTotalCriticalTickets(result.total);
      } else if (Array.isArray(result)) {
        setCriticalTickets(result);
        setTotalCriticalTickets(result.length);
      }
    } catch (error) {
      console.error("Fetch critical tickets error:", error);
    }
  }, [criticalCurrentPage, criticalItemsPerPage]);

  const fetchTickets = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const reqStatus = activeTab === "operacao" ? "Aberto,Em atendimento" : filterStatus;
      const reqLimit = activeTab === "operacao" ? itemsPerPage : 0;
      const reqPage = activeTab === "operacao" ? currentPage : 1;

      const params = new URLSearchParams({
        page: reqPage.toString(),
        limit: reqLimit.toString(),
        status: reqStatus,
        type: filterType,
        search: searchTerm,
        start: startDate,
        end: endDate
      });

      const response = await fetch(`/api/tickets?${params.toString()}`);

      if (response.status === 401) {
        localStorage.removeItem("admin-token");
        window.location.href = `/${(import.meta as any).env.VITE_ADMIN_PATH || "admin"}/login`;
        return;
      }

      const result = await response.json();
      
      if (result.data && Array.isArray(result.data)) {
        setTickets(result.data);
        setTotalTickets(result.total);
      } else if (Array.isArray(result)) {
        setTickets(result);
        setTotalTickets(result.length);
      }
      
      fetchStats();
      
    } catch (error) {
      console.error("Fetch tickets error:", error);
      if (showLoading) toast.error(t("error.send"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [activeTab, currentPage, filterStatus, filterType, searchTerm, startDate, endDate, itemsPerPage, t, fetchStats]);

  const fetchUsers = useCallback(async () => {
    if (userRole !== "SuperAdmin" && userRole !== "Admin") return;
    try {
      const res = await fetch("/api/users");
      if (res.status === 401) return;
      const data = await res.json();
      if (Array.isArray(data)) setUsersList(data);
    } catch (e) {
      console.error("Failed to fetch users");
    }
  }, [userRole]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchTickets(currentPage === 1);
  }, [fetchTickets, currentPage]);

  useEffect(() => {
    fetchCriticalTickets();
  }, [fetchCriticalTickets]);

  useEffect(() => {
    const socket: Socket = io("/tenant-axion", { transports: ["websocket"] });
    socket.on("connect", () => {
      socket.emit("authenticate", { token: localStorage.getItem("admin-token") });
    });

    let debounceTimer: ReturnType<typeof setTimeout>;
    socket.on("tickets_updated", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchTickets(false);
        fetchCriticalTickets();
      }, 500);
    });

    return () => {
      clearTimeout(debounceTimer);
      socket.disconnect();
    };
  }, [fetchTickets, fetchCriticalTickets]);

  return {
    tickets,
    setTickets,
    criticalTickets,
    totalTickets,
    totalCriticalTickets,
    loading,
    statsData,
    usersList,
    fetchTickets,
    fetchCriticalTickets
  };
}
