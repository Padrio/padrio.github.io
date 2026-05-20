---
title: "Konteo Provision"
description: "A cross-platform desktop companion to the Konteo Management Panel — a Go + Wails tool that issues, tops up, and inspects RFID chips through an ACR122U NFC reader and the Konteo Registrar API."
date: "2026-05-21"
tags: ["Go", "Wails", "Alpine.js", "Tailwind CSS", "NFC/RFID", "OpenAPI", "Cross-Platform"]
image: "/images/projects/konteo-provision-issue.webp"
---

## About the Project

In the Konteo ecosystem, a chip is the user's identity at the vending machine — a MIFARE Classic 1K card whose UID is bound to a credit balance, purchase limits, and category permissions stored in the Management Panel. Issuing those chips, topping them up, and diagnosing problems with them used to mean keeping a browser open next to a USB NFC reader, copying UIDs by hand, and hoping the operator typed them correctly. Konteo Provision replaces that step with a single desktop application built specifically for the chip-handling workflow.

The tool runs on macOS, Windows, and Linux as a single signed-by-OS-keychain binary. It speaks PC/SC to an ACR122U USB NFC reader, reads the UID from any tapped card, and synchronises the result with the Konteo Registrar API over a Bearer-token connection. All state — balances, ledger entries, flags — stays in the panel; the card itself is treated purely as a hardware bearer token. The result is an offline-tolerant, single-purpose tool that fits next to a reception desk, an HR onboarding station, or a temporary event counter.

## Technologies

- **Language**: Go 1.24
- **Application Framework**: Wails v2.12 (native WebView, single binary)
- **Frontend**: Alpine.js 3.14, Tailwind CSS 3.4, Vite 8
- **Hardware**: ACR122U USB NFC reader via `ebfe/scard` (PC/SC), MIFARE Classic 1K
- **API Client**: Generated from the Konteo Registrar OpenAPI spec via `oapi-codegen`
- **Configuration**: TOML at `~/.config/konteo-provision/config.toml`, mode `0600`
- **Quality**: `go test`, `golangci-lint` (errcheck, govet, staticcheck, revive, gosec, …)
- **CI**: GitHub Actions matrix on Ubuntu, macOS, and Windows runners

## Features

### Chip Issuance

The primary workflow. The operator enters holder details — name, optional reference, label, an initial top-up in euros, and any flags such as `employee` or `Free-Vend` — taps a fresh card on the reader, and the tool reads the UID via the standard `FF CA 00 00 00` APDU. It then `POST`s to `/api/v1/registrar/chips`, the panel validates and persists the chip, and the UI displays the resulting chip ID and starting balance in a single screen.

### Top-Up and Ledger Append

Loading credit onto an existing chip. The operator enters an amount and an optional reason ("Aufladung am Schalter", "Refund #1234"), taps the card, and the tool resolves the chip ID by UID against the panel and posts the top-up. The response carries the new balance and the ledger sequence number, both surfaced inline so that the operator has a printable record of the transaction.

![Top-up confirmation showing new balance and ledger sequence](/images/projects/konteo-provision-topup.webp)

### Chip Inspection

A read-only diagnostic view. Tap a card and the tool fetches the full chip record from the panel — UID, chip ID, status, holder name, reference, label, balance, Free-Vend flag, and any category flags. Useful at a help desk for answering "why was my chip rejected at the machine" without having to open the panel UI on a separate screen.

![Inspect view showing chip metadata and status badge](/images/projects/konteo-provision-inspect.webp)

### Multi-Environment Setup

The configuration file holds three named profiles — `dev`, `test`, `prod` — each with its own base URL and Bearer token. A first-run wizard prompts for the environment and validates the token by calling `/me` against the panel before persisting it. The settings page allows switching environments at runtime without restarting the binary, which makes acceptance testing on a staging panel a non-event.

### Hardware Diagnostics

A status sidebar polls the backend every three seconds and lists the connected PC/SC readers with their current state. A diagnostics page exposes the raw response from the `/me` endpoint, the latency of the last call, the configured polling interval, and the platform string — the difference between "the reader is unplugged" and "the panel is unreachable" is a glance away.

### Structured Error Handling

Every error from the backend is mapped through an `apierr.Kind` enum (`AuthInvalid`, `NotFound`, `Validation`, `Conflict`, `ServerUnavailable`, …) and tagged with the originating operation (`chip.read`, `chip.write`, `chip.topup`). The frontend renders human-readable German messages and decides on the appropriate next step — show the setup dialog, offer a retry, or surface the validation field — without parsing error strings.

## Challenges

**Backend as the single source of truth.** A natural design for a chip system is to write the balance onto the card itself, the way classic prepaid cards do. Konteo Provision deliberately does the opposite: the card carries only its factory UID, and every balance, status change, and limit lives in the Konteo ledger. The trade-off is one extra HTTPS round-trip per operation; the upside is that a lost or cloned card cannot leak credit, the ledger remains the legal record, and the same chip stays valid against any panel it is registered with. This shapes every part of the application — there is no offline mode, no local cache of balances, and no encryption-key custody to worry about.

**cgo on three platforms without cross-compilation.** PC/SC and Wails both bring cgo dependencies — `winscard.dll` on Windows, `PCSC.framework` on macOS, `libpcsclite` on Linux, plus a native WebView per platform. Cross-compiling these from a single host is fragile, so the build matrix in `.github/workflows/build.yml` simply dispatches to native runners and lets each one produce its own artefact. Platform-specific code is kept in a thin wrapper layer (`*_darwin.go`, `*_windows.go`) so the domain code never sees a `runtime.GOOS` check.

**Hardware-free testability.** The chip workflows have to be covered by tests that run on every commit — including in CI, where no NFC reader exists. The reader and the Registrar API are abstracted behind two interfaces, `rfid.Reader` and `konteo.Client`, and the domain layer takes them as constructor arguments. Tests run against a mock reader that returns canned UIDs and an `httptest` server that emulates the panel; real-hardware tests live behind a `hardware` build tag and only run when a reader is plugged in. The result is a CI run that finishes in seconds and a development loop that does not depend on having a card on the desk.
