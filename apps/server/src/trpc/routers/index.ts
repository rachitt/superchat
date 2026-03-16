import { router } from "../trpc.js";
import { userRouter } from "./user.js";
import { workspaceRouter } from "./workspace.js";
import { channelRouter } from "./channel.js";
import { messageRouter } from "./message.js";
import { uploadRouter } from "./upload.js";
import { aiRouter } from "./ai.js";
import { gameRouter } from "./game.js";
import { searchRouter } from "./search.js";
import { notificationRouter } from "./notification.js";

export const appRouter = router({
  user: userRouter,
  workspace: workspaceRouter,
  channel: channelRouter,
  message: messageRouter,
  upload: uploadRouter,
  ai: aiRouter,
  game: gameRouter,
  search: searchRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
