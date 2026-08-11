import type { Order, User } from "@prisma/client";

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    companyName: user.companyName,
    contactName: user.contactName,
    phone: user.phone,
    voivodeships: JSON.parse(user.voivodeships) as string[],
  };
}

export function serializeOrder(order: Order) {
  return {
    id: order.id,
    kw: order.kw,
    description: order.description,
    address: order.address,
    voivodeship: order.voivodeship,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  };
}
