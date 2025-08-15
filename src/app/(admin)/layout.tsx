import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SidebarProvider } from "ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { UserSession } from "app-types/user";
import { requireAdminSession } from "lib/admin/server";
import { cookies } from "next/headers";
import { COOKIE_KEY_SIDEBAR_STATE } from "lib/const";
import { AppPopupProvider } from "@/components/layouts/app-popup-provider";
import { UserDetailContent } from "@/components/user/user-detail/user-detail-content";
import { Suspense } from "react";
import { UserDetailContentSkeleton } from "@/components/user/user-detail/user-detail-content-skeleton";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Redirect before rendering the layout if the user is not an admin
  let session: UserSession;
  try {
    session = await requireAdminSession();
  } catch {
    redirect("/");
  }

  const cookieStore = await cookies();
  const isCollapsed =
    cookieStore.get(COOKIE_KEY_SIDEBAR_STATE)?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AdminSidebar session={session} />
      <AppPopupProvider
        userSettingsComponent={
          <Suspense fallback={<UserDetailContentSkeleton />}>
            <UserDetailContent view="user" />
          </Suspense>
        }
      />
      {children}
    </SidebarProvider>
  );
}
