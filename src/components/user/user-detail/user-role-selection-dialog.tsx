import { SubmitButton } from "./user-submit-button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "ui/radio-group";
import { Label } from "ui/label";
import { userRolesInfo } from "app-types/roles";
import { BasicUserWithLastLogin } from "app-types/user";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { updateUserRolesAction } from "@/app/api/admin/actions";
import { UpdateUserRoleActionState } from "@/app/api/admin/validations";
import Form from "next/form";
import { DEFAULT_USER_ROLE } from "app-types/roles";

export function UserRoleSelector({
  children,
  user,
  onRoleChange,
}: {
  children?: React.ReactNode;
  user: Pick<BasicUserWithLastLogin, "id" | "name" | "role">;
  onRoleChange: (newUserRole: string) => void;
}) {
  const [_, roleFormAction, isPending] = useActionState<
    UpdateUserRoleActionState,
    FormData
  >(async (_prevState, formData) => {
    const result = await updateUserRolesAction({}, formData);
    if (result?.success && result.user) {
      onRoleChange(result.user.role || DEFAULT_USER_ROLE);
      setShowRoleDialog(false);
      toast.success(result?.message || "Role updated successfully");
    } else {
      toast.error(result?.message || "Failed to update role");
      setShowRoleDialog(false);
    }
    return result;
  }, {});
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  return (
    <AlertDialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent>
        <Form action={roleFormAction}>
          <input type="hidden" name="userId" value={user.id} />

          <AlertDialogHeader>
            <AlertDialogTitle>Change User Roles</AlertDialogTitle>
            <AlertDialogDescription>
              Select roles for {user.name}. Users can have multiple roles.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 space-y-3">
            <RadioGroup
              name="role"
              defaultValue={user.role}
              onValueChange={(value) => {
                onRoleChange(value);
              }}
            >
              {Object.entries(userRolesInfo).map(([role, info]) => (
                <div key={role} className="flex items-start space-x-3">
                  <RadioGroupItem
                    value={role}
                    id={role}
                    disabled={isPending}
                    className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                  <div className="leading-none flex flex-col w-full">
                    <Label
                      htmlFor={role}
                      className="flex flex-col w-full cursor-pointer"
                    >
                      <span className="w-full flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-start">
                        {info.label}
                      </span>
                      <span className="w-full flex-1 text-sm text-muted-foreground text-start">
                        {info.description}
                      </span>
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-6">
            <AlertDialogCancel
              disabled={isPending}
              type="button"
              onClick={() => setShowRoleDialog(false)}
            >
              Cancel
            </AlertDialogCancel>
            <SubmitButton>Update Role</SubmitButton>
          </div>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
