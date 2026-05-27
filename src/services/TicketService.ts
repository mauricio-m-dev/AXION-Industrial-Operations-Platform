import { Ticket, User } from "../models/mongoose";
import { log } from "../utils/logger";
import { logAudit } from "../utils/audit";
import { notifyUsersAboutTicket, notifyUsersAboutTicketFinished } from "../utils/notifications";
import { emitSelectiveTicketsUpdated } from "../socket";
import redisClient from "../config/redis";
import crypto from "crypto";

const safeLean = async (query: any) => {
  return typeof query.lean === "function" ? await query.lean() : await query;
};

export class TicketService {
  private TICKETS_CACHE_KEY = "api:tickets:all";
  private TICKETS_STATS_CACHE_KEY = "api:tickets:stats";

  public async clearCache() {
    try {
      if (redisClient.isOpen) {
        await redisClient.del([this.TICKETS_CACHE_KEY, this.TICKETS_STATS_CACHE_KEY]);
      }
    } catch (err) {
      log(`Redis Cache Clear Error: ${err}`, "ERROR");
    }
  }

  public async createTicket(data: any, image_path: string | null, operator_name: string) {
    const { type, location, agv_number, part_name, sap_number, side, observation, operator_matricula, impact, downtime } = data;
    
    // Generates a cryptographically secure random 4 digit number
    const id = `TK-${crypto.randomInt(1000, 9999)}`;
    
    let priority = "Baixo";
    const isCriticalLoc = ["ASSEMBLY-01", "BODY-SHOP", "QC-LINE"].includes(location);
    if (type === "Colisão") priority = "Crítico";
    else if (impact === "total") priority = "Crítico";
    else if (impact === "partial") priority = isCriticalLoc || type === "AGV com falha" ? "Alto" : "Médio";
    else if (type === "AGV com falha" && isCriticalLoc) priority = "Alto";
    else if (type === "AGV com falha") priority = "Médio";
    else if (type === "Falta de peças" || type === "Painel/Botoeira") priority = "Médio";

    await Ticket.create({
      id, type, location, agv_number, part_name, sap_number, side, observation, image_path, operator_name, operator_matricula, priority, operational_impact: impact, downtime
    });

    logAudit("OPEN_TICKET", operator_name || "Operator", { ticketId: id, type });

    await notifyUsersAboutTicket({ id, type, location, impact, operator_name }, priority);
    
    await this.clearCache();
    try { await emitSelectiveTicketsUpdated(type); } catch (e) {}

    return id;
  }

  public async getStats(user: any) {
    const baseQuery: any = {};
    if (user.role === "Moderador") {
      baseQuery.type = { $in: user.allowedTicketTypes || [] };
    }

    const matchStage = Object.keys(baseQuery).length > 0 ? [{ $match: baseQuery }] : [];
    const statusPipeline = [...matchStage, { $group: { _id: "$status", count: { $sum: 1 } } }];
    const priorityPipeline = [...matchStage, { $group: { _id: "$priority", count: { $sum: 1 } } }];
    
    const [statusCounts, priorityCounts] = await Promise.all([
      Ticket.aggregate(statusPipeline),
      Ticket.aggregate(priorityPipeline)
    ]);

    const statusMap: Record<string, number> = {};
    for (const item of statusCounts) statusMap[item._id || "Unknown"] = item.count;
    
    const priorityMap: Record<string, number> = {};
    for (const item of priorityCounts) priorityMap[item._id || "Unknown"] = item.count;

    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
    return {
      total,
      open: statusMap["Aberto"] || 0,
      pending: statusMap["Em atendimento"] || 0,
      finished: statusMap["Finalizado"] || 0,
      critical: priorityMap["Crítico"] || 0,
      high: priorityMap["Alto"] || 0
    };
  }

  public async exportCSV(user: any): Promise<string> {
    const baseQuery: any = {};
    if (user.role === "Moderador") {
      baseQuery.type = { $in: user.allowedTicketTypes || [] };
    }
    
    const cursor = Ticket.find(baseQuery).sort({ created_at: -1 }).lean().cursor();
    
    const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
    let csvStr = "ID,Type,Status,Priority,Location,Operator,Matricula,Created_At,Resolved_At,MTTR_Min\n";
    
    for await (const t of cursor) {
      const createdAt = new Date(t.created_at).toISOString();
      const resolvedAt = t.resolved_at ? new Date(t.resolved_at).toISOString() : "";
      let mttr = "";
      if (t.created_at && t.resolved_at) {
        mttr = Math.round((new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 60000).toString();
      }
      csvStr += `${t.id},${escape(t.type)},${t.status},${t.priority},${escape(t.location)},${escape(t.operator_name)},${escape(t.operator_matricula)},${createdAt},${resolvedAt},${mttr}\n`;
    }
    
    return csvStr;
  }

  public buildFilter(query: any, user: any) {
    const filter: any = {};
    const { status, type, priority, search, start, end } = query;

    if (status && status !== 'all') {
      const statusList = String(status).split(',');
      filter.status = statusList.length > 1 ? { $in: statusList } : status;
    }

    const isModerador = user.role === "Moderador";
    const allowedTypes = user.allowedTicketTypes || [];

    if (type && type !== 'all') {
      const typeStr = String(type);
      filter.type = isModerador ? (allowedTypes.includes(typeStr) ? typeStr : { $in: [] }) : typeStr;
    } else if (isModerador) {
      filter.type = { $in: allowedTypes };
    }

    if (priority && priority !== 'all') filter.priority = String(priority);
    
    if (search) {
      const sanitizedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { id: { $regex: sanitizedSearch, $options: "i" } },
        { location: { $regex: sanitizedSearch, $options: "i" } },
        { operator_name: { $regex: sanitizedSearch, $options: "i" } },
        { operator_matricula: { $regex: sanitizedSearch, $options: "i" } }
      ];
    }

    if (start || end) {
      filter.created_at = {};
      if (start) filter.created_at.$gte = new Date(String(start));
      if (end) filter.created_at.$lte = new Date(String(end));
    }

    return filter;
  }

  public async getPaginatedTickets(filter: any, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [total, tickets] = await Promise.all([
      Ticket.countDocuments(filter),
      Ticket.find(filter).select('-images -__v').sort({ created_at: -1 }).skip(skip).limit(limit).lean()
    ]);
    return { data: tickets, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  public async getTickets(filter: any) {
    return Ticket.find(filter).select('-images -__v').sort({ created_at: -1 }).lean();
  }

  public async updateStatus(id: string, status: string, user: any) {
    const ticket = await safeLean(Ticket.findOne({ id }));
    if (!ticket) throw Object.assign(new Error("Chamado não encontrado"), { status: 404 });
    if (user.role === "Moderador" && !(user.allowedTicketTypes || []).includes(ticket.type)) {
      throw Object.assign(new Error("Acesso negado: Tipo de chamado não permitido"), { status: 403 });
    }

    await Ticket.updateOne({ id }, { status });
    logAudit("CHANGE_STATUS", user.username, { ticketId: id, newStatus: status });
    
    await this.clearCache();
    try { await emitSelectiveTicketsUpdated(ticket.type); } catch (e) {}
  }

  public async startTicket(id: string, assigned_to: string, user: any) {
    const ticket = await safeLean(Ticket.findOne({ id }));
    if (!ticket) throw Object.assign(new Error("Chamado não encontrado"), { status: 404 });
    if (user.role === "Moderador" && !(user.allowedTicketTypes || []).includes(ticket.type)) {
      throw Object.assign(new Error("Acesso negado: Tipo de chamado não permitido"), { status: 403 });
    }

    const result = await Ticket.updateOne(
      { id, status: 'Aberto' },
      { status: 'Em atendimento', assigned_to, started_at: new Date() }
    );
    if (result.modifiedCount === 0) {
      throw Object.assign(new Error("Chamado já foi assumido por outro usuário ou não está mais aberto"), { status: 409 });
    }

    logAudit("START_SERVICE", user.username, { ticketId: id, assignedTo: assigned_to });
    
    await this.clearCache();
    try { await emitSelectiveTicketsUpdated(ticket.type); } catch (e) {}
    return assigned_to;
  }

  public async finishTicket(id: string, resolution_report: string, resolution_image_path: string | null, user: any) {
    const ticket = await safeLean(Ticket.findOne({ id }));
    if (!ticket) throw Object.assign(new Error("Chamado não encontrado"), { status: 404 });
    if (user.role === "Moderador" && !(user.allowedTicketTypes || []).includes(ticket.type)) {
      throw Object.assign(new Error("Acesso negado: Tipo de chamado não permitido"), { status: 403 });
    }
    if (user.role !== "SuperAdmin" && user.role !== "Admin" && ticket.assigned_to !== user.username) {
      throw Object.assign(new Error("Apenas o responsável ou admins podem finalizar"), { status: 403 });
    }

    const finishedAt = new Date();
    await Ticket.updateOne(
      { id },
      { status: 'Finalizado', finished_at: finishedAt, resolution_report, resolution_image_path }
    );
    logAudit("FINISH_SERVICE", user.username, { ticketId: id });

    await notifyUsersAboutTicketFinished({
      id: ticket.id,
      type: ticket.type,
      location: ticket.location,
      priority: ticket.priority,
      operator_name: ticket.operator_name,
      assigned_to: ticket.assigned_to,
      created_at: ticket.created_at,
      finished_at: finishedAt,
      resolution_report,
      finished_by: user.username
    });

    await this.clearCache();
    try { await emitSelectiveTicketsUpdated(ticket.type); } catch (e) {}
  }

  public async updateTicket(id: string, data: any, user: any) {
    const ticket = await safeLean(Ticket.findOne({ id }));
    if (!ticket) throw Object.assign(new Error("Chamado não encontrado"), { status: 404 });
    
    await Ticket.updateOne({ id }, data);
    logAudit("EDIT_TICKET", user.username, { ticketId: id, updates: data });
    
    await this.clearCache();
    try { await emitSelectiveTicketsUpdated(data.type || ticket.type); } catch (e) {}
  }

  public async deleteTicket(id: string, user: any) {
    const ticketId = String(id).replace(/[${}]/g, "");
    const ticket = await safeLean(Ticket.findOne({ id: ticketId }));
    if (!ticket) throw Object.assign(new Error("Chamado não encontrado"), { status: 404 });
    
    await Ticket.deleteOne({ id: ticketId });
    logAudit("DELETE_TICKET", user.username, { ticketId });
    
    await this.clearCache();
    try { await emitSelectiveTicketsUpdated(ticket.type); } catch (e) {}
    
    return [ticket.image_path, ticket.resolution_image_path].filter(Boolean);
  }
}

export const ticketService = new TicketService();
