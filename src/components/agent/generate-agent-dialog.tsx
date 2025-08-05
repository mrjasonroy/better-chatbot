"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { experimental_useObject } from "@ai-sdk/react";
import { ChatModel } from "app-types/chat";
import { AgentGenerateSchema } from "app-types/agent";
import { handleErrorWithToast } from "ui/shared-toast";
import { CommandIcon, CornerRightUpIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Button } from "ui/button";
import { Textarea } from "ui/textarea";
import { MessageLoading } from "ui/message-loading";
import { SelectModel } from "@/components/select-model";
import { appStore } from "@/app/store";

interface GenerateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (data: any) => void;
  onToolsGenerated?: (tools: string[]) => void;
}

export function GenerateAgentDialog({
  open,
  onOpenChange,
  onGenerated,
  onToolsGenerated,
}: GenerateAgentDialogProps) {
  const t = useTranslations();
  const [generateModel, setGenerateModel] = useState<ChatModel | undefined>(
    appStore.getState().chatModel,
  );
  const [generateAgentPrompt, setGenerateAgentPrompt] = useState("");

  const { submit } = experimental_useObject({
    api: "/api/agent/ai",
    schema: AgentGenerateSchema,
    onFinish(event) {
      if (event.error) {
        handleErrorWithToast(event.error);
      }
      if (event.object) {
        onGenerated(event.object);
        if (event.object.tools && onToolsGenerated) {
          onToolsGenerated(event.object.tools);
        }
      }
    },
  });

  const submitGenerateAgent = () => {
    submit({
      message: generateAgentPrompt,
      chatModel: generateModel,
    });
    onOpenChange(false);
    setGenerateAgentPrompt("");
    setGenerateModel(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="xl:max-w-[40vw] w-full max-w-full">
        <DialogHeader>
          <DialogTitle>Generate Agent</DialogTitle>
          <DialogDescription className="sr-only">
            Generate Agent
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 w-full">
          <div className="px-4">
            <p className="bg-secondary rounded-lg max-w-2/3 p-4">
              {t("Agent.generateAgentDetailedGreeting")}
            </p>
          </div>

          <div className="flex justify-end px-4">
            <p className="text-sm bg-primary text-primary-foreground py-4 px-6 rounded-lg">
              <MessageLoading className="size-4" />
            </p>
          </div>

          <div className="relative flex flex-col border rounded-lg p-4">
            <Textarea
              value={generateAgentPrompt}
              autoFocus
              placeholder="input prompt here..."
              onChange={(e) => setGenerateAgentPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey) {
                  e.preventDefault();
                  submitGenerateAgent();
                }
              }}
              className="w-full break-all pb-6 border-none! ring-0! resize-none min-h-24 max-h-48 overflow-y-auto placeholder:text-xs transition-colors"
            />
            <div className="flex justify-end items-center gap-2">
              <SelectModel
                showProvider
                onSelect={(model) => setGenerateModel(model)}
              />
              <Button
                disabled={!generateAgentPrompt.trim()}
                size="sm"
                onClick={submitGenerateAgent}
                className="text-xs"
              >
                <span className="mr-1">Send</span>
                <CommandIcon className="size-3" />
                <CornerRightUpIcon className="size-3" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
