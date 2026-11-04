$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $docPath = "c:\Users\nagac\Desktop\fraud-detection\UPI_PayGuard_Project_Report_Formatted.docx"
    $doc = $word.Documents.Open($docPath)
    
    Write-Host "Total Pages: $($doc.ComputeStatistics(2))"
    
    for ($p = 1; $p -le $doc.ComputeStatistics(2); $p++) {
        $rng = $doc.Range()
        # navigate to page
        $rng = $rng.GoTo(1, 1, $p) # wdGoToPage, wdGoToAbsolute, pageNumber
        $txt = $rng.Paragraphs.Item(1).Range.Text.Trim()
        $sec = $rng.Sections.Item(1).Index
        $pNum = $rng.Information(1) # adjusted page number
        Write-Host "Physical P$($p.ToString('00')) [Sec $sec, Num: $pNum]: $txt"
    }

    $doc.Close()
} finally {
    $word.Quit()
}
