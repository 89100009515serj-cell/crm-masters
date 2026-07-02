import type { Role } from "@prisma/client";

/**
 * Единая точка проверки прав. Все server actions обязаны
 * проверять права через эти функции — не дублировать логику локально.
 */
export const permissions = {
  canCreateRequest: (role: Role) =>
    role === "MANAGER" || role === "CURATOR" || role === "ADMIN",

  canAssignMaster: (role: Role) =>
    role === "MANAGER" || role === "CURATOR" || role === "ADMIN",

  canReschedule: (role: Role) =>
    role === "MANAGER" || role === "CURATOR" || role === "ADMIN",

  canAddMaster: (role: Role) => role === "CURATOR" || role === "ADMIN",

  canDisableMaster: (role: Role) => role === "CURATOR" || role === "ADMIN",

  canViewFullFinance: (role: Role) => role === "ADMIN",

  canEditClosedRequest: (role: Role) => role === "ADMIN",

  canViewAllRequests: (role: Role) =>
    role === "MANAGER" || role === "CURATOR" || role === "ADMIN",

  isMaster: (role: Role) => role === "MASTER",
};

export class ForbiddenError extends Error {
  constructor(message = "Недостаточно прав для выполнения действия") {
    super(message);
    this.name = "ForbiddenError";
  }
}
