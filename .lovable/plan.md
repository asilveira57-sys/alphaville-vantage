# Painel de Leads (CRM)

## Objetivo
Uma tela única no Admin com todos os contatos deixados no site, de onde vieram, status Pendente/Atendido, exportação e aviso por e-mail a cada lead novo.

## Origens que entram no CRM
Formulários que já gravam contatos hoje:
- Newsletter
- Financiamento (simulador)
- Radar S.A.
- Pesquisa Inteligente (salvar pesquisa / PDF)
- Lista de Oportunidades
- Páginas de incorporadoras e empreendimentos (MPD, Andrômeda, Neo, Flora, Terrah, parceiros dinâmicos) — hoje caem junto com o Radar; passam a aparecer com a origem própria ("Parceiro: MPD", "Empreendimento: Neo"...)

Leads antigos de todos esses formulários entram no painel desde o primeiro dia.

## Tela "Leads (CRM)" no Admin
- Botão novo no Admin principal: "Leads (CRM)".
- Lista com o mais novo primeiro: data, nome, WhatsApp (clicável), e-mail, origem (etiqueta colorida), página onde entrou, resumo curto.
- Caixa de seleção por linha: Pendente / Atendido. Quem marcou e quando ficam guardados.
- Filtros: origem, status, período, busca por nome/telefone/e-mail.
- Contadores no topo: total, pendentes, atendidos, por origem.
- "Detalhes" abre tudo que o formulário trouxe (respostas do Radar, valores da simulação, filtros da pesquisa etc.).
- Botão "Exportar CSV" com os filtros aplicados (UTF-8, ";", mesmo padrão dos outros CSVs).

## Aviso por e-mail
- A cada lead novo, um e-mail em texto simples para contato@saimoveisalpha.com.br com: origem, nome, contato, página e resumo das respostas, e link para o painel.
- Pré-requisito: o domínio saimoveisalpha.com.br precisa estar confirmado para envio (plano pago + verificação). Se ainda não estiver, o painel funciona normalmente e eu deixo pronto o passo de ligar o e-mail assim que o domínio for confirmado — não vou dizer que avisa antes de ver um envio funcionando.

## Teste antes de entregar
- Enviar um lead de teste por formulário, conferir que aparece no painel com a origem certa, marcar Atendido, exportar, e conferir o e-mail (se o domínio estiver ativo). Apagar só os registros de teste.

## Detalhes técnicos
- Nova tabela `leads` (central): source, source_label, source_table, source_id, name, phone, email, landing_page, summary, payload jsonb, status ('pendente'|'atendido'), handled_at, handled_by, created_at. Índice único (source_table, source_id).
- Alimentação por gatilhos AFTER INSERT/UPDATE nas tabelas existentes (newsletter_subscribers, financing_simulations, real_estate_radar_leads, search_leads, opportunity_subscribers) — nenhum formulário muda o seu fluxo; dedup do Radar (update) atualiza a linha do CRM. Backfill dos registros existentes na mesma migração. Leads de parceiro identificados por `conversion_context`/`partner`.
- RLS: só admin (has_role) lê e atualiza; sem acesso anônimo. GRANT para authenticated/service_role.
- Server functions com requireSupabaseAuth + has_role: listLeads (paginado com fetch-all), setLeadStatus, exportLeadsCsv.
- Rota `/_authenticated/admin-leads` + link no admin.tsx.
- E-mail: infraestrutura de e-mails do app + template "novo-lead" com destinatário fixo; envio disparado no servidor após a gravação (chave de idempotência = id do lead), via server route chamada pelo gatilho (pg_net) para cobrir todos os formulários de uma vez.
- Registrar a decisão "CRM central alimentado por gatilhos" no AGENTS.md.
