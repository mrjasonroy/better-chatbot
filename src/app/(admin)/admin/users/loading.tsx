import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Skeleton } from "ui/skeleton";
import { UsersTableSkeleton } from "@/components/admin/users-table-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-16" /> {/* "Users" title */}
          <Skeleton className="h-5 w-64" /> {/* Description */}
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>View and manage user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTableSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}
