import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "ui/alert-dialog";
import { AlertDialogHeader } from "ui/alert-dialog";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { SubmitButton } from "./user-submit-button";
import Form from "next/form";
import { updateUserPasswordAction } from "@/app/api/user/actions";
import {
  UpdateUserPasswordActionState,
  UpdateUserPasswordError,
} from "@/app/api/user/validations";
import {
  passwordRegexPattern,
  passwordRequirementsText,
} from "lib/validations/password";

import { Input } from "ui/input";

export function UpdateUserPasswordDialog({
  children,
  userId,
  onReset,
  disabled,
}: {
  children: React.ReactNode;
  userId: string;
  onReset?: () => void;
  disabled?: boolean;
  view?: "admin" | "user";
}) {
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<null | string>(null);

  const [_, resetPasswordFormAction, isPending] = useActionState<
    UpdateUserPasswordActionState,
    FormData
  >(async (_prevState, formData) => {
    const result = await updateUserPasswordAction({}, formData);
    setErrorMessage(null);
    if (result?.success) {
      setShowResetPasswordDialog(false);
      onReset?.();
      setShowResetPasswordDialog(false);
      toast.success("Password updated successfully");
    } else {
      const errorMsg = result?.message || "Failed to update password";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    }
    return result;
  }, {});
  return (
    <AlertDialog
      open={showResetPasswordDialog}
      onOpenChange={(open) => {
        setShowResetPasswordDialog(open);
        if (!open) {
          setErrorMessage(null);
        }
      }}
    >
      <AlertDialogTrigger asChild disabled={disabled}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will change the user&apos;s password.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form action={resetPasswordFormAction}>
          <input type="hidden" name="userId" value={userId} />
          <div className="space-y-4 my-4">
            <Input
              type="password"
              name="newPassword"
              placeholder="New Password (8-20 chars, uppercase, lowercase, number, special char)"
              pattern={passwordRegexPattern}
              minLength={8}
              maxLength={20}
              required
              onFocus={() => setErrorMessage(null)}
              className={errorMessage ? "border-red-500" : ""}
              title={passwordRequirementsText}
            />
            <Input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              pattern={passwordRegexPattern}
              minLength={8}
              maxLength={20}
              required
              onFocus={() => setErrorMessage(null)}
              className={
                errorMessage === UpdateUserPasswordError.PASSWORD_MISMATCH
                  ? "border-red-500"
                  : ""
              }
              title={passwordRequirementsText}
            />
            {errorMessage && (
              <p className="text-red-500 text-sm">{errorMessage}</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setShowResetPasswordDialog(false)}
              disabled={isPending}
              type="button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <SubmitButton variant="default">Update Password</SubmitButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
