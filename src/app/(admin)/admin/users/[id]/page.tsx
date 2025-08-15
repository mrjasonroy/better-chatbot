import { notFound } from "next/navigation";
import { getUserAccounts, getUser } from "lib/user/server";
import { UserStats } from "@/components/user/user-detail/user-stats";
import { Button } from "ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { UserSession } from "app-types/user";
import { requireAdminSession } from "lib/admin/server";
import { UserDetail } from "@/components/user/user-detail/user-detail";
import { AdminHeader } from "@/components/admin/admin-header";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  return (
    <main className="relative bg-background w-full flex flex-col h-screen">
      <AdminHeader />
      <div className="flex-1 flex flex-col p-6 min-h-0">
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
          </Link>
        </div>

        <div className="flex-1 min-h-0">
          <UserDetail
            user={user}
            currentUserId={session.user.id}
            userAccountInfo={userAccountInfo}
            view="admin"
            statsSlot={
              <Suspense
                fallback={
                  <div className="text-sm text-muted-foreground">
                    Loading stats...
                  </div>
                }
              >
                <UserStats userId={id} />
              </Suspense>
            }
          />
        </div>
      </div>
    </main>
  );
}
