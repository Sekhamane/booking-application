# Booking demand forecasting

This isolated Python pipeline predicts daily booking demand for each service and time period. The dataset intentionally excludes personal data. It compares Random Forest, Extra Trees, and histogram gradient boosting on an earlier chronological validation period, selects the strongest ML candidate, then evaluates it once on a later untouched holdout against a lag-seven baseline.

## Run locally

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r ai/requirements.txt
py ai/generate_demo_data.py
py ai/prepare_data.py
py ai/train.py
```

For the external real-data benchmark, run `./ai/download_public_hotel_data.ps1`, then `py ai/prepare_public_hotel_data.py`, `py ai/prepare_data.py`, and `py ai/train.py`. Its provenance is recorded in `ai/data/dataset_kind.json`; do not delete that marker. For first-party results, an authorized operator can export counts using `ai/data/export_real_bookings.sql`, replace `ai/data/bookings.csv`, and retrain. See `ai/data/README.md` and `ai/RESULTS.md`.

For flight and healthcare benchmark datasets, see `ai/data/MULTIDOMAIN_DATASETS.md` and run `py ai/build_domain_datasets.py`. Train the daily healthcare series and monthly flight series separately using the commands there. The flight data is a historical passenger-traffic proxy rather than ticket sales; the healthcare builder only writes daily aggregated counts.

## Publish forecasts

Run `ai/publish.py` only in a trusted server or university-controlled job with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` supplied through its secret environment. It publishes the main run plus domain runs found under `ai/artifacts/*/run.json`. The key must never be placed in a Vite `VITE_*` variable, committed file, browser request, or blockchain transaction. Publication writes aggregated values to `ai_model_metrics`, `ai_forecasts`, and `ai_daily_history`; RLS restricts reads to admin and security-admin users. The dashboard lets an authorized user switch between published datasets.

The current local run uses an external public hotel dataset, not Teabag booking aggregates. Do not present it as first-party or current demand. Publishing to Supabase still requires a trusted server environment with `SUPABASE_SERVICE_ROLE_KEY`; never put that key in browser configuration.

## Evaluation and diminishing returns

The run reports the validation comparison, MAE, RMSE, symmetric MAPE, a normalized MAE-based score, and improvement over the lag-seven baseline on the last 20% of dates. The score is a comparative normalized measure, not classification accuracy. The learning curve evaluates MAE at increasing training-data sizes; flattening improvements indicate diminishing returns for this model and dataset. Use more seasons and first-party bookings before drawing conclusions about live demand. Publishing also stores the validation comparison in the dashboard's model metrics JSON.
