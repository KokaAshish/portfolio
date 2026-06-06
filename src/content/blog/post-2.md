---
title: "Why I chose Cloudflare Workers over a traditional server"
excerpt: "It's not about cost or hype. It's about what the constraints force you to think about."
date: 2024-10-03
category: "Infrastructure"
tags: ["cloudflare", "workers", "infrastructure", "edge"]
draft: true
---

Every time I mention using Cloudflare Workers for something, someone asks if it's actually worth it or if I'm just chasing the new thing. Fair question. Here's my honest answer.

## The constraint is the point

Workers have a 10ms CPU time limit per request (on the free tier — 30ms on paid). That's not a lot. It sounds like a restriction until you realize what it forces you to do.

You can't do the thing where you write some slow, lazy code and assume the server will absorb it. You have to know what your code is doing, why it takes the time it takes, and what you can move out of the hot path. The constraint is pedagogy in disguise.

Every Worker I've shipped is faster than the equivalent Express server I would have written, not because Workers are faster (though the cold start story is genuinely good), but because the limit made me think.

## The deployment model is genuinely different

There's no server to SSH into. There's no "works on my machine." When you `wrangler deploy`, you're pushing to 300+ datacenters simultaneously. There's nothing to configure because there's nothing to configure — the runtime is the same everywhere.

This sounds like marketing copy, and maybe it is. But it's also just true. The deployment surface is smaller, the failure modes are more predictable, and the debugging story is good enough that I've spent less time on infra than on any previous project.

## What I'd reach for instead

Workers aren't the right tool for everything. Long-running background tasks, anything that needs a real filesystem, heavy CPU work that can't be split up — standard VM or container. The 128MB memory limit will bite you if you need to load a large model or process a big file in-memory.

But for a personal portfolio, an API, a lightweight SaaS backend, or anything where the code fits in your head? Workers have become my first choice. Not because they're trendy, but because the constraints keep the code honest.
