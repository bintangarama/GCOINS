# G-COINS Documentation Index

> **Gramedia Cash Opname Internal System**
> Single Source of Truth for Spec-Driven Development

---

## Quick Links

| # | Document | Description |
|---|---|---|
| 00 | [Project Overview](./00-project-overview.md) | Ringkasan project, goals, tech stack |
| 01 | [Business Process](./01-business-process.md) | Alur bisnis, model 3 kantong, variance engine |
| 02 | [Functional Requirements](./02-functional-requirements.md) | Daftar fitur per modul |
| 03 | [Non-Functional Requirements](./03-non-functional-requirements.md) | Performance, security, availability |
| 04 | [Users & Roles](./04-users-and-roles.md) | 5 roles, RBAC matrix, SoD rules |
| 05 | [Business Rules](./05-business-rules.md) | Non-negotiable invariants |
| 06 | [Workflow & State Machine](./06-workflow-state-machine.md) | State diagrams, transition rules |
| 07 | [Database Design](./07-database-design.md) | Full schema, semua tabel, constraints |
| 08 | [ERD](./08-erd.md) | Entity Relationship Diagram |
| 09 | [System Architecture](./09-system-architecture.md) | Tech stack, deployment, infra |
| 10 | [UI/UX Specification](./10-ui-ux-specification.md) | Sitemap, layout, responsive rules |
| 11 | [API Contracts](./11-api-contracts.md) | Controller contracts, validation, errors |
| 12 | [Testing Strategy](./12-testing-strategy.md) | Test plan, critical test cases |
| 13 | [AI Agent Guidelines](./13-ai-agent-guidelines.md) | Conventions, do's/don'ts for AI |
| 14 | [Development Roadmap](./14-development-roadmap.md) | Phased plan, milestones |

## Source Reference

- [MASTER_SYSTEM_SPECIFICATION.md](../MASTER_SYSTEM_SPECIFICATION.md) — Original unified specification document (preserved as reference)

## How to Use These Docs

1. **Before coding any feature**, read the relevant doc first
2. **AI agents** should check `13-ai-agent-guidelines.md` before every task
3. **Business rules** in `05-business-rules.md` are **non-negotiable** — never bypass them
4. **Database changes** must be reflected in both `07-database-design.md` and `08-erd.md`
