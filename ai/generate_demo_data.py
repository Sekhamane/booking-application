"""Generate reproducible, non-personal demonstration booking rows."""
import csv
import json
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(42)
out = Path(__file__).parent / "data" / "bookings.csv"
out.parent.mkdir(parents=True, exist_ok=True)
categories = {"Domestic flight booking": 5.2, "International flight booking": 3.1,
              "Hotel room reservation": 7.0, "Hospital appointment": 3.4,
              "Local transport booking": 2.1}
periods = {"Morning": 1.3, "Afternoon": 1.0, "Evening": 0.72}
end = date.today() - timedelta(days=1)
start = end - timedelta(days=730)
with out.open("w", newline="", encoding="utf-8") as stream:
    writer = csv.writer(stream)
    writer.writerow(["booking_date", "category", "time_period", "status"])
    day = start
    while day <= end:
        seasonal = 1.25 if day.month in (6, 7, 12) else 1.0
        weekend = 1.18 if day.weekday() >= 5 else 1.0
        trend = 0.8 + ((day - start).days / (end - start).days) * 0.5
        for category, base in categories.items():
            for period, weight in periods.items():
                count = max(0, round(random.gauss(base * seasonal * weekend * trend * weight, 1.5)))
                for _ in range(count):
                    writer.writerow([day.isoformat(), category, period, random.choices(
                        ["confirmed", "completed", "cancelled", "rejected"], [0.46, 0.37, 0.12, 0.05]
                    )[0]])
        day += timedelta(days=1)
print(f"Wrote synthetic demonstration rows to {out}")
(out.parent / "dataset_kind.json").write_text(json.dumps({"kind": "demo_synthetic"}), encoding="utf-8")
