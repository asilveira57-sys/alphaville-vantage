# E-mails automáticos dos formulários + gestão no Admin

## Situação atual
- Nenhum domínio de envio está configurado. Sem isso, o site não envia e-mails.
- Primeiro passo (seu): configurar o domínio saimoveisalpha.com.br no botão "Configurar domínio de e-mail" e adicionar os registros no provedor do domínio. Remetente: contato@saimoveisalpha.com.br. As respostas dos clientes chegam nessa caixa.
- A confirmação do domínio pode levar algumas horas. Eu deixo tudo pronto antes, e os envios começam assim que o domínio for confirmado.

## 1. Aviso interno de lead novo
- Para contato@saimoveisalpha.com.br, a cada lead de qualquer formulário: origem (Newsletter, Financiamento, Radar, Pesquisa salva, Oportunidades, Parceiro/Empreendimento), página onde converteu, nome, WhatsApp, e-mail, resumo das respostas e link para o painel Leads (CRM).

## 2. Confirmação para o cliente (só quando ele deixou e-mail)
- Newsletter: confirmação da inscrição.
- Financiamento: resumo da simulação (valor, entrada, prazo, parcela, sistema).
- Radar: resumo do perfil e o próximo passo do corretor.
- Pesquisa salva: link da pesquisa e lista dos imóveis (até 30, com foto, preço e link). O PDF não vai anexo (anexos não são aceitos); o e-mail traz o link da pesquisa.
- Lista de Oportunidades: confirmação da inscrição.
- Parceiro/Empreendimento: confirmação do interesse no empreendimento.
- Todos com a marca S.A (preto, amarelo, Playfair) e o WhatsApp (11) 99551-5053. Um rodapé de descadastro é colocado automaticamente pelo sistema e não pode ser removido.
- Somente e-mails ligados ao pedido da pessoa. Envio em massa / campanhas não é permitido por este sistema.

## 3. Gestão de e-mails no Admin
- Novo botão "E-mails" no Admin.
- Lista dos modelos (um por formulário + aviso interno), com liga/desliga de cada um.
- Edição de: assunto, título, texto de abertura, texto de fechamento, texto e link do botão, destinatário do aviso interno.
- Campos variáveis prontos para inserir: {nome}, {origem}, {pagina}, {resumo}, etc.
- Pré-visualização ao vivo e "Enviar teste" para um e-mail escolhido.
- Histórico de envios: data, modelo, destinatário, situação (enviado, falhou, bloqueado/descadastrado).
- O layout (cores, logo, estrutura) é fixo pela marca; os textos e opções são editáveis. Mudanças maiores de layout continuam comigo.

## Teste antes de entregar
- Preencher cada formulário com um e-mail de teste, conferir o aviso interno e a confirmação do cliente, editar um texto no Admin e conferir que o envio seguinte usa o novo texto. Apagar só os registros de teste.

## Detalhes técnicos
- Configurar domínio (diálogo) -> setup_email_infra -> scaffold_transactional_email; página de descadastro com a marca no caminho informado pelo scaffold.
- Templates React Email em src/lib/email-templates/: lead-notificacao, newsletter-confirmacao, financiamento-resumo, radar-confirmacao, pesquisa-salva, oportunidades-confirmacao, parceiro-confirmacao. Cada um lê textos de uma nova tabela email_template_settings (template_name, enabled, subject, heading, intro, outro, cta_label, cta_url, recipient_override, updated_at), com valores padrão no código. RLS: só admin lê/edita; leitura no servidor com service role.
- Disparo no servidor, logo após gravar cada formulário (server functions existentes de newsletter, financiamento, radar, search-leads, opportunity-subscribers, parceiros), chamando a rota de envio internamente com idempotência = id do registro + template. Falha de e-mail nunca bloqueia o formulário.
- Admin: rota /_authenticated/admin-emails com server functions admin (has_role): listar/salvar configurações, prévia renderizada, envio de teste, histórico a partir de email_send_log (dedupe por message_id).
- Registrar no AGENTS.md: "e-mails de formulário disparados pelas server functions após gravar; textos editáveis em email_template_settings".
