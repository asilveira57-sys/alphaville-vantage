import { useState } from "react";
import { Send, Loader2, Check } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z
  .string()
  .trim()
  .email({ message: "Informe um e-mail válido." })
  .max(255, { message: "E-mail muito longo." });

type Props = { source?: string };

export function NewsletterForm({ source = "home" }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setIsError(true);
      setMessage(parsed.error.issues[0].message);
      return;
    }

    setStatus("loading");
    setMessage(null);
    setIsError(false);

    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: parsed.data.toLowerCase(), source });

    if (error && error.code !== "23505") {
      setStatus("idle");
      setIsError(true);
      setMessage("Não foi possível concluir agora. Tente novamente em instantes.");
      return;
    }

    setStatus("done");
    setEmail("");
    setMessage(
      error?.code === "23505"
        ? "Este e-mail já está cadastrado. Obrigado!"
        : "Inscrição confirmada. Obrigado!",
    );
  };

  return (
    <div className="mt-10 max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <label className="flex-1">
          <span className="sr-only">Seu melhor e-mail</span>
          <input
            type="email"
            required
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu.melhor@email.com"
            className="w-full bg-white/5 border border-white/15 text-white placeholder:text-white/40 px-5 py-4 text-sm outline-none focus:border-[#F2DA00] transition"
          />
        </label>
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex items-center justify-center gap-2 bg-[#F2DA00] text-[#0D0D0D] px-8 py-4 text-[12px] font-bold uppercase tracking-[0.22em] hover:brightness-95 transition disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
          ) : status === "done" ? (
            <Check className="h-4 w-4" strokeWidth={2.4} />
          ) : (
            <Send className="h-4 w-4" strokeWidth={2.4} />
          )}
          {status === "done" ? "Inscrito" : "Inscrever"}
        </button>
      </form>
      {message && (
        <p
          role="status"
          className={`mt-4 text-sm ${isError ? "text-red-400" : "text-[#F2DA00]"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
