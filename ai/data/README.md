# AI dataset

Place an anonymized `bookings.csv` export here. Required columns are `booking_date`, `category`, `time_period`, and `status`. Put the service name in `category` so forecasts are service-specific. Do not include names, emails, phone numbers, notes, payment documents, or booking reference codes.

For a real first-party dataset, an authorized operator should run [`export_real_bookings.sql`](export_real_bookings.sql) in the protected Supabase SQL editor and download the aggregate result as `ai/data/bookings.csv`. It creates one row per booking date, broad service category, and time period. It excludes names, email, phone, notes, booking IDs, payment data, and service names.

Then remove `ai/data/dataset_kind.json`, run `py ai/prepare_data.py`, and run `py ai/train.py`. Check the generated `ai/artifacts/run.json` has `"synthetic_dataset": false` and includes the expected training date range before publishing. Do not mark demo-generated data as real by deleting the marker; replace the CSV with an authorized real export first.

Local CSVs, synthetic markers, model files, and generated reports are excluded by `.gitignore`; keep them out of shared repositories and use only data you are authorized to process. The repository currently contains synthetic demo data only; actual booking data must be exported from the configured Supabase project.

For a demonstration before real bookings exist, run `python ai/generate_demo_data.py`. It creates a deterministic synthetic dataset and labels it as synthetic. Model scores on synthetic data are demonstration metrics, not evidence of real-world accuracy. When switching to a real export, remove `dataset_kind.json` so the resulting model is not labelled synthetic.
