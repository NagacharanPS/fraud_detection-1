try {
    $word = New-Object -ComObject Word.Application
    Write-Host "Word COM found"
    $word.Quit()
} catch {
    Write-Host "Word COM not found: $_"
}
