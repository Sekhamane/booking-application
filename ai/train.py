"""Compare demand models on a chronological validation split, then evaluate once on holdout."""
import json
import argparse
from datetime import timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

ROOT = Path(__file__).parent
parser = argparse.ArgumentParser()
parser.add_argument("--input", type=Path, default=ROOT / "artifacts" / "daily_demand.csv")
parser.add_argument("--output-dir", type=Path, default=ROOT / "artifacts")
parser.add_argument("--frequency", choices=("daily", "monthly"), default="daily")
parser.add_argument("--dataset-marker", type=Path, default=ROOT / "data" / "dataset_kind.json")
args = parser.parse_args()
ARTIFACTS = args.output_dir
ARTIFACTS.mkdir(parents=True, exist_ok=True)
data = pd.read_csv(args.input, parse_dates=["booking_date"])
data = data.sort_values(["booking_date", "category", "time_period"]).reset_index(drop=True)
data["dow"] = data.booking_date.dt.dayofweek
data["month"] = data.booking_date.dt.month
data["day_of_month"] = data.booking_date.dt.day
data["is_weekend"] = (data.dow >= 5).astype(int)
season_lag = 7 if args.frequency == "daily" else 12
lag_periods = (1, 7, 14) if args.frequency == "daily" else (1, 12, 24)
for lag in lag_periods:
    data[f"lag_{lag}"] = data.groupby(["category", "time_period"])["actual_bookings"].shift(lag)
rolling_window = 7 if args.frequency == "daily" else 12
data[f"rolling_{rolling_window}"] = data.groupby(["category", "time_period"])["actual_bookings"].transform(
    lambda series: series.shift(1).rolling(rolling_window, min_periods=1).mean())
required_lags = [f"lag_{lag}" for lag in lag_periods]
data = data.dropna(subset=required_lags).reset_index(drop=True)
minimum_rows = 180 if args.frequency == "daily" else 90
if len(data) < minimum_rows:
    raise SystemExit(f"At least {minimum_rows} prepared {args.frequency} rows are required for train/validation/holdout evaluation.")

calendar_features = ["month"] if args.frequency == "monthly" else ["dow", "month", "day_of_month", "is_weekend"]
numeric = calendar_features + required_lags + [f"rolling_{rolling_window}"]
encoded = pd.get_dummies(data[["category", "time_period"]], dtype=int)
feature_names = numeric + list(encoded.columns)
X = pd.concat([data[numeric].reset_index(drop=True), encoded.reset_index(drop=True)], axis=1)[feature_names]
y = data.actual_bookings.astype(float).reset_index(drop=True)
unique_dates = sorted(data.booking_date.unique())
holdout_day = unique_dates[max(1, int(len(unique_dates) * 0.8))]
pre_holdout_dates = [day for day in unique_dates if day < holdout_day]
validation_day = pre_holdout_dates[max(1, int(len(pre_holdout_dates) * 0.8))]
train_mask = data.booking_date < validation_day
validation_mask = (data.booking_date >= validation_day) & (data.booking_date < holdout_day)
holdout_mask = data.booking_date >= holdout_day
if not train_mask.any() or not validation_mask.any() or not holdout_mask.any():
    raise SystemExit("Not enough distinct dates for chronological train/validation/holdout splits.")

models = {
    "random_forest": lambda: RandomForestRegressor(n_estimators=240, min_samples_leaf=2, random_state=42, n_jobs=1),
    "extra_trees": lambda: ExtraTreesRegressor(n_estimators=240, min_samples_leaf=2, max_features=0.9, random_state=42, n_jobs=1),
    "hist_gradient_boosting": lambda: HistGradientBoostingRegressor(max_iter=180, learning_rate=0.08, l2_regularization=1.0, random_state=42),
}
comparisons = []
fitted_validation = {}
for name, factory in models.items():
    candidate = factory()
    candidate.fit(X.loc[train_mask], y.loc[train_mask])
    prediction = np.maximum(0, candidate.predict(X.loc[validation_mask]))
    score = float(mean_absolute_error(y.loc[validation_mask], prediction))
    comparisons.append({"model": name, "validation_mae": round(score, 4)})
    fitted_validation[name] = candidate
baseline_validation_mae = float(mean_absolute_error(y.loc[validation_mask], data.loc[validation_mask, f"lag_{season_lag}"]))
comparisons.append({"model": f"lag_{season_lag}_baseline", "validation_mae": round(baseline_validation_mae, 4)})
# Selection uses validation only. Keep a trained ML model even when a simple baseline scores better;
# report that transparently and let the dashboard show the benchmark comparison.
selected_name = min((item for item in comparisons if not item["model"].endswith("_baseline")), key=lambda item: item["validation_mae"])["model"]
selected_factory = models[selected_name]
selected = selected_factory()
selected.fit(X.loc[~holdout_mask], y.loc[~holdout_mask])
pred = np.maximum(0, selected.predict(X.loc[holdout_mask]))
y_test = y.loc[holdout_mask]
baseline = np.maximum(0, data.loc[holdout_mask, f"lag_{season_lag}"].to_numpy())
mae = float(mean_absolute_error(y_test, pred))
baseline_mae = float(mean_absolute_error(y_test, baseline))
rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
smape = float(np.mean(2 * np.abs(pred - y_test.to_numpy()) / (np.abs(pred) + np.abs(y_test.to_numpy()) + 1)) * 100)
normalized_accuracy = max(0.0, min(1.0, 1 - mae / (float(y_test.mean()) + 1)))

curve = []
holdout_dates = data.loc[~holdout_mask, "booking_date"].reset_index(drop=True)
holdout_train = X.loc[~holdout_mask].reset_index(drop=True)
holdout_target = y.loc[~holdout_mask].reset_index(drop=True)
ordered_train_dates = sorted(holdout_dates.unique())
for fraction in (0.2, 0.4, 0.6, 0.8, 1.0):
    date_count = max(1, int(len(ordered_train_dates) * fraction))
    selected_dates = set(ordered_train_dates[:date_count])
    curve_mask = holdout_dates.isin(selected_dates)
    rows = int(curve_mask.sum())
    candidate = selected_factory()
    candidate.fit(holdout_train.loc[curve_mask], holdout_target.loc[curve_mask])
    curve.append({"training_rows": rows, "mae": round(float(mean_absolute_error(y_test, np.maximum(0, candidate.predict(X.loc[holdout_mask])))), 4)})

final_model = selected_factory()
final_model.fit(X, y)
joblib.dump({"model": final_model, "model_name": selected_name, "features": feature_names, "numeric": numeric,
             "categories": sorted(data.category.unique()), "periods": sorted(data.time_period.unique())}, ARTIFACTS / "demand_model.joblib")

history = {(category, period): list(group.sort_values("booking_date").actual_bookings.astype(float))
           for (category, period), group in data.groupby(["category", "time_period"])}
forecast_rows = []
last_day = data.booking_date.max().date()
for offset in range(1, 4):
    day = last_day + timedelta(days=offset) if args.frequency == "daily" else last_day + pd.DateOffset(months=offset)
    for category in sorted(data.category.unique()):
        for period in sorted(data.time_period.unique()):
            values = history[(category, period)]
            base = {"month": day.month, "lag_1": values[-1],
                    f"lag_{season_lag}": values[-season_lag] if len(values) >= season_lag else float(np.mean(values)),
                    f"lag_{24 if args.frequency == 'monthly' else 14}": values[-24 if args.frequency == "monthly" else -14] if len(values) >= (24 if args.frequency == "monthly" else 14) else float(np.mean(values)),
                    f"rolling_{rolling_window}": float(np.mean(values[-rolling_window:]))}
            if args.frequency == "daily":
                base.update({"dow": day.weekday(), "day_of_month": day.day, "is_weekend": int(day.weekday() >= 5)})
            row = pd.DataFrame([{**base, "category": category, "time_period": period}])
            dummies = pd.get_dummies(row[["category", "time_period"]], dtype=int)
            row_x = pd.concat([row[numeric].reset_index(drop=True), dummies.reset_index(drop=True)], axis=1).reindex(columns=feature_names, fill_value=0)
            predicted = round(max(0.0, float(final_model.predict(row_x)[0])), 2)
            history[(category, period)].append(predicted)
            forecast_rows.append({"forecast_date": day.strftime("%Y-%m-%d"), "category": category, "time_period": period, "predicted_bookings": predicted})

version = pd.Timestamp.utcnow().strftime("%Y%m%dT%H%M%SZ")
dataset_marker_path = args.dataset_marker
dataset_marker = json.loads(dataset_marker_path.read_text(encoding="utf-8")) if dataset_marker_path.exists() else {"kind": "first_party_real"}
metrics = {"frequency": args.frequency, "seasonal_baseline_lag": season_lag,
           "mae": round(mae, 4), "rmse": round(rmse, 4), "smape_percent": round(smape, 2),
           "normalized_mae_accuracy": round(normalized_accuracy, 4), "baseline_mae": round(baseline_mae, 4),
           "baseline_improvement_percent": round((baseline_mae - mae) / baseline_mae * 100, 2) if baseline_mae else 0,
           "holdout_rows": len(y_test), "holdout_start": pd.Timestamp(holdout_day).strftime("%Y-%m-%d"),
           "validation_start": pd.Timestamp(validation_day).strftime("%Y-%m-%d"),
           "training_start": data.booking_date.min().strftime("%Y-%m-%d"), "training_end": data.booking_date.max().strftime("%Y-%m-%d"),
           "synthetic_dataset": dataset_marker.get("kind") == "demo_synthetic",
           "dataset_kind": dataset_marker.get("kind"), "dataset_source": dataset_marker.get("dataset_name", "First-party booking aggregates")}
metrics["target_label"] = dataset_marker.get("measure", "booking demand")
history_start = data.booking_date.max() - (pd.DateOffset(months=23) if args.frequency == "monthly" else pd.DateOffset(days=89))
history_rows = data.loc[data.booking_date >= history_start, ["booking_date", "category", "time_period", "actual_bookings"]].copy()
output = {"model_name": f"booking-demand-{selected_name.replace('_', '-')}", "model_version": version,
          "frequency": args.frequency,
          "dataset_rows": int(len(data)), "dataset_kind": dataset_marker.get("kind"),
          "dataset_source": dataset_marker.get("dataset_name", "First-party booking aggregates"),
          "metrics": metrics, "model_comparison": comparisons, "selected_model": selected_name,
          "learning_curve": curve,
          "history": [{"booking_date": r.booking_date.strftime("%Y-%m-%d"), "category": r.category, "time_period": r.time_period, "actual_bookings": int(r.actual_bookings)} for r in history_rows.itertuples()],
          "forecasts": forecast_rows}
(ARTIFACTS / "run.json").write_text(json.dumps(output, indent=2), encoding="utf-8")
print(json.dumps({"model_version": version, "selected_model": selected_name, "validation_comparison": comparisons, "metrics": metrics, "learning_curve": curve}, indent=2))
