$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $docxPath = "c:\Users\nagac\Desktop\fraud-detection\UPI_PayGuard_Project_Report_Formatted.docx"
    $pdfPath = "c:\Users\nagac\Desktop\fraud-detection\A_Graph_Based_System_for_Detecting_Suspicious_Transactions_in_Financial_Networks.pdf"
    $pdfPathDesktop = "c:\Users\nagac\Desktop\A_Graph_Based_System_for_Detecting_Suspicious_Transactions_in_Financial_Networks.pdf"
    
    Write-Host "Opening $docxPath..."
    $doc = $word.Documents.Open($docxPath)
    
    Write-Host "Updating all fields (TOC, page numbers)..."
    foreach ($story in $doc.StoryRanges) {
        $story.Fields.Update()
    }
    
    Write-Host "Exporting to PDF: $pdfPath..."
    # 17 = wdExportFormatPDF
    $doc.ExportAsFixedFormat($pdfPath, 17)
    $doc.ExportAsFixedFormat($pdfPathDesktop, 17)
    
    $doc.Close()
    Write-Host "PDF Export Successful!"
} catch {
    Write-Host "Error exporting PDF: $_"
} finally {
    $word.Quit()
}
