import { router } from "../trpc.js";
import { userRouter } from "./user.js";
import { workspaceRouter } from "./workspace.js";
import { channelRouter } from "./channel.js";
import { messageRouter } from "./message.js";
import { uploadRouter } from "./upload.js";
import { searchRouter } from "./search.js";

export const appRouter = router({
  user: userRouter,
  workspace: workspaceRouter,
  channel: channelRouter,
  message: messageRouter,
  upload: uploadRouter,
  search: searchRouter,
});

export type AppRouter = typeof appRouter;
