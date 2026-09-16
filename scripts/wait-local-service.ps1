param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('api', 'web')]
  [string]$Service,
  [ValidateRange(0, 120)]
  [int]$TimeoutSeconds = 0
)

$url = if ($Service -eq 'api') { 'http://127.0.0.1:3000/health' } else { 'http://127.0.0.1:5173/' }
$deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)

do {
  try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      if ($Service -eq 'api' -and ($response.Content | ConvertFrom-Json).status -eq 'ok') { exit 0 }
      if ($Service -eq 'web' -and $response.Content.Contains('<title>FORM Coach Desk</title>')) { exit 0 }
    }
  } catch {
    # The service may still be starting. The launcher reports failure after the deadline.
  }

  if ([DateTime]::UtcNow -ge $deadline) { break }
  Start-Sleep -Milliseconds 250
} while ($true)

exit 1
