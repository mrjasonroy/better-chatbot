import { Badge } from "ui/badge";
import { userRolesInfo } from "app-types/roles";
import { UserRoleNames } from "app-types/roles";
import { BasicUserWithLastLogin } from "app-types/user";
import { cn } from "lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { Edit2 } from "lucide-react";

export function UserRoleBadges({
  user,
  showBanned = false,
  className,
  onRoleClick,
  onBanClick,
  disabled = false,
}: {
  user: BasicUserWithLastLogin;
  showBanned?: boolean;
  className?: string;
  view?: "admin" | "user";
  onRoleClick?: () => void;
  onBanClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn("mt-3 flex flex-wrap items-center gap-2", className)}
      data-testid="user-role-badges"
    >
      {user.role?.split(",").map((role) => {
        const isClickable = onRoleClick && !disabled;
        const badgeContent = (
          <Badge
            key={role}
            variant="secondary"
            className={cn(
              "text-xs",
              isClickable &&
                "cursor-pointer hover:bg-secondary/80 transition-colors",
              isClickable && "flex items-center gap-1",
            )}
            data-testid={`role-badge-${role.toLowerCase()}`}
            onClick={isClickable ? onRoleClick : undefined}
          >
            {userRolesInfo[role as UserRoleNames]?.label || role}
            {isClickable && <Edit2 className="w-3 h-3" />}
          </Badge>
        );

        if (isClickable) {
          return (
            <Tooltip key={role}>
              <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
              <TooltipContent>Click to change user role</TooltipContent>
            </Tooltip>
          );
        }

        return badgeContent;
      })}
      {showBanned && user.banned && (
        <Badge
          variant="destructive"
          data-testid="user-banned-badge"
          className={cn(
            onBanClick &&
              !disabled &&
              "cursor-pointer hover:bg-destructive/80 transition-colors",
          )}
          onClick={onBanClick && !disabled ? onBanClick : undefined}
        >
          Banned
        </Badge>
      )}
    </div>
  );
}
