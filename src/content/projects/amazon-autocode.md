---
title: "Amazon Autocode"
description: "An automated SaaS platform for selling and delivering software licences and vouchers via Amazon. Developed in PHP 8.3 using Laravel and Orchid for the backend, it streamlines order management and licence delivery."
date: "2024-01-01"
tags: ["PHP", "Laravel", "Orchid", "SaaS", "Amazon", "E-Commerce"]
image: "/images/projects/autocode.webp"
---

## About the Project

Amazon Autocode is an automated SaaS platform designed for selling and delivering software licences and vouchers via Amazon. The project was initially developed for internal purposes to realize fully automated Amazon fulfillment, enabling the sale of software licences on Amazon in the B2C sector without having to access the cumbersome Amazon Vendor Portal.

The goal was not only to automate the delivery of software licences after receiving an order, but to create a comprehensive system that also serves as a management platform for the associated software licence keys as well as various documents and files. Product assets such as installation and activation instructions are included in the portal and can be accessed by customers.

In addition to digital delivery via email, the system also generates a physical letter including all associated assets and the licence key, creates a DHL Warenpost label, and automatically submits the tracking number to Amazon, which automatically updates the order status.

This reduces the fulfillment effort to merely maintaining products, licence keys, and printing and sending letters with labels. Once a mature state was reached, this project became a complete product that was made available to other sales partners and now processes several thousand orders per month.

## Technologies

- **Language**: PHP 8.3
- **Framework**: Laravel
- **Admin Panel**: Orchid
- **Platform**: SaaS (Software as a Service)

## Features

- Fully automated Amazon order processing
- Automated licence key delivery via email
- Comprehensive licence key management system
- Document and file management for product assets
- Customer-accessible installation and activation guides
- Physical letter generation with licence keys and assets
- Automatic DHL Warenpost label creation
- Automatic tracking number submission to Amazon
- Automatic order status updates in Amazon
- Multi-tenant SaaS architecture for multiple sales partners
- Processes several thousand orders per month

## Challenges

The primary challenge was developing a fully automated fulfillment system that could handle the entire order lifecycle from Amazon order receipt to final delivery, both digitally and physically. This required seamless integration with Amazon's API for order status updates and tracking number submission, while ensuring reliable delivery of digital licences via email.

Another significant challenge was creating a comprehensive management system that not only handled licence keys but also managed all associated product assets, documents, and files in a way that was accessible to customers. The system needed to balance automation with the flexibility required for different product types and sales partners.

The transition from an internal tool to a multi-tenant SaaS product required careful architecture considerations to ensure scalability, security, and isolation between different sales partners while maintaining the high level of automation that made the system valuable.
