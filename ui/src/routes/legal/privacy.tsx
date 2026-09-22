import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Spün Auth" },
      {
        name: "description",
        content: "Spün Auth Privacy Policy.",
      },
    ],
  }),
  component: () => null,
});
