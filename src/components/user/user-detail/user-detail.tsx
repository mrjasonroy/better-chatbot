"use client";

import { type ReactNode, useCallback, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "ui/card";
import { Button } from "ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "ui/tabs";
import { BasicUserWithLastLogin } from "app-types/user";
import { UserDeleteDialog } from "./user-delete-dialog";
import { UserDetailCard } from "./user-detail-card";
import { UserDetailForm } from "./user-detail-form";
import { useProfileTranslations } from "@/hooks/use-profile-translations";

interface UserDetailFormProps {
  user: BasicUserWithLastLogin;
  currentUserId: string;
  userAccountInfo?: {
    hasPassword: boolean;
    oauthProviders: string[];
  };
  statsSlot?: ReactNode;
  deleteUserAction?: ReactNode;
  view?: "admin" | "user";
}

export function UserDetail({
  view,
  user: initialUser,
  currentUserId,
  userAccountInfo,
  statsSlot,
}: UserDetailFormProps) {
  const [user, setUser] = useState(initialUser);
  const { t, tCommon } = useProfileTranslations(view);

  return (
    <div
      className="flex flex-col h-full gap-4"
      data-testid="user-detail-content"
    >
      {/* Fixed Header Section */}
      <div className="flex-shrink-0">
        <UserDetailCard user={user} currentUserId={currentUserId} view={view} />
      </div>

      {/* Tabs Container */}
      <Tabs
        defaultValue="details"
        className="flex flex-col flex-1 min-h-0"
        data-testid="user-detail-tabs"
      >
        {/* Fixed Tab Navigation */}
        <TabsList className="grid w-full grid-cols-3 bg-transparent border-b border-border p-0 h-auto rounded-none flex-shrink-0 shadow-none">
          <TabsTrigger
            value="details"
            className="bg-transparent border-0 border-b-2 border-transparent rounded-none px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent shadow-none data-[state=active]:shadow-none"
            data-testid="details-tab"
          >
            {tCommon("details")}
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="bg-transparent border-0 border-b-2 border-transparent rounded-none px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent shadow-none data-[state=active]:shadow-none"
            data-testid="stats-tab"
          >
            {tCommon("statistics")}
          </TabsTrigger>
          <TabsTrigger
            value="danger"
            className="bg-transparent border-0 border-b-2 border-transparent rounded-none px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent shadow-none data-[state=active]:shadow-none"
            data-testid="danger-tab"
          >
            {tCommon("dangerZone")}
          </TabsTrigger>
        </TabsList>

        {/* Scrollable Tab Content */}
        <div className="flex-1 min-h-0 mt-6">
          <TabsContent
            value="details"
            className="h-full flex flex-col"
            data-state="active"
          >
            <UserDetailForm
              user={user}
              currentUserId={currentUserId}
              userAccountInfo={userAccountInfo}
              onUserDetailsUpdate={(updatedUser) => {
                console.log("onUserDetailsUpdate", updatedUser);
                setUser((prev) => ({ ...prev, ...updatedUser }));
              }}
              view={view}
            />
          </TabsContent>

          <TabsContent value="stats" className="h-full overflow-y-auto">
            <div className="space-y-6 pb-6">
              <div className="max-w-2xl mx-auto">{statsSlot}</div>
            </div>
          </TabsContent>

          <TabsContent value="danger" className="h-full overflow-y-auto">
            <div className="space-y-6 pb-6">
              <div className="max-w-2xl mx-auto">
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive">
                      {tCommon("dangerZone")}
                    </CardTitle>
                    <CardDescription>
                      {t("dangerZoneDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-destructive/50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{t("deleteUser")}</p>
                          <p className="text-sm text-muted-foreground">
                            {t("deleteUserDescription")}
                          </p>
                        </div>
                        <UserDeleteDialog user={user} view={view}>
                          <Button
                            variant="destructive"
                            data-testid="delete-user-button"
                          >
                            {t("deleteUser")}
                          </Button>
                        </UserDeleteDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
