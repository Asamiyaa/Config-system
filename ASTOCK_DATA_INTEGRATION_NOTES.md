# a-stock-data integration notes

The current upstream `simonlin1212/a-stock-data` project describes a multi-source A-share data toolkit and prioritizes Tencent K-line/quote paths over public mootdx quote commands which it reports as returning empty data since 2026-09. It also emphasizes date, field and completeness checks and fallback rather than treating HTTP 200 as proof of valid data.

This Wealth OS integration adopts the applicable design for its current requirement: A-share ETF daily close series for price, MA20/MA60, 20/60-session return and drawdown. It does **not** claim to embed all 87 upstream endpoints or use a-stock-data as a complete replacement for all future financial/news/flow data. The adapter is intentionally scoped to fields consumed by the current Wealth OS UI and risk calculations.

Upstream: https://github.com/simonlin1212/a-stock-data

Validation policy: preserve last known values on source failure; require a usable date/close series, minimum 65 valid daily bars, positive OHLC and nonnegative volume, sorted/deduplicated dates, and reject data more than 10 calendar days behind. A 5–10 day lag is surfaced as a warning and makes the overall refresh `PARTIAL`. Real provider correctness cannot be guaranteed by software alone; compare with exchange/fund-company/broker data before placing trades.
