"use client";

import { useState, useActionState, useMemo } from "react";
import { Badge } from "ui/badge";
import { cn } from "lib/utils";
import { BasicUserWithLastLogin } from "app-types/user";
import { toast } from "sonner";
import { updateUserBanStatusAction } from "@/app/api/admin/actions";
import { UpdateUserBanStatusActionState } from "@/app/api/admin/validations";
import { useTranslations } from "next-intl";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { Edit2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTrigger,
} from "ui/alert-dialog";
import Form from "next/form";
import { SubmitButton } from "./user-submit-button";

export function UserStatusBadge({
  user,
  onStatusChange,
  currentUserId,
  disabled = false,
  showClickable = true,
}: {
  user: BasicUserWithLastLogin;
  onStatusChange?: (user: BasicUserWithLastLogin) => void;
  currentUserId?: string;
  disabled?: boolean;
  showClickable?: boolean;
}) {
  const tCommon = useTranslations("User.Profile.common");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [_, banStatusAction, isPending] = useActionState<
    UpdateUserBanStatusActionState,
    FormData
  >(async (_prevState, formData) => {
    const result = await updateUserBanStatusAction({}, formData);
    if (result?.success && result.user) {
      onStatusChange?.(result.user);
      setShowConfirmDialog(false);
      toast.success(result.message);
    } else {
      toast.error(result?.message || "Failed to update user status");
      setShowConfirmDialog(false);
    }
    return result;
  }, {});

  const canModify = useMemo(() => {
    return showClickable && !disabled && currentUserId !== user.id;
  }, [showClickable, disabled, currentUserId, user.id]);
  const willBan = !user.banned;
  console.log("willBan", willBan);
  console.log("user.banned", user.banned);

  const renderBadge = () => {
    const badgeElement = user.banned ? (
      <Badge
        variant="destructive"
        data-testid="status-badge-banned"
        className={cn(
          canModify &&
            "cursor-pointer hover:bg-destructive/80 transition-colors",
          canModify && "flex items-center gap-1",
        )}
      >
        {tCommon("banned")}
        {canModify && <Edit2 className="w-2 h-2" />}
      </Badge>
    ) : (
      <Badge
        variant="outline"
        data-testid="status-badge-active"
        className={cn(
          canModify && "cursor-pointer hover:bg-muted transition-colors",
          canModify && "flex items-center gap-1",
        )}
      >
        {tCommon("active")}
        {canModify && <Edit2 className="w-2 h-2" />}
      </Badge>
    );

    if (canModify) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{badgeElement}</TooltipTrigger>
          <TooltipContent>
            {user.banned ? "Click to unban user" : "Click to ban user"}
          </TooltipContent>
        </Tooltip>
      );
    }

    return badgeElement;
  };

  return (
    <>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        {canModify ? (
          <AlertDialogTrigger>{renderBadge()}</AlertDialogTrigger>
        ) : (
          renderBadge()
        )}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {willBan ? "Ban User" : "Unban User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {willBan
                ? `Are you sure you want to ban ${user.name}? This will prevent them from accessing the application.`
                : `Are you sure you want to unban ${user.name}? They will regain access to the application.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Form action={banStatusAction}>
            <input type="hidden" name="userId" value={user.id} />
            <input
              type="hidden"
              name="banned"
              value={user.banned ? "true" : "false"}
            />
            <input
              type="hidden"
              name="boolean2"
              value={user.banned ? "true" : "false"}
            />
            <div className="flex justify-end gap-2">
              <AlertDialogCancel
                disabled={isPending}
                onClick={(e) => {
                  e.preventDefault();
                  setShowConfirmDialog(false);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isPending}
                className={
                  willBan ? "bg-destructive hover:bg-destructive/90" : ""
                }
                asChild
              >
                <SubmitButton
                  className={
                    willBan ? "bg-destructive hover:bg-destructive/90" : ""
                  }
                >
                  {isPending
                    ? willBan
                      ? "Banning..."
                      : "Unbanning..."
                    : willBan
                      ? "Ban User"
                      : "Unban User"}
                </SubmitButton>
              </AlertDialogAction>
            </div>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
