import { BRAND, PARTNER_AGREEMENT_VERSION } from "@/lib/brand";

/**
 * Termo de adesão do parceiro.
 *
 * Existe por um motivo concreto: pelo CDC e pelo Código do CONAR, a
 * responsabilidade pela publicidade é conjunta entre quem anuncia e quem
 * divulga, e a Resolução COFECI 458/95 art. 1º só admite anúncio público
 * por quem tem contrato escrito de intermediação. Sem este aceite, a
 * imobiliária estaria distribuindo material para uma rede aberta e
 * respondendo pelo que cada um publica.
 *
 * Ao alterar o texto, suba PARTNER_AGREEMENT_VERSION — quem já aceitou
 * precisa aceitar de novo, e a versão de cada aceite fica registrada.
 */
export function PartnerAgreement() {
  return (
    <div className="max-h-72 overflow-y-auto border border-ink/15 bg-white p-6 text-sm leading-relaxed text-muted-foreground">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Termo de adesão · versão {PARTNER_AGREEMENT_VERSION}
      </p>
      <h3 className="font-serif mt-2 text-lg text-ink">
        Divulgação de imóveis da Vitrine de Oportunidades
      </h3>

      <ol className="mt-4 list-decimal space-y-3 pl-5">
        <li>
          <strong className="text-ink">Habilitação.</strong> O parceiro declara ser corretor de
          imóveis regularmente inscrito no CRECI e possuir contrato escrito de intermediação que o
          autorize a divulgar publicamente os imóveis disponibilizados, nos termos da Resolução
          COFECI 458/95, art. 1º.
        </li>
        <li>
          <strong className="text-ink">Identificação.</strong> Toda peça publicada pelo parceiro
          deve conter seu número de inscrição no CRECI, conforme o art. 2º da mesma resolução.
        </li>
        <li>
          <strong className="text-ink">Integridade do material.</strong> O parceiro se compromete a
          não alterar preço, condições, metragens, características ou qualquer alegação presente no
          material fornecido. Alterações criam informação divergente da anunciada pela {BRAND.name},
          e informação publicitária precisa vincula quem a veicula (CDC art. 30).
        </li>
        <li>
          <strong className="text-ink">Alegações de preço.</strong> Quando o material trouxer
          comparação de valor por metro quadrado, ela deve ser reproduzida na íntegra, com o número
          de comparáveis, o recorte, a fonte e a data da apuração. É vedado resumir a comparação em
          expressões como “abaixo do mercado”, “menor preço” ou equivalentes — o ônus da prova da
          veracidade da publicidade é de quem a patrocina (CDC art. 38) e alegações objetivas
          precisam ser comprováveis (Código do CONAR, art. 27).
        </li>
        <li>
          <strong className="text-ink">Escassez e urgência.</strong> É vedado ao parceiro criar
          mensagens de urgência, contagem regressiva, “última unidade” ou indicação de procura que
          não constem do material fornecido.
        </li>
        <li>
          <strong className="text-ink">Fotografias.</strong> As imagens devem ser usadas sem
          tratamento que altere a realidade do imóvel, conforme o Anexo D do Código do CONAR.
        </li>
        <li>
          <strong className="text-ink">Validade.</strong> Cada material tem prazo de validade
          indicado. Encerrada a validade, ou saindo o imóvel da vitrine, o parceiro deve remover as
          publicações em até 48 horas. Material vencido em circulação configura publicidade enganosa
          (CDC art. 37).
        </li>
        <li>
          <strong className="text-ink">Registro de acesso.</strong> A {BRAND.name} registra qual
          parceiro acessou o material de cada imóvel, para conseguir avisar quem precisa despublicar
          quando um imóvel é vendido ou retirado.
        </li>
        <li>
          <strong className="text-ink">Remuneração.</strong> Condições comerciais e divisão de
          comissão são tratadas em documento próprio, e não integram este termo nem o material de
          divulgação.
        </li>
        <li>
          <strong className="text-ink">Encerramento.</strong> A {BRAND.name} pode encerrar o acesso
          a qualquer momento, especialmente em caso de descumprimento dos itens acima.
        </li>
      </ol>
    </div>
  );
}
