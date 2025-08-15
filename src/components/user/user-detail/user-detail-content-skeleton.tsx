import { Card, CardContent, CardHeader } from "ui/card";
import { Skeleton } from "ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";

export function UserDetailContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* User Detail Card Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar skeleton */}
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                {/* Name skeleton */}
                <Skeleton className="h-8 w-48" />
                {/* Email skeleton */}
                <Skeleton className="h-4 w-64" />
                {/* Role badges skeleton */}
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs Skeleton */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-transparent border-b border-border p-0 h-auto rounded-none">
          <TabsTrigger
            value="details"
            className="bg-transparent border-0 border-b-2 border-transparent rounded-none px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent"
          >
            Details
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="bg-transparent border-0 border-b-2 border-transparent rounded-none px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent"
          >
            Statistics
          </TabsTrigger>
          <TabsTrigger
            value="danger"
            className="bg-transparent border-0 border-b-2 border-transparent rounded-none px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent"
          >
            Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* Details Tab Content Skeleton */}
        <TabsContent value="details" className="space-y-6">
          <div className="max-w-2xl mx-auto">
            <div className="space-y-2">
              {/* Title skeleton */}
              <Skeleton className="h-6 w-32" />
              {/* Description skeleton */}
              <Skeleton className="h-4 w-80" />
            </div>

            <div className="space-y-6 mt-6">
              {/* Name and Email fields skeleton */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Update Password button skeleton */}
              <div className="flex justify-end">
                <Skeleton className="h-10 w-36" />
              </div>

              {/* Roles section skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <div className="flex items-start gap-2">
                  <div className="flex flex-wrap gap-2 flex-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-28" />
                </div>
              </div>

              {/* Account Status skeleton */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>

              {/* Joined and Last Updated skeleton */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>

              {/* Save button skeleton */}
              <div className="pt-4">
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Stats Tab Content Skeleton */}
        <TabsContent value="stats" className="space-y-6">
          <div className="max-w-2xl mx-auto">
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-lg" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Danger Tab Content Skeleton */}
        <TabsContent value="danger" className="space-y-6">
          <div className="max-w-2xl mx-auto">
            <Card className="border-destructive">
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-80" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-destructive/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
