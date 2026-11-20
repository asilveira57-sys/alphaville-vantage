import { SITE_URL } from "@/lib/site";
import { brl, groupNearby, type StreetOverview } from "@/lib/street-overview";

/** Ficha da rua em PDF, gerada no navegador (jsPDF) com os números do dia. */
export async function buildStreetFichaPdf(opts: {
  name: string; slug: string; local: string; firstName: string;
  overview: StreetOverview | null; nearby: unknown; summary?: string | null;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 14;
  const url = `${SITE_URL}/ruas/${opts.slug}`;
  const header = () => {
    doc.setFillColor(13, 13, 13);
    doc.rect(0, 0, W, 26, "F");
    doc.setTextColor(242, 218, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("S.A IMÓVEIS ALPHAVILLE", M, 13);
    doc.setTextColor(234, 234, 230);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("FICHA DA RUA", M, 20);
    doc.text("(11) 99551-5053 · portal.saimoveisalpha.com.br", W - M, 20, { align: "right" });
  };
  let y = 0;
  const need = (h: number) => { if (y + h > 280) { doc.addPage(); header(); y = 38; } };
  const h2 = (t: string) => {
    need(14);
    doc.setFillColor(242, 218, 0);
    doc.rect(M, y - 4, 2, 6, "F");
    doc.setTextColor(13, 13, 13);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(t, M + 5, y);
    y += 7;
  };
  const line = (t: string, bold = false, size = 9) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(40, 40, 40);
    for (const l of doc.splitTextToSize(t, W - 2 * M - 5) as string[]) { need(5); doc.text(l, M + 5, y); y += 4.6; }
  };

  header();
  y = 40;
  doc.setTextColor(13, 13, 13);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text(opts.name, M, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`${opts.local} · dados de ${new Date().toLocaleDateString("pt-BR")} · preparado para ${opts.firstName}`, M, y);
  y += 5;
  doc.setTextColor(13, 13, 13);
  doc.textWithLink("Ver a página da rua com fotos, mapa e imóveis", M, y, { url });
  y += 10;

  if (opts.summary) { h2("Sobre a rua"); line(opts.summary); y += 4; }

  const o = opts.overview;
  if (o && o.total > 0) {
    h2("Imóveis na rua hoje");
    line(`${o.total} imóveis na carteira da S.A: ${o.venda} à venda e ${o.aluguel} para alugar.`);
    y += 2;
    for (const t of o.tipos) {
      const partes = [
        `${t.n} ${t.grupo.toLowerCase()}`,
        t.min_venda ? `venda a partir de ${brl(t.min_venda)} (mediana ${brl(t.med_venda)})` : null,
        t.min_aluguel ? `aluguel a partir de ${brl(t.min_aluguel)}/mês` : null,
      ].filter(Boolean).join(" · ");
      line(`• ${partes}`);
    }
    y += 4;
    if (o.condominios.length) {
      h2("Condomínios e edifícios na rua");
      line(o.condominios.slice(0, 20).map((c) => `${c.nome} (${c.n})`).join(" · "));
      y += 4;
    }
  }

  const groups = groupNearby(opts.nearby);
  if (groups.length) {
    h2("O que tem perto");
    for (const g of groups) {
      line(g.cat, true);
      for (const i of g.items) line(`• ${i.name} · ${String(i.km).replace(".", ",")} km${i.min ? ` · ${i.min} min de carro` : ""}`);
      y += 1;
    }
    line("Distâncias de carro pelas ruas a partir dos condomínios da rua, sem trânsito (OpenStreetMap/OSRM).", false, 7.5);
    y += 4;
  }

  need(24);
  doc.setFillColor(13, 13, 13);
  doc.rect(M, y, W - 2 * M, 18, "F");
  doc.setTextColor(242, 218, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Quer visitar um imóvel nesta rua?", M + 5, y + 7);
  doc.setTextColor(234, 234, 230);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Fale com a S.A Imóveis: (11) 99551-5053 · CRECI 26075-J · há mais de 15 anos em Alphaville", M + 5, y + 13);
  return doc;
}
