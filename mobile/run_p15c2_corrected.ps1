$adb = "C:\Users\joti.SIMPLO\AppData\Local\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
    $adb = "adb"
}
$appPkg = "com.epochs.idle"
$duration = 300
$interval = 10
$logFile = "docs/project/P15-C.2-CORRECTED-RAW-MEMORY.txt"
$p10File = "docs/project/P15-C.2-CORRECTED-RAW-P10.txt"
$logcatFile = "docs/project/P15-C.2-CORRECTED-RAW-LOGCAT.txt"
$execLog = "docs/project/P15-C.2-CORRECTED-EXECUTION-LOG.md"

function Log-Exec {
    param([string]$msg)
    $ts = Get-Date -Format "HH:mm:ss"
    $line = "[$ts] $msg"
    Write-Output $line
    Add-Content $execLog "- $line"
}

Out-File -FilePath $execLog -InputObject "# P15-C.2-CORRECTED Execution Log" -Encoding utf8
Log-Exec "Iniciando PREPARAÇÃO e CLEAN STATE"

& $adb shell am force-stop $appPkg
& $adb shell pm clear $appPkg
& $adb logcat -c
Start-Sleep -Seconds 2

Log-Exec "Iniciando aplicativo..."
& $adb shell am start -n $appPkg/.MainActivity
Start-Sleep -Seconds 30

Log-Exec "Capturando screenshot pré-tap..."
& $adb shell screencap -p /sdcard/pre_tap.png
& $adb pull /sdcard/pre_tap.png docs/project/P15-C.2-CORRECTED-PRE-TAP.png | Out-Null
& $adb shell rm /sdcard/pre_tap.png

$resolution = & $adb shell wm size
Log-Exec "Resolução do AVD: $resolution"

Log-Exec "Enviando tap 'Nova Campanha' (540, 1200)..."
& $adb shell input tap 540 1200
Start-Sleep -Seconds 3

Log-Exec "Capturando screenshot pós-tap..."
& $adb shell screencap -p /sdcard/pos_tap.png
& $adb pull /sdcard/pos_tap.png docs/project/P15-C.2-CORRECTED-POS-TAP.png | Out-Null
& $adb shell rm /sdcard/pos_tap.png
Log-Exec "Verificar screenshots salvos em docs/project para garantir que o tap acionou a Nova Campanha."

Log-Exec "Aguardando GATE DE BOOT (Janela operacional [P10])..."
$bootValid = $false
$lastP10Line = ""

while (-not $bootValid) {
    $logs = & $adb logcat -d -s ReactNativeJS
    $p10Lines = $logs | Select-String "\[P10\]"
    if ($p10Lines -and $p10Lines.Count -gt 0) {
        $lastP10Line = $p10Lines[-1].Line
        # speed=30, ticks >= 25, providerUpdates >= 20, appContent >= 20, inGameShell >= 20, topHud >= 20, p14Minimal >= 20, mapHeavy=0, canvas=0
        if ($lastP10Line -match "speed=30" -and 
            $lastP10Line -match "ticks=(2[5-9]|[3-9]\d|\d{3,})" -and
            $lastP10Line -match "providerUpdates=(2[0-9]|[3-9]\d|\d{3,})" -and
            $lastP10Line -match "appContent=(2[0-9]|[3-9]\d|\d{3,})" -and
            $lastP10Line -match "inGameShell=(2[0-9]|[3-9]\d|\d{3,})" -and
            $lastP10Line -match "topHud=(2[0-9]|[3-9]\d|\d{3,})" -and
            $lastP10Line -match "p14Minimal=(2[0-9]|[3-9]\d|\d{3,})" -and
            $lastP10Line -match "mapHeavy=0" -and
            $lastP10Line -match "canvas=0") {
            
            $bootValid = $true
            Log-Exec "BOOT VALIDADO via P10: $lastP10Line"
            break
        }
    }
    Start-Sleep -Seconds 2
}

Log-Exec "Aguardando 10s pós-boot para estabilizar GC antes de capturar baseline (T0)..."
Start-Sleep -Seconds 10

$appPid = & $adb shell pidof $appPkg
$appPid = $appPid.Trim()
if (-not $appPid) {
    Log-Exec "ABORT: PID não encontrado."
    exit 1
}
Log-Exec "PID estabilizado: $appPid"

$header = "Timestamp | Amostra | DeltaSegundos | VmRSS | RssAnon | RssFile | RssShmem | VmSwap | NativeHeap | JavaHeap | Unknown | TOTAL PSS | TOTAL RSS | TOTAL SWAP PSS | Views | ViewRootImpl"
Out-File -FilePath $logFile -InputObject $header -Encoding utf8
Out-File -FilePath $p10File -InputObject "Timestamp | Amostra | Linha P10" -Encoding utf8

$startTime = Get-Date
$prevTime = $startTime

for ($i = 0; $i -le ($duration / $interval); $i++) {
    $now = Get-Date
    $deltaSegundos = [math]::Round(($now - $prevTime).TotalSeconds, 1)
    if ($i -eq 0) { $deltaSegundos = 0 }
    $prevTime = $now

    $currentPid = & $adb shell pidof $appPkg
    $currentPid = $currentPid.Trim()
    if ($currentPid -ne $appPid) {
        Log-Exec "ABORT: PID mudou de $appPid para $currentPid. Aplicação possivelmente crashou ou reiniciou."
        exit 1
    }

    $mem = & $adb shell dumpsys meminfo $appPid
    $status = & $adb shell cat /proc/$appPid/status

    $nativeMatch = $mem | Select-String "Native Heap:\s+(\d+)"
    $native = if ($nativeMatch) { $nativeMatch.Matches.Groups[1].Value } else { "" }
    
    $javaMatch = $mem | Select-String "Java Heap:\s+(\d+)"
    $javaHeap = if ($javaMatch) { $javaMatch.Matches.Groups[1].Value } else { "" }
    
    $unknownMatch = $mem | Select-String "Unknown:\s+(\d+)"
    $unknown = if ($unknownMatch) { $unknownMatch.Matches.Groups[1].Value } else { "" }
    
    $pssMatch = $mem | Select-String "TOTAL PSS:\s+(\d+)"
    $totPss = if ($pssMatch) { $pssMatch.Matches.Groups[1].Value } else { "" }
    
    $rssMatch = $mem | Select-String "TOTAL RSS:\s+(\d+)"
    $totRss = if ($rssMatch) { $rssMatch.Matches.Groups[1].Value } else { "" }
    
    $swapPssMatch = $mem | Select-String "TOTAL SWAP PSS:\s+(\d+)"
    $totSwapPss = if ($swapPssMatch) { $swapPssMatch.Matches.Groups[1].Value } else { "" }
    
    $viewsMatch = $mem | Select-String "Views:\s+(\d+)"
    $views = if ($viewsMatch) { $viewsMatch.Matches.Groups[1].Value } else { "" }
    
    $viewRootMatch = $mem | Select-String "ViewRootImpl:\s+(\d+)"
    $viewRoot = if ($viewRootMatch) { $viewRootMatch.Matches.Groups[1].Value } else { "" }

    $vmRss = if ($status -match "VmRSS:\s+(\d+)\s+kB") { $Matches[1] } else { "" }
    $rssAnon = if ($status -match "RssAnon:\s+(\d+)\s+kB") { $Matches[1] } else { "" }
    $rssFile = if ($status -match "RssFile:\s+(\d+)\s+kB") { $Matches[1] } else { "" }
    $rssShmem = if ($status -match "RssShmem:\s+(\d+)\s+kB") { $Matches[1] } else { "" }
    $vmSwap = if ($status -match "VmSwap:\s+(\d+)\s+kB") { $Matches[1] } else { "" }

    if (-not $javaHeap -or -not $native -or -not $totPss -or -not $rssAnon) {
        Log-Exec "ABORT: Coluna obrigatória vazia detectada. JavaHeap=$javaHeap Native=$native PSS=$totPss RssAnon=$rssAnon"
        exit 1
    }

    $tsStr = $now.ToString("HH:mm:ss")
    $amostra = "T" + ($i * $interval)
    $line = "$tsStr | $amostra | $deltaSegundos | $vmRss | $rssAnon | $rssFile | $rssShmem | $vmSwap | $native | $javaHeap | $unknown | $totPss | $totRss | $totSwapPss | $views | $viewRoot"
    
    Write-Output $line
    Add-Content $logFile $line
    
    if ($i -lt ($duration / $interval)) {
        Start-Sleep -Seconds $interval
    }
}
Log-Exec "Coleta finalizada. Salvando raw logcat..."
& $adb logcat -d > $logcatFile

& $adb logcat -d -s ReactNativeJS | Select-String "\[P10\]" | ForEach-Object { $_.Line } > $p10File

Log-Exec "SCRIPT CONCLUIDO COM SUCESSO."
