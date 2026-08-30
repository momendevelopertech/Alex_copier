import { auth } from "@/auth";
import { hasPageAccess, type Page } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return null;
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  });
  if (!dbUser || !dbUser.isActive) {
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
