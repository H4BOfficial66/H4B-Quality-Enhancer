# H4B Quality Enhancer - SEO Step 4: Homepage metadata
# Run this script from the project root folder.

$ErrorActionPreference = "Stop"

$canonicalUrl = "https://h4-b-quality-enhancer.vercel.app/"
$pageTitle = "TikTok Video Upload Optimizer | H4B Quality Enhancer"
$pageDescription = "Prepare MP4 and MOV videos for TikTok uploads with H4B Quality Enhancer. Process supported files locally in your browser without uploading videos to H4B servers."
$ogImage = "https://h4-b-quality-enhancer.vercel.app/assets/logo.png"

function Set-HeadTag {
    param(
        [string]$Html,
        [string]$Pattern,
        [string]$Replacement
    )

    $regex = [regex]::new($Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    if ($regex.IsMatch($Html)) {
        return $regex.Replace($Html, $Replacement, 1)
    }

    if ($Html -notmatch "</head>") {
        throw "Could not find </head> while inserting a missing metadata tag."
    }

    return $Html.Replace("</head>", "$Replacement`r`n</head>")
}

$schema = @'
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "H4B Quality Enhancer",
  "url": "https://h4-b-quality-enhancer.vercel.app/",
  "operatingSystem": "Any device with a modern web browser",
  "applicationCategory": "MultimediaApplication",
  "description": "Prepare supported MP4 and MOV videos locally in the browser before TikTok uploads. Video files are processed on the user's device and are not uploaded to H4B servers.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
</script>
'@

$files = @(
    "index.html",
    "public/index.html"
)

foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
        throw "Required file not found: $file. Run this script from the repository root."
    }

    $html = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $file))

    if ($html -notmatch "<title>[\s\S]*?</title>") {
        throw "No <title> tag found in $file."
    }

    $html = [regex]::Replace(
        $html,
        "<title>[\s\S]*?</title>",
        "<title>$pageTitle</title>",
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )

    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bname=["'']description["''])[^>]*>' "<meta name=`"description`" content=`"$pageDescription`" />"
    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bname=["'']robots["''])[^>]*>' '<meta name="robots" content="index,follow,max-image-preview:large" />'
    $html = Set-HeadTag $html '<link\b(?=[^>]*\brel=["'']canonical["''])[^>]*>' "<link rel=`"canonical`" href=`"$canonicalUrl`" />"

    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bproperty=["'']og:title["''])[^>]*>' "<meta property=`"og:title`" content=`"$pageTitle`" />"
    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bproperty=["'']og:description["''])[^>]*>' "<meta property=`"og:description`" content=`"$pageDescription`" />"
    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bproperty=["'']og:url["''])[^>]*>' "<meta property=`"og:url`" content=`"$canonicalUrl`" />"
    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bproperty=["'']og:site_name["''])[^>]*>' '<meta property="og:site_name" content="H4B Quality Enhancer" />'
    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bproperty=["'']og:type["''])[^>]*>' '<meta property="og:type" content="website" />'
    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bproperty=["'']og:image["''])[^>]*>' "<meta property=`"og:image`" content=`"$ogImage`" />"
    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bproperty=["'']og:image:alt["''])[^>]*>' '<meta property="og:image:alt" content="H4B Quality Enhancer logo" />'
    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bproperty=["'']og:locale["''])[^>]*>' '<meta property="og:locale" content="en_US" />'

    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bname=["'']twitter:card["''])[^>]*>' '<meta name="twitter:card" content="summary" />'
    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bname=["'']twitter:title["''])[^>]*>' "<meta name=`"twitter:title`" content=`"$pageTitle`" />"
    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bname=["'']twitter:description["''])[^>]*>' "<meta name=`"twitter:description`" content=`"$pageDescription`" />"
    $html = Set-HeadTag $html '<meta\b(?=[^>]*\bname=["'']twitter:image["''])[^>]*>' "<meta name=`"twitter:image`" content=`"$ogImage`" />"

    # Remove the obsolete meta keywords tag. Google does not use it for ranking.
    $html = [regex]::Replace(
        $html,
        '<meta\b(?=[^>]*\bname=["'']keywords["''])[^>]*>\s*',
        '',
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )

    # Replace the existing structured data block, including its unverified aggregate rating.
    $jsonLdPattern = '<script\s+type=["'']application/ld\+json["'']>[\s\S]*?</script>'
    if ([regex]::IsMatch($html, $jsonLdPattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
        $html = [regex]::Replace(
            $html,
            $jsonLdPattern,
            $schema,
            [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
    } else {
        $html = $html.Replace("</head>", "$schema`r`n</head>")
    }

    # Save with UTF-8 BOM to preserve the current HTML file encoding.
    $encoding = [System.Text.UTF8Encoding]::new($true)
    [System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $file), $html, $encoding)

    Write-Host "Updated: $file" -ForegroundColor Green
}

Write-Host ""
Write-Host "SEO Step 4 homepage metadata updated in both HTML copies." -ForegroundColor Green
Write-Host "Review with: git diff -- index.html public/index.html"
