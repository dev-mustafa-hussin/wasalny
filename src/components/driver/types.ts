export interface DriverInfo {
  id: string;
  is_available: boolean;
  total_earnings: number;
  vehicle_type: string | null;
  vehicle_number: string | null;
  user_id: string;
}

export interface Store {
  name: string;
  address: string | null;
}

export interface Customer {
  full_name: string;
  phone: string | null;
}

export interface Order {
  id: string;
  status:
    | "confirmed"
    | "preparing"
    | "ready"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  total_amount: number;
  delivery_fee: number;
  created_at: string;
  notes: string | null;
  store: Store;
  customer: Customer | null;
  driver_id?: string | null;
}
