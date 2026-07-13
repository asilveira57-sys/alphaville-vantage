import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/ruas")({
  component: () => <Outlet />,
});
