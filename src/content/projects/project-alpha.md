---
title: "College Inquiry Chatbot"
summary: "A Flask web application that handles prospective student inquiries — collects visitor details and presents structured answers about admissions, tuition, housing, and academic programmes."
year: 2024
tags: ["Python", "Flask", "HTML", "Google App Engine"]
featured: false
hidden: true
problem: "Prospective students had no quick self-service way to get answers to common questions about the college — programme offerings, tuition, housing — without waiting for an email response or navigating a cluttered website."
outcome: "A deployed Flask app with a user registration form and a Q&A response view, covering the most common inquiry categories. Deployed to Google App Engine using app.yaml configuration."
lessons: "The response logic is all string-based and static — every visitor gets the same answers regardless of what they ask. The obvious next step is connecting a proper NLP layer (Rasa or a simple keyword router) so the chatbot actually responds to typed questions rather than just presenting a pre-baked list."
github: "https://github.com/ashishkoka/college-chatbot"
---

## The Problem

College inquiry handling is high-volume and repetitive. The most common questions — does the school have a football team, what's in-state tuition, is there on-campus housing, what majors are offered — are the same across every prospective student interaction. A basic self-service chatbot reduces that load and gives students an immediate answer.

## The Approach

I built the app with Flask, keeping the stack minimal: no database, no JavaScript framework. The flow is two steps:

1. **Registration form (`/`)** — Collects first name, last name, and email. All fields required; email validated as an HTML5 `type="email"` input.

2. **Response view (`/chat`)** — POST endpoint that reads the submitted form data and returns a personalised welcome message alongside a structured list of sample questions and answers covering the most common inquiry categories.

The app is configured for Google App Engine deployment via `app.yaml`, which specifies the Python 3 runtime and the entry point.

## The Outcome

A working, deployable chatbot skeleton that correctly handles user registration and returns relevant answers. The two-page flow is intentionally simple — the value is in the deployment configuration and the architectural decision to keep it stateless.

## What I'd Change Next Time

The biggest limitation is that the response is static — every user gets the same Q&A list regardless of what they type or select. I'd replace the static response view with a proper intent classifier: either a simple keyword-