# G-COINS

**Gramedia Cash Opname Internal System**

Multi-store cash reconciliation web application for Gramedia retail stores. Automates daily petty cash verification, bank sub-ledger reconciliation, and variance tracking with role-based authorization and immutable audit trails.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 13 (PHP 8.3+) |
| Frontend | React 19 + TypeScript + Inertia.js v2 |
| UI | shadcn/ui + Tailwind CSS v4 |
| Database | SQLite (WAL mode) |
| Auth | Cookie-based session (24h TTL) |
| RBAC | Spatie Laravel-Permission |
| Audit | Spatie Laravel-Activitylog |
| Excel | Maatwebsite/Excel |

## Documentation

All specifications are in the [`/docs`](./docs/README.md) folder:

| Document | Description |
|---|---|
| [Project Overview](./docs/00-project-overview.md) | Goals, scope, tech stack |
| [Business Process](./docs/01-business-process.md) | Three Pockets Model, variance engine |
| [Functional Requirements](./docs/02-functional-requirements.md) | Features per module |
| [Database Design](./docs/07-database-design.md) | Full schema (INTEGER cents) |
| [System Architecture](./docs/09-system-architecture.md) | Deployment, file structure |
| [Development Roadmap](./docs/14-development-roadmap.md) | Phased plan |

## Quick Start

```bash
# Install dependencies
composer install
npm install

# Setup database
php artisan migrate --seed

# Start development
composer run dev
# or
php artisan serve & npm run dev
```

## Testing

```bash
php artisan test
```

## License

Proprietary — PT Gramedia Asri Media
