import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";
import { Input } from "ui/input";
import { Search, ChevronRight } from "lucide-react";
import { Skeleton } from "ui/skeleton";
import { Avatar, AvatarFallback } from "ui/avatar";

export function UsersTableSkeleton() {
  // Generate 5-8 skeleton rows for a realistic loading state
  const skeletonRows = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="space-y-4">
      {/* Search Bar Section */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            disabled
          />
        </div>
        {/* Total count skeleton */}
        <div className="text-sm text-muted-foreground">
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold">User</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skeletonRows.map((index) => (
              <TableRow key={index}>
                {/* User Column */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        <Skeleton className="h-full w-full rounded-full" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                </TableCell>

                {/* Role Column */}
                <TableCell>
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    {/* Sometimes show a second role badge */}
                    {index % 3 === 0 && (
                      <Skeleton className="h-5 w-12 rounded-full" />
                    )}
                  </div>
                </TableCell>

                {/* Status Column */}
                <TableCell>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </TableCell>

                {/* Joined Column */}
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>

                {/* Arrow Column */}
                <TableCell>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="text-sm text-muted-foreground">
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>
  );
}
