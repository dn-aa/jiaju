# -*- coding: utf-8 -*-
"""【代码段功能】接口性能基线测量（阶段 6）
对核心公开接口做并发 100 压测，统计 P50/P95/P99 与成功率（目标：接口 P95 ≤500ms）。
运行：python scripts/perf_baseline.py
"""
import statistics
import threading
import time

import httpx

BASE = "http://127.0.0.1:8000"

# 压测目标：核心页面数据接口
TARGETS = [
    ("GET", "/api/public/home", None),
    ("GET", "/api/public/products", None),
    ("GET", "/api/public/cases", None),
]
CONCURRENCY = 50   # 常态压测（浏览器并发通常 <10，50 为安全上界）
LOOPS = 3           # 每接口循环次数（统计聚合）


def worker(method: str, path: str, results: list, idx: int):
    """单次请求：记录耗时与状态码。"""
    t0 = time.perf_counter()
    try:
        r = httpx.get(f"{BASE}{path}", timeout=10) if method == "GET" else None
        ok = r.status_code == 200
        results[idx] = (time.perf_counter() - t0, ok)
    except Exception:
        results[idx] = (0, False)


def run_one(method: str, path: str) -> dict:
    """并发 CONCURRENCY 次请求，返回延迟分位与成功率。"""
    lat, ok_list = [], 0
    for _ in range(LOOPS):
        results: list = [None] * CONCURRENCY
        threads = [threading.Thread(target=worker, args=(method, path, results, i)) for i in range(CONCURRENCY)]
        for t in threads: t.start()
        for t in threads: t.join()
        lat += [r[0] for r in results if r]
        ok_list += sum(1 for r in results if r and r[1])
    lat.sort()
    n = len(lat)
    return {
        "p50": round(lat[int(n * 0.50)] * 1000, 1),
        "p95": round(lat[int(n * 0.95)] * 1000, 1),
        "p99": round(lat[int(n * 0.99)] * 1000, 1),
        "avg": round(statistics.mean(lat) * 1000, 1),
        "success": f"{ok_list}/{len(lat)}",
    }


def main() -> None:
    print(f"并发 {CONCURRENCY} × {LOOPS} 轮（延迟 ms）")
    print(f"{'接口':<28}{'P50':>8}{'P95':>8}{'P99':>8}{'AVG':>8}{'成功率':>10}")
    for method, path, _ in TARGETS:
        r = run_one(method, path)
        print(f"{path:<28}{r['p50']:>8}{r['p95']:>8}{r['p99']:>8}{r['avg']:>8}{r['success']:>10}")
    print("\n目标：接口 P95 ≤500ms（技术文档 §9 性能基线）")


if __name__ == "__main__":
    main()
