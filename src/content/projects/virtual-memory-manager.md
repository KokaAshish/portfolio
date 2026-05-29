---
title: "Virtual Memory Manager in C"
summary: "A systems-level virtual-to-physical address translator written in C — implements a 16-entry TLB, a 256-page page table, and 256 frames of physical memory, with live page fault and TLB hit rate reporting."
year: 2025
tags: ["C", "Operating Systems", "Systems Programming"]
featured: false
problem: "Understand how operating systems translate logical addresses to physical ones — by building the full mechanism from scratch in C, including the TLB cache layer, page fault handling from a binary backing store, and performance statistics."
outcome: "A working virtual memory simulator that correctly translates 1,000 logical addresses from a test file, matches the expected physical address and byte value output, and reports page fault rate and TLB hit rate that align with the reference output."
lessons: "I initially used a flat linear scan for the TLB instead of a circular FIFO buffer, which gave correct results but wrong replacement behaviour on address sequences that looped back. The circular index fix was a one-liner once I understood the bug — but only after comparing my output byte-by-byte against the reference file."
github: "https://github.com/ashishkoka/vm-simulator"
---

## The Problem

Virtual memory is one of those OS concepts that's easy to describe and surprisingly easy to get wrong when you implement it. The assignment was to build the full address translation pipeline in C — no OS primitives, no mmap — just a backing store binary file, a page table array, a TLB, and physical memory modelled as a byte array.

Given a file of logical addresses (integers), the program had to produce the correct physical address and the signed byte value at that location, then report overall page fault and TLB hit rates.

## The Approach

The address space is 16-bit: the upper 8 bits are the page number, the lower 8 bits are the offset. Pages are 256 bytes. Physical memory is 256 frames × 256 bytes = 65,536 bytes total, modelled as a `signed char` array.

**TLB (Translation Lookaside Buffer):** 16 entries, FIFO replacement using a circular index counter. On every address lookup, the TLB is scanned linearly. A hit returns the frame number directly without touching the page table. A miss falls through to the page table.

**Page Table:** A 256-entry array initialised to -1 (invalid). On a TLB miss, the page table is checked. If valid, the frame number is returned and the TLB is updated. If invalid (page fault), the page is loaded from the backing store.

**Backing Store:** A 65,536-byte binary file (`BACKING_STORE.bin`). On a page fault, `fseek` positions to the correct page offset and `fread` copies 256 bytes into the next free frame in physical memory. The page table is updated and the TLB is populated.

**Output:** For each address: `0xLOGICAL -> 0xPHYSICAL: VALUE`. At the end: page fault rate and TLB hit rate as percentages.

The reference output (`correct.txt`) provided the expected translation for every address in `addresses.txt`, so correctness was verifiable byte-by-byte.

## The Outcome

All 1,000 addresses translated correctly against the reference output. Page fault rate and TLB hit rate match the expected values. The implementation compiles cleanly with `gcc vm.c -o vm` and runs in under a second on the full address set.

## What I'd Change Next Time

My first TLB implementation used a linear scan with no proper FIFO — entries were overwritten in place rather than rotating through the circular buffer. This produced correct translations for most cases but failed on address sequences that revisited old pages, because the wrong entry was evicted. The fix was adding a single `tlb_index` counter and using modulo arithmetic for replacement — something I should have implemented correctly from the spec rather than discovering it through output comparison.

I'd also add a second replacement policy (LRU) and compare hit rates between FIFO and LRU on the same address trace — that would be more interesting than just matching the reference output.
