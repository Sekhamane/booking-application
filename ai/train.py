"""Train a demand model, evaluate against a time holdout, and measure saturation."""
import json
from datetime import timedelta
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

ROOT = Path(__file__).parent
ARTIFACTS = ROOT / "artifacts"
ARTIFACTS.mkdir(parents=True, exist_ok=True)
data = pd.read_csv(ARTIFACTS / "daily_demand.csv", parse_dates=["booking_date"])
data = data.sort_values(["booking_date", "category", "time_period"]).reset_index(drop=True)
data["dow"] = data.booking_date.dt.dayofweek
data["month"] = data.booking_date.dt.month
data["day_of_month"] = data.booking_date.dt.day
data["is_weekend"] = (data.dow >= 5).astype(int)
for lag in (1, 7, 14):
    data[f"lag_{lag}"] = data.groupby(["category", "time_period"])["actual_bookings"].shift(lag)
data["rolling_7"] = data.groupby(["category", "time_period"])["actual_bookings"].transform(lambda series: series.shift(1).rolling(7, min_periods=1).mean())
data = data.dropna(subset=["lag_1", "lag_7", "lag_14"]).reset_index(drop=True)
if len(data) < 90:
    raise SystemExit("At least 90 prepared daily rows are required; add more history or generate demo data.")

numeric = ["dow", "month", "day_of_month", "is_weekend", "lag_1", "lag_7", "lag_14", "rolling_7"]
encoded = pd.get_dummies(data[["category", "time_period"]], dtype=int)
feature_names = numeric + list(encoded.columns)
X = pd.concat([data[numeric].reset_index(drop=True), encoded.reset_index(drop=True)], axis=1)[feature_names]
y = data.actual_bookings.astype(float).reset_index(drop=True)
unique_dates = sorted(data.booking_date.unique())
split_day = unique_dates[max(1, int(len(unique_dates) * 0.8))]
train_mask = data.booking_date < split_day
test_mask = ~train_mask
X_train, X_test = X.loc[train_mask], X.loc[test_mask]
y_train, y_test = y.loc[train_mask], y.loc[test_mask]
dates = data.booking_date
model = RandomForestRegressor(n_estimators=240, min_samples_leaf=2, random_state=42, n_jobs=1)
model.fit(X_train, y_train)
pred = np.maximum(0, model.predict(X_test))
baseline = np.maximum(0, data.loc[test_mask, "lag_7"].to_numpy())
mae = float(mean_absolute_error(y_test, pred))
baseline_mae = float(mean_absolute_error(y_test, baseline))
rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
smape = float(np.mean(2 * np.abs(pred - y_test.to_numpy()) / (np.abs(pred) + np.abs(y_test.to_numpy()) + 1)) * 100)
normalized_accuracy = max(0.0, min(1.0, 1 - mae / (float(y_test.mean()) + 1)))

curve = []
for fraction in (0.2, 0.4, 0.6, 0.8, 1.0):
    rows = max(30, int(len(X_train) * fraction))
    candidate = RandomForestRegressor(n_estimators=120, min_samples_leaf=2, random_state=42, n_jobs=1)
    candidate.fit(X_train.iloc[:rows], y_train.iloc[:rows])
    curve.append({"training_rows": rows, "mae": round(float(mean_absolute_error(y_test, np.maximum(0, candidate.predict(X_test)))), 4)})

final_model = RandomForestRegressor(n_estimators=240, min_samples_leaf=2, random_state=42, n_jobs=1)
final_model.fit(X, y)
joblib.dump({"model": final_model, "features": feature_names, "numeric": numeric,
             "categories": sorted(data.category.unique()), "periods": sorted(data.time_period.unique())}, ARTIFACTS / "demand_model.joblib")

history = {(category, period): list(group.sort_values("booking_date").actual_bookings.astype(float))
           for (category, period), group in data.groupby(["category", "time_period"])}
forecast_rows = []
last_day = data.booking_date.max().date()
for offset in range(1, 4):
    day = last_day + timedelta(days=offset)
    for category in sorted(data.category.unique()):
        for period in sorted(data.time_period.unique()):
            values = history[(category, period)]
            base = {"dow": day.weekday(), "month": day.month, "day_of_month": day.day,
                    "is_weekend": int(day.weekday() >= 5), "lag_1": values[-1],
                    "lag_7": values[-7] if len(values) >= 7 else float(np.mean(values)),
                    "lag_14": values[-14] if len(values) >= 14 else float(np.mean(values)),
                    "rolling_7": float(np.mean(values[-7:]))}
            row = pd.DataFrame([{**base, "category": category, "time_period": period}])
            dummies = pd.get_dummies(row[["category", "time_period"]], dtype=int)
            row_x = pd.concat([row[numeric].reset_index(drop=True), dummies.reset_index(drop=True)], axis=1).reindex(columns=feature_names, fill_value=0)
            predicted = round(max(0.0, float(final_model.predict(row_x)[0])), 2)
            history[(category, period)].append(predicted)
            forecast_rows.append({"forecast_date": day.isoformat(), "category": category, "time_period": period, "predicted_bookings": predicted})

version = pd.Timestamp.utcnow().strftime("%Y%m%dT%H%M%SZ")
metrics = {"mae": round(mae, 4), "rmse": round(rmse, 4), "smape_percent": round(smape, 2),
           "normalized_mae_accuracy": round(normalized_accuracy, 4), "baseline_mae": round(baseline_mae, 4),
           "baseline_improvement_percent": round((baseline_mae - mae) / baseline_mae * 100, 2) if baseline_mae else 0,
           "holdout_rows": len(y_test), "holdout_start": pd.Timestamp(split_day).strftime("%Y-%m-%d"),
           "training_start": data.booking_date.min().strftime("%Y-%m-%d"), "training_end": data.booking_date.max().strftime("%Y-%m-%d"),
           "synthetic_dataset": (ROOT / "data" / "dataset_kind.json").exists() and
             json.loads((ROOT / "data" / "dataset_kind.json").read_text(encoding="utf-8")).get("kind") == "demo_synthetic"}
history_start = data.booking_date.max() - pd.Timedelta(days=89)
history_rows = data.loc[data.booking_date >= history_start, ["booking_date", "category", "time_period", "actual_bookings"]].copy()
output = {"model_name": "booking-demand-random-forest", "model_version": version, "dataset_rows": int(len(data)),
          "metrics": metrics, "learning_curve": curve,
          "history": [{"booking_date": r.booking_date.strftime("%Y-%m-%d"), "category": r.category, "time_period": r.time_period, "actual_bookings": int(r.actual_bookings)} for r in history_rows.itertuples()],
          "forecasts": forecast_rows}
(ARTIFACTS / "run.json").write_text(json.dumps(output, indent=2), encoding="utf-8")
print(json.dumps({"model_version": version, "metrics": metrics, "learning_curve": curve}, indent=2))
