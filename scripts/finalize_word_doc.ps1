$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $paths = @(
        "c:\Users\nagac\Desktop\fraud-detection\A_Graph_Based_System_for_Detecting_Suspicious_Transactions_in_Financial_Networks.docx",
        "c:\Users\nagac\Desktop\A_Graph_Based_System_for_Detecting_Suspicious_Transactions_in_Financial_Networks.docx",
        "c:\Users\nagac\Desktop\fraud-detection\UPI_PayGuard_Project_Report_Formatted.docx",
        "c:\Users\nagac\Desktop\UPI_PayGuard_Project_Report_Formatted.docx"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) {
            $doc = $word.Documents.Open($p)
            foreach ($story in $doc.StoryRanges) {
                $story.Fields.Update()
            }
            $doc.Save()
            $doc.Close()
            Write-Host "Updated and saved: $p"
        }
    }
} finally {
    $word.Quit()
}
