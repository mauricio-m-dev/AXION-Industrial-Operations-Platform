import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  LogOut,
  Filter,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  FileImage,
  Layers,
  ChevronRight,
  ChevronLeft,
  X,
  Calendar,
  BarChart as BarChartIcon,
  Users,
  PenTool,
  UploadCloud,
  CheckCircle2,
  Trash2,
  MessageSquare,
  Settings,
  Activity,
  Menu
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { SettingsContainer } from "./SettingsContainer";
import { AnalyticsTab } from "./AnalyticsTab";
import { HealthDashboard } from "./HealthDashboard";

import { useLanguage } from "../contexts/LanguageContext";
import { LanguageSelector } from "../components/LanguageSelector";
import { ThemeToggle } from "../components/ThemeToggle";
import { SidebarLink } from "../components/admin/SidebarLink";
import { ModernStatCard } from "../components/admin/ModernStatCard";
import { DetailItem } from "../components/admin/DetailItem";
import { StatusActionButton } from "../components/admin/StatusActionButton";
import { io } from "socket.io-client";
import { sanitizeImageSrc } from "../utils/sanitize";
import DOMPurify from "dompurify";

interface Ticket {
  id: string;
  type: string;
  location: string;
  agv_number: string | null;
  part_name: string | null;
  sap_number: string | null;
  side: string | null;
  observation: string | null;
  image_path: string | null;
  status: string;
  created_at: string;
  operator_name: string | null;
  operator_matricula: string | null;
  priority?: string;
  operational_impact?: string | null;
  downtime?: string | null;
  started_at?: string;
  finished_at?: string;
  assigned_to?: string;
}

export default function AdminPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [criticalTickets, setCriticalTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState("operacao");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [criticalCurrentPage, setCriticalCurrentPage] = useState(1);
  const [totalCriticalTickets, setTotalCriticalTickets] = useState(0);
  const [statsData, setStatsData] = useState<{ total: number; open: number; pending: number; finished: number; critical: number; high: number }>({ total: 0, open: 0, pending: 0, finished: 0, critical: 0, high: 0 });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const itemsPerPage = 10;
  const criticalItemsPerPage = 3;
  const [usersList, setUsersList] = useState<{ id: string, username: string, role: string }[]>([]);
  const [userRole, setUserRole] = useState("Usuário");
  const notifiedSlaRef = useRef<Set<string>>(new Set());

  // Modal states for Service Workflow
  const [startTicketId, setStartTicketId] = useState<string | null>(null);
  const [assignedToUser, setAssignedToUser] = useState("");

  const [finishTicketId, setFinishTicketId] = useState<string | null>(null);
  const [resolutionReport, setResolutionReport] = useState("");
  const [resolutionImage, setResolutionImage] = useState<File | null>(null);
  const [finishing, setFinishing] = useState(false);

  const [editTicketId, setEditTicketId] = useState<string | null>(null);
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Ticket>>({});

  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const getTranzincdType = (type: string) => {
    switch (type) {
      case "AGV com falha": return t("cat.agv");
      case "Colisão": return t("cat.colisao");
      case "Falta de peças": return t("cat.pecas");
      case "Painel/Botoeira": return t("cat.painel");
      case "Resíduos": return t("cat.residuos");
      default: return type;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("admin-token");
    const role = localStorage.getItem("admin-role") || "Usuário";
    if (!token || role === "Usuário") {
      localStorage.removeItem("admin-token");
      navigate(`/${(import.meta as any).env.VITE_ADMIN_PATH || "admin"}/login`);
      return;
    }
    setUserRole(role);
    fetchTickets();
    fetchCriticalTickets(); // Busca chamados críticos na carga inicial
    if (role === "SuperAdmin") {
      fetchUsers();
    }

    // Connect to WebSocket for real-time updates
    const socket = io("/tenant-axion", { transports: ["websocket"] });
    socket.on("connect", () => {
      socket.emit("authenticate", { token: localStorage.getItem("admin-token") });
    });

    // Debounce de 500ms para evitar refetchs redundantes em atualizações em rajada
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
  }, []);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  useEffect(() => {
    fetchTickets(currentPage === 1);
  }, [currentPage, filterStatus, filterType, searchTerm, startDate, endDate, activeTab]);

  useEffect(() => {
    fetchCriticalTickets();
  }, [criticalCurrentPage]);

  const fetchTickets = async (showLoading = true) => {
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

      const response = await fetch(`/api/tickets?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("admin-token")}` }
      });

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
      
      // Também busca estatísticas para o dashboard
      fetchStats();
      
    } catch (error) {
      console.error("Fetch tickets error:", error);
      if (showLoading) toast.error(t("error.send"));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/tickets/stats", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("admin-token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (e) {
      console.error("Failed to fetch stats");
    }
  };

  const fetchCriticalTickets = async () => {
    try {
      const params = new URLSearchParams({
        page: criticalCurrentPage.toString(),
        limit: criticalItemsPerPage.toString(),
        priority: "Crítico",
        status: "Aberto,Em atendimento" // Apenas ativos
      });

      const response = await fetch(`/api/tickets?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("admin-token")}` }
      });

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
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("admin-token")}` }
      });
      if (res.status === 401) {
        localStorage.removeItem("admin-token");
        window.location.href = `/${(import.meta as any).env.VITE_ADMIN_PATH || "admin"}/login`;
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) setUsersList(data);
    } catch (e) {
      console.error("Failed to fetch users");
    }
  };

  const handleDeleteTicket = async () => {
    if (!deleteTicketId) return;
    try {
      const response = await fetch(`/api/tickets/${deleteTicketId}`, {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${localStorage.getItem("admin-token")}`,
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      if (response.ok) {
        setTickets(tickets.filter(t => t.id !== deleteTicketId));
        setSelectedTicket(null);
        setDeleteTicketId(null);
        toast.success(t("toast.ticket_deleted"));
      } else {
        toast.error(t("toast.delete_error"));
      }
    } catch (e) {
      toast.error(t("toast.connection_error"));
    }
  };

  const handleEditTicket = async () => {
    if (!editTicketId) return;
    try {
      const response = await fetch(`/api/tickets/${editTicketId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("admin-token")}`,
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify(editFormData)
      });
      if (response.ok) {
        setTickets(tickets.map(t => t.id === editTicketId ? { ...t, ...editFormData } : t));
        if (selectedTicket?.id === editTicketId) {
          setSelectedTicket({ ...selectedTicket, ...editFormData } as Ticket);
        }
        setEditTicketId(null);
        toast.success(t("toast.ticket_updated"));
      } else {
        toast.error(t("toast.update_error"));
      }
    } catch (e) {
      toast.error(t("toast.connection_error"));
    }
  };

  const handleStartTicket = async (ticketIdToStart?: string) => {
    const id = typeof ticketIdToStart === 'string' ? ticketIdToStart : startTicketId;
    if (!id) return;

    let assignee = assignedToUser; // Se for SuperAdmin escolhendo alguém, 'assignedToUser' deve ser a matrícula
    if (userRole !== "SuperAdmin") {
      assignee = localStorage.getItem("admin-matricula") || "";
    } else if (!assignee && !ticketIdToStart) {
      return toast.error(t("toast.select_resp"));
    }

    try {
      const response = await fetch(`/api/tickets/${id}/start`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("admin-token")}`,
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({ assigned_to: assignee }),
      });
      const data = await response.json();
      if (response.ok) {
        const finalAssignee = data.assigned_to || assignee;
        setTickets(tickets.map(t => t.id === id ? { ...t, status: "Em atendimento", assigned_to: finalAssignee, started_at: new Date().toISOString() } : t));
        if (selectedTicket?.id === id) {
          setSelectedTicket({ ...selectedTicket, status: "Em atendimento", assigned_to: finalAssignee, started_at: new Date().toISOString() });
        }
        toast.success(t("toast.service_started"));
        setStartTicketId(null);
        setAssignedToUser("");
      } else {
        toast.error(data.error || t("toast.start_error"));
      }
    } catch (error) {
      toast.error(t("toast.connection_error"));
    }
  };

  const handleFinishTicket = async () => {
    if (!finishTicketId || !resolutionReport) {
      return toast.error(t("toast.report_photo_required"));
    }

    setFinishing(true);
    const formData = new FormData();
    formData.append("resolution_report", resolutionReport);
    if (resolutionImage) {
      formData.append("resolution_image", resolutionImage, resolutionImage.name || "resolution.jpg");
    }

    try {
      const response = await fetch(`/api/tickets/${finishTicketId}/finish`, {
        method: "PATCH",
        headers: { 
          "Authorization": `Bearer ${localStorage.getItem("admin-token")}`,
          "X-Requested-With": "XMLHttpRequest"
        },
        body: formData,
      });

      if (response.ok) {
        const finished_at = new Date().toISOString();
        setTickets(tickets.map(t => t.id === finishTicketId ? { ...t, status: "Finalizado", finished_at, resolution_report: resolutionReport } : t));
        if (selectedTicket?.id === finishTicketId) {
          setSelectedTicket({ ...selectedTicket, status: "Finalizado", finished_at, resolution_report: resolutionReport });
          fetchTickets(false); // To get image URL
        }
        toast.success(t("toast.ticket_finished"));
        setFinishTicketId(null);
        setResolutionReport("");
        setResolutionImage(null);
      } else {
        const data = await response.json();
        toast.error(data.error || t("toast.finish_error"));
      }
    } catch (error) {
      toast.error(t("toast.connection_error"));
    } finally {
      setFinishing(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tickets/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("admin-token")}`,
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
        if (selectedTicket?.id === id) {
          setSelectedTicket({ ...selectedTicket, status: newStatus });
        }
        toast.success(t("toast.ok"));
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(t("error.send"));
    }
  };



  const stats = useMemo(() => {
    return {
      total: statsData.total,
      open: statsData.open,
      pending: statsData.pending,
      closed: statsData.finished,
    };
  }, [statsData]);

  // Os tickets já vêm filtrados do servidor
  const filteredTickets = tickets;

  // Normal tickets (não críticos na visão geral)
  const normalTickets = tickets.filter(ticket => ticket.priority !== "Crítico");

  const renderTicketRow = (ticket: Ticket) => (
    <TableRow
      key={ticket.id}
      className={`cursor-pointer group border-zinc-100 dark:border-zinc-800 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50`}
      onClick={() => { setSelectedTicket(ticket); }}
    >
      <TableCell className="pl-8 py-5">
        <span className="font-mono font-bold text-[#DC2626] dark:text-red-400 block text-sm">{ticket.id}</span>
      </TableCell>
      <TableCell className="py-5">
        <div className="flex flex-col gap-1.5">
          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm whitespace-nowrap flex items-center">
            {getTranzincdType(ticket.type)}
            {getPriorityBadge(ticket.priority)}
          </span>
          <span className="text-[12px] text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5"><AlertCircle size={14} className="text-zinc-400 dark:text-zinc-500" /> {ticket.location}</span>
          {(ticket.operator_name || ticket.operator_matricula) && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
              {t("modal.operator")}: {ticket.operator_name || "???"} ({ticket.operator_matricula || "N/A"})
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell py-5">
        <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
          {new Date(ticket.created_at).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
          <span className="ml-2 text-zinc-400 dark:text-zinc-500 font-medium text-xs">({new Date(ticket.created_at).toLocaleDateString(language, { day: '2-digit', month: '2-digit' })})</span>
        </span>
      </TableCell>
      <TableCell className="pr-8 py-5 text-right">
        <div className="flex items-center justify-end gap-4">
          {getStatusBadge(ticket.status)}
          <ChevronRight size={18} className="text-zinc-300 dark:text-zinc-600 group-hover:text-[#DC2626] dark:group-hover:text-red-400 transition-colors" />
        </div>
      </TableCell>
    </TableRow>
  );

  const adminPath = (import.meta as any).env.VITE_ADMIN_PATH || "admin";

  const handleLogout = () => {
    localStorage.removeItem("admin-token");
    navigate(`/${adminPath}/login`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Aberto": return <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50 font-bold px-3 py-1">{t("status.open")}</Badge>;
      case "Em atendimento": return <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50 font-bold px-3 py-1">{t("status.progress")}</Badge>;
      case "Finalizado": return <Badge className="bg-zinc-100 text-zinc-500 hover:bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 font-bold px-3 py-1">{t("status.finished")}</Badge>;
      default: return <Badge className="font-bold px-3 py-1">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    switch (priority) {
      case "Crítico": return <Badge className="bg-red-600 text-white hover:bg-red-700 font-bold px-1.5 py-0 border-none shadow-sm animate-pulse ml-2 text-[9px] uppercase tracking-widest">{t("priority.critical")}</Badge>;
      case "Alto": return <Badge className="bg-orange-500 text-white hover:bg-orange-600 font-bold px-1.5 py-0 border-none shadow-sm ml-2 text-[9px] uppercase tracking-widest">{t("priority.high")}</Badge>;
      case "Médio": return <Badge className="bg-amber-400 text-white hover:bg-amber-500 font-bold px-1.5 py-0 border-none shadow-sm ml-2 text-[9px] uppercase tracking-widest">{t("priority.medium")}</Badge>;
      case "Baixo": return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold px-1.5 py-0 border-none shadow-sm ml-2 text-[9px] uppercase tracking-widest">{t("priority.low")}</Badge>;
      default: return null;
    }
  };

  return (
    <div className="flex h-[100dvh] w-screen bg-zinc-50 dark:bg-[#000000] overflow-hidden font-sans transition-colors duration-300">
      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-0">
        <header className="h-[clamp(4rem,10vw,4.5rem)] bg-[#0A0A0A] dark:bg-[#050505] border-b border-red-600/20 px-[clamp(1rem,3vw,2rem)] flex items-center justify-between shrink-0 transition-colors duration-300 relative">
          <div className="flex items-center gap-2 z-10">
             <span className="h-5 w-1 bg-[#DC2626] inline-block animate-pulse"></span>
             <span className="text-xl font-black tracking-widest text-[#DC2626] dark:text-red-500">AXION</span>
          </div>
          
          <nav className="hidden md:flex items-center justify-center gap-2 absolute left-1/2 -translate-x-1/2">
             <Button variant="ghost" className={`text-white hover:text-red-500 hover:bg-red-500/10 ${activeTab === "operacao" ? "bg-red-500/20 text-red-500" : ""}`} onClick={() => setActiveTab("operacao")}>{t("admin.nav.operacao")}</Button>
             <Button variant="ghost" className={`text-white hover:text-red-500 hover:bg-red-500/10 ${activeTab === "performance" ? "bg-red-500/20 text-red-500" : ""}`} onClick={() => setActiveTab("performance")}>{t("admin.nav.performance")}</Button>
             {userRole === "SuperAdmin" && (
               <Button variant="ghost" className={`text-white hover:text-red-500 hover:bg-red-500/10 ${activeTab === "health" ? "bg-red-500/20 text-red-500" : ""}`} onClick={() => setActiveTab("health")}>{t("admin.nav.health") || "APM (Saúde)"}</Button>
             )}
             {(userRole === "SuperAdmin" || userRole === "Admin") && (
               <Button variant="ghost" className={`text-white hover:text-red-500 hover:bg-red-500/10 ${activeTab === "settings" ? "bg-red-500/20 text-red-500" : ""}`} onClick={() => setActiveTab("settings")}>{t("admin.nav.gestao")}</Button>
             )}
          </nav>

          <div className="flex items-center justify-end w-auto gap-2 z-10">
            {/* Apenas Desktop: Alternar Tema e Atualizar */}
            <div className="hidden md:flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => { fetchTickets(); fetchCriticalTickets(); }} className="rounded-full h-10 w-10 text-zinc-400 hover:text-red-500 hover:bg-red-500/20 transition-colors">
                <RefreshCw className={`h-[18px] w-[18px] ${loading ? 'animate-spin text-red-500' : ''}`} />
              </Button>
            </div>
            
            {/* Apenas Desktop: Idioma */}
            <div className="hidden md:block">
              <LanguageSelector />
            </div>
            
            {/* Sempre visível (Desktop e Mobile): Sair */}
            <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full h-10 w-10 text-zinc-400 hover:text-red-500 hover:bg-red-500/20 transition-colors">
              <LogOut className="h-[18px] w-[18px]" />
            </Button>
            
            {/* Apenas Mobile: Menu Hambúrguer */}
            <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 text-zinc-400 hover:text-red-500 hover:bg-red-500/20 rounded-full" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu size={20} />
            </Button>
          </div>
        </header>

        {isMobileMenuOpen && (
           <div className="md:hidden bg-[#0A0A0A] border-b border-red-600/20 p-4 flex flex-col gap-3 z-[100] animate-in slide-in-from-top duration-200">
               <div className="flex items-center justify-end border-b border-zinc-800 pb-3 gap-2">
                  <ThemeToggle />
                  <LanguageSelector />
                  <Button variant="ghost" size="icon" onClick={() => { fetchTickets(); fetchCriticalTickets(); }} className="rounded-full h-9 w-9 text-zinc-400 hover:text-red-500 hover:bg-red-500/20 transition-colors">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-red-500' : ''}`} />
                  </Button>
               </div>
               <Button variant="ghost" className={`justify-start text-white hover:text-red-500 hover:bg-red-500/10 ${activeTab === "operacao" ? "bg-red-500/20 text-red-500" : ""}`} onClick={() => { setActiveTab("operacao"); setIsMobileMenuOpen(false); }}>{t("admin.nav.operacao")}</Button>
               <Button variant="ghost" className={`justify-start text-white hover:text-red-500 hover:bg-red-500/10 ${activeTab === "performance" ? "bg-red-500/20 text-red-500" : ""}`} onClick={() => { setActiveTab("performance"); setIsMobileMenuOpen(false); }}>{t("admin.nav.performance")}</Button>
               {userRole === "SuperAdmin" && (
                 <Button variant="ghost" className={`justify-start text-white hover:text-red-500 hover:bg-red-500/10 ${activeTab === "health" ? "bg-red-500/20 text-red-500" : ""}`} onClick={() => { setActiveTab("health"); setIsMobileMenuOpen(false); }}>{t("admin.nav.health") || "APM"}</Button>
               )}
               {(userRole === "SuperAdmin" || userRole === "Admin") && (
                 <Button variant="ghost" className={`justify-start text-white hover:text-red-500 hover:bg-red-500/10 ${activeTab === "settings" ? "bg-red-500/20 text-red-500" : ""}`} onClick={() => { setActiveTab("settings"); setIsMobileMenuOpen(false); }}>{t("admin.nav.gestao")}</Button>
               )}
           </div>
        )}

        <main className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col p-[clamp(1rem,3vw,2rem)] gap-[clamp(1.5rem,4vw,2rem)]">
          {activeTab === "operacao" ? (
            <div className="flex flex-col gap-[clamp(1.5rem,4vw,2rem)] w-full max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-[clamp(1rem,3vw,1.5rem)] shrink-0">
                <ModernStatCard label={t("admin.metrics.total")} value={stats.total} icon={Layers} color="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300" />
                <ModernStatCard label={t("admin.metrics.open")} value={stats.open} icon={AlertCircle} color="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" textColor="text-red-600 dark:text-red-400" />
                <ModernStatCard label={t("admin.metrics.progress")} value={stats.pending} icon={Clock} color="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" textColor="text-red-600 dark:text-red-400" />
                <ModernStatCard label={t("admin.metrics.finished")} value={stats.closed} icon={CheckCircle} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" textColor="text-emerald-600 dark:text-emerald-400" />
              </div>

              {criticalTickets.length > 0 && (
                <Card className="flex flex-col rounded-sm overflow-hidden bg-white dark:bg-zinc-900 shadow-[0_0_40px_-10px_rgba(239,68,68,0.45)] flex-none border-none mb-6 p-0 transition-colors duration-300">
                  <div className="p-6 border-b border-red-100 dark:border-red-900/30 flex items-center justify-between gap-4 bg-red-50/50 dark:bg-red-950/20 shrink-0 min-h-[80px] transition-colors duration-300">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="text-red-500" size={20} />
                      <h3 className="font-bold text-red-700 text-sm">{t("admin.critical_tickets")}</h3>
                      <div className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded border border-red-200 shadow-sm">
                        {totalCriticalTickets}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-x-auto w-full">
                    <Table className="min-w-full">
                      <TableHeader className="bg-red-50/80 dark:bg-red-950/40 text-red-700 dark:text-red-400">
                        <TableRow className="border-red-100 dark:border-red-900/30 hover:bg-transparent">
                          <TableHead className="w-32 text-[11px] font-black uppercase tracking-wider pl-8 h-10 text-red-600 dark:text-red-400">{t("table.proto")}</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-wider h-10 text-red-600 dark:text-red-400">{t("table.occurrence")}</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-wider hidden sm:table-cell h-10 text-red-600 dark:text-red-400">{t("table.time")}</TableHead>
                          <TableHead className="text-[11px] font-black uppercase tracking-wider text-right pr-8 h-10 text-red-600 dark:text-red-400">{t("table.status")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {criticalTickets.map(renderTicketRow)}
                      </TableBody>
                    </Table>
                  </div>

                  {totalCriticalTickets > criticalItemsPerPage && (
                    <div className="p-3 border-t border-red-100 dark:border-red-900/30 flex items-center justify-between bg-red-50/30 dark:bg-red-950/10 shrink-0 h-12">
                      <span className="text-[10px] font-bold text-red-700/60 dark:text-red-400/60 uppercase tracking-widest">
                        {t("pagination.page")} {criticalCurrentPage} {t("pagination.of")} {Math.ceil(totalCriticalTickets / criticalItemsPerPage)}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCriticalCurrentPage(p => Math.max(1, p - 1))}
                          disabled={criticalCurrentPage === 1}
                          className="h-7 w-7 p-0 rounded-sm border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600"
                        >
                          <ChevronLeft size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCriticalCurrentPage(p => Math.min(Math.ceil(totalCriticalTickets / criticalItemsPerPage), p + 1))}
                          disabled={criticalCurrentPage === Math.ceil(totalCriticalTickets / criticalItemsPerPage)}
                          className="h-7 w-7 p-0 rounded-sm border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600"
                        >
                          <ChevronRight size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              <Card className="flex flex-col rounded-sm overflow-hidden bg-white dark:bg-zinc-900 shadow-md shadow-zinc-200/50 dark:shadow-none flex-1 min-h-[500px] border-none p-0 transition-colors duration-300">
                <div className="p-[clamp(1rem,3vw,1.5rem)] border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-50/50 dark:bg-zinc-900 gap-[clamp(1rem,3vw,1.5rem)] shrink-0 min-h-[80px]">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-[clamp(0.875rem,2.5vw,1.125rem)]">{t("admin.tickets")}</h3>
                    <div className="text-[clamp(0.65rem,1.5vw,0.75rem)] font-bold text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 shadow-sm">
                      {totalTickets} {t("admin.dash.results")}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        placeholder={t("filter.search")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-10 w-full sm:w-64 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 dark:text-zinc-100 rounded-sm focus:border-[#DC2626] transition-all text-sm shadow-sm"
                      />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-[140px] h-10 rounded-sm border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 dark:text-zinc-100 shadow-sm text-xs font-semibold">
                        <SelectValue>
                          {filterType === "all" ? t("filter.all") :
                            filterType === "Falta de peças" ? t("cat.pecas") :
                              filterType === "AGV com falha" ? t("cat.agv") :
                                filterType === "Colisão" ? t("cat.colisao") :
                                  filterType === "Painel/Botoeira" ? t("cat.painel") :
                                    filterType === "Resíduos" ? t("cat.residuos") :
                                      filterType}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 dark:text-zinc-100 shadow-2xl shadow-zinc-200/50 dark:shadow-none z-[100]">
                        <SelectItem value="all">{t("filter.all")}</SelectItem>
                        <SelectItem value="Falta de peças">{t("cat.pecas")}</SelectItem>
                        <SelectItem value="AGV com falha">{t("cat.agv")}</SelectItem>
                        <SelectItem value="Colisão">{t("cat.colisao")}</SelectItem>
                        <SelectItem value="Painel/Botoeira">{t("cat.painel")}</SelectItem>
                        <SelectItem value="Resíduos">{t("cat.residuos")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex-1 overflow-x-auto w-full">
                  <Table className="min-w-full">
                    <TableHeader className="bg-zinc-50/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400">
                      <TableRow className="border-zinc-100 dark:border-zinc-800 hover:bg-transparent">
                        <TableHead className="w-32 text-[11px] font-black uppercase tracking-wider pl-8 h-12">{t("table.proto")}</TableHead>
                        <TableHead className="text-[11px] font-black uppercase tracking-wider h-12">{t("table.occurrence")}</TableHead>
                        <TableHead className="text-[11px] font-black uppercase tracking-wider hidden sm:table-cell h-12">{t("table.time")}</TableHead>
                        <TableHead className="text-[11px] font-black uppercase tracking-wider text-right pr-8 h-12">{t("table.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {normalTickets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-40 text-center">
                            <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                              <Layers size={32} strokeWidth={1.5} />
                              <p className="font-bold uppercase tracking-widest text-xs">{t("admin.dash.empty")}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        normalTickets.map(renderTicketRow)
                      )}
                    </TableBody>
                  </Table>
                </div>

                {totalTickets > itemsPerPage && (
                  <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30 shrink-0 h-16 transition-colors">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {t("pagination.page")} {currentPage} {t("pagination.of")} {Math.ceil(totalTickets / itemsPerPage)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0 rounded-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalTickets / itemsPerPage), p + 1))}
                        disabled={currentPage === Math.ceil(totalTickets / itemsPerPage)}
                        className="h-8 w-8 p-0 rounded-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ) : activeTab === "performance" ? (
            <AnalyticsTab tickets={tickets} getStatusBadge={getStatusBadge} />
          ) : activeTab === "health" ? (
            <HealthDashboard />
          ) : activeTab === "settings" ? (
            <SettingsContainer />
          ) : null}
        </main>
      </div>

      {/* Ticket Details Panel (Overlay/Drawer) */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end overflow-hidden p-0 md:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ x: "100%", opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-xl h-full bg-white dark:bg-[#0A0A0C] shadow-2xl md:rounded-none overflow-hidden flex flex-col border-l-4 border-l-[#DC2626] border border-zinc-200 dark:border-zinc-800 transition-colors duration-300"
            >
              <div className="p-[clamp(1.5rem,4vw,2rem)] border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start bg-zinc-50 dark:bg-zinc-950 shrink-0">
                <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
                  <div className="flex items-center gap-[clamp(0.25rem,1vw,0.5rem)] flex-wrap">
                    <Badge className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 border-none font-bold font-mono tracking-widest text-[clamp(0.6rem,1.5vw,0.75rem)] px-2 py-1">{selectedTicket.id}</Badge>
                    {getStatusBadge(selectedTicket.status)}
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                  <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-zinc-900 dark:text-white tracking-tight leading-none">{getTranzincdType(selectedTicket.type)}</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium text-[clamp(0.65rem,1.5vw,0.75rem)] flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-500" /> {selectedTicket.location}
                  </p>
                </div>
                <div className="flex items-center gap-[clamp(0.25rem,1vw,0.5rem)]">
                  {(userRole === "SuperAdmin" || userRole === "Admin") && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => { setEditTicketId(selectedTicket.id); setEditFormData(selectedTicket); }} className="h-10 w-10 p-0 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-full border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                        <PenTool size={16} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTicketId(selectedTicket.id)} className="h-10 w-10 p-0 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-full border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedTicket(null)}
                    className="rounded-full h-10 w-10 p-0 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-900 dark:hover:text-white shrink-0 ml-2"
                  >
                    <X size={20} />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-[clamp(1.5rem,4vw,2rem)] space-y-[clamp(1.5rem,4vw,2rem)] bg-white dark:bg-zinc-900 transition-colors">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[clamp(1rem,3vw,2rem)]">
                  <div className="p-[clamp(1rem,3vw,1.5rem)] rounded-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 transition-colors">
                    <DetailItem label="AGV" value={selectedTicket.agv_number ? `AGV #${selectedTicket.agv_number}` : "N/A"} color="text-[#DC2626] dark:text-red-400" />
                  </div>
                  <div className="p-[clamp(1rem,3vw,1.5rem)] rounded-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 transition-colors">
                    <DetailItem label={t("modal.date")} value={new Date(selectedTicket.created_at).toLocaleString('pt-BR')} />
                  </div>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[clamp(1rem,3vw,2rem)]">
                  <div className="p-[clamp(1rem,3vw,1.5rem)] rounded-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 transition-colors">
                    <DetailItem label={t("op.impact")} value={selectedTicket.operational_impact ? t(`op.impact.${selectedTicket.operational_impact}`) : "-"} />
                  </div>
                  <div className="p-[clamp(1rem,3vw,1.5rem)] rounded-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 transition-colors">
                    <DetailItem label={t("op.downtime")} value={selectedTicket.downtime ? t(`op.downtime.${selectedTicket.downtime}`) : "-"} />
                  </div>
                </div>

                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[clamp(1rem,3vw,2rem)]">
                  <div className="p-[clamp(1rem,3vw,1.5rem)] rounded-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 transition-colors">
                    <DetailItem label={t("modal.operator")} value={selectedTicket.operator_name || t("modal.unknown")} />
                  </div>
                  <div className="p-[clamp(1rem,3vw,1.5rem)] rounded-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 transition-colors">
                    <DetailItem label={t("modal.matricula")} value={selectedTicket.operator_matricula || "N/A"} />
                  </div>
                </div>

                {selectedTicket.type === "Falta de peças" && (
                  <div className="p-[clamp(1rem,3vw,1.5rem)] bg-amber-50/50 dark:bg-amber-900/10 rounded-sm border border-amber-100 dark:border-amber-900/30 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[clamp(1rem,3vw,1.5rem)] transition-colors">
                    <DetailItem label={t("modal.part")} value={selectedTicket.part_name || "-"} />
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-[clamp(0.5rem,1.5vw,1rem)]">
                      <DetailItem label={t("op.sap")} value={selectedTicket.sap_number || "-"} />
                      <DetailItem label={t("modal.side")} value={selectedTicket.side || "-"} />
                    </div>
                  </div>
                )}

                <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
                  <h3 className="text-[clamp(0.55rem,1.5vw,0.65rem)] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest flex items-center gap-2"><PenTool size={12} /> {t("modal.obs")}</h3>
                  <div className="bg-zinc-50/80 dark:bg-zinc-950 p-[clamp(1rem,3vw,1.5rem)] rounded-sm border border-zinc-100 dark:border-zinc-800 min-h-[80px] shadow-sm transition-colors">
                    <p className="text-zinc-700 dark:text-zinc-300 text-[clamp(0.875rem,2.5vw,1rem)] font-medium leading-relaxed whitespace-pre-wrap">{selectedTicket.observation || t("modal.no_obs")}</p>
                  </div>
                </div>

                {selectedTicket.image_path && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest flex items-center gap-2"><Eye size={12} /> {t("op.step3.visual")}</h3>
                    <div className="rounded-sm overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shadow-md transition-colors">
                      {/* deepcode ignore DOMXSS: URL validated by sanitizeImageSrc strict allowlist */}
                      <img src={DOMPurify.sanitize(sanitizeImageSrc(selectedTicket.image_path))} alt="Evidência" className="w-full h-auto object-contain max-h-[300px] hover:scale-[1.02] transition-transform duration-500" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-[clamp(1.5rem,4vw,2rem)] bg-zinc-50/80 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 shrink-0 transition-colors">
                <p className="text-[clamp(0.55rem,1.5vw,0.65rem)] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest mb-[clamp(1rem,3vw,1.5rem)] flex items-center gap-2 justify-center"><Settings size={12} /> {t("modal.update_status")}</p>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-[clamp(0.5rem,1.5vw,1rem)]">
                  <StatusActionButton
                    label={t("status.open")}
                    active={selectedTicket.status === "Aberto"}
                    onClick={() => updateStatus(selectedTicket.id, "Aberto")}
                    activeColor="bg-[#DC2626] shadow-md shadow-blue-500/30"
                  />
                  <StatusActionButton
                    label={t("status.progress")}
                    active={selectedTicket.status === "Em atendimento"}
                    onClick={() => {
                      if (userRole === "SuperAdmin" || userRole === "Admin") {
                        setStartTicketId(selectedTicket.id);
                      } else {
                        handleStartTicket(selectedTicket.id);
                      }
                    }}
                    activeColor="bg-red-600 shadow-md shadow-blue-600/30"
                  />
                  <StatusActionButton
                    label={t("status.finished")}
                    active={selectedTicket.status === "Finalizado"}
                    onClick={() => {
                      const username = localStorage.getItem("admin-username") || "";
                      if (userRole === "SuperAdmin" || selectedTicket.assigned_to === username) {
                        setFinishTicketId(selectedTicket.id);
                      } else {
                        toast.error(t("toast.finish_error_auth") || "Apenas o responsável pelo atendimento ou um SuperAdmin podem finalizar este chamado.");
                      }
                    }}
                    activeColor="bg-zinc-900 dark:bg-zinc-800 shadow-md shadow-zinc-900/30 dark:shadow-none"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Start Ticket Modal */}
      <AnimatePresence>
        {startTicketId && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setStartTicketId(null)} className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }} className="relative w-full max-w-sm bg-white dark:bg-[#0A0A0C] rounded-none shadow-2xl overflow-hidden border-l-4 border-l-[#DC2626] border border-zinc-200 dark:border-zinc-800 transition-colors">
              <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-none flex items-center justify-center border border-red-200 dark:border-red-900/50 shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{t("modal.start_service")}</h3>
                      <span className="text-[9px] font-mono bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 px-1 py-0.5 rounded-sm font-bold">SYS-INIT</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t("modal.start_desc")}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t("res.resp")}</label>
                  <select
                    value={assignedToUser}
                    onChange={(e) => setAssignedToUser(e.target.value)}
                    className="w-full h-12 px-4 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-medium text-sm text-zinc-900 dark:text-zinc-100 focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors outline-none shadow-sm"
                  >
                    <option value="" disabled>{t("modal.select_user")}</option>
                    {usersList.filter((u: any) => u.role !== "Usuário").map((u: any) => (
                      <option key={u.id} value={u.matricula} className="bg-white dark:bg-zinc-900">{u.username} ({u.matricula})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" className="flex-1 h-12 rounded-none text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setStartTicketId(null)}>{t("modal.cancel")}</Button>
                  <Button className="flex-1 h-12 rounded-none bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20" onClick={handleStartTicket} disabled={!assignedToUser}>{t("modal.confirm_start")}</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Ticket Modal */}
      <AnimatePresence>
        {deleteTicketId && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteTicketId(null)} className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }} className="relative w-full max-w-sm bg-white dark:bg-[#0A0A0C] rounded-none shadow-2xl overflow-hidden border-l-4 border-l-[#DC2626] border border-zinc-200 dark:border-zinc-800 transition-colors">
              <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-none flex items-center justify-center border border-red-200 dark:border-red-900/50 shrink-0">
                    <Trash2 size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{t("modal.delete_title")}</h3>
                      <span className="text-[9px] font-mono bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 px-1 py-0.5 rounded-sm font-bold">TKT-DEL</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t("modal.delete_desc")} #{deleteTicketId}?</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400 text-center">{t("modal.delete_warn")}</p>
                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" className="flex-1 h-12 rounded-none text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setDeleteTicketId(null)}>{t("modal.cancel")}</Button>
                  <Button className="flex-1 h-12 rounded-none bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20" onClick={handleDeleteTicket}>{t("modal.confirm_delete")}</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Ticket Modal */}
      <AnimatePresence>
        {editTicketId && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditTicketId(null)} className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }} className="relative w-full max-w-sm bg-white dark:bg-[#0A0A0C] rounded-none shadow-2xl overflow-hidden border-l-4 border-l-[#DC2626] border border-zinc-200 dark:border-zinc-800 transition-colors">
              <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-none flex items-center justify-center border border-red-200 dark:border-red-900/50 shrink-0">
                    <PenTool size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{t("modal.edit_title") || "Editar Chamado"}</h3>
                      <span className="text-[9px] font-mono bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 px-1 py-0.5 rounded-sm font-bold">TKT-EDIT</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Modificar Propriedades do Chamado</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t("priority")}</label>
                  <select
                    value={editFormData.priority || ""}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                    className="w-full h-12 px-4 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-medium text-sm text-zinc-900 dark:text-zinc-100 focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors outline-none shadow-sm"
                  >
                    <option value="Baixo" className="bg-white dark:bg-zinc-900">{t("priority.low")}</option>
                    <option value="Médio" className="bg-white dark:bg-zinc-900">{t("priority.medium")}</option>
                    <option value="Alto" className="bg-white dark:bg-zinc-900">{t("priority.high")}</option>
                    <option value="Crítico" className="bg-white dark:bg-zinc-900">{t("priority.critical")}</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="ghost" className="flex-1 h-12 rounded-none text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setEditTicketId(null)}>{t("modal.cancel")}</Button>
                  <Button className="flex-1 h-12 rounded-none bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20" onClick={handleEditTicket}>{t("modal.save") || "Salvar"}</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Finish Ticket Modal */}
      <AnimatePresence>
        {finishTicketId && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFinishTicketId(null)} className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }} className="relative w-full max-w-md bg-white dark:bg-[#0A0A0C] rounded-none shadow-2xl overflow-hidden border-l-4 border-l-emerald-500 border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[95vh] transition-colors">
              <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-none flex items-center justify-center border border-emerald-200 dark:border-emerald-900/50 shrink-0">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{t("modal.finish_service")}</h3>
                      <span className="text-[9px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 px-1 py-0.5 rounded-sm font-bold">SYS-RESOLVE</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t("modal.finish_desc")}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar bg-white dark:bg-[#0C0C0E]">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><PenTool size={12} /> {t("modal.report")} <span className="text-[#DC2626] dark:text-red-400">*</span></label>
                  <textarea
                    placeholder={t("modal.report.placeholder")}
                    value={resolutionReport}
                    onChange={(e) => setResolutionReport(e.target.value)}
                    className="w-full min-h-[120px] p-4 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-medium text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 dark:focus:border-emerald-600 focus:bg-white dark:focus:bg-zinc-900 transition-colors outline-none shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><Eye size={12} /> {t("modal.photo")}</label>
                  <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-none cursor-pointer bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors">
                    {resolutionImage ? (
                      <div className="text-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                        <p className="text-[11px] font-black text-zinc-600 dark:text-zinc-300 tracking-widest">{t("op.file_attached").toUpperCase()}</p>
                      </div>
                    ) : (
                      <div className="text-center text-zinc-400 dark:text-zinc-500">
                        <UploadCloud className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-[11px] font-black tracking-widest">{t("modal.photo")}</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        try {
                          const imageCompression = (await import('browser-image-compression')).default;
                          const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: false };
                          const compressedBlob = await imageCompression(file, options);
                          const compressedFile = new File([compressedBlob], file.name, { type: file.type });
                          setResolutionImage(compressedFile);
                        } catch (error) {
                          setResolutionImage(file);
                        }
                      }
                    }} />
                  </label>
                </div>
              </div>

              <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800/80 shrink-0 flex gap-3 transition-colors">
                <Button variant="ghost" className="flex-1 h-12 rounded-none text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setFinishTicketId(null)} disabled={finishing}>{t("modal.cancel")}</Button>
                <Button className="flex-1 h-12 rounded-none bg-zinc-900 dark:bg-emerald-600 hover:bg-zinc-800 dark:hover:bg-emerald-700 text-white font-bold shadow-md shadow-zinc-900/30 dark:shadow-none" onClick={handleFinishTicket} disabled={finishing || !resolutionReport}>
                  {finishing ? <RefreshCw className="h-5 w-5 animate-spin" /> : t("modal.confirm_finish")}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
