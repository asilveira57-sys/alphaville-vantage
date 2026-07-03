import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";

const URL = "https://alphaville-vantage.lovable.app/politica-de-privacidade";
const TITLE = "Política de Privacidade — S.A Imóveis Alphaville";
const DESC =
  "Como a Padilha Assessoria em Vendas coleta, utiliza, armazena e protege dados pessoais conforme a LGPD. Direitos do titular e canal de contato.";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <SectionPage
      eyebrow="Transparência"
      title="Política de Privacidade"
      lead="Esta política descreve como tratamos dados pessoais em nossos canais digitais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)."
      breadcrumbs={[{ label: "Política de Privacidade" }]}
    >
      <div className="prose prose-neutral max-w-3xl prose-headings:font-serif prose-headings:text-ink prose-p:text-ink/85">
        <h2>1. Controlador</h2>
        <p>Padilha Assessoria em Vendas Ltda, CNPJ 13.349.385/0001-49, com sede na Av. Marcos Penteado de Ulhôa Rodrigues, 4053, Loja 4, Tamboré, Santana de Parnaíba/SP, CEP 06543-001.</p>

        <h2>2. Dados que coletamos</h2>
        <ul>
          <li><strong>Cadastrais:</strong> nome, CPF, RG, e-mail, telefone e endereço.</li>
          <li><strong>Financeiros:</strong> renda declarada e documentos exigidos para análise cadastral.</li>
          <li><strong>Navegação:</strong> IP, dispositivo, navegador, páginas visitadas e cookies.</li>
          <li><strong>Comunicação:</strong> mensagens enviadas por formulário, e-mail ou WhatsApp.</li>
        </ul>

        <h2>3. Finalidades</h2>
        <ul>
          <li>Prestação dos serviços de intermediação imobiliária, administração e reforma.</li>
          <li>Análise cadastral, contratação e cumprimento de obrigações legais.</li>
          <li>Comunicação com clientes e potenciais clientes.</li>
          <li>Melhoria contínua da experiência do site e do atendimento.</li>
        </ul>

        <h2>4. Base legal</h2>
        <p>Tratamos dados com base em: execução de contrato, cumprimento de obrigação legal, legítimo interesse e consentimento, conforme o caso.</p>

        <h2>5. Compartilhamento</h2>
        <p>Compartilhamos dados apenas com parceiros necessários à prestação do serviço (bancos, correspondentes, cartórios, empresas de vistoria, seguradoras) e autoridades quando exigido por lei. Não vendemos dados.</p>

        <h2>6. Armazenamento e segurança</h2>
        <p>Adotamos medidas técnicas e administrativas para proteger seus dados contra acesso não autorizado, perda, alteração ou destruição indevida.</p>

        <h2>7. Retenção</h2>
        <p>Retemos dados pelo tempo necessário ao cumprimento das finalidades e das obrigações legais aplicáveis ao setor imobiliário.</p>

        <h2>8. Direitos do titular</h2>
        <p>Você pode solicitar confirmação, acesso, correção, anonimização, portabilidade, eliminação, informações sobre compartilhamento e revogação de consentimento. Detalhes em <Link to="/lgpd">nossa página de LGPD</Link>.</p>

        <h2>9. Cookies</h2>
        <p>Utilizamos cookies conforme detalhado em <Link to="/politica-de-cookies">Política de Cookies</Link>.</p>

        <h2>10. Alterações</h2>
        <p>Esta política pode ser atualizada a qualquer momento. A versão vigente é sempre a publicada neste endereço.</p>

        <h2>11. Contato</h2>
        <p>Dúvidas ou solicitações relacionadas a dados pessoais: <a href="mailto:contato@saimoveisalphaville.com.br">contato@saimoveisalphaville.com.br</a>.</p>

        <p className="text-sm text-muted-foreground">Última atualização: julho de 2026.</p>
      </div>
    </SectionPage>
  );
}
