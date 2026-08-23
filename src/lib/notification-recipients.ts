import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/permissions";

/**
 * Resolves notification recipients from the real org structure (roles,
 * engineer→user links, company membership). Every resolver is failure-safe:
 * it never throws, so business flows are never broken by notification issues.
 */

export async function getUserIdsByRoles(
  roles: Role[],
  options: { excludeUserId?: string | null; companyId?: string | null } = {},
): Promise<string[]> {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { in: roles },
        isActive: true,
        ...(options.companyId ? { companyId: options.companyId } : {}),
      },
      select: { id: true },
    });
    return users
      .map((u) => u.id)
      .filter((id) => id !== options.excludeUserId);
  } catch {
    return [];
  }
}

export async function getEngineerUserId(engineerId: string | null | undefined): Promise<string | null> {
  if (!engineerId) return null;
  try {
    const engineer = await prisma.engineer.findUnique({
      where: { id: engineerId },
      select: { userId: true, isActive: true },
    });
    if (!engineer?.userId || !engineer.isActive) return null;
    const user = await prisma.user.findUnique({
      where: { id: engineer.userId },
      select: { isActive: true },
    });
    return user?.isActive ? engineer.userId : null;
  } catch {
    return null;
  }
}

/** Maintenance managers + general manager (who oversees everything). */
export async function getServiceManagementRecipients(excludeUserId?: string | null): Promise<string[]> {
  return getUserIdsByRoles(["MAINTENANCE_MANAGER", "GENERAL_MANAGER"], { excludeUserId });
}

/** Workshop managers (inventory custodians) + maintenance managers. */
export async function getInventoryRecipients(excludeUserId?: string | null): Promise<string[]> {
  return getUserIdsByRoles(["WORKSHOP_MANAGER", "MAINTENANCE_MANAGER", "GENERAL_MANAGER"], { excludeUserId });
}

/** Users allowed to verify field collections: accountants + managers. */
export async function getFinanceVerificationRecipients(excludeUserId?: string | null): Promise<string[]> {
  return getUserIdsByRoles(["ACCOUNTANT", "GENERAL_MANAGER"], { excludeUserId });
}

/** Contract lifecycle watchers: GM + company managers + maintenance manager. */
export async function getContractRecipients(companyId?: string | null, excludeUserId?: string | null): Promise<string[]> {
  const roles: Role[] = ["GENERAL_MANAGER", "COMPANY_MANAGER", "MAINTENANCE_MANAGER"];
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true, role: true, companyId: true },
    });
    return users
      .filter((u) => !companyId || u.role === "GENERAL_MANAGER" || u.companyId === companyId)
      .map((u) => u.id)
      .filter((id) => id !== excludeUserId);
  } catch {
    return [];
  }
}
