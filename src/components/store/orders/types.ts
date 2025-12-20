export type OrderStatus =
  | "pending"
  | "processing"
  | "ready"
  | "delivering"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface StoreOrder {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  items: OrderItem[];
  notes?: string;
}

export interface StoreProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category_id?: string;
  is_available: boolean;
  created_at: string;
}
