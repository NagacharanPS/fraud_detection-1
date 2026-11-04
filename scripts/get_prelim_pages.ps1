$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $docPath = "c:\Users\nagac\Desktop\fraud-detection\UPI_PayGuard_Project_Report_Formatted.docx"
    $doc = $word.Documents.Open($docPath)
    $sec1 = $doc.Sections.Item(1)
    $rng1 = $sec1.Range

    Write-Host "`n=== PRELIMINARY PAGES PAGINATION ==="
    $prelims = @(
        "CERTIFICATE", "DECLARATION", "PLAGIARISM AND AI VERIFICATION REPORT",
        "ACKNOWLEDGEMENTS", "ABSTRACT", "TABLE OF CONTENTS", "LIST OF FIGURES",
        "LIST OF TABLES", "LIST OF ABBREVIATIONS"
    )
    foreach ($pr in $prelims) {
        $find = $rng1.Duplicate.Find
        $find.Text = $pr
        $find.Forward = $true
        $find.Wrap = 0
        if ($find.Execute()) {
            $p = $find.Parent.Information(1)
            Write-Host "$pr -> Roman Page $p"
        }
    }

    $doc.Close()
} finally {
    $word.Quit()
}
