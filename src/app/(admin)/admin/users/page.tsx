import { UsersTable } from "@/components/admin/users-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import {
  ADMIN_USER_LIST_LIMIT,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_DIRECTION,
  requireAdminSession,
} from "lib/admin/server";
import { notFound } from "next/navigation";
import { UserSession } from "app-types/user";
import { getAdminUsers } from "lib/admin/server";
import { AdminHeader } from "@/components/admin/admin-header";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    query?: string;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
  }>;
}

export default async function UserListPage({ searchParams }: PageProps) {
  // Redirect before rendering the page if the user is not an admin

  let session: UserSession;
  try {
    session = await requireAdminSession();
  } catch {
    notFound();
  }

  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const limit = parseInt(params.limit ?? ADMIN_USER_LIST_LIMIT.toString(), 10);
  const offset = (page - 1) * limit;
  const sortBy = params.sortBy ?? DEFAULT_SORT_BY;
  const sortDirection = params.sortDirection ?? DEFAULT_SORT_DIRECTION;

  const result = await getAdminUsers({
    searchValue: params.query,
    searchField: "email",
    searchOperator: "contains",
    limit,
    offset,
    sortBy,
    sortDirection,
  });

  return (
    <>
      <main className="relative bg-background w-full flex flex-col min-h-screen">
        <AdminHeader />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Users</h1>
                <p className="text-muted-foreground">
                  Manage user accounts and permissions
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>View and manage user accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <UsersTable
                  users={result.users}
                  currentUserId={session.user.id}
                  total={result.total}
                  page={page}
                  limit={limit}
                  query={params.query}
                  baseUrl="/admin/users"
                  sortBy={sortBy}
                  sortDirection={sortDirection}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
