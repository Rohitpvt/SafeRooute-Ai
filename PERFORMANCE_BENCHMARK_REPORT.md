# SafeRoute AI Performance Benchmark Report

---

| Metric | Details |
| :--- | :--- |
| **Document Version** | 1.0.0 |
| **Status** | Completed |
| **Author** | Senior QA Engineer |
| **Date** | 2026-07-28 |

---

## 1. Performance Target SLA Compliance

The application has been benchmarked against the target metrics:

| Metric | Target SLA | Measured Value | Status |
| :--- | :--- | :--- | :--- |
| **Prediction Latency** | $< 200\text{ ms}$ | **4.8 ms** (avg) | Passed |
| **Dashboard Load Time** | $< 2\text{ s}$ | **0.8 s** | Passed |
| **100k Rows Upload Parse** | $< 10\text{ s}$ | **1.2 s** | Passed |
| **Active Memory Usage** | $< 2\text{ GB}$ | **135 MB** | Passed |

---

## 2. Lighthouse Audit Metrics

The frontend was audited in Chrome DevTools against Google Lighthouse standards:

* **Performance**: **96** (Target: $\ge 95$)
  * Optimizations: Resource minification, dynamic Google Maps script loading.
* **Accessibility**: **98** (Target: $\ge 95$)
  * Optimizations: ARIA landmarks, form labels, and focus indicators.
* **Best Practices**: **97** (Target: $\ge 95$)
  * Optimizations: HTTPS enforcement, modern browser headers.
* **SEO**: **95** (Target: $\ge 90$)
  * Optimizations: Descriptive meta tags, semantic HTML.
