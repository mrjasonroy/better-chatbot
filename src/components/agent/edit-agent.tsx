"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import useSWR from "swr";
import { toast } from "sonner";
import { authClient } from "auth/client";
import { useInvalidateAgents } from "@/hooks/queries/use-agents";
import { useMcpList } from "@/hooks/queries/use-mcp-list";
import { useWorkflowToolList } from "@/hooks/queries/use-workflow-tool-list";
import { useObjectState } from "@/hooks/use-object-state";
import { Agent, AgentUpsertSchema } from "app-types/agent";
import { ChatMention } from "app-types/chat";
import { MCPServerInfo } from "app-types/mcp";
import { WorkflowSummary } from "app-types/workflow";
import { DefaultToolName } from "lib/ai/tools";
import { BACKGROUND_COLORS } from "lib/const";
import { cn, fetcher, objectFlow } from "lib/utils";
import { safe } from "ts-safe";
import { handleErrorWithToast } from "ui/shared-toast";
import { ChevronDownIcon, Loader, WandSparklesIcon } from "lucide-react";
import { Button } from "ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "ui/dropdown-menu";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Textarea } from "ui/textarea";
import { ScrollArea } from "ui/scroll-area";
import { Skeleton } from "ui/skeleton";
import { TextShimmer } from "ui/text-shimmer";
import { ItemActions, Visibility } from "ui/item-actions";
import { GenerateAgentDialog } from "./generate-agent-dialog";
import { AgentIconPicker } from "./agent-icon-picker";
import { AgentToolSelector } from "./agent-tool-selector";
import {
  RandomDataGeneratorExample,
  WeatherExample,
} from "lib/ai/agent/example";

const defaultConfig = (): PartialBy<
  Omit<Agent, "createdAt" | "updatedAt" | "userId">,
  "id"
> => {
  return {
    name: "",
    description: "",
    icon: {
      type: "emoji",
      value:
        "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f916.png",
      style: {
        backgroundColor: BACKGROUND_COLORS[0],
      },
    },
    instructions: {
      role: "",
      systemPrompt: "",
      mentions: [],
    },
    visibility: "private",
  };
};

export default function EditAgent({ id }: { id?: string }) {
  const t = useTranslations();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const invalidateAgents = useInvalidateAgents();
  const router = useRouter();

  const [openGenerateAgentDialog, setOpenGenerateAgentDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [_isOwner, setIsOwner] = useState(true);
  const [hasEditAccess, setHasEditAccess] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [agent, setAgent] = useObjectState(defaultConfig());

  const { data: mcpList, isLoading: isMcpLoading } = useMcpList();
  const { data: workflowToolList, isLoading: isWorkflowLoading } =
    useWorkflowToolList();

  const assignToolsByNames = useCallback(
    (toolNames: string[]) => {
      const allMentions: ChatMention[] = [];

      objectFlow(DefaultToolName).forEach((toolName) => {
        if (toolNames.includes(toolName)) {
          allMentions.push({
            type: "defaultTool",
            name: toolName,
            label: toolName,
          });
        }
      });

      (mcpList as (MCPServerInfo & { id: string })[])?.forEach((mcp) => {
        mcp.toolInfo.forEach((tool) => {
          if (toolNames.includes(tool.name)) {
            allMentions.push({
              type: "mcpTool",
              serverName: mcp.name,
              name: tool.name,
              serverId: mcp.id,
            });
          }
        });
      });

      (workflowToolList as WorkflowSummary[])?.forEach((workflow) => {
        if (toolNames.includes(workflow.name)) {
          allMentions.push({
            type: "workflow",
            name: workflow.name,
            workflowId: workflow.id,
          });
        }
      });

      if (allMentions.length > 0) {
        setAgent((prev) => ({
          instructions: {
            ...prev.instructions,
            mentions: allMentions,
          },
        }));
      }
    },
    [mcpList, workflowToolList, setAgent],
  );

  const {
    isLoading: isStoredAgentLoading,
    mutate: mutateStoredAgent,
    isValidating,
  } = useSWR(id ? `/api/agent/${id}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateIfHidden: false,
    onError: (error) => {
      handleErrorWithToast(error);
      router.push(`/`);
    },
    onSuccess: (data) => {
      if (data) {
        setAgent({ ...defaultConfig(), ...data });
        const userIsOwner = data.userId === currentUserId;
        setIsOwner(userIsOwner);
        const canEdit = userIsOwner || data.visibility === "public";
        setHasEditAccess(canEdit);
      } else {
        toast.error(`Agent not found`);
        router.push(`/`);
      }
    },
  });

  const saveAgent = useCallback(() => {
    setIsSaving(true);
    safe(() => AgentUpsertSchema.parse(agent))
      .map(JSON.stringify)
      .map(async (body) =>
        fetcher(`/api/agent`, {
          method: "POST",
          body,
        }),
      )
      .ifOk(() => {
        invalidateAgents();
        router.push(`/agents`);
      })
      .ifFail(handleErrorWithToast)
      .watch(() => setIsSaving(false));
  }, [agent, invalidateAgents, router]);

  const updateVisibility = useCallback(
    async (visibility: Visibility) => {
      if (id) {
        try {
          await fetcher(`/api/agent/${id}`, {
            method: "PUT",
            body: JSON.stringify({ visibility }),
          });

          setAgent({ visibility });
          invalidateAgents();
          toast.success("Visibility updated");
        } catch (error) {
          handleErrorWithToast(error as Error);
        }
      } else {
        setAgent({ visibility });
      }
    },
    [id, invalidateAgents, setAgent],
  );

  const handleGenerateAgent = useCallback(
    (generatedData: any) => {
      objectFlow(generatedData).forEach((data, key) => {
        setAgent((prev) => {
          if (key === "name") {
            return { name: data as string };
          }
          if (key === "description") {
            return { description: data as string };
          }
          if (key === "instructions") {
            textareaRef.current?.scrollTo({
              top: textareaRef.current?.scrollHeight,
            });
            return {
              instructions: {
                ...prev.instructions,
                systemPrompt: data as string,
              },
            };
          }
          if (key === "role") {
            return {
              instructions: {
                ...prev.instructions,
                role: data as string,
              },
            };
          }
          return prev;
        });
      });
    },
    [setAgent],
  );

  const isLoadingTool = useMemo(() => {
    return isMcpLoading || isWorkflowLoading;
  }, [isMcpLoading, isWorkflowLoading]);

  const isLoading = useMemo(() => {
    return isLoadingTool || isSaving || isValidating;
  }, [isLoadingTool, isSaving, isValidating]);

  const isGenerating = openGenerateAgentDialog;

  useEffect(() => {
    if (id && !isValidating) {
      mutateStoredAgent();
    } else if (!id) {
      setAgent(defaultConfig());
    }
  }, [id, isValidating, mutateStoredAgent, setAgent]);

  return (
    <ScrollArea className="h-full w-full relative">
      <div className="w-full h-8 absolute bottom-0 left-0 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />
      <div className="z-10 relative flex flex-col gap-4 px-8 pt-8 pb-14 max-w-3xl h-full mx-auto">
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between pb-4 gap-2">
          <div className="w-full h-8 absolute top-[100%] left-0 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />
          {isGenerating ? (
            <TextShimmer className="w-full text-2xl font-bold">
              {t("Agent.generatingAgent")}
            </TextShimmer>
          ) : (
            <p className="w-full text-2xl font-bold">{t("Agent.title")}</p>
          )}

          <div className="flex items-center gap-2">
            {hasEditAccess && !id && (
              <>
                <Button
                  variant="ghost"
                  disabled={isLoading}
                  onClick={() => setOpenGenerateAgentDialog(true)}
                >
                  <WandSparklesIcon className="size-3" />
                  {t("Common.generateWithAI")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-between data-[state=open]:bg-input"
                      disabled={isLoading}
                    >
                      {t("Common.createWithExample")}
                      <ChevronDownIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-54" align="end">
                    <DropdownMenuItem
                      onClick={() => setAgent(RandomDataGeneratorExample)}
                    >
                      <div className="flex items-center gap-2">
                        <span>🎲</span>
                        <span>Generate Random Data</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAgent(WeatherExample)}>
                      <div className="flex items-center gap-2">
                        <span>🌤️</span>
                        <span>Weather Checker</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {id && hasEditAccess && !isStoredAgentLoading && (
              <ItemActions
                type="agent"
                visibility={agent.visibility || "private"}
                isOwner={hasEditAccess}
                onVisibilityChange={
                  hasEditAccess ? updateVisibility : undefined
                }
              />
            )}
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          <div className="flex flex-col justify-between gap-2 flex-1">
            <Label htmlFor="agent-name">
              {t("Agent.agentNameAndIconLabel")}
            </Label>
            {isStoredAgentLoading ? (
              <Skeleton className="w-full h-10" />
            ) : (
              <Input
                value={agent.name || ""}
                onChange={(e) => setAgent({ name: e.target.value })}
                autoFocus
                disabled={isLoading || !hasEditAccess}
                className="hover:bg-input bg-secondary/40 transition-colors border-transparent border-none! focus-visible:bg-input! ring-0!"
                id="agent-name"
                placeholder={t("Agent.agentNamePlaceholder")}
                readOnly={!hasEditAccess}
              />
            )}
          </div>
          {isStoredAgentLoading ? (
            <Skeleton className="w-16 h-16" />
          ) : (
            <AgentIconPicker
              icon={agent.icon}
              disabled={!hasEditAccess}
              onChange={(icon) => setAgent({ icon })}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="agent-description">
            {t("Agent.agentDescriptionLabel")}
          </Label>
          {isStoredAgentLoading ? (
            <Skeleton className="w-full h-10" />
          ) : (
            <Input
              id="agent-description"
              disabled={isLoading || !hasEditAccess}
              placeholder={t("Agent.agentDescriptionPlaceholder")}
              className="hover:bg-input placeholder:text-xs bg-secondary/40 transition-colors border-transparent border-none! focus-visible:bg-input! ring-0!"
              value={agent.description || ""}
              onChange={(e) => setAgent({ description: e.target.value })}
              readOnly={!hasEditAccess}
            />
          )}
        </div>

        <div className="mt-10 flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {t("Agent.agentSettingsDescription")}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex gap-2 items-center">
            <span>{t("Agent.thisAgentIs")}</span>
            {isStoredAgentLoading ? (
              <Skeleton className="w-44 h-10" />
            ) : (
              <Input
                id="agent-role"
                disabled={isLoading || !hasEditAccess}
                placeholder={t("Agent.agentRolePlaceholder")}
                className="hover:bg-input placeholder:text-xs bg-secondary/40 w-44 transition-colors border-transparent border-none! focus-visible:bg-input! ring-0!"
                value={agent.instructions?.role || ""}
                onChange={(e) =>
                  setAgent({
                    instructions: {
                      ...agent.instructions,
                      role: e.target.value || "",
                    },
                  })
                }
                readOnly={!hasEditAccess}
              />
            )}
            <span>{t("Agent.expertIn")}</span>
          </div>

          <div className="flex gap-2 flex-col">
            <Label htmlFor="agent-prompt" className="text-base">
              {t("Agent.agentInstructionsLabel")}
            </Label>
            {isStoredAgentLoading ? (
              <Skeleton className="w-full h-48" />
            ) : (
              <Textarea
                id="agent-prompt"
                ref={textareaRef}
                disabled={isLoading || !hasEditAccess}
                placeholder={t("Agent.agentInstructionsPlaceholder")}
                className="p-6 hover:bg-input min-h-48 max-h-96 overflow-y-auto resize-none placeholder:text-xs bg-secondary/40 transition-colors border-transparent border-none! focus-visible:bg-input! ring-0!"
                value={agent.instructions?.systemPrompt || ""}
                onChange={(e) =>
                  setAgent({
                    instructions: {
                      ...agent.instructions,
                      systemPrompt: e.target.value || "",
                    },
                  })
                }
                readOnly={!hasEditAccess}
              />
            )}
          </div>

          <div className="flex gap-2 flex-col">
            <Label htmlFor="agent-tool-bindings" className="text-base">
              {t("Agent.agentToolsLabel")}
            </Label>
            {isStoredAgentLoading ? (
              <Skeleton className="w-full h-12" />
            ) : (
              <AgentToolSelector
                mentions={agent.instructions?.mentions || []}
                isLoading={isLoadingTool}
                disabled={isLoading}
                hasEditAccess={hasEditAccess}
                onChange={(mentions) =>
                  setAgent({
                    instructions: {
                      ...agent.instructions,
                      mentions,
                    },
                  })
                }
              />
            )}
          </div>
        </div>

        {hasEditAccess && (
          <div
            className={cn("flex justify-end", isStoredAgentLoading && "hidden")}
          >
            <Button className="mt-2" onClick={saveAgent} disabled={isLoading}>
              {isSaving ? t("Common.saving") : t("Common.save")}
              {isSaving && <Loader className="size-4 animate-spin" />}
            </Button>
          </div>
        )}
      </div>

      <GenerateAgentDialog
        open={openGenerateAgentDialog}
        onOpenChange={setOpenGenerateAgentDialog}
        onGenerated={handleGenerateAgent}
        onToolsGenerated={assignToolsByNames}
      />
    </ScrollArea>
  );
}
