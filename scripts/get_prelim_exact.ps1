$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open('c:\Users\nagac\Desktop\fraud-detection\UPI_PayGuard_Project_Report_Formatted.docx')
    $targets = @('CERTIFICATE', 'DECLARATION', 'PLAGIARISM AND AI VERIFICATION REPORT', 'ACKNOWLEDGEMENTS', 'ABSTRACT', 'TABLE OF CONTENTS', 'LIST OF FIGURES', 'LIST OF TABLES', 'LIST OF ABBREVIATIONS')
    foreach ($p in $doc.Paragraphs) {
        $t = $p.Range.Text.Trim()
        if ($targets -contains $t) {
            $num = $p.Range.Information(1)
            $raw = $p.Range.Information(3)
            Write-Host "$t -> Roman $num (Physical $raw)"
        }
    }
    $doc.Close()
} finally {
    $word.Quit()
}
