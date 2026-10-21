"""Aggregate booking rows into a complete daily category/time-period series."""
import argparse
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).parent
parser = argparse.ArgumentParser()
parser.add_argument("--input", type=Path, default=ROOT / "data" / "bookings.csv")
parser.add_argument("--output", type=Path, default=ROOT / "artifacts" / "daily_demand.csv")
args = parser.parse_args()

df = pd.read_csv(args.input, parse_dates=["booking_date"])
required = {"booking_date", "category", "time_period"}
if not required.issubset(df.columns):
    raise SystemExit(f"Input must contain: {', '.join(sorted(required))}")
if df.empty:
    raise SystemExit("Input dataset contains no bookings")
df["category"] = df["category"].fillna("general").astype(str)
df["time_period"] = df["time_period"].fillna("Unspecified").astype(str)
if "booking_count" in df.columns or "actual_bookings" in df.columns:
    count_column = "booking_count" if "booking_count" in df.columns else "actual_bookings"
    df[count_column] = pd.to_numeric(df[count_column], errors="coerce").fillna(0).clip(lower=0)
    actual = df.groupby(["booking_date", "category", "time_period"])[count_column].sum().rename("actual_bookings")
elif "status" in df.columns:
    df = df[df["status"].isin(["requested", "pending_slip", "pending_validation", "confirmed", "in_progress", "completed"])]
    actual = df.groupby(["booking_date", "category", "time_period"]).size().rename("actual_bookings")
else:
    raise SystemExit("Input must contain booking_count aggregates or a status column")
dates = pd.date_range(df["booking_date"].min().normalize(), df["booking_date"].max().normalize(), freq="D")
categories = sorted(df["category"].unique())
periods = sorted(df["time_period"].unique())
full = pd.MultiIndex.from_product([dates, categories, periods], names=["booking_date", "category", "time_period"])
daily = actual.reindex(full, fill_value=0).reset_index()
daily["actual_bookings"] = daily["actual_bookings"].astype(int)
args.output.parent.mkdir(parents=True, exist_ok=True)
daily.to_csv(args.output, index=False, date_format="%Y-%m-%d")
print(f"Prepared {len(daily)} daily service-period rows at {args.output}")
