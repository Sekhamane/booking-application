$ErrorActionPreference = 'Stop'
$sourceUrl = 'https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/data/2020/2020-02-11/hotels.csv'
$outputPath = Join-Path $PSScriptRoot 'data/hotels_public_source.csv'
Invoke-WebRequest -Uri $sourceUrl -OutFile $outputPath
Write-Output "Downloaded the anonymized Hotel Booking Demand source to $outputPath"
