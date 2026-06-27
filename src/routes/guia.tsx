import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/guia")({
  component: () => <Outlet />,
});
