export type Role = "CLIENT" | "CONTRACTOR";
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED";
export type OrderStatus = "OPEN" | "ASSIGNED";
export type BidStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type User = {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  companyName: string | null;
  contactName: string | null;
  phone: string | null;
  voivodeships: string[];
};

export type Order = {
  id: string;
  kw: number;
  description: string;
  address: string;
  voivodeship: string;
  status: OrderStatus;
  createdAt: string;
  pendingBidCount?: number;
};

export type BidForClient = { id: string; status: BidStatus; contractor: User };
export type DeclineForClient = { id: string; contractor: User };
export type OrderDetailClient = Order & { bids: BidForClient[]; declines: DeclineForClient[] };
export type OrderDetailContractor = Order & { myBid: { id: string; status: BidStatus } | null };
export type MyBid = { id: string; status: BidStatus; order: Order };

export type NotificationType = "NEW_ORDER" | "BID_SUBMITTED" | "ORDER_DECLINED" | "ORDER_ASSIGNED";
export type AppNotification = {
  id: string;
  type: NotificationType;
  message: string;
  orderId: string | null;
  createdAt: string;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; userId?: string } = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.userId ? { "x-user-id": opts.userId } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return data as T;
}
