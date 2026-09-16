param(
    [int]$DurationMinutes = 180
)

$adbPath = "adb"
if (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe") {
    $adbPath = "$env:ANDROID_HOME\platform-tools\adb.exe"
}

$logFile = "soak-test-results.csv"
Write-Host "Starting Soak Test for $DurationMinutes minutes. Log: $logFile"
"Timestamp,PID,Action,Hades_MB,Dalvik_MB,Hermes_Stats" | Out-File $logFile -Encoding utf8

$endTime = (Get-Date).AddMinutes($DurationMinutes)
$lastPid = ""
$cycleCount = 1

while ((Get-Date) -lt $endTime) {
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    
    # 1. Get current PID
    $pidOutput = & "`$adbPath" shell pidof com.epochs.idle
    $currentPid = $pidOutput.Trim()
    
    if (-not $currentPid) {
        Write-Host "$timestamp - App not running. Attempting to start..."
        & "`$adbPath" shell am start -n com.epochs.idle/.MainActivity | Out-Null
        Start-Sleep -Seconds 10
        continue
    }

    # Detect process restart
    if ($lastPid -ne "" -and $currentPid -ne $lastPid) {
        Write-Host "$timestamp - PROCESS_RESTART detected (Old: $lastPid, New: $currentPid)"
        "$timestamp,$currentPid,PROCESS_RESTART,,,"Process changed from $lastPid to $currentPid"" | Out-File $logFile -Append -Encoding utf8
    }
    $lastPid = $currentPid

    # 2. Get smaps
    $smapsOutput = & "`$adbPath" shell "run-as com.epochs.idle cat /proc/$currentPid/smaps" 2>
    $hadesMb = 0
    $dalvikMb = 0
    
    if ($smapsOutput) {
        $lines = $smapsOutput -split "
"
        $currBlock = ""
        $currAnon = 0
        foreach ($line in $lines) {
            if ($line -match "^[0-9a-f]+-[0-9a-f]+") {
                if ($currBlock -match "hades-segment") { $hadesMb += $currAnon }
                if ($currBlock -match "dalvik") { $dalvikMb += $currAnon }
                $currBlock = $line
                $currAnon = 0
            } elseif ($line -match "^Anonymous:\s+(\d+)") {
                $currAnon = [int]$matches[1]
            }
        }
        if ($currBlock -match "hades-segment") { $hadesMb += $currAnon }
        if ($currBlock -match "dalvik") { $dalvikMb += $currAnon }
        
        $hadesMb = [math]::Round($hadesMb / 1024, 2)
        $dalvikMb = [math]::Round($dalvikMb / 1024, 2)
    }

    # 3. Get Hermes stats from logcat
    $hermesStats = ""
    $logcatLine = & "`$adbPath" logcat -d | Select-String "\[SOAK_HERMES_STATS\]" | Select-Object -Last 1
    if ($logcatLine) {
        $hermesStats = $logcatLine.ToString() -replace ".*\[SOAK_HERMES_STATS\] ", ""
    }
    
    # Write to CSV
    Write-Host "$timestamp - PID: $currentPid | Hades: $hadesMb MB | Dalvik: $dalvikMb MB"
    "$timestamp,$currentPid,SAMPLE,$hadesMb,$dalvikMb,"$hermesStats"" | Out-File $logFile -Append -Encoding utf8

    # 4. Occasional background cycle (every ~30 mins)
    if ($cycleCount % 30 -eq 0) {
        Write-Host "Triggering background/foreground cycle..."
        "$timestamp,$currentPid,BACKGROUND_CYCLE,,," | Out-File $logFile -Append -Encoding utf8
        & "`$adbPath" shell input keyevent 3 # Home
        Start-Sleep -Seconds 5
        & "`$adbPath" shell am start -n com.epochs.idle/.MainActivity | Out-Null
    }

    $cycleCount++
    Start-Sleep -Seconds 60
}

Write-Host "Soak test complete!"

