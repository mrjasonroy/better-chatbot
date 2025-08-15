"use client";

import { useActionState } from "react";
import { format } from "date-fns";
import { Label } from "ui/label";
import { Input } from "ui/input";
import { Button } from "ui/button";
import { Badge } from "ui/badge";
import { FormGroup } from "ui/form-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { toast } from "sonner";
import { updateUserDetailsAction } from "@/app/api/user/actions";
import { UpdateUserActionState } from "@/app/api/user/validations";
import { BasicUserWithLastLogin } from "app-types/user";
import { UserRoleSelector } from "./user-role-selection-dialog";

import { UserRoleBadges } from "./user-role-badges";
import Form from "next/form";
import { UpdateUserPasswordDialog } from "./user-update-password-dialog";
import { SubmitButton } from "./user-submit-button";
import { LockIcon } from "lucide-react";

interface UserDetailFormProps {
  user: BasicUserWithLastLogin;
  userAccountInfo?: {
    hasPassword: boolean;
    oauthProviders: string[];
  };
  currentUserId: string;
  onUserDetailsUpdate: (user: BasicUserWithLastLogin) => void;
  view?: "admin" | "user";
}

export function UserDetailForm({
  user,
  userAccountInfo,
  currentUserId,
  view,
  onUserDetailsUpdate,
}: UserDetailFormProps) {
  const [, detailsUpdateFormAction, isPending] = useActionState<
    UpdateUserActionState,
    FormData
  >(async (prevState, formData) => {
    const result = await updateUserDetailsAction(prevState, formData);
    if (result?.success && result.user) {
      onUserDetailsUpdate(result.user);
      toast.success("User details updated successfully");
    } else {
      toast.error(result?.message || "Failed to update user details");
    }
    return result;
  }, {});

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 pb-6">
          <div className="max-w-2xl mx-auto">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">User Information</h3>
              <p className="text-sm text-muted-foreground">
                Update user details and manage their account
              </p>
            </div>

            <Form
              className="space-y-6 mt-6"
              action={detailsUpdateFormAction}
              data-testid="user-detail-form"
            >
              <input type="hidden" name="userId" value={user.id} />

              <FormGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={user.name}
                      required
                      disabled={isPending}
                      data-testid="user-name-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={
                            !userAccountInfo?.oauthProviders?.length
                              ? "cursor-not-allowed"
                              : ""
                          }
                        >
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            defaultValue={user.email}
                            disabled={
                              !!userAccountInfo?.oauthProviders?.length ||
                              isPending
                            }
                            required
                            data-testid="user-email-input"
                          />
                        </span>
                      </TooltipTrigger>
                      {!!userAccountInfo?.oauthProviders?.length && (
                        <TooltipContent>
                          Email cannot be modified for SSO users
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </div>
              </FormGroup>

              <FormGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Roles Section */}
                  <div className="space-y-2 sm:border-r sm:border-border sm:pr-4">
                    <Label>Roles</Label>
                    <div className="flex items-start gap-2">
                      <div className="flex flex-wrap gap-2 flex-1">
                        <UserRoleBadges
                          user={user}
                          showBanned={false}
                          view={view}
                        />
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={
                              user.id === currentUserId
                                ? "cursor-not-allowed"
                                : ""
                            }
                          >
                            <UserRoleSelector
                              user={user}
                              onRoleChange={(newRole) => {
                                onUserDetailsUpdate({
                                  ...user,
                                  role: newRole,
                                });
                              }}
                            >
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={
                                  user.id === currentUserId || isPending
                                }
                                data-testid="change-role-button"
                              >
                                Change Role
                              </Button>
                            </UserRoleSelector>
                          </span>
                        </TooltipTrigger>
                        {user.id === currentUserId && (
                          <TooltipContent>
                            You cannot modify your own role
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </div>
                  </div>

                  {/* Account Status Section */}
                  <div className="space-y-2 sm:pl-4">
                    <Label>Account Status</Label>
                    <div>
                      {user.banned ? (
                        <Badge
                          variant="destructive"
                          data-testid="status-badge-banned"
                        >
                          Banned
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          data-testid="status-badge-active"
                        >
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </FormGroup>

              <FormGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Joined</Label>
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid="user-created-at"
                    >
                      {format(new Date(user.createdAt), "PPP")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Last Updated</Label>
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid="user-updated-at"
                    >
                      {format(new Date(user.updatedAt), "PPP")}
                    </p>
                  </div>
                </div>
              </FormGroup>
            </Form>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-background border-t border-border p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <UpdateUserPasswordDialog userId={user.id}>
            <Button
              variant="secondary"
              disabled={isPending || !userAccountInfo?.hasPassword}
              className="flex items-center gap-2"
              data-testid="update-password-button"
            >
              <LockIcon className="w-4 h-4" />
              Update Password
            </Button>
          </UpdateUserPasswordDialog>

          <SubmitButton data-testid="save-changes-button">
            Save Changes
          </SubmitButton>
        </div>
      </div>
    </>
  );
}
