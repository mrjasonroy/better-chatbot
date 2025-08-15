"use client";

import { Suspense } from "react";

import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerPortal,
  DrawerTitle,
} from "ui/drawer";
import { Button } from "ui/button";
import { UserDetailContentSkeleton } from "./user-detail-content-skeleton";
import { X } from "lucide-react";

export function UserSettingsPopup({
  userSettingsComponent,
}: {
  userSettingsComponent: React.ReactNode;
}) {
  const [openUserSettings, appStoreMutate] = appStore(
    useShallow((state) => [state.openUserSettings, state.mutate]),
  );

  const handleClose = () => {
    appStoreMutate({ openUserSettings: false });
  };

  return (
    <Drawer
      handleOnly
      open={openUserSettings}
      direction="top"
      onOpenChange={(open) => appStoreMutate({ openUserSettings: open })}
    >
      <DrawerPortal>
        <DrawerContent
          style={{
            userSelect: "text",
          }}
          className="max-h-[100vh]! w-full h-full border-none rounded-none flex flex-col bg-card overflow-hidden p-4 md:p-6"
        >
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X />
            </Button>
          </div>
          <DrawerTitle className="sr-only">User Settings</DrawerTitle>
          <DrawerDescription className="sr-only" />
          <div className="flex-1 rounded-lg border flex flex-col min-h-0">
            <div className="flex-1 p-4 md:p-8 min-h-0">
              <Suspense fallback={<UserDetailContentSkeleton />}>
                {userSettingsComponent}
              </Suspense>
            </div>
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}
