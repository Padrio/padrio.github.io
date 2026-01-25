---
title: "WacheDigital Service Planning"
description: "A modern web platform transforming volunteer fire department administration from paper-based processes to a centralized, process-oriented system with intelligent scheduling and hybrid digital-analog workflows."
date: "2024-01-01"
tags: ["PHP", "Laravel", "React", "InertiaJS", "REST-API", "Scheduling", "Fire Department"]
image: "/images/projects/wachedigital-dienstplan.webp"
---

## About the Project

Fire departments perform highly complex work, often coordinated through outdated, analog processes. This project transforms the administration of the Coburg Fire Department away from paperwork and manual coordination toward a centralized, process-oriented web platform. The unique aspect: The software respects the established structures of volunteer work and offers full "backward compatibility" for less tech-savvy members through hybrid approaches that bridge digital efficiency with traditional workflows.

The platform serves as more than just planning software; it's a tool to relieve leadership and increase commitment in volunteer service operations. By combining modern web technology (passwordless magic-link logins) with deep understanding of fire department-specific processes (BayFwDV-compliant roles), the application sets new standards for managing emergency services organizations.

## Technologies

- **Language**: PHP 8.5
- **Backend Framework**: Laravel
- **Frontend**: ReactJS with InertiaJS
- **API Architecture**: Clean REST-API with OpenAPI specification for potential future mobile app development
- **Compliance**: BayFwDV (Bavarian Fire Department Regulations)

## Features

### Intelligent Service Planning Architecture

A three-tier planning model that offers maximum flexibility:

- **Event Level**: Bundles global metadata for major operations (e.g., security watches)
- **Time Slots**: Define precise sections within an event, including optional resources like vehicles
- **Positions**: Represent personnel requirements directly linked to the qualification-based role system
- **Planning Wizard**: Users are guided through an intuitive process to create either chronological lists or efficient shift matrices

### Advanced Swapping & Operational Capability

Availability in volunteer work is volatile. The system offers a highly secure exchange process:

- **Three-Step Verification**: Exchange requests require confirmation from both partners plus final approval from leadership
- **Emergency Exchange Process**: In case of unexcused absence, the operations center can immediately and unilaterally reassign positions to ensure operational readiness at all times
- **Audit Trail**: A complete audit trail documents every change and ensures full transparency

### Intelligent Auto-Scheduling & Fairness Algorithm

The system "thinks" along. An integrated auto-scheduler assists with staffing:

- **Constraint Engine**: Distinguishes between hard constraints (technical blocks for collisions or missing qualifications) and soft constraints (warnings for rest period violations)
- **Fairness Scoring**: The algorithm prioritizes members based on their previous service load and their reliability score to promote fair task distribution

### Absence Management & Availability Planning

Members can independently record absences such as vacation or training courses. This data flows in real-time into the assignment logic and proactively prevents planning errors.

### Hybrid Concept: Digital Efficiency Meets Analog Standard

To exclude no one, the software breaks down the media barrier:

- **PDF Exports**: Generation of service plans in the familiar, classic design for posting in the fire station
- **QR Code Bridge**: Printed plans contain dynamic QR codes that lead directly to digital applications in the app
- **Calendar Integration**: An ICS export allows seamless transfer of services into private calendars (Google, Outlook, Apple)

### Data Sovereignty & Seamless Integration

The software does not function as a data silo, but as a specialized satellite:

- **MP-Feuer Interface**: User data is synchronized exclusively via Excel import from MP-Feuer

## Challenges

The primary challenge was developing a system that respects the traditional structures of volunteer fire departments while introducing modern digital workflows. This required deep understanding of fire department-specific processes, including BayFwDV-compliant role systems and the complex requirements of service planning in volunteer organizations.

Creating a hybrid system that bridges digital and analog workflows was crucial to ensure adoption by all members, regardless of their technical affinity. This involved developing PDF export functionality that maintains the familiar visual design of traditional service plans while adding digital capabilities through QR codes.

The intelligent auto-scheduling system required balancing multiple constraints: technical qualifications, availability, fairness in task distribution, and compliance with rest period regulations. The constraint engine needed to distinguish between hard blocks (that prevent assignment) and soft warnings (that inform but don't block), requiring sophisticated logic.

Ensuring data sovereignty and seamless integration with existing systems like MP-Feuer while maintaining data consistency through UUID synchronization was another significant technical challenge. The system needed to function as a specialized tool that enhances rather than replaces existing infrastructure.
