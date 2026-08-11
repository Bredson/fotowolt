import type { UserStatus } from "./api";

export const CONTRACTOR_STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: "Oczekuje na akceptację",
  APPROVED: "Zaakceptowany",
  REJECTED: "Odrzucony",
};
