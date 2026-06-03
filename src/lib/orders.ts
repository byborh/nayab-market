export type OrderStatus =
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  paid: 'Payée',
  processing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  paid: 'bg-saffron-100 text-saffron-700 border-saffron-300',
  processing: 'bg-lapis-100 text-lapis-700 border-lapis-300',
  shipped: 'bg-blue-100 text-blue-700 border-blue-300',
  delivered: 'bg-green-100 text-green-700 border-green-300',
  cancelled: 'bg-pomegranate-100 text-pomegranate-700 border-pomegranate-300',
};

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export type OrderItem = {
  productId?: string;
  name: string;
  qty: number;
  unitAmount: number;
  currency: string;
  image?: string;
};

export type OrderAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  postalCode?: string;
  state?: string;
  country?: string;
};

export type StatusHistoryEntry = {
  status: OrderStatus;
  at: number;
  note?: string;
};

export type Order = {
  id: string;
  status: OrderStatus;
  /** Historique chronologique des changements de statut. */
  statusHistory?: StatusHistoryEntry[];
  /** UID de l'utilisateur si commande passée en étant connecté, sinon null. */
  userId?: string | null;
  customer: {
    email: string;
    name?: string;
    phone?: string;
  };
  shipping: {
    name?: string;
    address: OrderAddress;
    method?: string;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
  };
  items: OrderItem[];
  amounts: {
    subtotal: number;
    shipping: number;
    total: number;
    currency: string;
  };
  notes?: string;
  stripeSessionId: string;
  stripePaymentIntent?: string;
  createdAt: number;
  updatedAt: number;
  paidAt: number;
  shippedAt: number | null;
  deliveredAt: number | null;
};
