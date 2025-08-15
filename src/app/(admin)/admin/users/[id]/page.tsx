import { notFound } from "next/navigation";
import { getUserAccounts, getUser } from "lib/user/server";
import { BackButton } from "@/components/admin/back-button";
import { buildReturnUrl } from "@/lib/admin/navigation-utils";
import { UserSession } from "app-types/user";
import { requireAdminSession } from "lib/admin/server";
import { UserDetail } from "@/components/user/user-detail/user-detail";
import { AdminHeader } from "@/components/admin/admin-header";
import {
  UserStatsCardLoader,
  UserStatsCardLoaderSkeleton,
} from "@/components/user/user-detail/user-stats-card-loader";

import { Suspense } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    searchPageParams?: string;
  }>;
}

export default async function UserDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { searchPageParams } = await searchParams;
  let session: UserSession;
  try {
    session = await requireAdminSession();
  } catch (_error) {
    notFound();
  }
  const [user, userAccountInfo] = await Promise.all([
    getUser(id),
    getUserAccounts(id),
  ]);

  if (!user) {
    notFound();
  }

  // Calculate return URL server-side
  const returnUrl = buildReturnUrl("/admin/users", searchPageParams || "");

  return (
    <main className="relative bg-background w-full min-h-screen">
      <AdminHeader />

      {/* Back button and breadcrumb */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <BackButton returnUrl={returnUrl} />
        </div>
      </div>

      <UserDetail
        user={user}
        currentUserId={session.user.id}
        userAccountInfo={userAccountInfo}
        userStatsSlot={
          <Suspense fallback={<UserStatsCardLoaderSkeleton />}>
            <UserStatsCardLoader userId={id} view="admin" />
          </Suspense>
        }
        view="admin"
      />
    </main>
  );
}
