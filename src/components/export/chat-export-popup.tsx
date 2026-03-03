import { exportChatAction } from "@/app/api/chat/actions";
import { LinkIcon, Loader } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { safe } from "ts-safe";
import { Button } from "ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "ui/dialog";

type Props = {
  threadId: string;
  onExport?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

export function ChatExportPopup(props: Props) {
  const t = useTranslations();
  const [isExporting, setIsExporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      props.onOpenChange?.(open);
    },
    [props.onOpenChange],
  );

  const handleExport = useCallback(() => {
    setIsExporting(true);
    safe(() =>
      exportChatAction({
        threadId: props.threadId,
      }),
    )
      .watch(() => setIsExporting(false))
      .ifOk((exportId) => {
        const link = `${window.location.origin}/export/${exportId}`;
        navigator.clipboard.writeText(link).then(() => {
          toast.success(t("Chat.Thread.linkCopied"));
        });
        window.open(link, "_blank");
        handleOpenChange(false);
      })
      .ifFail((error) => {
        toast.error(error.message || "Failed to export chat");
      })
      .unwrap();
  }, [props.threadId, handleOpenChange, t]);

  return (
    <Dialog open={props.open ?? dialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent className="flex flex-col gap-4">
        <DialogHeader className="mb-4">
          <DialogTitle>{t("Chat.Thread.sharePublicLink")}</DialogTitle>
          <DialogDescription>
            {t("Chat.Thread.sharePublicLinkDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 p-6 rounded-full border">
          <span className="mr-auto truncate min-w-0">{`${window.location.origin}/export/...`}</span>
          <Button
            className="rounded-full"
            size="lg"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader className="size-3.5 animate-spin" />
            ) : (
              <LinkIcon className="size-3.5" />
            )}
            {isExporting
              ? t("Chat.Thread.creatingLink")
              : t("Chat.Thread.createLink")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
