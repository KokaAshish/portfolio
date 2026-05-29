---
title: "SMO Algorithm — SVM from Scratch"
summary: "A from-scratch Python implementation of the Sequential Minimal Optimization (SMO) algorithm for training a hard-margin Support Vector Machine, with linear and polynomial kernels and a decision boundary visualisation."
year: 2025
tags: ["Python", "NumPy", "Machine Learning", "Algorithms"]
featured: false
problem: "Understand how Support Vector Machines are actually trained — not by calling sklearn.svm.SVC, but by implementing the SMO optimisation algorithm from the mathematical definition, including the kernel trick, Lagrange multipliers, and the KKT conditions."
outcome: "A working SMO implementation in pure NumPy that trains a hard-margin SVM on 2D data with two kernels (linear and linear+1), produces correct confusion matrices for both, plots the decision boundary, and converges correctly on the provided dataset."
lessons: "The eta >= 0 guard took me the longest to get right. If eta is zero or positive, the quadratic has no minimum and the step should be skipped — but I initially continued and updated alpha anyway, which produced numerically unstable weights that oscillated rather than converging. Getting the KKT violation checks right required reading the original Platt (1998) paper rather than relying on secondary sources."
github: "https://github.com/ashishkoka/smo-svm"
---

## The Problem

Most ML courses teach you to call `sklearn.svm.SVC` and tune the C parameter. This assignment required going deeper: implement the Sequential Minimal Optimization (SMO) algorithm — the actual optimisation procedure that trains SVMs — from scratch using only NumPy.

SMO, introduced by John Platt in 1998, solves the SVM quadratic programming problem by breaking it into a series of two-variable subproblems that have an analytic solution. This avoids the need for a full QP solver and is why SVMs are tractable at scale.

## The Approach

**Data:** 2D points with binary labels (+1 / -1), loaded from a flat text file. The two columns are features `x1`, `x2`; the third column is the class label (0 mapped to -1).

**Kernel functions:** Two kernels implemented as Python functions passed as arguments:
- `kernel_linear(x, y)` → `x · y`
- `kernel_add_one(x, y)` → `x · y + 1`

The kernel matrix `K` is precomputed as an `m × m` NumPy array before training begins to avoid redundant computation inside the inner loop.

**SMO loop:**
1. For each training point `i`, compute the error `E_i = f(x_i) - y_i`.
2. Randomly select a second point `j ≠ i`.
3. Compute the bounds `L` and `H` based on whether `y_i == y_j` (same class) or not.
4. Compute `eta = 2K(i,j) - K(i,i) - K(j,j)`. Skip if `eta >= 0` (no valid minimum).
5. Update `alpha_j` analytically, clip to `[L, H]`, skip if change is too small.
6. Update `alpha_i` to maintain the equality constraint `Σ alpha_i * y_i = 0`.
7. Update the bias `b` as the average of `b1` and `b2`.
8. Repeat until no alphas change in a full pass (convergence).

After training, the weight vector `w = Σ (alpha_i * y_i) * x_i` is computed for the linear case and used for prediction and visualisation.

**Evaluation:** Confusion matrices for both kernels printed to stdout. Decision boundary plotted with `matplotlib.pyplot.contour` over a meshgrid of the feature space, scatter-coloured by true label.

## The Outcome

Both kernels converge on the provided dataset. The linear kernel confusion matrix shows clean separation. The `+1` kernel (a degree-1 polynomial) produces similar results on this linearly separable data, as expected. Decision boundary visualisation confirms the hyperplane sits correctly between the two classes.

## What I'd Change Next Time

The random selection of `j` is the simplest heuristic but not the most efficient. Platt's original paper describes a two-pass heuristic — a second choice pass that maximises `|E_i - E_j|` to pick the most violating pair. Implementing this would dramatically reduce the number of iterations needed for convergence on larger datasets.

I'd also factor the kernel into a class rather than a function argument, so adding new kernels (RBF, polynomial degree n) doesn't require changing the SMO function signature. And I'd add a proper stopping criterion based on KKT violation magnitude rather than a fixed iteration count.
