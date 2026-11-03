# Booking demand datasets

The pipeline supports benchmark series for accommodation and flights. Sources are transformed into date, category, period, and aggregate count columns; source-level customer records are not stored in generated datasets.

## Flight passenger demand proxy

`public_flight_monthly.csv` contains 144 monthly international passenger totals from January 1949 through December 1960. This is a historical passenger traffic series, not a ticket booking transaction dataset. It supports a monthly demand forecasting example only. The source documents the series as monthly totals in thousands: [R AirPassengers documentation](https://search.r-project.org/R/refmans/datasets/html/AirPassengers.html).

## Accommodation benchmark

The project also has the [Hotel Booking Demand dataset](https://doi.org/10.1016/j.dib.2018.11.126), transformed by `prepare_public_hotel_data.py`. It is external accommodation data and does not represent bookings made through this application.

## Rebuild and train

```powershell
py ai/build_domain_datasets.py
py ai/prepare_public_hotel_data.py
py ai/prepare_data.py
py ai/train.py --input ai/data/public_flight_monthly.csv --output-dir ai/artifacts/flights --frequency monthly --dataset-marker ai/data/flight_dataset_kind.json
```

The trainer selects a model using chronological validation and evaluates it against a later holdout plus a seasonal naive baseline. Results must be interpreted per source and cannot be transferred to real flight sellers or accommodation providers without first-party data.
