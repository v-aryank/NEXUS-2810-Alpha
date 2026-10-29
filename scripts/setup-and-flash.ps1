[CmdletBinding()]
param(
    [string]$Port,
    [switch]$BuildOnly,
    [switch]$NoMonitor
)

$ErrorActionPreference = 'Stop'
$EnvironmentName = 'esp32dev'
$RootDirectory = Split-Path -Parent $PSScriptRoot
$FirmwareDirectory = Join-Path $RootDirectory 'firmware'
$VenvDirectory = Join-Path $FirmwareDirectory '.venv'
$PrivateHeader = Join-Path $FirmwareDirectory 'include/wifi_credentials.h'
$ExampleHeader = Join-Path $FirmwareDirectory 'include/wifi_credentials.example.h'

function Stop-WithError {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Invoke-Pio {
    param([string[]]$Arguments)
    Push-Location $FirmwareDirectory
    try {
        & $script:PlatformIO @Arguments
        $ExitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
    if ($ExitCode -ne 0) {
        throw "PlatformIO command failed with exit code $ExitCode."
    }
}

try {
    $LocalPio = Join-Path $VenvDirectory 'Scripts/pio.exe'
    $KnownPio = Join-Path $HOME '.platformio/penv/Scripts/platformio.exe'
    $PathPio = Get-Command pio -ErrorAction SilentlyContinue

    if (Test-Path $LocalPio) {
        $script:PlatformIO = $LocalPio
    }
    elseif (Test-Path $KnownPio) {
        $script:PlatformIO = $KnownPio
    }
    elseif ($PathPio) {
        $script:PlatformIO = $PathPio.Source
    }
    else {
        $PythonCommand = Get-Command py -ErrorAction SilentlyContinue
        if ($PythonCommand) {
            & $PythonCommand.Source -3 -m venv $VenvDirectory
        }
        else {
            $PythonCommand = Get-Command python -ErrorAction SilentlyContinue
            if (-not $PythonCommand) {
                Stop-WithError 'Python 3 is required. Install Python with the Python Launcher, then rerun.'
            }
            & $PythonCommand.Source -m venv $VenvDirectory
        }
        if ($LASTEXITCODE -ne 0) {
            Stop-WithError 'Could not create firmware/.venv. Check the Python installation and rerun.'
        }
        $VenvPython = Join-Path $VenvDirectory 'Scripts/python.exe'
        & $VenvPython -m pip install --upgrade platformio
        if ($LASTEXITCODE -ne 0) {
            Stop-WithError 'PlatformIO installation failed. Check Python, network access, and package-index availability.'
        }
        $script:PlatformIO = $LocalPio
    }

    $IniPath = Join-Path $FirmwareDirectory 'platformio.ini'
    if (-not (Test-Path $IniPath)) {
        Stop-WithError 'Missing firmware/platformio.ini.'
    }
    $IniText = Get-Content -Raw $IniPath
    $HasDefaultEnvironment = $IniText -match '(?m)^\s*default_envs\s*=\s*esp32dev\s*$'
    $InEnvironment = $false
    $HasBoard = $false
    foreach ($Line in Get-Content $IniPath) {
        if ($Line -match '^\s*\[env:esp32dev\]\s*$') {
            $InEnvironment = $true
            continue
        }
        if ($Line -match '^\s*\[') {
            $InEnvironment = $false
        }
        if ($InEnvironment -and $Line -match '^\s*board\s*=\s*esp32dev\s*(?:[;#].*)?$') {
            $HasBoard = $true
        }
    }
    $HasEnvironment = $HasBoard
    if (-not ($HasDefaultEnvironment -and $HasEnvironment)) {
        Stop-WithError 'PlatformIO target mismatch: expected default environment [env:esp32dev] with board = esp32dev.'
    }
    Write-Host "Verified PlatformIO target: $EnvironmentName (board esp32dev)"

    if (-not (Test-Path $PrivateHeader)) {
        Copy-Item -LiteralPath $ExampleHeader -Destination $PrivateHeader
        Stop-WithError 'Created the ignored local Wi-Fi credential template. Edit firmware/include/wifi_credentials.h, then rerun. Its contents are never displayed.'
    }
    $HasPlaceholder = Select-String -LiteralPath $PrivateHeader -Pattern 'replace-with-your-router' -Quiet
    if ($HasPlaceholder) {
        Stop-WithError 'The local Wi-Fi header still contains template placeholders. Edit it and rerun; its contents are never displayed.'
    }

    Write-Host "`nBuilding firmware for $EnvironmentName..."
    Invoke-Pio -Arguments @('run', '-e', $EnvironmentName)
    Write-Host 'Firmware build succeeded.'

    if ($BuildOnly) {
        Write-Host 'Build-only mode complete; no device was accessed or changed.'
        exit 0
    }

    if (-not $Port) {
        $DetectedPorts = @()
        try {
            $DetectedPorts = @(Get-CimInstance Win32_SerialPort -ErrorAction Stop | ForEach-Object { $_.DeviceID })
        }
        catch {
            Write-Host 'Automatic COM-port discovery was unavailable.'
        }

        if ($DetectedPorts.Count -eq 1) {
            $Port = $DetectedPorts[0]
        }
        elseif ($DetectedPorts.Count -gt 1) {
            Write-Host 'Detected serial ports:'
            $DetectedPorts | ForEach-Object { Write-Host "  $_" }
        }
        if (-not $Port) {
            $Port = Read-Host 'Serial port (for example COM5)'
        }
    }

    if ($Port -notmatch '^COM\d+$') {
        Stop-WithError "Invalid Windows serial port '$Port'. Supply a port such as COM5."
    }

    Write-Host "`nTarget port: $Port"
    $Confirmation = Read-Host 'Confirm the relay module AND all external loads are disconnected before upload (type YES)'
    if ($Confirmation -cne 'YES') {
        Stop-WithError 'Upload cancelled; no device was changed.'
    }

    Write-Host "Uploading firmware to $Port..."
    Invoke-Pio -Arguments @('run', '-e', $EnvironmentName, '-t', 'upload', '--upload-port', $Port)
    Write-Host 'Firmware upload succeeded. This does not verify serial startup, HTTP connectivity, or physical relay behavior.'

    if ($NoMonitor) {
        Write-Host 'Serial monitor skipped by request.'
        exit 0
    }

    $MonitorChoice = Read-Host 'Open the 115200-baud serial monitor now? (Y/n)'
    if ($MonitorChoice -notmatch '^(n|N)$') {
        Write-Host 'Monitoring at 115200 baud. Press Ctrl+C to stop; if startup lines were missed, attach the monitor before one deliberate reset with relay hardware disconnected.'
        Invoke-Pio -Arguments @('device', 'monitor', '--port', $Port, '--baud', '115200')
    }
    else {
        Write-Host 'Serial monitor skipped. Startup, HTTP, and physical relay operation remain unverified by this script.'
    }
}
catch {
    Write-Host "Setup/upload failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
