$base = 'c:\Users\Sammy\big-family'
$c1 = Get-Content "$base\CLAUDE (2).md"           -Raw -ErrorAction SilentlyContinue
$c2 = Get-Content "$base\context (1).md"          -Raw -ErrorAction SilentlyContinue
$c3 = Get-Content "$base\prompt-maestro-v2 (1).md" -Raw -ErrorAction SilentlyContinue

$ctx = "=== CLAUDE.md (convenciones, stack, rutas) ===`n$c1`n`n=== context.md (features, bugs, decisiones) ===`n$c2`n`n=== prompt-maestro-v2 (estandares de diseno) ===`n$c3"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
@{
    hookSpecificOutput = @{
        hookEventName   = 'SessionStart'
        additionalContext = $ctx
    }
} | ConvertTo-Json -Compress -Depth 3
