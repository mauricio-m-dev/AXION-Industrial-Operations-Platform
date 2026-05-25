import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, Loader2, AlertCircle, ChevronLeft, ChevronRight, X, PenTool, Link as LinkIcon, RadioReceiver } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../contexts/LanguageContext";

interface WeComWebhook {
  id: string;
  name?: string;
  url: string;
  ticketTypes: string[];
}

export function ApmWebhooksTab() {
  const [webhooks, setWebhooks] = useState<WeComWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  
  const AVAILABLE_TYPES = [
    "AGV com falha", "Colisão", "Falta de peças", "Painel/Botoeira", "Resíduos", "Erro de Software", "Bateria Fraca"
  ];
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [typeSearch, setTypeSearch] = useState("");
  const [editTypeSearch, setEditTypeSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editWebhook, setEditWebhook] = useState<WeComWebhook | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { t } = useLanguage();

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
    fetchWebhooks();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/webhooks", {
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data);
      } else {
        toast.error("Erro ao buscar integrações WeCom.");
      }
    } catch (error) {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setSubmitLoading(true);
    try {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({ name, url, ticketTypes: selectedTypes }),
      });

      if (response.ok) {
        toast.success("Integração cadastrada com sucesso!");
        setName("");
        setUrl("");
        setSelectedTypes([]);
        fetchWebhooks();
      } else {
        const data = await response.json();
        toast.error(data.error || "Erro ao cadastrar.");
      }
    } catch (error) {
      toast.error("Erro de comunicação com servidor.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });

      if (response.ok) {
        toast.success("Integração excluída.");
        setDeleteConfirm(null);
        fetchWebhooks();
      } else {
        toast.error("Erro ao excluir.");
      }
    } catch (error) {
      toast.error("Erro de comunicação com servidor.");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWebhook) return;
    
    setSubmitLoading(true);
    try {
      const response = await fetch(`/api/webhooks/${editWebhook.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify(editWebhook),
      });

      if (response.ok) {
        toast.success("Integração atualizada.");
        setEditWebhook(null);
        fetchWebhooks();
      } else {
        toast.error("Erro ao atualizar.");
      }
    } catch (error) {
      toast.error("Erro de conexão.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Form */}
        <Card className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-sm bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none p-0 lg:col-span-1 h-fit transition-colors duration-300">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-red-50 dark:bg-red-900/30 text-[#DC2626] dark:text-red-400 rounded-sm transition-colors">
                <RadioReceiver size={20} />
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Novo Grupo WeCom</h3>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Nome do Grupo/Setor (Opcional)
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Manutenção Mecânica"
                  className="h-11 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 focus:bg-white transition-colors"
                  disabled={submitLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  URL do Webhook Robot
                </label>
                <Input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/..."
                  className="h-11 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 focus:bg-white transition-colors"
                  disabled={submitLoading}
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in-50 duration-300">
                <div className="flex flex-col">
                  <label className="text-[11px] font-black uppercase tracking-widest text-[#DC2626] dark:text-red-400">
                    Tipos de Chamados Vinculados
                  </label>
                  <p className="text-[10px] text-zinc-400 font-medium">Este grupo receberá alertas apenas dos chamados selecionados abaixo.</p>
                </div>
                <Input
                  placeholder="Filtrar tipos..."
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                  className="h-8 text-xs border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 dark:text-zinc-100"
                />
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-zinc-50 dark:bg-zinc-950 rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-inner">
                  {AVAILABLE_TYPES.filter(tItem => getTranzincdTypeLabel(tItem).toLowerCase().includes(typeSearch.toLowerCase())).map(tItem => {
                    const isChecked = selectedTypes.includes(tItem);
                    return (
                      <label key={tItem} className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-zinc-900 rounded-sm cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTypes([...selectedTypes, tItem]);
                            } else {
                              setSelectedTypes(selectedTypes.filter(item => item !== tItem));
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

              <Button
                type="submit"
                className="w-full h-12 rounded-sm bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold mt-2 transition-all shadow-md shadow-[#DC2626]/20"
                disabled={submitLoading || !url}
              >
                {submitLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Salvar Integração"}
              </Button>
            </form>
          </div>
        </Card>

        {/* Webhooks List */}
        <Card className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-sm bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none lg:col-span-2 overflow-hidden p-0 transition-colors duration-300">
          <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/50 min-h-[80px] border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 transition-colors duration-300">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Grupos Cadastrados</h3>

            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Input
                placeholder="Buscar por nome ou URL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full sm:w-64 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 dark:text-zinc-100 rounded-sm focus:border-[#DC2626] transition-all text-xs"
              />
              <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-sm border border-zinc-200 dark:border-zinc-700 shadow-sm dark:shadow-none shrink-0 transition-colors">
                {webhooks.length} {webhooks.length === 1 ? 'grupo' : 'grupos'}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto w-full">
            <Table className="min-w-full">
              <TableHeader className="bg-white dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 transition-colors duration-300">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[11px] font-black uppercase tracking-wider pl-6 h-12 text-zinc-400">
                    Grupo / URL
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider h-12 text-zinc-400">
                    Chamados Vinculados
                  </TableHead>
                  <TableHead className="text-[11px] font-black uppercase tracking-wider text-right pr-6 h-12 text-zinc-400">
                    Ações
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
                ) : webhooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                        <LinkIcon size={32} strokeWidth={1.5} className="opacity-50" />
                        <p className="font-bold uppercase tracking-widest text-xs opacity-60">Nenhuma integração WeCom</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const filtered = webhooks.filter(w => 
                      (w.name && w.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
                      w.url.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    const totalPages = Math.ceil(filtered.length / itemsPerPage);
                    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                    if (filtered.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={3} className="h-40 text-center">
                            <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                              <LinkIcon size={32} strokeWidth={1.5} className="opacity-50" />
                              <p className="font-bold uppercase tracking-widest text-xs opacity-60">Nenhum resultado encontrado</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <>
                        {paginated.map((hook) => (
                          <TableRow key={hook.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors border-zinc-100 dark:border-zinc-800">
                            <TableCell className="pl-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-zinc-800 dark:text-zinc-100">{hook.name || "Sem Nome"}</span>
                                <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px] sm:max-w-[300px]" title={hook.url}>
                                  {hook.url}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-wrap gap-1">
                                {hook.ticketTypes && hook.ticketTypes.length > 0 ? (
                                  hook.ticketTypes.map(type => (
                                    <span key={type} className="text-[9px] bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider whitespace-nowrap">
                                      {getTranzincdTypeLabel(type)}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-zinc-400 italic">Nenhum</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="pr-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditWebhook({ ...hook });
                                    setEditTypeSearch("");
                                  }}
                                  className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-sm"
                                >
                                  <PenTool size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirm(hook.id)}
                                  className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-sm"
                                >
                                  <Trash2 size={16} />
                                </Button>
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

          {!loading && webhooks.filter(w => (w.name && w.name.toLowerCase().includes(searchTerm.toLowerCase())) || w.url.toLowerCase().includes(searchTerm.toLowerCase())).length > itemsPerPage && (
            <div className="p-4 bg-zinc-50/30 dark:bg-zinc-900/30 h-16 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 transition-colors duration-300">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Página {currentPage} de {Math.ceil(webhooks.filter(w => (w.name && w.name.toLowerCase().includes(searchTerm.toLowerCase())) || w.url.toLowerCase().includes(searchTerm.toLowerCase())).length / itemsPerPage)}
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
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(webhooks.filter(w => (w.name && w.name.toLowerCase().includes(searchTerm.toLowerCase())) || w.url.toLowerCase().includes(searchTerm.toLowerCase())).length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(webhooks.filter(w => (w.name && w.name.toLowerCase().includes(searchTerm.toLowerCase())) || w.url.toLowerCase().includes(searchTerm.toLowerCase())).length / itemsPerPage)}
                  className="h-8 w-8 p-0 rounded-sm border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
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
                    <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Excluir Grupo?</h3>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6">
                  Remover esta URL fará com que chamados dos tipos vinculados parem de ser enviados para este WeCom Robot.
                </p>
                <div className="flex gap-3 justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                  <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="rounded-none font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    Cancelar
                  </Button>
                  <Button onClick={() => handleDelete(deleteConfirm)} className="rounded-none font-bold bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-md shadow-[#DC2626]/20">
                    Excluir
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editWebhook && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditWebhook(null)}
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
                      <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Editar Grupo</h3>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditWebhook(null)} className="h-8 w-8 rounded-none hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-950 dark:hover:text-white shrink-0">
                  <X size={16} />
                </Button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-white dark:bg-[#0C0C0E] custom-scrollbar">
                <form id="edit-hook-form" onSubmit={handleEdit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Nome</label>
                    <Input
                      type="text"
                      value={editWebhook.name || ""}
                      onChange={(e) => setEditWebhook({ ...editWebhook, name: e.target.value })}
                      className="h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 rounded-none focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">URL</label>
                    <Input
                      type="url"
                      required
                      value={editWebhook.url}
                      onChange={(e) => setEditWebhook({ ...editWebhook, url: e.target.value })}
                      className="h-11 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100 rounded-none focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 animate-in fade-in-50 duration-300">
                    <div className="flex flex-col">
                      <label className="text-[11px] font-black uppercase tracking-widest text-[#DC2626] dark:text-red-400">
                        Tipos de Chamados Vinculados
                      </label>
                    </div>
                    <Input
                      placeholder="Filtrar tipos..."
                      value={editTypeSearch}
                      onChange={(e) => setEditTypeSearch(e.target.value)}
                      className="h-8 text-xs border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 dark:text-zinc-100 rounded-none focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-zinc-50 dark:bg-zinc-950 rounded-none border border-zinc-200 dark:border-zinc-800/80 shadow-inner">
                      {AVAILABLE_TYPES.filter(tItem => getTranzincdTypeLabel(tItem).toLowerCase().includes(editTypeSearch.toLowerCase())).map(tItem => {
                        const currentTypes = editWebhook.ticketTypes || [];
                        const isChecked = currentTypes.includes(tItem);
                        return (
                          <label key={tItem} className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-zinc-900 rounded-none cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                let newTypes = [...currentTypes];
                                if (e.target.checked) {
                                  if (!newTypes.includes(tItem)) newTypes.push(tItem);
                                } else {
                                  newTypes = newTypes.filter(item => item !== tItem);
                                }
                                setEditWebhook({ ...editWebhook, ticketTypes: newTypes });
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
                </form>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex gap-3 justify-end transition-colors duration-300 shrink-0">
                <Button variant="ghost" onClick={() => setEditWebhook(null)} className="rounded-none font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  form="edit-hook-form" 
                  disabled={submitLoading || !editWebhook.url} 
                  className="rounded-none font-bold bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-md shadow-[#DC2626]/20 disabled:opacity-50"
                >
                  {submitLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Salvar"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
