# Booking demand model: accommodation benchmark

The model uses the published Hotel Booking Demand dataset from two anonymized Portuguese hotels. It is external accommodation benchmark data, not data collected by Teabag, and does not represent live application demand.

The pipeline also supports a historical flight passenger-traffic proxy. It is not a ticket booking transaction dataset and must be evaluated separately from accommodation demand.

Use the reproducible commands in [`ai/README.md`](README.md) to rebuild the supported flight and accommodation datasets. Publishing writes aggregate values only to the protected Supabase AI tables.
