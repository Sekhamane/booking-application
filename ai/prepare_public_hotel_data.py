"""Aggregate a public anonymized hotel booking dataset into daily demand."""
import argparse
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).parent
parser = argparse.ArgumentParser()
parser.add_argument("--input", type=Path, default=ROOT / "data" / "hotels_public_source.csv")
parser.add_argument("--output", type=Path, default=ROOT / "data" / "bookings.csv")
args = parser.parse_args()

df = pd.read_csv(args.input)
required = {
    "hotel", "lead_time", "arrival_date_year", "arrival_date_month",
    "arrival_date_day_of_month",
}
missing = required - set(df.columns)
if missing:
    raise SystemExit(f"Input is missing required columns: {', '.join(sorted(missing))}")

month_lookup = {
    name.lower(): number for number, name in enumerate(
        ("January", "February", "March", "April", "May", "June", "July",
         "August", "September", "October", "November", "December"), start=1
    )
}
months = df["arrival_date_month"].astype(str).str.strip().str.lower().map(month_lookup)
arrival = pd.to_datetime({
    "year": pd.to_numeric(df["arrival_date_year"], errors="coerce"),
    "month": months,
    "day": pd.to_numeric(df["arrival_date_day_of_month"], errors="coerce"),
}, errors="coerce")
lead_time = pd.to_numeric(df["lead_time"], errors="coerce")
valid = arrival.notna() & lead_time.notna() & lead_time.ge(0) & df["hotel"].notna()
if not valid.any():
    raise SystemExit("No valid hotel booking rows found.")

events = pd.DataFrame({
    "booking_date": (arrival[valid] - pd.to_timedelta(lead_time[valid], unit="D")).dt.normalize(),
    "category": "accommodation_" + df.loc[valid, "hotel"].astype(str).str.strip().str.lower().str.replace(r"\s+", "_", regex=True),
    # The source has no booking time-of-day field, so do not invent one.
    "time_period": "All day",
})
daily = (events.groupby(["booking_date", "category", "time_period"], as_index=False)
         .size().rename(columns={"size": "booking_count"}))
daily["booking_date"] = daily["booking_date"].dt.strftime("%Y-%m-%d")
args.output.parent.mkdir(parents=True, exist_ok=True)
daily.to_csv(args.output, index=False)

marker = {
    "kind": "external_real_anonymized",
    "dataset_name": "Hotel booking demand datasets (H1/H2)",
    "source_url": "https://doi.org/10.1016/j.dib.2018.11.126",
    "data_paper": "Antonio, Almeida and Nunes (2019), Data in Brief 22, 41-49",
    "license": "CC BY 4.0",
    "source_rows_used": int(valid.sum()),
    "aggregated_rows": int(len(daily)),
    "booking_date_method": "arrival date minus lead_time",
    "time_period_method": "All day; source has no booking time-of-day field",
    "cancellation_method": "All booking requests counted, including records later canceled",
    "data_period": [daily.booking_date.min(), daily.booking_date.max()],
    "first_party_data": False,
}
(ROOT / "data" / "dataset_kind.json").write_text(json.dumps(marker, indent=2), encoding="utf-8")
print(json.dumps(marker, indent=2))
