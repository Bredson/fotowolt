import { prisma } from "./db";

export type NotificationType =
  | "NEW_ORDER"
  | "BID_SUBMITTED"
  | "ORDER_DECLINED"
  | "ORDER_ASSIGNED";

export async function notify(
  userId: string,
  type: NotificationType,
  message: string,
  orderId?: string,
) {
  await prisma.notification.create({ data: { userId, type, message, orderId } });
}
