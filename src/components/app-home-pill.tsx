import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { isStandalone } from "@/lib/pwa";

/** No app instalado, qualquer página do portal mostra um atalho de volta à tela de botões (/app). */
export function AppHomePill() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(isStandalone()), []);
  if (!show) return null;
  return (
    <Link
      to="/app"
      className="fixed left-3 bottom-[max(14px,env(safe-area-inset-bottom))] z-40 flex items-center gap-2 rounded-full bg-[#0D0D0D] text-[#F2DA00] border border-[#F2DA00]/40 px-4 h-11 text-sm shadow-lg"
    >
      <LayoutGrid className="h-4 w-4" /> Menu do app
    </Link>
  );
}
