# Git Contribution Analysis Script (Fixed Version)
# Run this from the root of your repo

param(
    [string]$author = "mystico53", # Your GitHub username
    [string]$since = "2025-02-07", # Start date (adjust as needed)
    [string]$until = "2025-03-02", # End date (adjust as needed)
    [string]$outputDir = ".\contribution_analysis"  # Output directory
)

# Create output directory if it doesn't exist
if (!(Test-Path -Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# 1. Generate basic file edit stats by date (filename, edit date)
Write-Host "Generating file edit history..." -ForegroundColor Cyan
git log --author=$author --name-only --date=short --pretty=format:"%ad" `
    --since=$since --until=$until | Where-Object { $_ -ne "" } | ForEach-Object {
    if ($_ -match "\d{4}-\d{2}-\d{2}") {
        $script:date = $_
    }
    else {
        "$_,$script:date"
    }
} | Sort-Object -Unique | Out-File -FilePath "$outputDir\file_edit_history.csv"

# 2. Get all commits by the author in the date range
Write-Host "Getting commits..." -ForegroundColor Cyan
$commits = git log --author=$author --pretty=format:"%H|%ad|%s" --date=short --since=$since --until=$until |
ForEach-Object {
    $parts = $_ -split "\|", 3
    if ($parts.Count -eq 3) {
        [PSCustomObject]@{
            CommitHash = $parts[0]
            Date       = $parts[1]
            Message    = $parts[2]
        }
    }
}

# Save commit messages
$commits | Export-Csv -Path "$outputDir\commit_messages.csv" -NoTypeInformation

# 3. Generate file statistics for each commit in a more reliable way
Write-Host "Analyzing contribution metrics per file..." -ForegroundColor Cyan
$contributionStats = @()

foreach ($commit in $commits) {
    # Get stats for this commit
    $stats = git show --numstat --format='' $commit.CommitHash
    
    foreach ($stat in $stats) {
        if ($stat -match "^(\d+)\s+(\d+)\s+(.+)$") {
            $added = [int]$matches[1]
            $deleted = [int]$matches[2]
            $filename = $matches[3]
            
            # Skip binary files which show as "-" in git numstat
            if ($added -ne "-" -and $deleted -ne "-") {
                $contributionStats += [PSCustomObject]@{
                    Filename      = $filename
                    Date          = $commit.Date
                    LinesAdded    = $added
                    LinesDeleted  = $deleted
                    TotalChanges  = $added + $deleted
                    CommitHash    = $commit.CommitHash
                    CommitMessage = $commit.Message
                }
            }
        }
    }
}

$contributionStats | Export-Csv -Path "$outputDir\contribution_metrics.csv" -NoTypeInformation

# 4. Group metrics by directory to show focus areas
$directoryStats = $contributionStats | ForEach-Object {
    $parts = $_.Filename.Split('/')
    $path = ""
    
    # Process file type
    $fileExtension = if ($_.Filename -match '\.([^\.]+)$') { $matches[1] } else { "none" }
    
    # Process directory path (up to 3 levels)
    for ($i = 0; $i -lt [Math]::Min(3, $parts.Count - 1); $i++) {
        if ($i -eq 0) {
            $path = $parts[$i]
        }
        else {
            $path += "/$($parts[$i])"
        }
        
        [PSCustomObject]@{
            Directory    = $path
            FileType     = $fileExtension
            LinesAdded   = $_.LinesAdded
            LinesDeleted = $_.LinesDeleted
            TotalChanges = $_.TotalChanges
            Date         = $_.Date
        }
    }
}

# 5. Directory focus analysis
$directoryFocus = $directoryStats | Group-Object Directory | 
Select-Object @{N = "Directory"; E = { $_.Name } }, 
@{N = "FileCount"; E = { $_.Count } },
@{N = "TotalLinesAdded"; E = { ($_.Group | Measure-Object LinesAdded -Sum).Sum } },
@{N = "TotalLinesDeleted"; E = { ($_.Group | Measure-Object LinesDeleted -Sum).Sum } },
@{N = "TotalChanges"; E = { ($_.Group | Measure-Object TotalChanges -Sum).Sum } } |
Sort-Object -Property TotalChanges -Descending

$directoryFocus | Export-Csv -Path "$outputDir\directory_focus.csv" -NoTypeInformation

# 6. Technology breakdown by file extension
$techBreakdown = $directoryStats | Group-Object FileType | 
Select-Object @{N = "FileType"; E = { $_.Name } }, 
@{N = "FileCount"; E = { $_.Count } },
@{N = "TotalLinesAdded"; E = { ($_.Group | Measure-Object LinesAdded -Sum).Sum } },
@{N = "TotalLinesDeleted"; E = { ($_.Group | Measure-Object LinesDeleted -Sum).Sum } },
@{N = "TotalChanges"; E = { ($_.Group | Measure-Object TotalChanges -Sum).Sum } } |
Sort-Object -Property TotalChanges -Descending

$techBreakdown | Export-Csv -Path "$outputDir\technology_breakdown.csv" -NoTypeInformation

# 7. Daily activity stats
$dailyActivity = $contributionStats | Group-Object Date | 
Select-Object @{N = "Date"; E = { $_.Name } }, 
@{N = "FilesChanged"; E = { $_.Group.Filename | Select-Object -Unique | Measure-Object | Select-Object -ExpandProperty Count } },
@{N = "LinesAdded"; E = { ($_.Group | Measure-Object LinesAdded -Sum).Sum } },
@{N = "LinesDeleted"; E = { ($_.Group | Measure-Object LinesDeleted -Sum).Sum } },
@{N = "TotalChanges"; E = { ($_.Group | Measure-Object TotalChanges -Sum).Sum } } |
Sort-Object -Property Date

$dailyActivity | Export-Csv -Path "$outputDir\daily_activity.csv" -NoTypeInformation

# 8. Component-specific analysis (for React projects)
$componentAnalysis = $contributionStats | Where-Object { 
    $_.Filename -like "*component*" -or 
    $_.Filename -like "*.tsx" -or 
    $_.Filename -like "*.jsx" 
} | ForEach-Object {
    $filename = $_.Filename
    $componentName = "Unknown"
    
    # Extract component name with various patterns
    if ($filename -match "/([^/]+)\.tsx$") {
        $componentName = $matches[1]
    }
    elseif ($filename -match "/components/([^/]+)/") {
        $componentName = $matches[1]
    }
    
    [PSCustomObject]@{
        Component    = $componentName
        Filename     = $filename
        LinesAdded   = $_.LinesAdded
        LinesDeleted = $_.LinesDeleted
        TotalChanges = $_.TotalChanges
        Date         = $_.Date
    }
}

$componentSummary = $componentAnalysis | Group-Object Component | 
Select-Object @{N = "Component"; E = { $_.Name } }, 
@{N = "FileCount"; E = { $_.Group.Filename | Select-Object -Unique | Measure-Object | Select-Object -ExpandProperty Count } },
@{N = "TotalChanges"; E = { ($_.Group | Measure-Object TotalChanges -Sum).Sum } } |
Sort-Object -Property TotalChanges -Descending

$componentSummary | Export-Csv -Path "$outputDir\component_analysis.csv" -NoTypeInformation

# 9. Summarize all contributions 
$summary = [PSCustomObject]@{
    TotalUniqueFiles  = ($contributionStats.Filename | Select-Object -Unique).Count
    TotalLinesAdded   = ($contributionStats | Measure-Object LinesAdded -Sum).Sum
    TotalLinesDeleted = ($contributionStats | Measure-Object LinesDeleted -Sum).Sum
    TotalChanges      = ($contributionStats | Measure-Object TotalChanges -Sum).Sum
    TotalCommits      = ($commits | Measure-Object).Count
    DateRange         = "$since to $until"
    TopFocusAreas     = ($directoryFocus | Select-Object -First 5 | ForEach-Object { "$($_.Directory) ($($_.TotalChanges) changes)" }) -join ", "
    MainTechnologies  = ($techBreakdown | Select-Object -First 5 | ForEach-Object { "$($_.FileType) ($($_.TotalChanges) changes)" }) -join ", "
}

$summary | ConvertTo-Json | Out-File -FilePath "$outputDir\contribution_summary.json"

# Generate a simple README with all the data
$readmeContent = @"
# Contribution Analysis for $author

## Summary
- Time period: $since to $until
- Total unique files modified: $($summary.TotalUniqueFiles)
- Total lines added: $($summary.TotalLinesAdded)
- Total lines deleted: $($summary.TotalLinesDeleted)
- Total changes: $($summary.TotalChanges)
- Total commits: $($summary.TotalCommits)

## Top Focus Areas
$($directoryFocus | Select-Object -First 5 | ForEach-Object { "- $($_.Directory): $($_.TotalChanges) changes ($($_.TotalLinesAdded) lines added, $($_.TotalLinesDeleted) lines deleted)" } | Out-String)

## Technology Breakdown
$($techBreakdown | Select-Object -First 5 | ForEach-Object { "- $($_.FileType): $($_.FileCount) files, $($_.TotalChanges) changes" } | Out-String)

## Key Components Modified
$($componentSummary | Select-Object -First 5 | ForEach-Object { "- $($_.Component): $($_.FileCount) files, $($_.TotalChanges) changes" } | Out-String)

## Daily Activity
$($dailyActivity | ForEach-Object { "- $($_.Date): $($_.FilesChanged) files changed, $($_.TotalChanges) total changes" } | Out-String)

Generated on $(Get-Date -Format "yyyy-MM-dd")
"@

$readmeContent | Out-File -FilePath "$outputDir\README.md"

Write-Host "Analysis complete!" -ForegroundColor Green
Write-Host "Results saved to: $outputDir" -ForegroundColor Yellow
Write-Host "Files generated:" -ForegroundColor Yellow
Get-ChildItem -Path $outputDir | ForEach-Object { Write-Host "- $($_.Name)" }