"""Build a privacy-safe flight demand time series from a public source."""
import json
from pathlib import Path
import urllib.request

import pandas as pd

ROOT = Path(__file__).parent
DATA = ROOT / "data"
DATA.mkdir(parents=True, exist_ok=True)
FLIGHT_URL = "https://raw.githubusercontent.com/vincentarelbundock/Rdatasets/master/csv/datasets/AirPassengers.csv"

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
    "category": "flights",
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

print(json.dumps({
    "flight": {"rows": len(flights), "start": str(flight_dates.min().date()), "end": str(flight_dates.max().date()), "path": str(DATA / "public_flight_monthly.csv")},
}, indent=2))
