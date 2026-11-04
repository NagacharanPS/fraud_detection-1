$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $docPath = "c:\Users\nagac\Desktop\fraud-detection\UPI_PayGuard_Project_Report_Formatted.docx"
    $doc = $word.Documents.Open($docPath)
    
    Write-Host "Sections count: $($doc.Sections.Count)"
    $sec2 = $doc.Sections.Item(2)
    $rng2 = $sec2.Range
    
    Write-Host "`n=== SECTION 2 (MAIN BODY) SEARCH ==="
    
    $headings = @(
        "Chapter 1", "1.1 MOTIVATION", "1.2 PROBLEM STATEMENT", "1.3 SCOPE OF THE PROJECT", "1.4 RELATION TO PREVIOUS", "1.5 REPORT ORGANIZATION",
        "Chapter 2", "2.1 LITERATURE REVIEW", "2.2 IDENTIFIED RESEARCH GAP", "2.3 MAIN OBJECTIVES", "2.4 SCOPE AND BOUNDARIES",
        "Chapter 3", "3.1 PROJECT OBJECTIVES", "3.2 SYSTEM REQUIREMENTS", "3.2.1 Hardware Requirements", "3.2.2 Software Requirements", "3.3 HIGH-LEVEL SYSTEM ARCHITECTURE", "3.4 CHAPTER SUMMARY",
        "Chapter 4", "4.1 REAL-TIME FINANCIAL RISK", "4.2 GRAPH ANALYTICS", "4.3 DEEP FACIAL BIOMETRIC", "4.4 MULTI-TIER ADAPTIVE", "4.5 TEMPORAL HABITUAL", "4.6 GROUNDED EVIDENCE", "4.7 RELATIONAL DATABASE",
        "Chapter 5", "5.1 SYSTEM FLOW", "5.2 DETAILED MODULAR", "5.2.1 Multi-Tier Step-Up Security Matrix", "5.3 RELATIONAL DATABASE SCHEMA", "5.4 IMPLEMENTATION DETAILS", "5.4.1 Client-Side Reactive", "5.4.2 ML Feature Extraction", "5.4.3 Biometric Face Verification", "5.4.4 Graph Centrality", "5.4.5 Deterministic Grounded", "5.4.6 Multi-Tier Step-Up",
        "Chapter 6", "6.1 EXPERIMENTAL RESULTS", "6.2 LATENCY, NETWORK", "6.3 COMPARATIVE ANALYSIS", "6.4 KEY INSIGHTS",
        "Chapter 7", "7.1 VALIDATION WITH ALTERNATIVE", "7.2 SYSTEM TESTING METHODOLOGY", "7.3 COMPREHENSIVE TEST CASES",
        "Chapter 8", "8.1 CONCLUSION AND SUMMARY", "8.2 SCOPE FOR FUTURE WORK",
        "REFERENCES", "MAPPING WITH PROGRAM OUTCOMES", "MAPPING WITH SUSTAINABLE DEVELOPMENT GOALS",
        "Appendix A", "Appendix B", "Appendix C"
    )

    foreach ($h in $headings) {
        $find = $rng2.Duplicate.Find
        $find.Text = $h
        $find.Forward = $true
        $find.Wrap = 0
        if ($find.Execute()) {
            $adjPage = $find.Parent.Information(1) # wdActiveEndAdjustedPageNumber
            $rawPage = $find.Parent.Information(3) # wdActiveEndPageNumber
            Write-Host "$h -> Section Page: $adjPage (Physical Page: $rawPage)"
        } else {
            Write-Host "NOT FOUND: $h"
        }
    }

    Write-Host "`n=== CODE PLACEHOLDERS IN SECTION 2 ==="
    $findPlaceholders = $rng2.Duplicate.Find
    $findPlaceholders.Text = "[INSERT CODE SNAPSHOT HERE"
    $findPlaceholders.Forward = $true
    $findPlaceholders.Wrap = 0
    while ($findPlaceholders.Execute()) {
        $adjPage = $findPlaceholders.Parent.Information(1)
        $rawPage = $findPlaceholders.Parent.Information(3)
        $txt = $findPlaceholders.Parent.Text.Trim()
        Write-Host "Section Page $adjPage (Physical: $rawPage): $txt"
    }

    $doc.Close()
} finally {
    $word.Quit()
}
