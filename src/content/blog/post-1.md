---
title: "What I learned shipping software at small scale"
excerpt: "Three things I didn't expect to matter as much as they do: documentation, scope discipline, and saying no early."
date: 2024-11-15
category: "Engineering"
tags: ["process", "lessons", "software"]
draft: false
---

I've shipped maybe a dozen non-trivial projects in the last two years. Not at scale — no millions of users, no distributed systems war stories. Just real software, used by real people, that needed to work reliably without me babysitting it.

Here's what surprised me.

## Documentation is the work

I used to think documentation was what you did after the real work was done. The thing you wrote for other people, or for future-you when you've forgotten what past-you was thinking.

It's not. Writing documentation *is* how I think through a problem now. If I can't explain a system clearly in prose, I don't understand it well enough to build it. The write-up forces the holes to the surface before they're load-bearing.

The column descriptions I wrote for the retail analytics dashboard took longer than the self-serve query builder they supported. They were not optional.

## Scope is a skill

The hardest thing I do isn't writing code. It's deciding what not to build.

Every project I've shipped on time came down to one or two explicit decisions to cut a feature that felt important in week one and turned out not to matter. Every late project had a feature that seemed obviously in-scope until it wasn't.

The skill is making the cut early enough that it doesn't hurt, and writing it down so you remember why you made it. I keep a running `DECISIONS.md` now. It's one of the most useful habits I've picked up.

## The boring parts are the actual differentiator

The part of the deployment CLI that people cared about was the consistent health check behavior. Not the canary split logic I spent three days on. The boring, obvious thing: "does it work after I deploy it, and if not, does it roll back automatically?"

Every project I've done where the thing that mattered was something unsexy. The good indexes. The clear error messages. The descriptive commit messages. The documentation that a stranger can follow.

That's where the difference is. Not in