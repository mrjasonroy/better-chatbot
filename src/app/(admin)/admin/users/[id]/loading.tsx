import { AdminHeader } from "@/components/admin/admin-header";
import { UserDetailSkeleton } from "@/components/user/user-detail/user-detail-skeleton";
import { BackButtonSkeleton } from "@/components/admin/back-button-skeleton";

export default function UserDetailLoading() {
  return (
    <main className="relative bg-background w-full min-h-screen">
      <AdminHeader />

      {/* Back button skeleton */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <BackButtonSkeleton />
        </div>
      </div>

      <UserDetailSkeleton />
    </main>
  );
}
