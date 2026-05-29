---
title: "SMO Algorithm — SVM from Scratch"
summary: "A from-scratch Python implementation of the Sequential Minimal Optimization algorithm for training a hard-margin SVM, with linear and polynomial kernels and a decision boundary visualisation."
year: 2025
tags: ["Python", "NumPy", "Machine Learning", "Algorithms"]
featured: false
hidden: true
problem: "Understand how Support Vector Machines are actually trained by implementing the SMO optimisation algorithm from the mathematical definition — including the kernel trick, Lagrange multipliers, and KKT conditions."
outcome: "A working SMO implementation in pure NumPy that trains a hard-margin SVM on 2D data with two kernels, produces correct confusion matrices for both, plots the decision boundary, and converges correctly on the test dataset."
lessons: "The eta >= 0 guard took the longest to get right. If eta is zero or positive, the quadratic has no minimum and the step should be skipped — getting this right required reading Platt's original 1998 paper rather than relying on secondary sources."
github: "https://github.com/ashishkoka/smo-svm"
---

## The Problem

Most ML courses teach you to call `sklearn.svm.SVC`. This assignment required going deeper: implement the Sequential Minimal Optimization algorithm — the actual optimisation procedure that trains SVMs — from scratch using only NumPy.

SMO, introduced by John Platt in 1998, solves the SVM quadratic programming problem by breaking it into a series of two-variable subproblems with an analytic solution. This avoids a full QP solver and is why SVMs are tractable at scale.

## The Approach

**Data:** 2D labelled points loaded from a flat text file. Labels 0 mapped to -1 for the SVM formulation.

**Kernels:** Two functions passed as arguments — `kernel_linear(x,y) = x·y` and `kernel_add_one(x,y) = x·y + 1`. The full kernel matrix is precomputed before training.

**SMO loop:** For each point `i`, compute error `E_i`, randomly select `j`, compute bounds `L` and `H`, compute `eta = 2K(i,j) - K(i,i) - K(j,j)`, skip if `eta >= 0`, update `alpha_j` analytically, clip to `[L,H]`, update `alpha_i` to maintain the equality constraint, update bias `b`. Repeat until convergence (no alphas change in a full pass).

Weight vector `w = Σ (alpha_i * y_i) * x_i` computed after training for prediction and visualisation.

## The Outcome

Both kernels converge correctly on the provided dataset. Confusion matrices match expected output. Decision boundary visualisation 