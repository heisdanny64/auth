import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/")({
  head: () => ({
    meta: [
      { title: "Terms & Privacy — Spün Auth" },
      {
        name: "description",
        content: "Spün Auth Terms of Service and Privacy Policy.",
      },
    ],
  }),
  component: () => null,
});
