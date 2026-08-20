import { auth } from "@/auth";
import { hasPageAccess, type Page } from "@/lib/permissions";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return session.user;
}

export async function requirePageAccess(page: Page) {
  const user = await requireAuth();
  if (!user) return null;
  const role = (user as { role?: string }).role;
  if (!hasPageAccess(role, page)) return null;
  return user;
}

export async function requireRole(...roles: string[]) {
  const user = await requireAuth();
  if (!user) return null;
  const role = (user as { role?: string }).role;
  if (!role || !roles.includes(role)) return null;
  return user;
}
