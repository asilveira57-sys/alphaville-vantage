import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export type Option = { value: string; label: string; hint?: string };

export function RelatedSelect({
  value,
  onChange,
  options,
  placeholder = "Selecionar…",
  loading,
  allowClear = true,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  loading?: boolean;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full border border-ink/15 px-3 py-2 text-sm text-left bg-transparent flex items-center justify-between hover:border-ink/40"
        >
          <span className={current ? "text-ink" : "text-muted-foreground"}>
            {loading ? "Carregando…" : current ? current.label : placeholder}
          </span>
          <span className="text-muted-foreground text-xs">▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command>
          <CommandInput placeholder="Buscar…" />
          <CommandList>
            <CommandEmpty>Nenhum resultado.</CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem value="__clear__" onSelect={() => { onChange(""); setOpen(false); }}>
                  <span className="text-muted-foreground">— Nenhum —</span>
                </CommandItem>
              )}
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={`${o.label} ${o.hint ?? ""}`}
                  onSelect={() => { onChange(o.value); setOpen(false); }}
                >
                  <div className="flex flex-col">
                    <span>{o.label}</span>
                    {o.hint && <span className="text-[11px] text-muted-foreground">{o.hint}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
