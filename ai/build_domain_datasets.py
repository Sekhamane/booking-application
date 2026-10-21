"""Build small, privacy-safe flight and healthcare demand time series from public sources."""
import json
from pathlib import Path
import urllib.request

import pandas as pd

ROOT = Path(__file__).parent
DATA = ROOT / "data"
DATA.mkdir(parents=True, exist_ok=True)
FLIGHT_URL = "https://raw.githubusercontent.com/vincentarelbundock/Rdatasets/master/csv/datasets/AirPassengers.csv"
HEALTH_URL = "https://d17h27t6h515a5.cloudfront.net/topher/2017/October/59dd2e9a_noshowappointments-kagglev2-may-2016/noshowappointments-kagglev2-may-2016.csv"

def read_public_csv(url):
    request = urllib.request.Request(url, headers={"User-Agent": "booking-demand-coursework/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return pd.read_csv(response)

# R AirPassengers is a monthly count of international airline passengers.
# Convert the sequence index to exact month starts; it is passenger traffic, not ticket transactions.
flight_raw = read_public_csv(FLIGHT_URL)
flight_dates = pd.date_range("1949-01-01", periods=len(flight_raw), freq="MS")
flights = pd.DataFrame({
    "booking_date": flight_dates,
    "category": "flight_passenger_traffic_proxy",
    "time_period": "All day",
    "actual_bookings": pd.to_numeric(flight_raw["value"], errors="raise").astype(int),
})
flights.to_csv(DATA / "public_flight_monthly.csv", index=False, date_format="%Y-%m-%d")
(DATA / "flight_dataset_kind.json").write_text(json.dumps({
    "kind": "external_real_aggregate", "dataset_name": "AirPassengers monthly airline passenger counts",
    "source": FLIGHT_URL, "source_period": "1949-01 through 1960-12",
    "measure": "Monthly international airline passengers (thousands; traffic proxy, not booking transactions)",
    "privacy": "Aggregate time series; contains no person-level records."
}, indent=2), encoding="utf-8")

# Aggregate in memory by the date appointments were registered. Do not persist source rows,
# identifiers, demographics, neighbourhood, or clinical variables.
health_raw = read_public_csv(HEALTH_URL)
required = {"ScheduledDay", "No-show"}
if not required.issubset(health_raw.columns):
    raise SystemExit(f"Healthcare source missing required columns: {sorted(required - set(health_raw.columns))}")
health_raw["booking_date"] = pd.to_datetime(health_raw["ScheduledDay"], errors="coerce", utc=True).dt.tz_convert(None).dt.normalize()
health_raw = health_raw.dropna(subset=["booking_date"])
health_raw["is_no_show"] = health_raw["No-show"].astype(str).str.strip().str.lower().eq("yes")
health_daily = health_raw.groupby("booking_date").agg(
    total_appointments=("is_no_show", "size"),
    missed_appointments=("is_no_show", "sum"),
).reset_index()
first, last = health_daily.booking_date.min(), health_daily.booking_date.max()
complete = pd.DataFrame({"booking_date": pd.date_range(first, last, freq="D")})
health_daily = complete.merge(health_daily, on="booking_date", how="left").fillna(0)
health_rows = health_daily.assign(category="healthcare_registered_appointments", time_period="All day",
                                  actual_bookings=health_daily.total_appointments)[["booking_date", "category", "time_period", "actual_bookings"]]
health_rows["actual_bookings"] = health_rows.actual_bookings.astype(int)
health_rows.to_csv(DATA / "public_healthcare_daily.csv", index=False, date_format="%Y-%m-%d")
(DATA / "healthcare_dataset_kind.json").write_text(json.dumps({
    "kind": "external_real_aggregated", "dataset_name": "Medical Appointment No Shows (Brazil, 2016)",
    "source": "https://www.kaggle.com/datasets/joniarroba/noshowappointments",
    "source_license": "CC BY-NC-SA 4.0; educational/non-commercial use; attribution and share-alike apply",
    "source_period": f"{first.date()} through {last.date()}",
    "measure": "Daily registered appointment count by booking-registration date; no-show rate retained only as an aggregate summary",
    "aggregate_no_show_rate_percent": round(float(health_daily.missed_appointments.sum() / max(1, health_daily.total_appointments.sum()) * 100), 2),
    "privacy": "Aggregated counts only. Source identifiers, demographics, neighbourhood, and clinical columns are not written to disk.",
}, indent=2), encoding="utf-8")

print(json.dumps({
    "flight": {"rows": len(flights), "start": str(flight_dates.min().date()), "end": str(flight_dates.max().date()), "path": str(DATA / "public_flight_monthly.csv")},
    "healthcare": {"rows": len(health_rows), "source_rows_aggregated_in_memory": len(health_raw), "start": str(first.date()), "end": str(last.date()), "path": str(DATA / "public_healthcare_daily.csv")},
}, indent=2))
