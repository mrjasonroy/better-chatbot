"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { Plus, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Skeleton } from "ui/skeleton";
import Link from "next/link";

import { BackgroundPaths } from "ui/background-paths";
import { ItemCard } from "@/components/ui/item-card";
import { useAgents } from "@/hooks/queries/use-agents";
import { useBookmark } from "@/hooks/use-bookmark";
import { toast } from "sonner";

export default function AgentsPage() {
  const t = useTranslations();

  const {
    myAgents,
    sharedAgents,
    isLoading,
    mutate: mutateAgents,
  } = useAgents(); // Use defaults to share cache

  const isLoadingMy = isLoading;
  const isLoadingShared = isLoading;

  // Use the bookmark hook with automatic data refresh
  const { toggleBookmark: toggleBookmarkHook } = useBookmark({
    itemType: "agent",
  });

  // Wrapper function to match the ItemCard's callback interface
  const toggleBookmark = async (agentId: string, isBookmarked: boolean) => {
    await toggleBookmarkHook({ id: agentId, isBookmarked });
  };

  const updateVisibility = async (
    agentId: string,
    visibility: "private" | "public" | "readonly",
  ) => {
    try {
      const response = await fetch(`/api/agent/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });

      if (!response.ok) throw new Error("Failed to update visibility");

      mutateAgents();
      toast.success(t("Agent.visibilityUpdated"));
    } catch {
      toast.error(t("Common.error"));
    }
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm(t("Agent.deleteConfirm"))) return;

    try {
      const response = await fetch(`/api/agent/${agentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete agent");

      // Refresh the agents data
      mutateAgents();
      toast.success(t("Agent.deleted"));
    } catch {
      toast.error(t("Common.error"));
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("Layout.agents")}</h1>
        <Link href="/agent/new">
          <Button>
            <Plus className="size-4 mr-2" />
            {t("Agent.newAgent")}
          </Button>
        </Link>
      </div>

      {/* My Agents Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t("Agent.myAgents")}</h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/agent/new">
            <Card className="relative bg-secondary overflow-hidden cursor-pointer hover:bg-input transition-colors h-[196px]">
              <div className="absolute inset-0 w-full h-full opacity-50">
                <BackgroundPaths />
              </div>
              <CardHeader>
                <CardTitle>
                  <h1 className="text-lg font-bold">{t("Agent.newAgent")}</h1>
                </CardTitle>
                <CardDescription className="mt-2">
                  <p>{t("Layout.createYourOwnAgent")}</p>
                </CardDescription>
                <div className="mt-auto ml-auto flex-1">
                  <Button variant="ghost" size="lg">
                    {t("Common.create")}
                    <ArrowUpRight className="size-3.5" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </Link>
          {isLoadingMy
            ? Array(6)
                .fill(null)
                .map((_, i) => <Skeleton key={i} className="h-32" />)
            : myAgents.map((agent) => (
                <ItemCard
                  key={agent.id}
                  type="agent"
                  item={agent}
                  href={`/agent/${agent.id}`}
                  onVisibilityChange={updateVisibility}
                  onDelete={deleteAgent}
                />
              ))}
        </div>
      </div>

      {/* Shared Agents Section */}
      <div className="flex flex-col gap-4 mt-8">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{t("Agent.sharedAgents")}</h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoadingShared
            ? Array(6)
                .fill(null)
                .map((_, i) => <Skeleton key={i} className="h-32" />)
            : sharedAgents.map((agent) => (
                <ItemCard
                  key={agent.id}
                  type="agent"
                  item={agent}
                  isOwner={false}
                  href={`/agent/${agent.id}`}
                  onBookmarkToggle={toggleBookmark}
                />
              ))}
          {!isLoadingShared && sharedAgents.length === 0 && (
            <Card className="col-span-full">
              <CardHeader className="text-center py-12">
                <CardTitle>{t("Agent.noSharedAgents")}</CardTitle>
                <CardDescription>
                  {t("Agent.noSharedAgentsDescription")}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
