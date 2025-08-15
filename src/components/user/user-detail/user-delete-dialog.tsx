import { deleteUserAction } from "@/app/api/user/actions";
import { DeleteUserActionState } from "@/app/api/user/validations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "ui/alert-dialog";
import { SubmitButton } from "./user-submit-button";
import { BasicUserWithLastLogin } from "app-types/user";
import { useActionState, useState } from "react";
import Form from "next/form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function UserDeleteDialog({
  user,
  children,
}: {
  user: BasicUserWithLastLogin;
  children?: React.ReactNode;
  view?: "admin" | "user";
}) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [_, deleteFormAction] = useActionState<DeleteUserActionState, FormData>(
    async (_prevState, formData) => {
      const result = await deleteUserAction({}, formData);

      if (result?.success) {
        router.replace(result.redirect || "/admin");
        toast.success("User deleted successfully");
        setShowDeleteDialog(false);
      } else {
        toast.error(result?.message || "Failed to delete user");
      }
      return result;
    },
    {},
  );
  return (
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{" "}
            <span className="font-semibold">{user.name}</span>&apos;s account
            and remove all associated data from the system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
            Cancel
          </AlertDialogCancel>
          <Form action={deleteFormAction}>
            <input type="hidden" name="userId" value={user.id} />
            <AlertDialogAction asChild>
              <SubmitButton variant="destructive">Delete User</SubmitButton>
            </AlertDialogAction>
          </Form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
