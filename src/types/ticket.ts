export interface Ticket {
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
  resolution_report?: string | null;
}
