# Cross-domain booking demand datasets

The pipeline now includes booking-relevant benchmark series for accommodation, flights, and healthcare. The downloaded sources are transformed into date, category, period, and aggregate count columns; source-level customer records are not stored in the generated datasets.

## Flight passenger demand proxy

`public_flight_monthly.csv` contains 144 monthly international passenger totals from January 1949 through December 1960. This is a historical passenger traffic series, **not a ticket booking transaction dataset**. It supports a monthly demand forecasting example only. The source documents the series as monthly totals in thousands: [R AirPassengers documentation](https://search.r-project.org/R/refmans/datasets/html/AirPassengers.html). A CSV copy is obtained from [Rdatasets](https://github.com/vincentarelbundock/Rdatasets/blob/master/csv/datasets/AirPassengers.csv).

## Healthcare appointment demand

`public_healthcare_daily.csv` aggregates the public Brazil medical appointment dataset by the date the appointment was registered. It contains 212 daily aggregate observations from November 2015 through June 2016. The source has 110,527 appointment rows and sensitive demographic/health fields; the builder processes them in memory and writes only daily totals and a separate dataset marker. The appointment source defines the schedule-registration and appointment date fields; original dataset: [Kaggle Medical Appointment No Shows](https://www.kaggle.com/datasets/joniarroba/noshowappointments). The source license is CC BY-NC-SA 4.0, so these derived data are for educational/non-commercial use and must retain attribution and share-alike terms.

## Hotel benchmark

The project also has the [Hotel Booking Demand dataset](https://doi.org/10.1016/j.dib.2018.11.126), transformed by `prepare_public_hotel_data.py`. It is external hotel data and does not represent bookings made through this application.

## Rebuild and train

```powershell
py ai/build_domain_datasets.py
py ai/prepare_data.py --input ai/data/public_healthcare_daily.csv --output ai/artifacts/healthcare/daily_demand.csv
py ai/train.py --input ai/artifacts/healthcare/daily_demand.csv --output-dir ai/artifacts/healthcare --dataset-marker ai/data/healthcare_dataset_kind.json
py ai/train.py --input ai/data/public_flight_monthly.csv --output-dir ai/artifacts/flights --frequency monthly --dataset-marker ai/data/flight_dataset_kind.json
```

The trainer selects an ML model using a chronological validation period and evaluates it against a later holdout plus a seasonal naive baseline (lag 7 for daily data, lag 12 for monthly data). Flight forecasts and metrics are monthly; healthcare forecasts and metrics are daily. Results must be interpreted per source and cannot be transferred to real flight sellers, clinics, or the app without first-party data.
