$ErrorActionPreference = "Stop"

Write-Host "Waiting for NGINX on http://localhost ..."
$ready = $false
for ($i = 1; $i -le 60; $i++) {
  try {
    $resp = Invoke-WebRequest -Uri "http://localhost" -Method Get -TimeoutSec 3
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 2
  }
}

if (-not $ready) {
  throw "NGINX did not become ready in time."
}

Write-Host "Creating a tiny PNG test file..."
$base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
$tmpPath = Join-Path $env:TEMP "it-test-image.png"
[IO.File]::WriteAllBytes($tmpPath, [Convert]::FromBase64String($base64))

Write-Host "Posting file to /upload ..."
$status = & curl.exe -s -o NUL -w "%{http_code}" -X POST "http://localhost/upload" -F "image=@$tmpPath"

Write-Host "HTTP status: $status"
if ($status -ne "200" -and $status -ne "201") {
  throw "Integration test failed. Expected 200/201, got $status"
}

Write-Host "Integration test succeeded."
