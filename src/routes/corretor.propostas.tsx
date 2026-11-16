import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/corretor/propostas")({
  component: () => <Outlet />,
});
