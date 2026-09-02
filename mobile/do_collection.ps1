$adb = "C:\Users\joti.SIMPLO\AppData\Local\Android\Sdk\platform-tools\adb.exe"
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

Log-Exec "=== ETAPA 7: PROVAR PID ==="
$pidOut = & $adb shell pidof $appPkg
$basePid = $pidOut.Trim()
if ([string]::IsNullOrWhiteSpace($basePid)) {
    Log-Exec "ABORT: PID não encontrado."
    exit 1
}
Log-Exec "PID Inicial capturado: $basePid"

Log-Exec "=== ETAPA 8: BASELINE ==="
Log-Exec "Aguardando 10 segundos antes da coleta T0..."
Start-Sleep -Seconds 10

Log-Exec "=== ETAPA 9: COLETA ==="
Out-File -FilePath $logFile -InputObject "Timestamp,Amostra,DeltaSegundos,VmRSS,RssAnon,RssFile,RssShmem,VmSwap,NativeHeap,JavaHeap,Unknown,TOTAL_PSS,TOTAL_RSS,TOTAL_SWAP_PSS,Views,ViewRootImpl" -Encoding utf8

for ($i = 0; $i -le 30; $i++) {
    $delta = $i * $interval
    $ts = Get-Date -Format "HH:mm:ss"
    
    # Check PID
    $curPid = & $adb shell pidof $appPkg
    $curPid = $curPid.Trim()
    if ($curPid -ne $basePid) {
        Log-Exec "ABORT: PID mudou de $basePid para $curPid no T$delta"
        exit 1
    }
    
    $mem = & $adb shell dumpsys meminfo $appPkg
    
    $javaHeap = ""
    $nativeHeap = ""
    $unknown = ""
    $totPss = ""
    $totRss = ""
    $totSwap = ""
    $views = ""
    $viewRoot = ""
    
    foreach ($line in $mem) {
        if ($line -match 'Java Heap:\s+(\d+)') { $javaHeap = $matches[1] }
        if ($line -match 'Native Heap:\s+(\d+)') { $nativeHeap = $matches[1] }
        if ($line -match 'Unknown:\s+(\d+)') { $unknown = $matches[1] }
        if ($line -match 'TOTAL PSS:\s+(\d+)') { $totPss = $matches[1] }
        if ($line -match 'TOTAL RSS:\s+(\d+)') { $totRss = $matches[1] }
        if ($line -match 'TOTAL SWAP PSS:\s+(\d+)') { $totSwap = $matches[1] }
        if ($line -match 'Views:\s+(\d+)') { $views = $matches[1] }
        if ($line -match 'ViewRootImpl:\s+(\d+)') { $viewRoot = $matches[1] }
    }
    
    $smaps = & $adb shell run-as $appPkg cat /proc/$curPid/status
    $vmRss="0"; $rssAnon="0"; $rssFile="0"; $rssShm="0"; $vmSwap="0"
    foreach ($line in $smaps) {
        if ($line -match '^VmRSS:\s+(\d+)\s+kB') { $vmRss = $matches[1] }
        if ($line -match '^RssAnon:\s+(\d+)\s+kB') { $rssAnon = $matches[1] }
        if ($line -match '^RssFile:\s+(\d+)\s+kB') { $rssFile = $matches[1] }
        if ($line -match '^RssShmem:\s+(\d+)\s+kB') { $rssShm = $matches[1] }
        if ($line -match '^VmSwap:\s+(\d+)\s+kB') { $vmSwap = $matches[1] }
    }
    
    if (-not $javaHeap -or -not $nativeHeap -or -not $totPss) {
        Log-Exec "ABORT: Memória em branco no dumpsys no T$delta"
        exit 1
    }
    
    $csv = "$ts,T$delta,$delta,$vmRss,$rssAnon,$rssFile,$rssShm,$vmSwap,$nativeHeap,$javaHeap,$unknown,$totPss,$totRss,$totSwap,$views,$viewRoot"
    Add-Content $logFile $csv
    Log-Exec "Coletado T$delta : PSS $totPss KB"
    
    if ($i -lt 30) { Start-Sleep -Seconds $interval }
}

Log-Exec "Coleta de 31 pontos concluída com sucesso (PID $basePid mantido)."

& $adb logcat -d -s ReactNativeJS | Select-String "\[P10\]" | Out-File -FilePath $p10File -Encoding utf8
& $adb logcat -d > $logcatFile
Log-Exec "Logs P10 e Logcat geral salvos."
