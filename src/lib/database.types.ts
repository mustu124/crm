export type OrderStatus =
  | "pending"
  | "in_progress"
  | "ready"
  | "delivered"
  | "cancelled";

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  business_type: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  client_id: string;
  title: string;
  status: OrderStatus;
  total_value: number;
  advance_paid: number;
  due_date: string | null;
  notes: string | null;
  created_at: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  created_at: string;
};

export type InventoryLog = {
  id: string;
  item_id: string;
  change_amount: number;
  reason: string | null;
  created_at: string;
};

export type ReportData = {
  client: Client;
  orders: Order[];
  paymentSummary: {
    total: number;
    advancePaid: number;
    remaining: number;
  };
  notes: string[];
  completedAt: string;
  tags: string[];
};

export type Report = {
  id: string;
  client_id: string;
  report_data: ReportData;
  pdf_url: string | null;
  created_at: string;
};

export type ArchivedClient = {
  id: string;
  name: string;
  phone: string;
  last_project_date: string | null;
  report_id: string | null;
  tags: string[];
  summary_json: {
    totalOrders?: number;
    totalValue?: number;
    advancePaid?: number;
    remaining?: number;
    completedAt?: string;
    businessType?: string | null;
    email?: string | null;
  };
};

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: Client;
        Insert: {
          id?: string;
          name: string;
          phone: string;
          email?: string | null;
          business_type?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Client, "id" | "created_at">>;
        Relationships: [];
      };
      orders: {
        Row: Order;
        Insert: {
          id?: string;
          client_id: string;
          title: string;
          status?: OrderStatus;
          total_value?: number;
          advance_paid?: number;
          due_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Order, "id" | "client_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_items: {
        Row: InventoryItem;
        Insert: {
          id?: string;
          name: string;
          category?: string | null;
          unit: string;
          quantity?: number;
          low_stock_threshold?: number;
          created_at?: string;
        };
        Update: Partial<Omit<InventoryItem, "id" | "created_at">>;
        Relationships: [];
      };
      inventory_logs: {
        Row: InventoryLog;
        Insert: {
          id?: string;
          item_id: string;
          change_amount: number;
          reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<InventoryLog, "id" | "item_id" | "created_at">>;
        Relationships: [
          {
            foreignKeyName: "inventory_logs_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: Report;
        Insert: {
          id?: string;
          client_id: string;
          report_data: ReportData;
          pdf_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Report, "id" | "client_id" | "created_at">>;
        Relationships: [];
      };
      archived_clients: {
        Row: ArchivedClient;
        Insert: {
          id: string;
          name: string;
          phone: string;
          last_project_date?: string | null;
          report_id?: string | null;
          tags?: string[];
          summary_json?: ArchivedClient["summary_json"];
        };
        Update: Partial<Omit<ArchivedClient, "id">>;
        Relationships: [
          {
            foreignKeyName: "archived_clients_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      order_status: OrderStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
