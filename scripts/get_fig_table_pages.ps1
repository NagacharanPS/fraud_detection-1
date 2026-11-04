$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $docPath = "c:\Users\nagac\Desktop\fraud-detection\UPI_PayGuard_Project_Report_Formatted.docx"
    $doc = $word.Documents.Open($docPath)
    $sec3 = $doc.Sections.Item(3)
    $rng2 = $sec3.Range

    Write-Host "`n=== FIGURES PAGINATION ==="
    $all_figs = @(
        "Figure 3.1", "Figure 3.2", "Figure 4.1", "Figure 5.1", "Figure 5.2",
        "Figure 5.3", "Figure 5.4", "Figure 5.5", "Figure 5.6", "Figure 5.7",
        "Figure 6.1", "Figure 6.2", "Figure 6.3", "Figure 6.4", "Figure 6.5",
        "Figure 6.6", "Figure 6.7"
    )
    foreach ($fg in $all_figs) {
        $find = $rng2.Duplicate.Find
        $find.Text = $fg
        $find.Forward = $true
        $find.Wrap = 0
        if ($find.Execute()) {
            $p = $find.Parent.Information(1)
            Write-Host "$fg -> Page $p"
        } else {
            Write-Host "$fg -> NOT FOUND"
        }
    }

    Write-Host "`n=== TABLES PAGINATION ==="
    $tbls = @(
        "Table 3.1", "Table 3.2", "Table 4.1", "Table 5.1", "Table 5.2",
        "Table 6.1", "Table 6.2", "Table 6.3", "Table 7.1", "Table 7.2",
        "Table 7.3", "Table 9.1", "Table 10.1"
    )
    foreach ($tb in $tbls) {
        $find = $rng2.Duplicate.Find
        $find.Text = $tb
        $find.Forward = $true
        $find.Wrap = 0
        if ($find.Execute()) {
            $p = $find.Parent.Information(1)
            Write-Host "$tb -> Page $p"
        } else {
            Write-Host "$tb -> NOT FOUND"
        }
    }

    Write-Host "`n=== CHAPTERS PAGINATION ==="
    $chaps = @(
        "Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4",
        "Chapter 5", "Chapter 6", "Chapter 7", "Chapter 8",
        "REFERENCES", "MAPPING WITH PROGRAM OUTCOMES",
        "MAPPING WITH SUSTAINABLE DEVELOPMENT GOALS",
        "Appendix A:", "Appendix B:", "Appendix C:"
    )
    foreach ($ch in $chaps) {
        $find = $rng2.Duplicate.Find
        $find.Text = $ch
        $find.Forward = $true
        $find.Wrap = 0
        if ($find.Execute()) {
            $p = $find.Parent.Information(1)
            Write-Host "$ch -> Page $p"
        } else {
            Write-Host "$ch -> NOT FOUND"
        }
    }

    $doc.Close()
} finally {
    $word.Quit()
}
