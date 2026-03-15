import { router } from "../trpc.js";
import { workspaceRouter } from "./workspace.js";
import { channelRouter } from "./channel.js";
import { messageRouter } from "./message.js";

export const appRouter = router({
  workspace: workspaceRouter,
  channel: channelRouter,
  message: messageRouter,
});

export type AppRouter = typeof appRouter;
