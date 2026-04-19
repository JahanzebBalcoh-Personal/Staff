$lines = Get-Content index.html -Encoding UTF8

New-Item -ItemType Directory -Force -Path css
New-Item -ItemType Directory -Force -Path js

# CSS is lines 25 to 226 (Indices 24 to 225)
$lines[24..225] | Out-File css\style.css -Encoding UTF8

# JS is logic from multiple script tags
$js = $lines[18..21] + $lines[818..2206] + $lines[2210..2217]
$js | Out-File js\app.js -Encoding UTF8

# New HTML
$html = $lines[0..16] + '<link rel="stylesheet" href="css/style.css">' + $lines[227..816] + '<script src="js/app.js"></script>' + $lines[2220..2221]
$html | Out-File index.html -Encoding UTF8

Write-Output "Successfully split index.html into css/style.css and js/app.js"
