import { useState } from "react";
import { toast } from "sonner";
import { Ticket } from "../../types/ticket";

interface UseTicketActionsOptions {
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  selectedTicket: Ticket | null;
  setSelectedTicket: React.Dispatch<React.SetStateAction<Ticket | null>>;
  fetchTickets: (showLoading?: boolean) => void;
  userRole: string;
  t: (key: string) => string;
}

export function useTicketActions({
  tickets,
  setTickets,
  selectedTicket,
  setSelectedTicket,
  fetchTickets,
  userRole,
  t
}: UseTicketActionsOptions) {
  const [finishing, setFinishing] = useState(false);

  const handleDeleteTicket = async (deleteTicketId: string | null, onSuccess: () => void) => {
    if (!deleteTicketId) return;
    try {
      const response = await fetch(`/api/tickets/${deleteTicketId}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" }
      });
      if (response.ok) {
        setTickets(tickets.filter(t => t.id !== deleteTicketId));
        setSelectedTicket(null);
        toast.success(t("toast.ticket_deleted"));
        onSuccess();
      } else {
        toast.error(t("toast.delete_error"));
      }
    } catch (e) {
      toast.error(t("toast.connection_error"));
    }
  };

  const handleEditTicket = async (editTicketId: string | null, editFormData: Partial<Ticket>, onSuccess: () => void) => {
    if (!editTicketId) return;
    try {
      const response = await fetch(`/api/tickets/${editTicketId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify(editFormData)
      });
      if (response.ok) {
        setTickets(tickets.map(t => t.id === editTicketId ? { ...t, ...editFormData } : t));
        if (selectedTicket?.id === editTicketId) {
          setSelectedTicket({ ...selectedTicket, ...editFormData } as Ticket);
        }
        toast.success(t("toast.ticket_updated"));
        onSuccess();
      } else {
        toast.error(t("toast.update_error"));
      }
    } catch (e) {
      toast.error(t("toast.connection_error"));
    }
  };

  const handleStartTicket = async (id: string, assignedToUser: string, onSuccess: () => void) => {
    let assignee = assignedToUser;
    if (userRole !== "SuperAdmin" && userRole !== "Admin") {
      assignee = localStorage.getItem("admin-matricula") || "";
    } else if (!assignee && !id) {
      return toast.error(t("toast.select_resp"));
    }

    try {
      const response = await fetch(`/api/tickets/${id}/start`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
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
        onSuccess();
      } else {
        toast.error(data.error || t("toast.start_error"));
      }
    } catch (error) {
      toast.error(t("toast.connection_error"));
    }
  };

  const handleFinishTicket = async (finishTicketId: string, resolutionReport: string, resolutionImage: File | null, onSuccess: () => void) => {
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
        headers: { "X-Requested-With": "XMLHttpRequest" },
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
        onSuccess();
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

  return {
    finishing,
    handleDeleteTicket,
    handleEditTicket,
    handleStartTicket,
    handleFinishTicket,
    updateStatus
  };
}
