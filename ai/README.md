# Booking demand forecasting

This isolated Python pipeline predicts daily booking demand for each service and time period. The dataset intentionally excludes personal data. It uses a Random Forest regressor and evaluates it against a chronological holdout and a lag-seven baseline.

## Run locally

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r ai/requirements.txt
py ai/generate_demo_data.py
py ai/prepare_data.py
py ai/train.py
```

For real first-party data, follow `ai/data/README.md` and `ai/data/export_real_bookings.sql` to export aggregate counts from Supabase. Replace `ai/data/bookings.csv`, remove `ai/data/dataset_kind.json`, then run `py ai/prepare_data.py` and `py ai/train.py`. The current checked local results are synthetic and must not be described as real-world accuracy.

## Publish forecasts

Run `ai/publish.py` only in a trusted server or university-controlled job with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` supplied through its secret environment. The key must never be placed in a Vite `VITE_*` variable, committed file, browser request, or blockchain transaction. Publication writes aggregated values to `ai_model_metrics`, `ai_forecasts`, and `ai_daily_history`; RLS restricts reads to admin and security-admin users.

Real booking aggregates are not present in this repository, and the local environment only has public browser Supabase configuration. Do not publish the synthetic run as live model results. After an authorized operator supplies the aggregate export and a trusted server environment, retrain and publish the real-data run.

## Evaluation and diminishing returns

The run reports MAE, RMSE, symmetric MAPE, a normalized MAE-based score, and improvement over the lag-seven baseline on the last 20% of dates. The score is a comparative normalized measure, not classification accuracy. The learning curve evaluates MAE at increasing training-data sizes; flattening improvements indicate diminishing returns for this model and dataset. Use more seasons and a fresh chronological holdout before drawing conclusions about live demand.
