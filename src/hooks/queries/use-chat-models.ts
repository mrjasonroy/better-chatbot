import { appStore } from "@/app/store";
import { fetcher } from "lib/utils";
import useSWR from "swr";

export const useChatModels = () => {
  return useSWR<
    {
      provider: string;
      models: {
        name: string;
        isToolCallUnsupported: boolean;
        isDefault: boolean;
      }[];
    }[]
  >("/api/chat/models", fetcher, {
    dedupingInterval: 60_000 * 5,
    revalidateOnFocus: false,
    fallbackData: [],
    onSuccess: (data) => {
      const status = appStore.getState();
      if (!status.chatModel) {
        // Find the default model first
        const defaultModel = data.flatMap((p) =>
          p.models
            .filter((m) => m.isDefault)
            .map((m) => ({
              provider: p.provider,
              model: m.name,
            })),
        )[0];

        // Use default model if available, otherwise fallback to first model
        const modelToSet = defaultModel || {
          provider: data[0].provider,
          model: data[0].models[0].name,
        };

        appStore.setState({ chatModel: modelToSet });
      }
    },
  });
};
