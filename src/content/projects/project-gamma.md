---
title: "Virtual Memory Manager in C"
summary: "A systems-level virtual-to-physical address translator in C — implements a 16-entry TLB, a 256-page page table, and 256 frames of physical memory with live page fault and TLB hit rate reporting."
year: 2025
tags: ["C", "Operating Systems", "Systems Programming"]
featured: false
hidden: true
problem: "Understand how operating systems translate logical addresses to physical ones by building the full mechanism from scratch in C — TLB caching, page fault handling from a binary backing store, and performance statistics."
outcome: "A working virtual memory simulator that correctly translates 1,000 logical addresses, matches the expected physical address and byte value output byte-for-byte, and reports page fault and TLB hit rates that align with the reference output."
lessons: "My first TLB used a flat linear scan with no FIFO replacement — it produced correct translations for most cases but evicted the wrong entry on address sequences that revisited old pages. The fix was a single circular index counter, but I only found the bug by comparing output byte-by-byte against the reference file."
github: "https://github.com/ashishkoka/vm-simulator"
---

## The Problem

Virtual memory is one of those OS concepts that is easy to describe and surprisingly easy to implement incorrectly. The assignment was to build the full address translation pipeline in C from scratch — no OS primitives, no mmap — just a backing store binary file, a page table array, a TLB, and physical memory modelled as a byte array.

Given a file of 1,000 logical addresses, the program had to produce the correct physical address and signed byte value at each location, then report overall page fault and TLB hit rates.

## The Approach

The address space is 16-bit: upper 8 bits are the page number, lower 8 bits are the byte offset. Pages are 256 bytes. Physical memory is 256 frames × 256 bytes, modelled as a `signed char` array.

**TLB:** 16 entries, FIFO replacement using a circular `tlb_index` counter. On every lookup, the TLB is scanned linearly. A hit returns the frame number directly. A miss falls through to the page table.

**Page Table:** A 256-entry array initialised to -1 (unmapped). On a TLB miss, the page table is checked. If valid, the frame is returned and the TLB is updated. If -1, a page fault occurs.

**Page Fault Handling:** `fseek` to `page * PAGE_SIZE` in the backing store binary, `fread` 256 bytes into the next free frame in physical memory. Update the page table and TLB.

**Output:** For each address: `0xLOGICAL -> 0xPHYSICAL: VALUE`. After all addresses: page fault rate and TLB hit rate as percentages.

The provided `correct.txt` file gave the expected output for eve