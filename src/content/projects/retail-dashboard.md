---
title: "Retail Customer Intelligence Dashboard"
summary: "A full-stack analytics platform on Azure SQL and Streamlit that predicts customer lifetime value, churn risk, and cross-sell opportunities using three ML models on 400+ product and transaction records."
year: 2025
tags: ["Python", "Streamlit", "Azure SQL", "Scikit-learn", "Plotly"]
featured: true
problem: "Retail teams lacked a single view of customer behaviour across households, products, and transactions. Insights were buried in raw CSVs with no way to query by customer, spot spending trends, or identify at-risk households before they churned."
outcome: "A deployed dashboard with role-based login, per-household transaction lookup, basket co-occurrence analysis, and three production ML models: Linear Regression for CLV prediction (R² reported live), Gradient Boosting for cross-sell drivers, and Random Forest for churn classification — all fed from an Azure SQL backend."
lessons: "Hardcoding database credentials in source is an obvious mistake in hindsight. I'd use environment variables and a secrets manager from day one. I'd also add input validation on the CSV upload route — right now a malformed file surfaces a raw SQLAlchemy traceback to the user."
github: "https://github.com/ashishkoka/retail-dashboard"
---

## The Problem

Retail analytics teams were working with flat CSV exports — no live querying, no demographic breakdowns, no way to answer "which households are about to stop buying?" without a data engineering ticket. The data existed (transactions, products, households) but there was no interface to connect them.

The assignment was to build an end-to-end analytics platform: ingest the data into a cloud database, build a dashboard on top of it, and layer machine learning models that produce actionable predictions.

## The Approach

I chose Azure SQL as the backend and Streamlit for the frontend — Streamlit's data-first component model lets you build interactive dashboards without fighting a JavaScript framework, and SQLAlchemy gives a clean ORM layer between Python and the database.

**Authentication:** A simple SHA-256-hashed credential store with three roles (admin, analyst, guest). Guest access is read-only. Not production-grade, but demonstrates session gating and role separation cleanly.

**Dashboard (Page 1):** Key metrics (total spend, average spend per transaction, top commodity, unique households), spend-over-time line chart, demographic breakdowns by income range and household size, brand preference pie charts, and a basket co-occurrence matrix for the top 10 product categories.

**Customer Lookup (Page 2):** Enter any household number — get a sorted, joined view of all their transactions, products, and department data, with a CSV download button.

**Data Upload (Page 4):** Upload a new CSV for any of the three tables (transactions, households, products). The system previews it, runs a column summary, and on confirmation appends it to Azure SQL — so the dashboard always reflects the latest data without a redeploy.

**ML Models (Page 5 — three tabs):**

- *Linear Regression (CLV):* Aggregates per-household behaviour (transaction count, total units, average spend) and fits a regression to predict total lifetime spend. R² score is displayed live. Scatter plot of actual vs predicted CLV lets you spot outliers immediately.

- *Gradient Boosting (Basket Analysis):* Binarises the basket-product matrix, treats the top commodity as the target, and trains a GBR to predict which category combinations drive purchasing. Feature importance chart surfaces the top cross-sell signals.

- *Random Forest (Churn):* Labels households in the bottom 25th percentile of spend as "at risk" and trains a classifier on transaction features. Outputs accuracy, a confusion matrix heatmap, and a ranked list of at-risk households the team can act on.

## The Outcome

A fully deployed dashboard on Streamlit Community Cloud, backed by Azure SQL, with five functional pages and three live ML models. The churn model correctly identified the bottom-quartile households with high accuracy, giving the retail team a prioritised call list for the first time.

## What I'd Change Next Time

Database credentials are in the source file. In a real deployment this would be a critical vulnerability — I'd use Azure Key Vault or environment secrets managed outside the repo from the start.

The CSV upload has no schema validation. If the uploaded file has different column names than the database table, you get a raw SQLAlchemy error in the UI. A simple column-matching step before the write would prevent that.

I'd also extract the ML model training into a separate module with proper train/test split logging so model performance is tracked across data updates, not just computed fresh each session load.
