---
title: "CuraBill"
description: "A VBVG 2026 billing software for German professional guardians. Calculates monthly flat-rate compensations based on 16 remuneration combinations, generates PDF invoices, and manages the full guardianship lifecycle."
date: "2026-03-01"
tags: ["PHP", "Laravel", "React", "InertiaJS", "TypeScript", "shadcn/ui", "MySQL"]
image: "/images/projects/curabill-dashboard.webp"
---

## About the Project

In Germany, professional guardians (Berufsbetreuer) are compensated through a legally defined flat-rate system governed by the VBVG (Vormünder- und Betreuervergütungsgesetz). With the 2026 reform introducing 16 distinct remuneration combinations based on qualification level, asset status, living situation, and guardian type, accurate billing has become a significant administrative challenge.

CuraBill was built to solve exactly this problem. It is a dedicated billing platform that automates the entire compensation workflow — from managing wards and guardianships to calculating monthly flat-rate amounts, generating PDF invoices, and tracking the billing lifecycle. The goal is to let guardians focus on their actual work instead of wrestling with complex legal formulas and manual paperwork.

## Technologies

- **Language**: PHP 8.4
- **Backend Framework**: Laravel 12
- **Frontend**: React 18 with Inertia.js
- **Type Safety**: TypeScript
- **UI Components**: shadcn/ui
- **Database**: MySQL

## Features

### Ward & Guardianship Management

A complete management system for wards (Betreute) and their guardianships (Betreuungen) with full CRUD operations, search, and pagination. Each guardianship tracks all legally relevant attributes: start and end dates, qualification level, asset status, living situation, guardian type, and areas of responsibility. Guardian changes are supported through separate original appointment dates, enabling accurate calculation across two distinct timelines.

### VBVG 2026 Calculation Engine

The core of CuraBill is its calculation engine, which implements the full VBVG 2026 remuneration logic:

- **16 Remuneration Combinations**: Determines the correct monthly flat rate based on the intersection of qualification level, asset status, living situation, and guardian type
- **BGB-Compliant Date Arithmetic**: Calculates guardianship months (Betreuungsmonate) using the exact rules defined in §§ 187, 188 BGB
- **Phase Transitions**: Automatically detects the transition from the initial phase (months 1–12) to the ongoing phase (month 13+), which carry different rates
- **Partial Month Calculation**: Handles pro-rata billing with a configurable divisor — either the legally established fixed 30-day model (BGH XII ZB 208/20) or actual calendar days
- **Pre-2026 Filtering**: Skips guardianship months that fall before the VBVG 2026 effective date
- **Statute of Limitations**: Tracks the 15-month filing deadline per billing period with proactive warnings

### Status Change Tracking

Guardianship attributes like asset status and living situation can change mid-period. CuraBill logs these changes with an effective date and supports two configurable calculation modes: the reference date method (§ 9 Abs. 3 VBVG), where the status at the end of a guardianship month applies to the entire month, and a day-accurate mode that splits compensation proportionally at the exact date of change. Deleting a status change automatically rolls back the guardianship to its previous value.

### Billing Workflow

Invoices follow a structured lifecycle: Draft, Created, Exported, and Cancelled. CuraBill supports three billing types — flat-rate compensation (calculated automatically), expense reimbursement (manual line items), and hourly billing. Cancellation generates a mirrored negative invoice, and correction invoices link back to the cancelled original. Sequential invoice numbers (YYYY-NNN) are assigned automatically, and overlap protection prevents duplicate flat-rate periods per guardianship.

### Batch Billing

For guardians managing many wards, CuraBill offers a batch billing workflow: select a billing period, preview all eligible guardianships with estimated amounts, pick which ones to include, and generate all invoices in one step. The result view shows a clear breakdown of successful, skipped, and failed entries. All generated PDFs can be downloaded as a single ZIP archive.

### Dashboard & Monitoring

The dashboard provides five KPI cards at a glance — total wards, active guardianships, total invoices, open drafts, and exported revenue. A batch billing prompt highlights how many guardianships are eligible for the next billing period with a direct link. Statute of limitations warnings flag unexported invoices whose 15-month deadline is approaching within the next three months.

## Challenges

The primary challenge was translating the intricate German legal framework — particularly the VBVG 2026 with its 16 remuneration combinations and the BGB's date arithmetic rules — into reliable, testable software. Edge cases around phase transitions (month 12 to 13), partial months, leap years, and mid-period status changes required careful modeling to ensure every cent is calculated correctly.

Building the batch billing system introduced additional complexity: validating eligibility across all guardianships, preventing overlapping billing periods, handling mixed success/failure scenarios, and generating potentially dozens of PDF invoices in a single operation — all while keeping the user informed with real-time previews and clear result summaries.

Another significant challenge was designing the status change system to support two fundamentally different calculation modes (reference date vs. day-accurate) while maintaining data integrity through automatic rollback on deletion, ensuring that the guardianship record always reflects the correct historical state.
