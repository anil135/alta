param(
    [string]$OutputFile = "..\S3-Retrieval-Portal.zip"
)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$outputPath = Resolve-Path (Join-Path $projectRoot $OutputFile) -ErrorAction SilentlyContinue

if ($outputPath) {
    Remove-Item $outputPath.Path -Force
}

$target = Join-Path $projectRoot $OutputFile
Compress-Archive -Path (Join-Path $projectRoot "*") -DestinationPath $target -Force

Write-Host "Package created:" $target
