# Booking demand model: real-data benchmark

## Dataset and target

The model uses the published Hotel Booking Demand dataset from two anonymized Portuguese hotels (H1 resort and H2 city hotel). It contains 119,390 booking records. The article is open access under CC BY 4.0: Antonio, N., Almeida, A., and Nunes, L. (2019), *Hotel booking demand datasets*, Data in Brief 22, 41–49, [doi:10.1016/j.dib.2018.11.126](https://doi.org/10.1016/j.dib.2018.11.126).

The preparation script derives a booking-created date as `arrival date - lead_time` (the source defines lead time as elapsed days between booking entry and arrival). It aggregates requests by date and hotel type. Because the source has no booking time-of-day, the period is `All day`. It counts requests even if they were later canceled, measuring gross booking demand. No customer-level information enters the model dataset.

This is **real external benchmark data**, not data collected by Teabag. The historical range is 2013-07-08 through 2017-08-31 after the model's lag features are prepared. Its forecasts do not represent demand in the live app in 2026.

## Evaluation

Model selection: chronological train/validation/holdout. Random Forest, Extra Trees, and histogram gradient boosting were compared on an earlier validation period; the last 20% of dates remained untouched until final evaluation. Random Forest had the lowest validation MAE and was selected. No random shuffle is used.

| Validation candidate | Validation MAE |
|---|---:|
| Random Forest (selected) | 27.7112 |
| Extra Trees | 28.0777 |
| Lag-seven baseline | 28.1358 |
| Histogram Gradient Boosting | 35.2012 |

| Measure | Result | Interpretation |
|---|---:|---|
| Holdout dates start | 2016-11-01 | Test period begins after training period |
| Holdout rows | 608 | Daily rows across both hotel categories |
| MAE | 25.2131 bookings | Average absolute error per hotel/day row |
| RMSE | 46.0554 bookings | Penalizes larger misses more heavily |
| sMAPE | 42.15% | Symmetric percentage error, stabilized for low counts |
| Lag-seven baseline MAE | 24.9688 bookings | Predicts the matching value from one week earlier |
| Random Forest vs baseline | 0.98% worse | The trained model did not beat the simple baseline on this holdout |
| Normalized MAE score | 58.98% | `1 - MAE / (mean holdout demand + 1)`; this is **not classification accuracy** |

For this regression task, MAE is the typical absolute miss in bookings, RMSE emphasizes large misses, and sMAPE expresses relative error as a percentage. The 58.98% normalized MAE score is only a custom rescaling against mean demand; it must not be presented as the model's prediction accuracy.

Random Forest narrowly won the validation comparison, but its untouched holdout MAE is slightly higher than the lag-seven baseline. This small validation advantage did not generalize to the holdout. For planning on this benchmark, use the baseline unless further evaluation demonstrates a reliable gain. The dataset is useful for demonstrating the pipeline and booking-demand analysis, not for claiming production performance. The dashboard now shows the candidate comparison and this holdout limitation.

## Learning curve and saturation

The learning curve evaluates the same chronological holdout while increasing the training rows. Falling MAE means the model is still benefiting from additional examples. A flattening curve suggests diminishing returns; this curve does not flatten enough to claim saturation.

| Training rows | Holdout MAE |
|---:|---:|
| 484 | 60.4622 |
| 968 | 59.5502 |
| 1,454 | 31.4105 |
| 1,938 | 30.8191 |
| 2,424 | 25.6361 |

MAE continues to fall at the largest sample size, and its final step improves by about 18.2%. Each curve point adds complete chronological dates across both hotel categories. The curve does not show saturation. More training history may help; model selection is performed on the separate validation period while the evaluation holdout remains untouched.

## Additional domains

The pipeline also builds separate flight and healthcare benchmark datasets. They are not combined with the hotel series because the measurement frequency and context differ.

| Domain and target | Selected ML model | Holdout MAE | Holdout RMSE | Holdout sMAPE | Seasonal baseline MAE | Holdout MAE change vs baseline |
|---|---|---:|---:|---:|---:|---:|
| Hotel booking demand, daily | Random Forest | 25.2131 bookings | 46.0554 bookings | 42.15% | 24.9688 | 0.98% worse |
| Flight passenger traffic, monthly | Extra Trees | 31.0184 thousand passengers | 43.8735 thousand | 6.55% | 47.5833 | 34.81% lower |
| Healthcare appointment registrations, daily | Extra Trees | 1,164.0775 appointments | 1,423.1947 appointments | 106.28% | 831.25 | 40.04% worse |

These per-domain holdouts are reported independently. The validation seasonal baseline also beat the selected Extra Trees model for both flights (25.20 vs. 38.11 thousand MAE) and healthcare (560.91 vs. 760.23 appointments MAE), although the flight model did better on its later holdout. The healthcare baseline wins both validation and holdout, so it is the preferred count forecast for that short series. The airline series measures completed passenger traffic in thousands rather than ticket booking transactions, is more than 65 years old, and should be treated only as an educational forecasting proxy. Neither external dataset establishes performance on this application's own customer bookings.

Saturation is assessed by checking whether holdout error flattens as chronological training data is added; as a simple diagnostic here, less than a 2% error change at the final step would indicate a possible plateau. None of the selected models meet that threshold. At the final training-size step, hotel Random Forest MAE fell 18.2%, flight Extra Trees MAE fell 50.9%, and healthcare Extra Trees MAE fell 41.0%. The curves show continued learning rather than saturation. These single-holdout diagnostics do not guarantee that more data will improve future periods or outperform a simple baseline.

## Reproduce

```powershell
./ai/download_public_hotel_data.ps1
py ai/prepare_public_hotel_data.py
py ai/prepare_data.py
py ai/train.py
```

The generated machine-readable run is `ai/artifacts/run.json` and is excluded from Git along with the raw data. The dashboard shows these metrics only after an authorized operator publishes them to the RLS-protected Supabase AI tables.
