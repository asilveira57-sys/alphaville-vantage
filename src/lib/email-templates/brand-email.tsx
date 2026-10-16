import * as React from "react";
import { Body, Button, Column, Container, Head, Heading, Hr, Html, Img, Link, Preview, Row, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EMAIL_TEMPLATES } from "../email-defaults";

export type BrandEmailProps = {
  subject?: string;
  heading?: string;
  intro?: string;
  outro?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  details?: { label: string; value: string }[];
  items?: { title: string; url: string; price?: string; image?: string | null; facts?: string }[];
};

const BrandEmail = ({ heading, intro, outro, ctaLabel, ctaUrl, details, items }: BrandEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{heading || "S.A Imóveis Alphaville"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>S.A IMÓVEIS ALPHAVILLE</Text>
        </Section>
        <Section style={content}>
          <Heading style={h1}>{heading || "Olá"}</Heading>
          {intro ? <Text style={text}>{intro}</Text> : null}
          {details && details.length > 0 ? (
            <Section style={box}>
              {details.map((d, i) => (
                <Text key={i} style={detail}>
                  <strong>{d.label}:</strong> {d.value}
                </Text>
              ))}
            </Section>
          ) : null}
          {items && items.length > 0 ? (
            <Section>
              {items.map((p, i) => (
                <Row key={i} style={itemRow}>
                  {p.image ? (
                    <Column style={{ width: "110px", verticalAlign: "top" }}>
                      <Img src={p.image} width="100" height="70" alt="" style={{ objectFit: "cover" }} />
                    </Column>
                  ) : null}
                  <Column style={{ verticalAlign: "top" }}>
                    <Link href={p.url} style={itemTitle}>{p.title}</Link>
                    {p.facts ? <Text style={small}>{p.facts}</Text> : null}
                    {p.price ? <Text style={price}>{p.price}</Text> : null}
                  </Column>
                </Row>
              ))}
            </Section>
          ) : null}
          {ctaLabel && ctaUrl ? (
            <Section style={{ margin: "24px 0" }}>
              <Button href={ctaUrl} style={button}>{ctaLabel}</Button>
            </Section>
          ) : null}
          {outro ? <Text style={text}>{outro}</Text> : null}
          <Hr style={{ borderColor: "#e5e5e0", margin: "24px 0" }} />
          <Text style={small}>
            S.A Imóveis Alphaville · WhatsApp (11) 99551-5053 · contato@saimoveisalpha.com.br
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const sample: BrandEmailProps = {
  heading: "Olá, Maria",
  intro: "Exemplo de texto de abertura.",
  outro: "Exemplo de texto de fechamento.",
  ctaLabel: "Falar no WhatsApp",
  ctaUrl: "https://wa.me/5511995515053",
  details: [
    { label: "Origem", value: "Radar" },
    { label: "Telefone", value: "(11) 99999-0000" },
  ],
};

export const BRAND_TEMPLATES: Record<string, TemplateEntry> = Object.fromEntries(
  EMAIL_TEMPLATES.map((t) => [
    t.name,
    {
      component: BrandEmail,
      subject: (d: Record<string, any>) => d.subject || t.subject.replace(/\{\w+\}/g, "").trim(),
      displayName: t.label,
      previewData: { ...sample, subject: t.subject, heading: t.heading.replace("{nome}", "Maria") },
    } satisfies TemplateEntry,
  ]),
);

const main = { backgroundColor: "#ffffff", fontFamily: "Georgia, 'Playfair Display', serif", margin: 0 };
const container = { maxWidth: "600px", margin: "0 auto" };
const header = { backgroundColor: "#0D0D0D", padding: "20px 28px" };
const brand = { color: "#F2DA00", fontSize: "16px", fontWeight: 700, letterSpacing: "2px", margin: 0, fontFamily: "Arial, sans-serif" };
const content = { padding: "28px", backgroundColor: "#ffffff" };
const h1 = { fontSize: "24px", color: "#0D0D0D", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "24px", color: "#333333", fontFamily: "Arial, sans-serif" };
const box = { backgroundColor: "#F5F5F1", borderLeft: "3px solid #F2DA00", padding: "12px 16px", margin: "16px 0" };
const detail = { fontSize: "14px", lineHeight: "20px", color: "#0D0D0D", margin: "4px 0", fontFamily: "Arial, sans-serif" };
const itemRow = { borderBottom: "1px solid #eeeeea", padding: "10px 0" };
const itemTitle = { fontSize: "14px", color: "#0D0D0D", fontWeight: 700, fontFamily: "Arial, sans-serif" };
const price = { fontSize: "14px", color: "#0D0D0D", fontWeight: 700, margin: "2px 0", fontFamily: "Arial, sans-serif" };
const small = { fontSize: "12px", color: "#777777", margin: "2px 0", fontFamily: "Arial, sans-serif" };
const button = { backgroundColor: "#F2DA00", color: "#0D0D0D", padding: "14px 24px", fontSize: "12px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" as const, textDecoration: "none", fontFamily: "Arial, sans-serif" };
