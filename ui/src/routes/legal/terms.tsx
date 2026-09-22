import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Spün Auth" },
      {
        name: "description",
        content: "Spün Auth Terms of Service.",
      },
    ],
  }),
  component: () => null,
});
