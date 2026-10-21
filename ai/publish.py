"""Publish anonymized forecast outputs to RLS-protected Supabase tables."""
import json
import os
from pathlib import Path
from supabase import create_client

root = Path(__file__).parent
run_paths = [root / "artifacts" / "run.json"]
run_paths.extend(sorted((root / "artifacts").glob("*/run.json")))
run_paths = [path for path in run_paths if path.exists()]
if not run_paths:
    raise SystemExit("No trained run.json artifacts found.")
url = os.environ["SUPABASE_URL"]
service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
client = create_client(url, service_key)

for run_path in run_paths:
    run = json.loads(run_path.read_text(encoding="utf-8"))
    metric = {
        "model_name": run["model_name"], "model_version": run["model_version"],
        "dataset_rows": run["dataset_rows"],
        "metrics": {**run["metrics"], "synthetic_dataset": run["metrics"]["synthetic_dataset"],
                    "model_comparison": run.get("model_comparison", []),
                    "selected_model": run.get("selected_model")},
        "learning_curve": run["learning_curve"],
    }
    saved = client.table("ai_model_metrics").upsert(metric, on_conflict="model_name,model_version").execute()
    metric_id = saved.data[0]["id"]
    client.table("ai_forecasts").delete().eq("model_metrics_id", metric_id).execute()

    forecasts = [{**row, "model_metrics_id": metric_id} for row in run["forecasts"]]
    for start in range(0, len(forecasts), 500):
        client.table("ai_forecasts").insert(forecasts[start:start + 500]).execute()

    history = [{"booking_date": row["booking_date"], "category": row["category"],
                "time_period": row["time_period"], "actual_bookings": row["actual_bookings"]}
               for row in run["history"]]
    for start in range(0, len(history), 500):
        client.table("ai_daily_history").upsert(history[start:start + 500],
            on_conflict="booking_date,category,time_period").execute()
    print(f"Published {run['model_name']} {run['model_version']} with {len(forecasts)} forecasts from {run_path.parent}.")
