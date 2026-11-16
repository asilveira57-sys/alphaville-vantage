import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/corretor/leads")({
  component: () => <Outlet />,
});
