import { SITE_URL } from "@/lib/site";
import { brl, groupNearby, type StreetOverview } from "@/lib/street-overview";

/** Imagens da ficha (servidas em /public). Em teste local, passe dataURLs prontos. */
export type FichaAssets = { logo?: string; qr?: string; gustavo?: string; joao?: string };

const ASSET_PATHS: Record<keyof FichaAssets, string> = {
  logo: "/brand/logo-sa-imoveis-amarela.png",
  qr: "/brand/qr-whatsapp-ficha.png",
  gustavo: "/corretores/gustavo-padilha-redondo.jpg",
  joao: "/corretores/joao-carvalho-redondo.jpg",
};

async function toDataUrl(path: string): Promise<string | undefined> {
  try {
    const res = await fetch(path);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise<string>((ok, fail) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.onerror = fail;
      r.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export async function loadFichaAssets(): Promise<FichaAssets> {
  const entries = await Promise.all(
    (Object.keys(ASSET_PATHS) as (keyof FichaAssets)[]).map(async (k) => [k, await toDataUrl(ASSET_PATHS[k])] as const),
  );
  return Object.fromEntries(entries) as FichaAssets;
}

const fmt = (d: string) => (d.startsWith("data:image/png") ? "PNG" : "JPEG");
const WHATS = "(11) 99551-5053";

/** Ficha da rua em PDF, gerada no navegador (jsPDF) com os números do dia. */
export async function buildStreetFichaPdf(opts: {
  name: string; slug: string; local: string; firstName: string;
  overview: StreetOverview | null; nearby: unknown; summary?: string | null;
  assets?: FichaAssets; date?: Date;
}) {
  const { jsPDF } = await import("jspdf");
  const a = opts.assets ?? (await loadFichaAssets());
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 16;
  const url = `${SITE_URL}/ruas/${opts.slug}`;
  const hoje = (opts.date ?? new Date()).toLocaleDateString("pt-BR");
  const FOOT = 20; // altura reservada ao rodapé

  const header = () => {
    doc.setFillColor(13, 13, 13);
    doc.rect(0, 0, W, 24, "F");
    if (a.logo) doc.addImage(a.logo, "PNG", M, 4.5, 31, 15.1);
    else {
      doc.setTextColor(242, 218, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("S.A IMÓVEIS", M, 14);
    }
    doc.setTextColor(242, 218, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("FICHA DA RUA", W - M, 11, { align: "right" });
    doc.setTextColor(234, 234, 230);
    doc.setFont("helvetica", "normal");
    doc.text(`Dados de ${hoje}`, W - M, 16, { align: "right" });
  };

  let y = 0;
  const newPage = () => { doc.addPage(); header(); y = 36; };
  const need = (h: number) => { if (y + h > H - FOOT - 4) newPage(); };
  const h2 = (t: string) => {
    need(16);
    doc.setFillColor(242, 218, 0);
    doc.rect(M, y - 4.2, 2.2, 6, "F");
    doc.setTextColor(13, 13, 13);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(t, M + 5, y);
    y += 7;
  };
  const para = (t: string, opt: { bold?: boolean; size?: number; color?: [number, number, number]; indent?: number } = {}) => {
    doc.setFont("helvetica", opt.bold ? "bold" : "normal");
    doc.setFontSize(opt.size ?? 9.5);
    doc.setTextColor(...(opt.color ?? [45, 45, 45]));
    const x = M + (opt.indent ?? 5);
    for (const l of doc.splitTextToSize(t, W - x - M) as string[]) { need(5); doc.text(l, x, y); y += 4.8; }
  };

  // ---- Capa / topo
  header();
  y = 40;
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(opts.local.toUpperCase(), M, y);
  y += 9;
  doc.setTextColor(13, 13, 13);
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  for (const l of doc.splitTextToSize(opts.name, W - 2 * M) as string[]) { doc.text(l, M, y); y += 8; }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(90, 90, 90);
  doc.text(`Preparada para ${opts.firstName} pela S.A Imóveis Alphaville`, M, y);
  y += 5;
  doc.setTextColor(13, 13, 13);
  doc.setFont("helvetica", "bold");
  doc.textWithLink("Ver a página da rua com fotos, mapa e imóveis  >", M, y, { url });
  y += 9;

  if (opts.summary) { para(opts.summary, { size: 10.5, color: [30, 30, 30], indent: 0 }); y += 3; }

  // ---- Números
  const o = opts.overview;
  if (o && o.total > 0) {
    h2("A rua em números hoje");
    need(22);
    const boxW = (W - 2 * M - 8) / 3;
    [["Imóveis", o.total], ["À venda", o.venda], ["Para alugar", o.aluguel]].forEach(([l, v], i) => {
      const x = M + i * (boxW + 4);
      doc.setFillColor(245, 244, 238);
      doc.rect(x, y, boxW, 14, "F");
      doc.setTextColor(13, 13, 13);
      doc.setFont("times", "bold");
      doc.setFontSize(18);
      doc.text(String(v), x + 5, y + 7.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(110, 110, 110);
      doc.text(String(l).toUpperCase(), x + 5, y + 11.8);
    });
    y += 19;
    // tabela por tipo
    const cols = [M, M + 38, M + 60, M + 98, M + 136];
    need(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    ["TIPO", "IMÓVEIS", "VENDA A PARTIR DE", "VENDA (MEDIANA)", "ALUGUEL A PARTIR DE"].forEach((t, i) => doc.text(t, cols[i], y));
    y += 2;
    doc.setDrawColor(200, 200, 195);
    doc.line(M, y, W - M, y);
    y += 5;
    for (const t of o.tipos) {
      need(7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 30, 30);
      [t.grupo, String(t.n), brl(t.min_venda) ?? "-", brl(t.med_venda) ?? "-", t.min_aluguel ? `${brl(t.min_aluguel)}/mês` : "-"]
        .forEach((v, i) => doc.text(v, cols[i], y));
      y += 2;
      doc.setDrawColor(230, 230, 225);
      doc.line(M, y, W - M, y);
      y += 4.5;
    }
    y += 4;
    if (o.condominios.length) {
      h2("Condomínios e edifícios na rua");
      para(o.condominios.slice(0, 24).map((c) => `${c.nome} (${c.n})`).join("  ·  "));
      y += 2;
    }
  }

  // ---- Entorno
  const groups = groupNearby(opts.nearby);
  if (groups.length) {
    h2("O que tem perto");
    const colW = (W - 2 * M - 6) / 2;
    let col = 0, rowTop = y, colBottom = y;
    for (const g of groups) {
      const blockH = 5 + g.items.length * 4.3;
      if (col === 0) { need(blockH); rowTop = y; }
      const x = M + col * (colW + 6);
      let yy = rowTop;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(g.cat.toUpperCase(), x, yy);
      yy += 4.5;
      for (const i of g.items) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        const nm = (doc.splitTextToSize(i.name, colW - 30) as string[])[0];
        doc.text(nm, x, yy);
        doc.setTextColor(110, 110, 110);
        doc.text(`${String(i.km).replace(".", ",")} km${i.min ? ` · ${i.min} min` : ""}`, x + colW, yy, { align: "right" });
        yy += 4.3;
      }
      colBottom = Math.max(colBottom, yy);
      if (col === 1) { y = colBottom + 2; col = 0; } else col = 1;
    }
    if (col === 1) y = colBottom + 2;
    para("Distâncias de carro pelas ruas, a partir dos condomínios da rua, sem trânsito. Fonte: OpenStreetMap.", { size: 7.5, color: [120, 120, 120], indent: 0 });
    y += 4;
  }

  // ---- Fale com a S.A: corretores + QR
  if (y + 42 > H - 17) newPage();
  const boxTop = y;
  doc.setFillColor(13, 13, 13);
  doc.rect(M, boxTop, W - 2 * M, 42, "F");
  doc.setTextColor(242, 218, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Quer visitar um imóvel nesta rua?", M + 7, boxTop + 9);
  doc.setTextColor(234, 234, 230);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Fale com a nossa equipe pelo WhatsApp " + WHATS + ".", M + 7, boxTop + 14.5);
  const people: [string | undefined, string][] = [[a.gustavo, "Gustavo Padilha"], [a.joao, "João Carvalho"]];
  people.forEach(([img, nome], i) => {
    const x = M + 7 + i * 36;
    if (img) {
      doc.setFillColor(255, 255, 255);
      doc.circle(x + 9, boxTop + 27, 9.4, "F");
      doc.addImage(img, fmt(img), x, boxTop + 18, 18, 18);
    }
    doc.setTextColor(234, 234, 230);
    doc.setFontSize(8);
    doc.text(nome, x + 9, boxTop + 39.5, { align: "center" });
  });
  if (a.qr) {
    doc.setFillColor(255, 255, 255);
    doc.rect(W - M - 34, boxTop + 4, 28, 28, "F");
    doc.addImage(a.qr, "PNG", W - M - 33, boxTop + 5, 26, 26);
    doc.setTextColor(242, 218, 0);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("APONTE A CÂMERA", W - M - 20, boxTop + 35.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(234, 234, 230);
    doc.text("e fale no WhatsApp", W - M - 20, boxTop + 39, { align: "center" });
  }
  doc.link(W - M - 34, boxTop + 4, 28, 28, { url: "https://wa.me/5511995515053" });
  y = boxTop + 46;

  // ---- Rodapé em todas as páginas
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(242, 218, 0);
    doc.setLineWidth(0.6);
    doc.line(M, H - 15, W - M, H - 15);
    doc.setLineWidth(0.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text("S.A Imóveis Alphaville · CRECI 26075-J · Av. Marcos Penteado de Ulhôa Rodrigues, 4053, Loja 4, Tamboré, Santana de Parnaíba/SP", M, H - 10.5);
    doc.text(`WhatsApp ${WHATS} · portal.saimoveisalpha.com.br · há mais de 15 anos em Alphaville`, M, H - 6.5);
    doc.text(`${p}/${total}`, W - M, H - 6.5, { align: "right" });
    doc.setFontSize(6.5);
    doc.setTextColor(140, 140, 140);
    doc.text("Valores e disponibilidade dos imóveis mudam com frequência; confirme com a S.A antes de visitar.", M, H - 2.8);
  }
  return doc;
}
