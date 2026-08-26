/**
 * Dados institucionais que precisam aparecer em material publicitário.
 *
 * O Anexo D do Código do CONAR e a Resolução COFECI 458/95 art. 2º exigem
 * o número de inscrição no CRECI em anúncios e impressos, com o sufixo "J"
 * para pessoa jurídica. Enquanto o valor abaixo não for preenchido, o mídia
 * kit exibe um aviso e o botão de impressão fica bloqueado — melhor um kit
 * indisponível do que um material irregular circulando com o nome da casa.
 */

export const BRAND = {
  name: "S.A Imóveis Alphaville",
  site: "https://saimoveisalphaville.com.br",
  portal: "https://alphaville-vantage.lovable.app",
  whatsapp: "5511995515053",

  /** TODO: preencher com o CRECI real da imobiliária, no formato "CRECI 00000-J". */
  creci: "",
} as const;

export const hasCreci = () => BRAND.creci.trim().length > 0;

/** Versão do termo de adesão do parceiro. Suba a versão a cada alteração do texto. */
export const PARTNER_AGREEMENT_VERSION = "parceiros-1.0";
