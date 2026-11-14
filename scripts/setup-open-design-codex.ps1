# Project helper: inspect official OpenDesign Codex integration.
# Default read-only. -InstallPlugin changes the user's Codex profile.
[CmdletBinding()]
param([switch]$InstallPlugin)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Codex {
    param([string[]]$Parts)
    Write-Host ("codex " + ($Parts -join " "))
    & codex @Parts
    if ($LASTEXITCODE -ne 0) { throw "Codex command failed: exit $LASTEXITCODE" }
}

$codexCommand = Get-Command codex -ErrorAction SilentlyContinue
if (-not $codexCommand) { throw "Codex CLI not found on PATH. No changes performed." }
Write-Host "Codex binary: $($codexCommand.Source)"

if ($InstallPlugin) {
    Write-Host "Install official OpenDesign Codex plugin into the current user profile."
    Invoke-Codex -Parts @("plugin", "marketplace", "add", "nexu-io/open-design-agent-plugins", "--ref", "main", "--json")
    Invoke-Codex -Parts @("plugin", "add", "open-design@open-design", "--json")
}

Write-Host "Installed Codex plugins:"
Invoke-Codex -Parts @("plugin", "list", "--json")
Write-Host "OpenDesign local MCP registration (managed separately):"
& codex mcp get open-design --json
if ($LASTEXITCODE -ne 0) {
    Write-Warning "OpenDesign MCP missing. Install the signed OpenDesign app, then register local MCP via Settings > MCP server or its official od mcp install codex."
}
Write-Host "Project-design skill is in Git. Host installation must be checked separately."
