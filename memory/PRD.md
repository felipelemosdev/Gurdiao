# Guardian Juri — PRD

## Problem Statement
Aplicação para escritório de advogados brasileiro em PT-BR, tema azul e dourado, com front-end e back-end prontos para uso.

## Architecture
- Backend: FastAPI + Motor (MongoDB) + JWT auth (bcrypt hashing)
- Frontend: React + React Router + Axios + TailwindCSS + Recharts + Shadcn/UI
- Colors: Navy #0A192F, Gold #C5A059, Bg #F8FAFC
- Fonts: Playfair Display (headings), IBM Plex Sans (body)

## User Personas
- Advogado (Admin) — controle total, gestão de usuários
- Estagiário — acesso operacional a clientes/processos/agenda/financeiro
- Secretaria — acesso operacional a clientes/processos/agenda/financeiro

## Core Requirements
- Autenticação por email/senha; admin cria demais usuários
- Módulos: Dashboard, Clientes, Processos, Agenda, Financeiro, Usuários
- Upload e visualização de múltiplos PDFs por processo

## Implemented (2026-02)
- JWT auth with seeded admin (admin@guardianjuri.com.br / admin123)
- RBAC (advogado admin gate for /users and destructive endpoints)
- Clientes CRUD
- Processos CRUD + detail page with client info
- Documentos: base64 PDF upload/view/delete per processo (multiple, viewable via iframe modal)
- Agenda: prazos/audiências/reuniões com toggle concluído e agrupamento (atrasados/hoje/próximos/futuros)
- Financeiro: honorários/despesas com status Pago/Pendente e totais
- Usuários: admin cria estagiario/secretaria/advogado
- Dashboard com KPIs e gráfico de receita mensal (Recharts)

## Backlog / Next
- P1: Editar processo/prazo/financeiro via modal (hoje só cria/deleta)
- P1: Filtros e busca nas tabelas (Clientes/Processos/Financeiro)
- P1: Notificações de prazos por e-mail
- P2: Peticionamento com templates
- P2: Integração com tribunais (consulta CNJ automática)
- P2: Assistente IA para análise de processos
