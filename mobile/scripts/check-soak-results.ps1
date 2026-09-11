$logFile = "soak-test-results.csv"
if (-not (Test-Path $logFile)) {
    Write-Host "Log file $logFile not found."
    exit
}

$data = Import-Csv $logFile
$samples = $data | Where-Object { $_.Action -eq "SAMPLE" }
$restarts = $data | Where-Object { $_.Action -eq "PROCESS_RESTART" }

Write-Host "=== P15 Soak Test Results ==="
Write-Host "Total Samples: $($samples.Count)"
Write-Host "Process Restarts: $($restarts.Count)"
if ($restarts.Count -gt 0) {
    $restarts | ForEach-Object { Write-Host " - At $($_.Timestamp): $($_.Hermes_Stats)" }
}

if ($samples.Count -ge 2) {
    $first = $samples[0]
    $last = $samples[-1]
    
    Write-Host "
[SMAPS Hades Heap]"
    Write-Host "Initial: $($first.Hades_MB) MB"
    Write-Host "Final:   $($last.Hades_MB) MB"
    
    try {
        $hInitial = (ConvertFrom-Json $first.Hermes_Stats).GC_Heap_Size / 1024 / 1024
        $hFinal = (ConvertFrom-Json $last.Hermes_Stats).GC_Heap_Size / 1024 / 1024
        Write-Host "
[HermesInternal GC_Heap_Size]"
        Write-Host "Initial: $([math]::Round($hInitial, 2)) MB"
        Write-Host "Final:   $([math]::Round($hFinal, 2)) MB"
        
        Write-Host "
[Correlation Table (First Sample)]"
        Write-Host "smaps Hades: $($first.Hades_MB) MB  <-->  Hermes GC_Heap_Size: $([math]::Round($hInitial, 2)) MB"
    } catch {
        Write-Host "
Could not parse Hermes_Stats JSON."
    }
}
