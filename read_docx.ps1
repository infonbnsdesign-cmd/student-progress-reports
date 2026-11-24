Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('d:\Application\Progress Report\student progress reports application.docx')
$entry = $zip.GetEntry('word/document.xml')
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$content = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()
# extract all w:t tags
$text = [regex]::Matches($content, '<w:t[^>]*>(.*?)</w:t>') | ForEach-Object { $_.Groups[1].Value }
$text -join "`n" | Out-File -FilePath 'd:\Application\Progress Report\docx_content.txt' -Encoding utf8
