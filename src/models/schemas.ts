import { z } from "zod";

export const loginSchema = z.object({
  matricula: z.string().length(7, "A matrícula deve ter exatamente 7 dígitos").regex(/^\d+$/, "A matrícula deve conter apenas números"),
  password: z.string().min(6).max(64),
});

export const userSchema = z.object({
  username: z.string().min(3),
  matricula: z.string().length(7, "A matrícula deve ter exatamente 7 dígitos").regex(/^\d+$/, "A matrícula deve conter apenas números"),
  password: z.string().min(6).max(64),
  role: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal('')),
  notificationPreference: z.enum(['whatsapp', 'email', 'both', 'none']).default('none'),
  allowedTicketTypes: z.array(z.string()).optional(),
});

export const ticketSchema = z.object({
  type: z.string().min(1),
  location: z.string().min(1),
  agv_number: z.string().regex(/^\d{1,10}$/, "Apenas valores inteiros positivos (máx 10 dígitos)").optional(),
  part_name: z.string().optional(),
  sap_number: z.string().optional(),
  side: z.string().optional(),
  observation: z.string().optional(),
  operator_name: z.string().optional(),
  operator_matricula: z.string().length(7, "A matrícula deve ter exatamente 7 dígitos").regex(/^\d+$/, "A matrícula deve conter apenas números").optional().or(z.literal('')),
  impact: z.string().optional(),
  downtime: z.string().optional(),
});

export const ticketUpdateSchema = z.object({
  type: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  priority: z.enum(['Baixo', 'Médio', 'Alto', 'Crítico']).optional(),
  operational_impact: z.string().optional(),
  downtime: z.string().optional(),
  observation: z.string().optional(),
});

export const ticketStatusSchema = z.object({
  status: z.enum(['Aberto', 'Em atendimento', 'Finalizado']),
});

export const feedbackSchema = z.object({
  matricula: z.string().length(7, "A matrícula deve ter exatamente 7 dígitos").regex(/^\d+$/, "A matrícula deve conter apenas números"),
  name: z.string().min(1),
  feedback: z.string().min(1),
});
