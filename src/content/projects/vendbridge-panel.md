---
title: "Vendbridge Management Panel"
description: "A Laravel + React control panel for networked beverage vending machines with RFID-based cashless payment, append-only transaction ledgers, and OTA firmware rollouts to ESP32 devices."
date: "2026-05-02"
tags: ["PHP", "Laravel", "React", "InertiaJS", "TypeScript", "shadcn/ui", "MariaDB", "RFID/IoT"]
image: "/images/projects/vendbridge-dashboard.webp"
---

## About the Project

Operators of small to mid-sized beverage vending fleets traditionally rely on coin and bill mechanisms or per-machine prepaid cards — both of which scale poorly: cash has to be collected, cards live on a single device, and reconciling sales across a fleet is a manual exercise. Vendbridge replaces that model with a centralised platform where ESP32-equipped Sielaff FK 185 vending machines authenticate cashless transactions against RFID chips held by employees, members, or tenants of an organisation.

The panel is the operator's cockpit. It manages the chip lifecycle, products and price lists, slot assignments per machine, firmware rollouts, and an immutable audit trail. Three distinct roles share the same interface: administrators configure tenants, push firmware, and approve high-value refunds; operators handle day-to-day chip and device management; auditors hold read-only access to the ledger and reports. Every action against a vending machine — credit reservation, dispense, settlement, refund — flows through the panel and lands in a tamper-evident ledger.

## Technologies

- **Language**: PHP 8.3+
- **Backend**: Laravel 13 with Sanctum, Spatie Permissions, Laravel Horizon
- **Frontend**: React 18 with TypeScript, Inertia.js v2, shadcn/ui, Tailwind CSS, TanStack Query
- **Storage**: MariaDB 11 LTS, Redis 7
- **Money Handling**: moneyphp/money (BIGINT cents, no float arithmetic)
- **Quality**: Pest 4 (106 tests), Playwright E2E, PHPStan Level 6, axe-core (WCAG 2.2 AA)
- **Deployment**: Hetzner Cloud via an in-house `forge-lite` provisioning tool

## Features

### RFID Chip & Credit Management

Chips are the primary identity in Vendbridge. The panel handles the full lifecycle — registration, top-ups, daily and weekly purchase limits, category locks (e.g. blocking age-verified products on a chip without proof of age), and bulk CSV import for fleet-wide onboarding. UIDs are stored as SHA-256 hashes rather than plaintext, and every chip carries an explicit status (active, locked, retired) that the firmware enforces at the point of sale.

![Chip management with status flags and bulk actions](/images/projects/vendbridge-chips.webp)

### Tamper-Evident Transaction Ledger

Every sale follows a three-step protocol: reserve credit, dispense the product, then commit or cancel the transaction. Each step writes to an append-only `LedgerEntry` table whose rows are linked by an SHA-256 hash chain — `chain_hash = SHA256(prev_hash || payload_hash || timestamp || nonce)`. The chain can be verified end-to-end with an Artisan command, which detects any silent modification of historical rows. Refunds are time-limited (30 days for operators, 90 days for administrators) and produce a mirrored negative entry rather than mutating the original record.

### Device Configuration & OTA Firmware

Machines pull their configuration — slot-to-product mapping, active price list, feature flags — from an ETag-cached endpoint. Operators define this configuration in the panel using a drag-and-drop slot editor, then trigger a reload via the next heartbeat. Firmware updates work the same way: an administrator uploads a signed image, picks the target devices, and the OTA endpoint serves the manifest the next time each machine checks in.

### Audit, Roles & Two-Factor Authentication

Authorisation is layered on `spatie/laravel-permission` with three roles: admin, operator, and auditor. TOTP-based 2FA is mandatory for administrators and optional for operators, with hashed recovery codes for lockout recovery. Every write across the system — chip changes, device updates, user invitations, firmware deployments — produces an `AuditEvent` row that the auditor role can filter and export, but no role can edit or delete.

![Login screen with Vendbridge branding](/images/projects/vendbridge-login.webp)

### Multi-Tenancy

A single Vendbridge instance can host multiple operator organisations side by side. Isolation is enforced at the row level through an `OrganizationScope` global scope and a `BelongsToOrganization` trait applied to every tenant-bound model. There is no per-tenant database, no shared schema migration to coordinate, and no cross-tenant query path that does not require an explicit, audited `withoutGlobalScope` call.

### External Registrar API

Chip enrolment often happens outside the panel — at a reception desk, a member portal, or an existing identity system. Vendbridge exposes a Bearer-token API with three scoped permissions (`chip.read`, `chip.write`, `chip.topup`) so an external registrar application can create chips, adjust limits, and credit balances without ever touching the operator UI.

## Challenges

**Atomicity across a distributed mid-vend failure.** A vending machine can lose power, network, or the product itself between "credit reserved" and "product dispensed". The panel addresses this with pessimistic `lockForUpdate()` on the chip and reservation rows, a UNIQUE index `active_chip_lock` that forbids concurrent reservations on the same chip, and idempotency keys (`mdb_session_id`, `reservation_id`) so the firmware can retry safely on flaky links. A reservation that is never committed expires on a worker job and releases the held credit.

**Tamper detection without a privileged database user.** Production runs as a single MariaDB account without `ALTER` or `CREATE` rights, which rules out database-level triggers as a guard against ledger mutation. The same goal is reached in application code: Eloquent `booted()` hooks throw on `update` and `delete` calls against `LedgerEntry`, and the SHA-256 hash chain provides an after-the-fact integrity check. The on-demand verification command can be run from cron, on deploy, or before any export — and reports the exact row at which the chain breaks if tampering ever occurs.

**Replay-safe firmware authentication.** ESP32 devices in the field are authenticated to the API with HMAC-SHA256 over a canonical request — `METHOD\nPATH\nSHA256(BODY)\nTIMESTAMP\nNONCE` — and a per-device shared secret. Each request carries a UUID nonce that is stored in Redis with a 300 second TTL, and the timestamp must fall within ±60 seconds of the server clock. The result is a stateless, replay-resistant transport that costs the device only a single HMAC computation per request and survives clock drift typical of cheap microcontrollers.
