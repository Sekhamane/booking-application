# AI dataset

Place an anonymized `bookings.csv` export here. Required columns are `booking_date`, `category`, `time_period`, and `status`. Put the service name in `category` so forecasts are service-specific. Do not include names, emails, phone numbers, notes, payment documents, or booking reference codes.

For real first-party data, an authorized operator should run [`export_real_bookings.sql`](export_real_bookings.sql) in the protected Supabase SQL editor and download the aggregate result as `ai/data/bookings.csv`. It creates one row per booking date, broad service category, and time period. It excludes names, email, phone, notes, booking IDs, payment data, and service names.

Then remove `ai/data/dataset_kind.json`, run `py ai/prepare_data.py`, and run `py ai/train.py`. Check the generated `ai/artifacts/run.json` has `"synthetic_dataset": false` and includes the expected training date range before publishing. Do not mark demo-generated data as real by deleting the marker; replace the CSV with an authorized real export first.

## External real-data benchmark

The current model run uses the published **Hotel booking demand datasets (H1/H2)** by Antonio, Almeida and Nunes. The open-access article describes 119,390 anonymized booking records from a resort hotel and a city hotel in Portugal, with arrival dates from July 2015 through August 2017; it is published under CC BY 4.0. The raw source file is `hotels_public_source.csv` and is excluded from version control.

Download the anonymized source CSV and create the model's own daily dataset by running:

```powershell
./ai/download_public_hotel_data.ps1
py ai/prepare_public_hotel_data.py
py ai/prepare_data.py
py ai/train.py
```

The preparation script derives each booking's creation date as arrival date minus `lead_time`, then aggregates by date and hotel category. Since the source has no time-of-day, every row uses `All day`. It counts all booking requests, including bookings later canceled. This is real historical external data, but it is not first-party Teabag data and its 2013–2017 forecast horizon is not current demand. See [`../RESULTS.md`](../RESULTS.md) for the measured holdout results and limitations.

Local CSVs, source files, synthetic markers, model files, and generated reports are excluded by `.gitignore`; keep them out of shared repositories and use only data you are authorized to process. The Supabase public key configured in this workspace returned zero booking rows; an authorized SQL-editor export is still needed for first-party model results.

For a demonstration before real bookings exist, run `python ai/generate_demo_data.py`. It creates a deterministic synthetic dataset and labels it as synthetic. Model scores on synthetic data are demonstration metrics, not evidence of real-world accuracy. When switching to a real export, remove `dataset_kind.json` so the resulting model is not labelled synthetic.
