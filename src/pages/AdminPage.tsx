import React, { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Search, RefreshCw, Clock, CheckCircle, AlertCircle, Layers, Menu } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { LanguageSelector } from "../components/LanguageSelector";
import { ThemeToggle } from "../components/ThemeToggle";
import { ModernStatCard } from "../components/admin/ModernStatCard";
import { SettingsContainer } from "./SettingsContainer";
import { AnalyticsTab } from "./AnalyticsTab";
import { ApmContainer } from "./ApmContainer";
import { Ticket } from "../types/ticket";
import { useTickets } from "../hooks/admin/useTickets";
import { useTicketActions } from "../hooks/admin/useTicketActions";
import { TicketTable } from "../components/admin/tables/TicketTable";

// Lazy loading the modals since they are heavy
const TicketDetailModal = lazy(() => import("../components/admin/modals/TicketDetailModal"));
const ActionModals = lazy(() => import("../components/admin/modals/ActionModals").then(mod => ({ default: mod.ActionModals })));
const FinishTicketModal = lazy(() => import("../components/admin/modals/FinishTicketModal").then(mod => ({ default: mod.FinishTicketModal })));
const EditTicketModal = lazy(() => import("../components/admin/modals/EditTicketModal").then(mod => ({ default: mod.EditTicketModal })));

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("operacao");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [criticalCurrentPage, setCriticalCurrentPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [startTicketId, setStartTicketId] = useState<string | null>(null);
  const [assignedToUser, setAssignedToUser] = useState("");
  const [assignSearch, setAssignSearch] = useState("");
  const [finishTicketId, setFinishTicketId] = useState<string | null>(null);
  const [resolutionReport, setResolutionReport] = useState("");
  const [resolutionImage, setResolutionImage] = useState<File | null>(null);
  const [editTicketId, setEditTicketId] = useState<string | null>(null);
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Ticket>>({});

  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const userRole = localStorage.getItem("admin-role") || "Usuário";
  const adminPath = (import.meta as any).env.VITE_ADMIN_PATH || "admin";

  const {
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
  } = useTickets({
    activeTab,
    currentPage,
    criticalCurrentPage,
    filterStatus,
    filterType,
    searchTerm,
    startDate,
    endDate,
    itemsPerPage: 10,
    criticalItemsPerPage: 3,
    userRole
  });

  const {
    finishing,
    handleDeleteTicket,
    handleEditTicket,
    handleStartTicket,
    handleFinishTicket,
    updateStatus
  } = useTicketActions({
    tickets,
    setTickets,
    selectedTicket,
    setSelectedTicket,
    fetchTickets,
    userRole,
    t
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", headers: { "X-Requested-With": "XMLHttpRequest" } });
    } catch (e) { console.error("Logout request failed:", e); }
    localStorage.removeItem("admin-token");
    navigate(`/${adminPath}/login`);
  };

  const normalTickets = tickets.filter(ticket => ticket.priority !== "Crítico");

  return (
    <div className="flex h-[100dvh] w-screen bg-zinc-50 dark:bg-[#000000] overflow-hidden font-sans transition-colors duration-300">
      <div className="flex-1 flex flex-col min-w-0 pb-0">
        <header className="h-[clamp(4rem,10vw,4.5rem)] bg-[#0A0A0A] dark:bg-[#050505] border-b border-red-600/20 px-[clamp(1rem,3vw,2rem)] flex items-center justify-between shrink-0 transition-colors duration-300 relative">
          <div className="flex items-center gap-2 z-10">
             <span className="h-5 w-1 bg-[#DC2626] inline-block animate-pulse"></span>
             <span className="text-xl font-black tracking-widest text-[#DC2626] dark:text-red-500">AXION</span>
             <span className="hidden min-[350px]:inline-flex ml-1 text-[9px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase bg-zinc-800 dark:bg-zinc-900 px-1.5 py-0.5 rounded-none border border-zinc-700/50 dark:border-zinc-800/50">
               <span className="hidden sm:inline">{t("app.free_license")}</span>
               <span className="inline sm:hidden">{t("app.free_license_short")}</span>
             </span>
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
            <div className="hidden md:flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => { fetchTickets(); fetchCriticalTickets(); }} className="rounded-full h-10 w-10 text-zinc-400 hover:text-red-500 hover:bg-red-500/20 transition-colors">
                <RefreshCw className={`h-[18px] w-[18px] ${loading ? 'animate-spin text-red-500' : ''}`} />
              </Button>
            </div>
            <div className="hidden md:block"><LanguageSelector minimalOnMobile={false} /></div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full h-10 w-10 text-zinc-400 hover:text-red-500 hover:bg-red-500/20 transition-colors">
              <LogOut className="h-[18px] w-[18px]" />
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 text-zinc-400 hover:text-red-500 hover:bg-red-500/20 rounded-full" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu size={20} />
            </Button>
          </div>
        </header>

        {isMobileMenuOpen && (
           <div className="md:hidden bg-[#0A0A0A] border-b border-red-600/20 p-4 flex flex-col gap-3 z-[100] animate-in slide-in-from-top duration-200">
               <div className="flex items-center justify-end border-b border-zinc-800 pb-3 gap-2">
                  <ThemeToggle />
                  <LanguageSelector minimalOnMobile={false} />
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
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-[clamp(1rem,3vw,1.5rem)] shrink-0">
                <ModernStatCard label={t("admin.metrics.total")} value={statsData.total} icon={Layers} color="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300" />
                <ModernStatCard label={t("admin.metrics.open")} value={statsData.open} icon={AlertCircle} color="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" textColor="text-red-600 dark:text-red-400" />
                <ModernStatCard label={t("admin.metrics.progress")} value={statsData.pending} icon={Clock} color="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" textColor="text-red-600 dark:text-red-400" />
                <ModernStatCard label={t("admin.metrics.finished")} value={statsData.finished} icon={CheckCircle} color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" textColor="text-emerald-600 dark:text-emerald-400" />
              </div>

              {criticalTickets.length > 0 && (
                <Card className="flex flex-col rounded-sm overflow-hidden bg-white dark:bg-zinc-900 shadow-[0_0_40px_-10px_rgba(239,68,68,0.45)] flex-none border-none mb-6 p-0 transition-colors duration-300">
                  <div className="p-6 border-b border-red-100 dark:border-red-900/30 flex items-center justify-between gap-4 bg-red-50/50 dark:bg-red-950/20 shrink-0 min-h-[80px] transition-colors duration-300">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="text-red-500" size={20} />
                      <h3 className="font-bold text-red-700 text-sm">{t("admin.critical_tickets")}</h3>
                      <div className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded border border-red-200 shadow-sm">{totalCriticalTickets}</div>
                    </div>
                  </div>
                  <TicketTable
                    tickets={criticalTickets}
                    t={t}
                    language={language}
                    onRowClick={setSelectedTicket}
                    totalTickets={totalCriticalTickets}
                    itemsPerPage={3}
                    currentPage={criticalCurrentPage}
                    onPageChange={setCriticalCurrentPage}
                    isCompact={true}
                  />
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
                        <SelectValue>{filterType === "all" ? t("filter.all") : filterType}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 dark:text-zinc-100 shadow-2xl z-[100]">
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
                <TicketTable
                  tickets={normalTickets}
                  t={t}
                  language={language}
                  onRowClick={setSelectedTicket}
                  totalTickets={totalTickets}
                  itemsPerPage={10}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </Card>
            </div>
          ) : activeTab === "performance" ? (
            <AnalyticsTab tickets={tickets} getStatusBadge={() => <></>} usersList={usersList} /> 
          ) : activeTab === "health" ? (
            <ApmContainer />
          ) : activeTab === "settings" ? (
            <SettingsContainer />
          ) : null}
        </main>
      </div>

      <Suspense fallback={null}>
        {selectedTicket && (
          <TicketDetailModal
            selectedTicket={selectedTicket}
            setSelectedTicket={setSelectedTicket}
            userRole={userRole}
            t={t}
            setEditTicketId={setEditTicketId}
            setEditFormData={setEditFormData}
            setDeleteTicketId={setDeleteTicketId}
            updateStatus={updateStatus}
            setStartTicketId={setStartTicketId}
            handleStartTicket={(id) => handleStartTicket(id, "", () => setStartTicketId(null))}
            setFinishTicketId={setFinishTicketId}
          />
        )}
        {(startTicketId || deleteTicketId) && (
          <ActionModals
            t={t}
            startTicketId={startTicketId}
            setStartTicketId={setStartTicketId}
            assignSearch={assignSearch}
            setAssignSearch={setAssignSearch}
            usersList={usersList}
            assignedToUser={assignedToUser}
            setAssignedToUser={setAssignedToUser}
            handleStartTicket={(id, assignee) => handleStartTicket(id, assignee, () => setStartTicketId(null))}
            deleteTicketId={deleteTicketId}
            setDeleteTicketId={setDeleteTicketId}
            handleDeleteTicket={(id) => handleDeleteTicket(id, () => setDeleteTicketId(null))}
          />
        )}
        {finishTicketId && (
          <FinishTicketModal
            t={t}
            finishTicketId={finishTicketId}
            setFinishTicketId={setFinishTicketId}
            resolutionReport={resolutionReport}
            setResolutionReport={setResolutionReport}
            resolutionImage={resolutionImage}
            setResolutionImage={setResolutionImage}
            handleFinishTicket={(id, report, image) => handleFinishTicket(id, report, image, () => setFinishTicketId(null))}
            finishing={finishing}
          />
        )}
        {editTicketId && (
          <EditTicketModal
            t={t}
            editTicketId={editTicketId}
            setEditTicketId={setEditTicketId}
            editFormData={editFormData}
            setEditFormData={setEditFormData}
            handleEditTicket={(id, data) => handleEditTicket(id, data, () => setEditTicketId(null))}
          />
        )}
      </Suspense>
    </div>
  );
}
