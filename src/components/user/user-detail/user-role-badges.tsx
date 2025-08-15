import { Badge } from "ui/badge";
import { userRolesInfo } from "app-types/roles";
import { UserRoleNames } from "app-types/roles";
import { BasicUserWithLastLogin } from "app-types/user";
import { cn } from "lib/utils";

export function UserRoleBadges({
  user,
  showBanned = false,
  className,
}: {
  user: BasicUserWithLastLogin;
  showBanned?: boolean;
  className?: string;
  view?: "admin" | "user";
}) {
  return (
    <div
      className={cn("mt-3 flex flex-wrap items-center gap-2", className)}
      data-testid="user-role-badges"
    >
      {user.role?.split(",").map((role) => (
        <Badge
          key={role}
          variant="secondary"
          className="text-xs"
          data-testid={`role-badge-${role.toLowerCase()}`}
        >
          {userRolesInfo[role as UserRoleNames]?.label || role}
        </Badge>
      ))}
      {showBanned && user.banned && (
        <Badge variant="destructive" data-testid="user-banned-badge">
          Banned
        </Badge>
      )}
    </div>
  );
}
