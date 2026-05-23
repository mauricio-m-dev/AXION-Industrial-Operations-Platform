import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Trash2, UserPlus, Loader2, AlertCircle, ChevronLeft, ChevronRight, X, PenTool } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../contexts/LanguageContext";

interface User {
  id: string;
  username: string;
  role: string;
  matricula?: string;
  whatsapp?: string;
  email?: string;
  notificationPreference?: string;
  allowedTicketTypes?: string[];
}

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [matricula, setMatricula] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Usuário");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [notificationPreference, setNotificationPreference] = useState("none");
  const AVAILABLE_TYPES = [
    "AGV com falha", "Colisão", "Falta de peças", "Painel/Botoeira", "Resíduos", "Erro de Software", "Bateria Fraca"
  ];
  const [allowedTicketTypes, setAllowedTicketTypes] = useState<string[]>(AVAILABLE_TYPES);
  const [typeSearch, setTypeSearch] = useState("");
  const [editTypeSearch, setEditTypeSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { t } = useLanguage();
  const currentUserRole = localStorage.getItem("admin-role") || "Usuário";

  const getTranzincdTypeLabel = (type: string) => {
    switch (type) {
      case "AGV com falha": return t("cat.agv") || type;
      case "Colisão": return t("cat.colisao") || type;
      case "Falta de peças": return t("cat.pecas") || type;
      case "Painel/Botoeira": return t("cat.painel") || type;
      case "Resíduos": return t("cat.residuos") || type;
      default: return type;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users", {
        headers: { }
      });
      if (response.status === 401) {
        localStorage.removeItem("admin-token");
        window.location.href = `/${(import.meta as any).env.VITE_ADMIN_PATH || "admin"}/login`;
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error(t("error.send"));
      }
    } catch (error) {
      console.error("Fetch users error:", error);
      toast.error(t("error.send"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !matricula || !password) return;
    if (password.length < 6) {
      toast.error(t("users.password.min"));
      return;
    }
    if (notificationPreference === 'whatsapp' || notificationPreference === 'both') {
      if (!whatsapp.trim()) {
        toast.error("WhatsApp é obrigatório para esta preferência.");
        return;
      }
    }
    if (notificationPreference === 'email' || notificationPreference === 'both') {
      if (!email.trim()) {
        toast.error("E-mail é obrigatório para esta preferência.");
        return;
      }
    }

    setSubmitLoading(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({ username, matricula, password, role, whatsapp, email, notificationPreference, allowedTicketTypes }),
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(t("users.success"));
        setUsername("");
        setMatricula("");
        setPassword("");
        setWhatsapp("");
        setEmail("");
        setNotificationPreference("none");
        setAllowedTicketTypes(AVAILABLE_TYPES);
        fetchUsers();
      } else {
        toast.error(data.error || t("users.error"));
      }
    } catch (error) {
      toast.error(t("users.error"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: { 
          
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(t("users.delete.success"));
        setDeleteConfirm(null);
        fetchUsers();
      } else {
        toast.error(data.error || t("users.delete.error"));
      }
    } catch (error) {
      toast.error(t("users.delete.error"));
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    
    setSubmitLoading(true);
    try {
      const response = await fetch(`/api/users/${editUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify(editUser),
      });
      const data = await response.json();

      if (response.ok) {
        toast.success("Usuário atualizado com sucesso");
        setEditUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || "Erro ao atualizar usuário");
      }
    } catch (error) {
      toast.error("Erro ao conectar com servidor");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{t("users.title")}</h2>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">{t("users.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Form */}
        <Card className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-sm bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none p-0 lg:col-span-1 h-fit transition-colors duration-300">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-red-50 dark:bg-red-900/30 text-[#DC2626] dark:text-red-400 rounded-sm transition-colors">
                <UserPlus size={20} />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{t("users.add")}</h3>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  {t("users.username")}
                </label>
                <Input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="h-11 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 focus:bg-white transition-colors"
                  disabled={submitLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  {t("users.matricula")}
                </label>
                <Input
                  type="text"
                  required
                  value={matricula}
                  maxLength={7}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 7) {
                      setMatricula(val);
                    }
                  }}
                  placeholder="Ex: 1234567"
                  className="h-11 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 focus:bg-white transition-colors"
                  disabled={submitLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  {t("users.password")}
                </label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="h-11 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 focus:bg-white transition-colors"
                  disabled={submitLoading}
                />
                <p className="text-[10px] text-zinc-400 font-medium">{t("users.password.min")}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  {t("users.role")}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-11 px-3 rounded-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 text-sm focus:bg-white outline-none"
                  disabled={submitLoading}
                >
                  <option value="Usuário">{t("users.role.standard")}</option>
                  <option value="Moderador">{t("users.role.manu")}</option>
                  <option value="Admin">Admin</option>
                  {currentUserRole === "SuperAdmin" && (
                    <option value="SuperAdmin">{t("users.role.super")}</option>
                  )}
                </select>
              </div>

              {(role === "Moderador" || role === "Admin") && (
                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in-50 duration-300">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-black uppercase tracking-widest text-[#DC2626] dark:text-red-400">
                      Tipos de Chamados Permitidos
                    </label>
                    <p className="text-[10px] text-zinc-400 font-medium">Selecione quais chamados este moderador visualizará</p>
                  </div>
                  <Input
                    placeholder="Filtrar tipos..."
                    value={typeSearch}
                    onChange={(e) => setTypeSearch(e.target.value)}
                    className="h-8 text-xs border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-zinc-50 dark:bg-zinc-950 rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-inner">
                    {AVAILABLE_TYPES.filter(tItem => getTranzincdTypeLabel(tItem).toLowerCase().includes(typeSearch.toLowerCase())).map(tItem => {
                      const isChecked = allowedTicketTypes.includes(tItem);
                      return (
                        <label key={tItem} className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-zinc-900 rounded-sm cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAllowedTicketTypes([...allowedTicketTypes, tItem]);
                              } else {
                                setAllowedTicketTypes(allowedTicketTypes.filter(item => item !== tItem));
                              }
                            }}
                            className="rounded border-zinc-300 text-[#DC2626] focus:ring-[#DC2626]"
                          />
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 select-none">
                            {getTranzincdTypeLabel(tItem)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  {t("users.notif.pref")}
                </label>
                <select
                  value={notificationPreference}
                  onChange={(e) => setNotificationPreference(e.target.value)}
                  className="w-full h-11 px-3 rounded-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 text-sm focus:bg-white outline-none"
                  disabled={submitLoading}
                >
                  <option value="none">{t("users.notif.none")}</option>
                  <option value="whatsapp">{t("users.notif.whatsapp")}</option>
                  <option value="email">{t("users.notif.email")}</option>
                  <option value="both">{t("users.notif.both")}</option>
                </select>
              </div>

              {(notificationPreference === "whatsapp" || notificationPreference === "both") && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    {t("users.whatsapp")}
                  </label>
                  <Input
                    type="text"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+5511999999999"
                    className="h-11 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 focus:bg-white transition-colors"
                    disabled={submitLoading}
                  />
                </div>
              )}

              {(notificationPreference === "email" || notificationPreference === "both") && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    {t("users.email")}
                  </label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="h-11 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 focus:bg-white transition-colors"
                    disabled={submitLoading}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 rounded-sm bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold mt-2 transition-all shadow-md shadow-[#DC2626]/20"
                disabled={submitLoading || !username || password.length < 6 || matricula.length !== 7}
              >
                {submitLoading ? <Loader2 className="animate-spin h-5 w-5" /> : t("users.add")}
              </Button>
            </form>
          </div>
        </Card>

        {/* Users List */}
        <Card className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-sm bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none lg:col-span-2 overflow-hidden p-0 transition-colors duration-300">
          <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/50 min-h-[80px] border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 transition-colors duration-300">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{t("users.title")}</h3>

            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Input
                placeholder={t("filter.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full sm:w-64 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 dark:text-zinc-100 rounded-sm focus:border-[#DC2626] transition-all text-xs"
              />
              <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-sm border border-zinc-200 dark:border-zinc-700 shadow-sm dark:shadow-none shrink-0 transition-colors">
                {users.length} {t("admin.nav.users").toLowerCase()}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto w-full">
            <Table className="min-w-full">
              <TableHeader className="bg-white dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 transition-colors duration-300">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-black uppercase tracking-wider pl-6 h-12 text-zinc-400">
                    {t("users.username")}
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider h-12 text-zinc-400">
                    {t("users.matricula")}
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-right pr-6 h-12 text-zinc-400">
                    {t("audit.action")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-40 text-center">
                      <Loader2 className="animate-spin h-8 w-8 text-zinc-300 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                        <Users size={32} strokeWidth={1.5} className="opacity-50" />
                        <p className="font-bold uppercase tracking-widest text-xs opacity-60">{t("users.empty")}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));
                    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
                    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                    if (filteredUsers.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={3} className="h-40 text-center">
                            <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                              <Users size={32} strokeWidth={1.5} className="opacity-50" />
                              <p className="font-bold uppercase tracking-widest text-xs opacity-60">{t("users.empty")}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <>
                        {paginatedUsers.map((user) => (
                          <TableRow key={user.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors border-zinc-100 dark:border-zinc-800">
                            <TableCell className="pl-6 py-4">
                              <span className="font-bold text-zinc-800 dark:text-zinc-100">{user.username}</span>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-red-600 dark:text-red-400">{user.matricula}</span>
                                {user.role === "SuperAdmin" && (
                                  <span className="text-[9px] bg-red-100 text-[#DC2626] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{t("users.role.super")}</span>
                                )}
                                {user.role === "Admin" && (
                                  <span className="text-[9px] bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
                                )}
                                {user.role === "Moderador" && (
                                  <span className="text-[9px] bg-purple-100 text-purple-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{t("users.role.manu")}</span>
                                )}
                                {user.role === "Usuário" && (
                                  <span className="text-[9px] bg-zinc-100 text-zinc-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{t("users.role.standard")}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="pr-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                {/* Only show actions if authorized (cannot edit/delete SuperAdmin unless you are one) */}
                                {(user.role !== "SuperAdmin" || currentUserRole === "SuperAdmin") && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditUser({
                                          ...user,
                                          allowedTicketTypes: user.allowedTicketTypes || AVAILABLE_TYPES
                                        });
                                        setEditTypeSearch("");
                                      }}
                                      className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-sm"
                                    >
                                      <PenTool size={16} />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeleteConfirm(user.id)}
                                      className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-sm"
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    );
                  })()
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase())).length > itemsPerPage && (
            <div className="p-4 bg-zinc-50/30 dark:bg-zinc-900/30 h-16 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 transition-colors duration-300">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {t("pagination.page")} {currentPage} {t("pagination.of")} {Math.ceil(users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase())).length / itemsPerPage)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 rounded-sm border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase())).length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase())).length / itemsPerPage)}
                  className="h-8 w-8 p-0 rounded-sm border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Delete User Modal Redesigned */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#0A0A0C] border-l-4 border-l-[#DC2626] border border-zinc-200 dark:border-zinc-800 rounded-none shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-none flex items-center justify-center border border-red-200 dark:border-red-900/50 shrink-0">
                  <AlertCircle size={20} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{t("users.delete.confirm")}?</h3>
                    <span className="text-[9px] font-mono bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 px-1 py-0.5 rounded-sm font-bold">USR-DEL</span>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t("modal.delete_warn")}</p>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6">
                  Esta ação excluirá permanentemente o usuário selecionado do sistema de logs e permissões de acesso.
                </p>
                <div className="flex gap-3 justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                  <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="rounded-none font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    {t("users.cancel")}
                  </Button>
                  <Button onClick={() => handleDelete(deleteConfirm)} className="rounded-none font-bold bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-md shadow-[#DC2626]/20">
                    {t("users.delete")}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditUser(null)}
              className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0A0A0C] border-l-4 border-l-[#DC2626] border border-zinc-200 dark:border-zinc-800 rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-none flex items-center justify-center border border-red-200 dark:border-red-900/50 shrink-0">
                    <PenTool size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{t("users.edit")}</h3>
                      <span className="text-[9px] font-mono bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 px-1 py-0.5 rounded-sm font-bold">USR-MOD</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Modificar Acesso de Usuário</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditUser(null)} className="h-8 w-8 rounded-none hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-950 dark:hover:text-white shrink-0">
                  <X size={16} />
                </Button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-white dark:bg-[#0C0C0E] custom-scrollbar">
                <form id="edit-user-form" onSubmit={handleEdit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t("users.username")}</label>
                    <Input
                      type="text"
                      required
                      value={editUser.username}
                      onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                      className="h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 rounded-none focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t("users.matricula")}</label>
                    <Input
                      type="text"
                      required
                      value={editUser.matricula || ""}
                      maxLength={7}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 7) {
                          setEditUser({ ...editUser, matricula: val });
                        }
                      }}
                      className="h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 rounded-none focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t("users.password")} (Opcional)</label>
                    <Input
                      type="password"
                      placeholder="Deixe em branco para manter a atual"
                      value={editUser.password || ""}
                      onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                      className="h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 rounded-none focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                    />
                    {editUser.password && editUser.password.length < 6 && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">
                        A senha deve ter no mínimo 6 caracteres.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t("users.role")}</label>
                    <select
                      value={editUser.role || "Usuário"}
                      onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                      className="w-full h-11 px-3 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 text-sm focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors outline-none"
                    >
                      <option value="Usuário">{t("users.role.standard")}</option>
                      <option value="Moderador">{t("users.role.manu")}</option>
                      <option value="Admin">Admin</option>
                      {currentUserRole === "SuperAdmin" && (
                        <option value="SuperAdmin">{t("users.role.super")}</option>
                      )}
                    </select>
                  </div>

                  {(editUser.role === "Moderador" || editUser.role === "Admin") && (
                    <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 animate-in fade-in-50 duration-300">
                      <div className="flex flex-col">
                        <label className="text-[11px] font-black uppercase tracking-widest text-[#DC2626] dark:text-red-400">
                          Tipos de Chamados Permitidos
                        </label>
                        <p className="text-[10px] text-zinc-400 font-medium">Selecione quais chamados este moderador visualizará</p>
                      </div>
                      <Input
                        placeholder="Filtrar tipos..."
                        value={editTypeSearch}
                        onChange={(e) => setEditTypeSearch(e.target.value)}
                        className="h-8 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 dark:text-zinc-100 rounded-none focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-zinc-50 dark:bg-zinc-950 rounded-none border border-zinc-200 dark:border-zinc-800/80 shadow-inner">
                        {AVAILABLE_TYPES.filter(tItem => getTranzincdTypeLabel(tItem).toLowerCase().includes(editTypeSearch.toLowerCase())).map(tItem => {
                          const currentAllowed = editUser.allowedTicketTypes || [];
                          const isChecked = currentAllowed.includes(tItem);
                          return (
                            <label key={tItem} className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-zinc-900 rounded-none cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  let newAllowed = [...currentAllowed];
                                  if (e.target.checked) {
                                    if (!newAllowed.includes(tItem)) newAllowed.push(tItem);
                                  } else {
                                    newAllowed = newAllowed.filter(item => item !== tItem);
                                  }
                                  setEditUser({ ...editUser, allowedTicketTypes: newAllowed });
                                }}
                                className="rounded border-zinc-300 text-[#DC2626] focus:ring-[#DC2626]"
                              />
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 select-none">
                                {getTranzincdTypeLabel(tItem)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t("users.notif.pref")}</label>
                    <select
                      value={editUser.notificationPreference || "none"}
                      onChange={(e) => setEditUser({ ...editUser, notificationPreference: e.target.value })}
                      className="w-full h-11 px-3 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 text-sm focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors outline-none"
                    >
                      <option value="none">{t("users.notif.none")}</option>
                      <option value="whatsapp">{t("users.notif.whatsapp")}</option>
                      <option value="email">{t("users.notif.email")}</option>
                      <option value="both">{t("users.notif.both")}</option>
                    </select>
                  </div>
                  {(editUser.notificationPreference === "whatsapp" || editUser.notificationPreference === "both") && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t("users.whatsapp")}</label>
                      <Input
                        type="text"
                        value={editUser.whatsapp || ""}
                        onChange={(e) => setEditUser({ ...editUser, whatsapp: e.target.value })}
                        className="h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 rounded-none focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                      />
                    </div>
                  )}
                  {(editUser.notificationPreference === "email" || editUser.notificationPreference === "both") && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t("users.email")}</label>
                      <Input
                        type="email"
                        value={editUser.email || ""}
                        onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                        className="h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 rounded-none focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                      />
                    </div>
                  )}
                </form>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex gap-3 justify-end transition-colors duration-300 shrink-0">
                <Button variant="ghost" onClick={() => setEditUser(null)} className="rounded-none font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  {t("users.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  form="edit-user-form" 
                  disabled={submitLoading || (!!editUser.password && editUser.password.length < 6) || editUser.matricula?.length !== 7} 
                  className="rounded-none font-bold bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-md shadow-[#DC2626]/20 disabled:opacity-50"
                >
                  {submitLoading ? <Loader2 className="animate-spin h-5 w-5" /> : t("users.save")}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
