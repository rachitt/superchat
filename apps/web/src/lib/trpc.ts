"use client";

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import superjson from "superjson";
import type { AppRouter } from "../../../server/src/trpc/routers/index.js";

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export function getTRPCClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "/trpc",
        transformer: superjson,
      }),
    ],
  });
}
