"use client";

import { useState } from "react";
import { BasicUserWithLastLogin } from "app-types/user";
import { UserDetailFormCard } from "./user-detail-form-card";
import { UserAccessCard } from "./user-access-card";
import { useProfileTranslations } from "@/hooks/use-profile-translations";

interface UserDetailProps {
  user: BasicUserWithLastLogin;
  currentUserId: string;
  userAccountInfo?: {
    hasPassword: boolean;
    oauthProviders: string[];
  };
  userStatsSlot?: React.ReactNode;
  view?: "admin" | "user";
}

export function UserDetail({
  view,
  user: initialUser,
  currentUserId,
  userAccountInfo,
  userStatsSlot,
}: UserDetailProps) {
  const [user, setUser] = useState(initialUser);
  const { t } = useProfileTranslations(view);

  const handleUserUpdate = (updatedUser: Partial<BasicUserWithLastLogin>) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  return (
    <div
      className="min-h-full p-4 md:p-6 space-y-6"
      data-testid="user-detail-content"
    >
      {/* Hero Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
        <p className="text-muted-foreground">{t("userDetailDescription")}</p>
      </div>

      {/* Cards Layout */}
      <div className="space-y-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Top Row: User Details Form & Access & Account */}
        <UserDetailFormCard
          user={user}
          currentUserId={currentUserId}
          userAccountInfo={userAccountInfo}
          onUserDetailsUpdate={handleUserUpdate}
          view={view}
        />

        <UserAccessCard
          user={user}
          currentUserId={currentUserId}
          userAccountInfo={userAccountInfo}
          onUserDetailsUpdate={handleUserUpdate}
          view={view}
        />

        {/* Full Width Statistics - conditionally rendered */}
        <div className="col-span-2">{userStatsSlot}</div>
      </div>
    </div>
  );
}
