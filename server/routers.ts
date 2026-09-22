import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: router({
    health: publicProcedure.query(() => ({ ok: true })),
  }),
});

export type AppRouter = typeof appRouter;
