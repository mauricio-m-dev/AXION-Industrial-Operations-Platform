import mongoose, { Schema } from "mongoose";
import { encrypt, decrypt } from "../utils/crypto";

// TTL configuration (5 years in seconds)
const fiveYearsInSeconds = 157680000;

export const UserSchema = new Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  matricula: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "Usuário" },
  failedLoginAttempts: { type: Number, default: 0 },
  lockoutUntil: { type: Date },
  mfaSecret: { type: String, get: decrypt, set: encrypt },
  mfaEnabled: { type: Boolean, default: false },
  email: { type: String, get: decrypt, set: encrypt },
  whatsapp: { type: String, get: decrypt, set: encrypt },
  notificationPreference: { 
    type: String, 
    enum: ['whatsapp', 'email', 'both', 'none'], 
    default: 'none' 
  },
  allowedTicketTypes: { type: [String], default: [] },
  tokenVersion: { type: Number, default: 0 }
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

export const TicketSchema = new Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  location: { type: String, required: true },
  agv_number: { type: String },
  part_name: { type: String },
  sap_number: { type: String },
  side: { type: String },
  observation: { type: String },
  image_path: { type: String },
  status: { type: String, default: 'Aberto' },
  operator_name: { type: String },
  operator_matricula: { type: String },
  priority: { type: String },
  operational_impact: { type: String },
  downtime: { type: String },
  assigned_to: { type: String },
  started_at: { type: Date },
  finished_at: { type: Date },
  resolution_report: { type: String },
  resolution_image_path: { type: String }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { getters: true },
  toObject: { getters: true }
});

TicketSchema.index({ status: 1, created_at: -1 });
TicketSchema.index({ type: 1, status: 1, created_at: -1 });
TicketSchema.index({ priority: 1, status: 1 });
TicketSchema.index({ assigned_to: 1, status: 1 });      // Ranking de técnicos
TicketSchema.index({ type: 1, created_at: -1 });         // Analytics por categoria
TicketSchema.index({ agv_number: 1, created_at: -1 });   // MTBF por AGV
TicketSchema.index({ location: 1, created_at: -1 });     // Filtros por localização

export const AuditLogSchema = new Schema({
  id: { type: String, required: true, unique: true },
  action: { type: String, required: true },
  username: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, expires: fiveYearsInSeconds }
});

export const LoginHistorySchema = new Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  ip_address: { type: String },
  device: { type: String },
  timestamp: { type: Date, default: Date.now }
});

export const OperatorFeedbackSchema = new Schema({
  id: { type: String, required: true, unique: true },
  matricula: { type: String, required: true },
  name: { type: String, required: true },
  feedback: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

export const ApmMetricSchema = new Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  cpu_usage: { type: Number },
  ram_used_mb: { type: Number },
  ram_total_mb: { type: Number },
  load_avg: { type: [Number] },
  requests_per_min: { type: Number },
  avg_latency_ms: { type: Number },
  error_rate: { type: Number },
  ws_clients: { type: Number },
  db_response_time_ms: { type: Number },
  disk_free_gb: { type: Number },
  disk_total_gb: { type: Number }
});

export const ApmReportSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  period_start: { type: Date, required: true },
  period_end: { type: Date, required: true },
  generated_by: { type: String, required: true },
  status: { type: String, default: 'completed' },
  risk_level: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
  health_score: { type: Number },
  summary: { type: Schema.Types.Mixed },
  recommendations: { type: [String] },
  metrics_snapshots: { type: Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now }
});

UserSchema.index({ username: 1 });

export const User = mongoose.model("User", UserSchema);
export const Ticket = mongoose.model("Ticket", TicketSchema);
export const AuditLog = mongoose.model("AuditLog", AuditLogSchema);
LoginHistorySchema.index({ timestamp: -1 });
export const LoginHistory = mongoose.model("LoginHistory", LoginHistorySchema);
OperatorFeedbackSchema.index({ created_at: -1 });
export const OperatorFeedback = mongoose.model("OperatorFeedback", OperatorFeedbackSchema);
export const ApmMetric = mongoose.model("ApmMetric", ApmMetricSchema);
ApmReportSchema.index({ created_at: -1 });
export const ApmReport = mongoose.model("ApmReport", ApmReportSchema);
