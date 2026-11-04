$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $docPath = "c:\Users\nagac\Desktop\fraud-detection\UPI_PayGuard_Project_Report_Formatted.docx"
    $doc = $word.Documents.Open($docPath)
    
    # Update all fields in document, headers, footers
    foreach ($story in $doc.StoryRanges) {
        $story.Fields.Update()
    }
    
    # Save after updating fields
    $doc.Save()
    
    $pageCount = $doc.ComputeStatistics(2) # 2 = wdStatisticPages
    Write-Host "Total Page Count in Word: $pageCount"
    
    # Find page numbers of code placeholders
    Write-Host "`n--- Code Placeholder Page Numbers ---"
    $find = $doc.Content.Find
    $find.Text = "[INSERT CODE SNAPSHOT HERE"
    $find.Forward = $true
    $find.Wrap = 0 # wdFindStop
    
    while ($find.Execute()) {
        $rng = $doc.Content
        # find in selection or range
        $pageNumber = $find.Parent.Information(3) # 3 = wdActiveEndPageNumber
        $foundText = $find.Parent.Text.Trim()
        Write-Host "Page $pageNumber : $foundText"
    }

    # Find page numbers of major sections
    Write-Host "`n--- Heading Page Numbers ---"
    $headings = @(
        "Chapter 1", "1.1 MOTIVATION", "1.2 PROBLEM STATEMENT", "1.3 SCOPE OF THE PROJECT",
        "Chapter 2", "2.1 LITERATURE REVIEW", "2.2 IDENTIFIED RESEARCH GAP", "2.3 MAIN OBJECTIVES",
        "Chapter 3", "3.1 PROJECT OBJECTIVES", "3.2 SYSTEM REQUIREMENTS", "3.3 HIGH-LEVEL",
        "Chapter 4", "4.1 REAL-TIME", "4.2 GRAPH ANALYTICS", "4.3 DEEP FACIAL", "4.4 MULTI-TIER", "4.5 TEMPORAL", "4.6 GROUNDED", "4.7 RELATIONAL",
        "Chapter 5", "5.1 SYSTEM FLOW", "5.2 DETAILED MODULAR", "5.3 RELATIONAL DATABASE", "5.4 IMPLEMENTATION DETAILS",
        "Chapter 6", "6.1 EXPERIMENTAL RESULTS", "6.2 LATENCY", "6.3 COMPARATIVE ANALYSIS", "6.4 KEY INSIGHTS",
        "Chapter 7", "7.1 VALIDATION", "7.2 SYSTEM TESTING", "7.3 COMPREHENSIVE TEST",
        "Chapter 8", "8.1 CONCLUSION", "8.2 SCOPE FOR FUTURE",
        "REFERENCES", "MAPPING WITH PROGRAM OUTCOMES", "MAPPING WITH SUSTAINABLE",
        "Appendix A", "Appendix B", "Appendix C"
    )

    foreach ($h in $headings) {
        $f = $doc.Content.Find
        $f.Text = $h
        $f.Forward = $true
        $f.Wrap = 0
        if ($f.Execute()) {
            $pNum = $f.Parent.Information(3)
            Write-Host "$h -> Page $pNum"
        }
    }

    $doc.Close()
} finally {
    $word.Quit()
}
