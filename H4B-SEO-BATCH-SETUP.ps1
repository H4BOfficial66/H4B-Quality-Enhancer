<#
H4B Quality Enhancer - SEO batch setup
Run from the repository root in PowerShell:
  powershell -ExecutionPolicy Bypass -File .\H4B-SEO-BATCH-SETUP.ps1

The script backs up files first, updates the deployed public/ copy, mirrors changed HTML
into the repository root, creates robots.txt + sitemap.xml in both locations, and adds
one original export-settings guide. It does not submit URLs to Google or promise rankings.
#>

$ErrorActionPreference = 'Stop'
$Site = 'https://h4-b-quality-enhancer.vercel.app'
$Root = (Get-Location).Path
$Public = Join-Path $Root 'public'

if (-not (Test-Path (Join-Path $Public 'index.html'))) {
    throw 'public/index.html not found. Open the H4B-Quality-Enhancer repository root before running this script.'
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$Backup = Join-Path $env:TEMP "H4B-SEO-Backup-$timestamp"
New-Item -ItemType Directory -Path $Backup -Force | Out-Null

$filesToBackup = @(
    'index.html','method.html','tutorial.html','old-method.html','stats.html','contact.html',
    'robots.txt','sitemap.xml','guides/tiktok-video-export-settings.html'
)
foreach ($file in $filesToBackup) {
    foreach ($base in @($Root, $Public)) {
        $source = Join-Path $base $file
        if (Test-Path $source) {
            $target = Join-Path (Join-Path $Backup ($(if ($base -eq $Public) {'public'} else {'root'}))) $file
            $targetDir = Split-Path $target -Parent
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            Copy-Item -LiteralPath $source -Destination $target -Force
        }
    }
}

function Replace-First {
    param(
        [string]$Text,
        [string]$Pattern,
        [string]$Replacement,
        [string]$Label
    )
    $rx = [regex]::new($Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if (-not $rx.IsMatch($Text)) {
        Write-Warning "Could not find expected content for: $Label. This replacement was skipped."
        return $Text
    }
    return $rx.Replace($Text, $Replacement, 1)
}

function Build-Schema {
    param($Page)
    if ($Page.File -eq 'index.html') {
        $schema = [ordered]@{
            '@context' = 'https://schema.org'
            '@type' = 'WebSite'
            'name' = 'H4B Quality Enhancer'
            'url' = "$Site/"
            'description' = $Page.Description
        }
    } else {
        $schema = [ordered]@{
            '@context' = 'https://schema.org'
            '@type' = 'WebPage'
            'name' = $Page.Title
            'description' = $Page.Description
            'url' = $Page.Canonical
            'isPartOf' = [ordered]@{
                '@type' = 'WebSite'
                'name' = 'H4B Quality Enhancer'
                'url' = "$Site/"
            }
        }
    }
    return ($schema | ConvertTo-Json -Depth 8 -Compress)
}

$pages = @(
    [pscustomobject]@{
        File='index.html'; Title='Free TikTok Video Upload Tool | H4B Quality Enhancer'
        Description='Prepare MP4 and MOV videos for TikTok uploads with H4B Quality Enhancer. Process supported files locally in your browser without uploading videos to H4B servers.'
        Canonical="$Site/"; Robots='index,follow,max-image-preview:large'
    },
    [pscustomobject]@{
        File='method.html'; Title='MP4 Video Container Optimizer | H4B Quality Enhancer'
        Description='Use H4B to process supported MP4 and MOV video containers in your browser before uploading. Your selected video is processed on your device.'
        Canonical="$Site/method.html"; Robots='index,follow,max-image-preview:large'
    },
    [pscustomobject]@{
        File='tutorial.html'; Title='TikTok Video Export Settings and Tutorial | H4B'
        Description='Learn how to prepare vertical videos for TikTok, preserve the source frame rate, choose compatible MP4 settings, and use the H4B browser workflow.'
        Canonical="$Site/tutorial.html"; Robots='index,follow,max-image-preview:large'
    },
    [pscustomobject]@{
        File='contact.html'; Title='Contact H4B Quality Enhancer Support'
        Description='Contact H4B Quality Enhancer for help with video processing, website issues, bug reports, and general support.'
        Canonical="$Site/contact.html"; Robots='index,follow,max-image-preview:large'
    },
    [pscustomobject]@{
        File='old-method.html'; Title='Classic Video Processing Method V1 | H4B'
        Description='Information about the classic H4B video-processing workflow for supported video files.'
        Canonical="$Site/old-method.html"; Robots='noindex,follow'
    },
    [pscustomobject]@{
        File='stats.html'; Title='TikTok Video Stats Demo | H4B Quality Enhancer'
        Description='Experimental H4B stats interface. Any sample or estimated values are illustrative and are not verified measurements from TikTok.'
        Canonical="$Site/stats.html"; Robots='noindex,follow'
    }
)

foreach ($page in $pages) {
    $path = Join-Path $Public $page.File
    if (-not (Test-Path $path)) {
        Write-Warning "Missing public/$($page.File); skipping."
        continue
    }

    $html = Get-Content -LiteralPath $path -Raw -Encoding UTF8
    $html = $html.Replace('https://method.billoxd.site/enahncerlogo.png', "$Site/assets/logo.png")
    $html = $html.Replace('https://method.billoxd.site', $Site)
    $html = $html.Replace('H4B Quality Enhancer | Bypass TikTok Video Compression (120FPS)', $page.Title)

    # Remove the old, repeated SEO tags and the old unverified structured data.
    $html = [regex]::Replace($html, '(?is)<title\b[^>]*>.*?</title>', '')
    $html = [regex]::Replace($html, '(?is)<meta\s+(?:(?:name)|(?:property))\s*=\s*["''](?:description|keywords|robots|og:[^"'']+|twitter:[^"'']+)["''][^>]*>', '')
    $html = [regex]::Replace($html, '(?is)<link\s+rel=["'']canonical["''][^>]*>', '')
    $html = [regex]::Replace($html, '(?is)<script\s+type=["'']application/ld\+json["''][^>]*>.*?</script>', '')

    $schemaJson = Build-Schema -Page $page
    $safeTitle = [System.Net.WebUtility]::HtmlEncode($page.Title)
    $safeDescription = [System.Net.WebUtility]::HtmlEncode($page.Description)
    $seoBlock = @"
<title>$safeTitle</title>
<meta name="description" content="$safeDescription" />
<meta name="robots" content="$($page.Robots)" />
<link rel="canonical" href="$($page.Canonical)" />
<meta property="og:type" content="website" />
<meta property="og:title" content="$safeTitle" />
<meta property="og:description" content="$safeDescription" />
<meta property="og:url" content="$($page.Canonical)" />
<meta property="og:site_name" content="H4B Quality Enhancer" />
<meta property="og:image" content="$Site/assets/logo.png" />
<meta property="og:image:alt" content="H4B Quality Enhancer logo" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="$safeTitle" />
<meta name="twitter:description" content="$safeDescription" />
<meta name="twitter:image" content="$Site/assets/logo.png" />
<script type="application/ld+json">$schemaJson</script>
"@
    $html = Replace-First -Text $html -Pattern '(?i)</head>' -Replacement ($seoBlock + "`n</head>") -Label "head tag in $($page.File)"

    # Rewrite inaccurate or overconfident claims with wording that matches a local container workflow.
    if ($page.File -eq 'index.html') {
        $html = Replace-First -Text $html -Pattern '(?is)<h1 class="hero-title"[^>]*>.*?</h1>' -Replacement '<h1 class="hero-title" style="font-size:clamp(2.4rem, 5vw, 3.8rem);line-height:1.12;font-weight:800;margin-bottom:20px;letter-spacing:-0.03em">Prepare TikTok Videos for Better Upload Quality</h1>' -Label 'homepage H1'
        $html = Replace-First -Text $html -Pattern '(?is)<p class="hero-desc"[^>]*>.*?</p>' -Replacement '<p class="hero-desc" style="font-size:1.12rem;line-height:1.65;color:#94a3b8;max-width:700px;margin:0 auto 36px auto">Prepare supported MP4 and MOV files with H4B Quality Enhancer. Processing runs in your browser, but TikTok may still re-encode uploaded videos and final quality can vary.</p>' -Label 'homepage intro paragraph'
        $html = $html.Replace('Videos Enhanced Losslessly','Videos Processed')
        $html = Replace-First -Text $html -Pattern '(?is)(<div class="file-chips" style="justify-content:center;margin-top:32px">)' -Replacement '<p style="margin:18px auto 0;color:#94a3b8"><a href="./guides/tiktok-video-export-settings.html" style="color:#f87171;text-decoration:underline">Read the TikTok video export settings guide</a></p>$1' -Label 'homepage guide link'
    }
    elseif ($page.File -eq 'method.html') {
        $html = Replace-First -Text $html -Pattern '(?is)<h1 class="hero-title headbang-font"[^>]*>.*?</h1>' -Replacement '<h1 class="hero-title headbang-font" style="font-size:clamp(2.4rem, 5vw, 3.6rem);text-align:center;margin:0 0 12px 0;line-height:1.15">Prepare Your Video for TikTok Upload</h1>' -Label 'method H1'
        $html = Replace-First -Text $html -Pattern '(?is)<p class="hero-desc"[^>]*>.*?</p>' -Replacement '<p class="hero-desc" style="max-width:580px;margin:0 auto 18px auto;text-align:center;color:#94a3b8;font-size:0.95rem;line-height:1.5">Select a supported video and run H4B container processing locally in your browser. This tool does not guarantee that TikTok will preserve the original quality or avoid server-side compression.</p>' -Label 'method intro paragraph'
        $html = $html.Replace('120FPS Supported','Source Frame Rate')
    }
    elseif ($page.File -eq 'tutorial.html') {
        $html = Replace-First -Text $html -Pattern '(?is)<h1\b[^>]*>How To Upload.*?</h1>' -Replacement '<h1 style="color:#ffffff;font-size:2.8rem;font-weight:900;line-height:1.2;margin:0 0 16px 0;font-family:''Outfit'', -apple-system, BlinkMacSystemFont, sans-serif">TikTok Video Export and H4B Upload Tutorial</h1>' -Label 'tutorial H1'
        $html = Replace-First -Text $html -Pattern '(?is)<p style="color:#94a3b8;font-size:1.1rem;max-width:680px;margin:0 auto;line-height:1.6;font-family:.*?</p>' -Replacement '<p style="color:#94a3b8;font-size:1.1rem;max-width:680px;margin:0 auto;line-height:1.6;font-family:''Outfit'', sans-serif">Follow this walkthrough to prepare a vertical video, process a supported file with H4B, and review it before uploading. TikTok can still re-encode videos after upload.</p>' -Label 'tutorial intro paragraph'
        $html = $html.Replace('Drag your rendered video file into the H4B Quality Enhancer tool on our website homepage to apply container timing and scale patches.','Select a supported video in H4B Method V2. The tool processes the file in your browser; review the output before uploading.')
        $html = $html.Replace('Upload the processed output video using TikTok Web on your PC browser. Avoid editing or adding music inside TikTok to maintain 100% quality.','Upload the processed file through TikTok. The platform may re-encode it, so compare the published result and keep your original file.')
        $html = $html.Replace('Try H4B Quality Enhancer now for 100% free lossless video processing.','Try the H4B browser-based container workflow. Your source file remains on your device during processing.')
    }
    elseif ($page.File -eq 'stats.html') {
        $html = $html.Replace('Paste a TikTok link to analyze views, likes, VQ quality scores, browser vs phone resolution compression, shadowban status, and stream downloads.','This experimental page is a demonstration interface. It does not currently retrieve or verify TikTok analytics, quality scores, bitrate throttling, or shadowban status.')
        $html = Replace-First -Text $html -Pattern '(?is)<script>\s*document\.addEventListener\(''DOMContentLoaded'',\s*\(\)\s*=>\s*\{\s*const inspectBtn.*?Inspecting TikTok video quality parameters.*?</script>' -Replacement '<script>document.addEventListener("DOMContentLoaded", () => { const inspectBtn = document.querySelector("button[type=submit], .primary-action-btn") || document.querySelector("button"); if (inspectBtn) inspectBtn.addEventListener("click", (event) => { event.preventDefault(); alert("This is a demonstration page. It does not retrieve or verify TikTok analytics or video quality metrics."); }); });</script>' -Label 'stats demo alert script'
    }

    Set-Content -LiteralPath $path -Value $html -Encoding UTF8
    Copy-Item -LiteralPath $path -Destination (Join-Path $Root $page.File) -Force
    Write-Host "Updated SEO: $($page.File)" -ForegroundColor Green
}

# Create one original, useful guide rather than publishing thin keyword pages.
$guideDir = Join-Path $Public 'guides'
New-Item -ItemType Directory -Path $guideDir -Force | Out-Null
$guidePath = Join-Path $guideDir 'tiktok-video-export-settings.html'
$guideHtml = @'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TikTok Video Export Settings: Resolution, FPS and MP4 | H4B</title>
  <meta name="description" content="A practical guide to preparing vertical videos for TikTok: choose a suitable resolution, preserve the source frame rate, use compatible MP4 settings and review uploads." />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href="https://h4-b-quality-enhancer.vercel.app/guides/tiktok-video-export-settings.html" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="TikTok Video Export Settings: Resolution, FPS and MP4 | H4B" />
  <meta property="og:description" content="A practical, honest guide to preparing vertical videos before uploading to TikTok." />
  <meta property="og:url" content="https://h4-b-quality-enhancer.vercel.app/guides/tiktok-video-export-settings.html" />
  <meta property="og:site_name" content="H4B Quality Enhancer" />
  <meta property="og:image" content="https://h4-b-quality-enhancer.vercel.app/assets/logo.png" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="TikTok Video Export Settings: Resolution, FPS and MP4 | H4B" />
  <meta name="twitter:description" content="Prepare vertical videos with sensible resolution, frame-rate and MP4 export choices." />
  <meta name="twitter:image" content="https://h4-b-quality-enhancer.vercel.app/assets/logo.png" />
  <script type="application/ld+json">
  {
    "@context":"https://schema.org",
    "@type":"Article",
    "headline":"TikTok Video Export Settings: Resolution, FPS and MP4",
    "description":"A practical guide to preparing vertical videos before uploading to TikTok.",
    "mainEntityOfPage":"https://h4-b-quality-enhancer.vercel.app/guides/tiktok-video-export-settings.html",
    "publisher":{"@type":"Organization","name":"H4B Quality Enhancer","url":"https://h4-b-quality-enhancer.vercel.app/"}
  }
  </script>
  <style>
    :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#08080c;color:#e5e7eb;font:16px/1.75 system-ui,-apple-system,Segoe UI,Arial,sans-serif}a{color:#f87171}.wrap{max-width:900px;margin:0 auto;padding:28px 22px 80px}.top{display:flex;justify-content:space-between;gap:16px;align-items:center;border-bottom:1px solid #27272a;padding-bottom:20px;margin-bottom:48px}.brand{font-weight:800;color:#fff;text-decoration:none;letter-spacing:.04em}.top nav{display:flex;gap:18px;flex-wrap:wrap}.top nav a{color:#d4d4d8;text-decoration:none;font-size:.92rem}.eyebrow{color:#f87171;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;font-weight:800}h1{font-size:clamp(2rem,5vw,3.3rem);line-height:1.14;letter-spacing:-.04em;color:#fff;margin:12px 0 18px}h2{color:#fff;margin-top:36px;font-size:1.45rem}h3{color:#fff;font-size:1.08rem}.lead{font-size:1.12rem;color:#c4c4cc}.notice{border:1px solid #7f1d1d;background:#200d12;border-radius:14px;padding:16px 18px;margin:24px 0}.panel{border:1px solid #2a2a32;background:#111116;border-radius:14px;padding:18px 20px;margin:18px 0}.steps li{margin:10px 0}.cta{display:inline-block;background:#dc2626;color:white;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:10px;margin:10px 10px 0 0}.muted{color:#a1a1aa;font-size:.92rem}.footer{border-top:1px solid #27272a;margin-top:55px;padding-top:22px;color:#a1a1aa;font-size:.9rem}
  </style>
</head>
<body>
  <div class="wrap">
    <header class="top">
      <a class="brand" href="../index.html">H4B QUALITY ENHANCER</a>
      <nav aria-label="Main navigation"><a href="../index.html">Home</a><a href="../method.html">Video Tool</a><a href="../tutorial.html">Tutorial</a></nav>
    </header>
    <main>
      <p class="eyebrow">H4B Video Guide</p>
      <h1>TikTok Video Export Settings: A Practical Guide</h1>
      <p class="lead">Good upload quality starts with a clean source file and a sensible export. No single setting can guarantee that TikTok will show every upload at its original quality, because the platform may process uploaded videos again.</p>

      <div class="notice"><strong>Important:</strong> H4B prepares supported video containers in your browser. It is not an AI upscaler, it does not create missing detail or extra frames, and it cannot guarantee that TikTok will skip its own compression.</div>

      <h2>1. Choose a suitable video size</h2>
      <p>For a full-screen vertical post, a 9:16 canvas is a common editing format. A 1080 × 1920 export is a practical target when your original footage has enough detail to support it. If your source was recorded at a lower resolution, exporting a larger frame does not restore detail that was never captured. Avoid stretching the video; crop carefully and keep important subjects inside the visible frame.</p>

      <h2>2. Keep the frame rate close to the source</h2>
      <p>Start with the frame rate used when recording or editing the footage. If the original clip is 30 frames per second, exporting it at 60 or 120 frames per second does not automatically make motion smoother. A higher frame rate requires genuine extra frames, usually from recording at that rate or using frame interpolation. Unnecessary frame-rate conversion can create duplicate frames or uneven motion.</p>

      <h2>3. Use a widely compatible format</h2>
      <div class="panel">
        <h3>Practical compatibility choices</h3>
        <ul>
          <li><strong>Container:</strong> MP4 is widely supported by browsers and editing tools.</li>
          <li><strong>Video codec:</strong> H.264 is a common compatibility choice.</li>
          <li><strong>Audio:</strong> AAC is commonly supported for encoded video audio.</li>
          <li><strong>Orientation:</strong> Keep the intended vertical or horizontal layout and check that rotation is correct.</li>
        </ul>
      </div>
      <p>Always check the export options in your own editor. Codec support and available presets vary between devices and applications.</p>

      <h2>4. Avoid unnecessarily extreme bitrates</h2>
      <p>Higher bitrate can preserve more source detail, but it also creates larger files and does not prevent a social platform from re-encoding an upload. Use your editor's high-quality preset or a reasonable bitrate for the chosen resolution and frame rate. Compare a short test export before rendering a long project. If the file is already clean, repeatedly exporting it through different apps can introduce additional quality loss.</p>

      <h2>5. Check the file before uploading</h2>
      <ol class="steps">
        <li>Watch the exported file locally from beginning to end.</li>
        <li>Check focus, motion, audio sync, orientation and the first and last frames.</li>
        <li>Keep an untouched copy of the original export.</li>
        <li>Use the H4B tool only with a supported file type, then review the downloaded output.</li>
        <li>Upload the reviewed file and check the published result on another device or connection.</li>
      </ol>

      <h2>What H4B does and does not do</h2>
      <p>H4B's browser workflow processes supported video containers locally on your device. Container or metadata processing is different from AI enhancement, denoising, sharpening, upscaling or frame generation. It does not guarantee a particular TikTok resolution, bitrate, reach, or final playback quality. TikTok can apply its own processing after upload, so keep the original export and compare results.</p>

      <h2>Frequently asked questions</h2>
      <h3>Does exporting at 4K guarantee 4K playback on TikTok?</h3>
      <p>No. A 4K source can contain more detail, but the final playback resolution is controlled by the platform and playback conditions. Do not upscale a low-resolution source only to claim a higher quality.</p>
      <h3>Should I change a 30 FPS video to 120 FPS?</h3>
      <p>Usually, keep the frame rate aligned with the source. A metadata change alone cannot create real intermediate frames.</p>
      <h3>Does H4B bypass TikTok compression?</h3>
      <p>No bypass is guaranteed. H4B can process supported containers locally, while TikTok may still re-encode the uploaded file.</p>
      <h3>Are my videos uploaded to H4B servers?</h3>
      <p>The H4B browser workflow is designed to process selected files locally in the browser. Check the browser network activity and the site's current privacy information if you need to independently audit data handling.</p>

      <div class="panel">
        <h2>Try the H4B video workflow</h2>
        <p>Prepare a supported MP4 or MOV file and review the result before publishing.</p>
        <a class="cta" href="../method.html">Open H4B Method Tool</a>
        <a class="cta" href="../tutorial.html">Watch the Tutorial</a>
      </div>
    </main>
    <footer class="footer">H4B Quality Enhancer · <a href="../contact.html">Contact</a> · <a href="../index.html">Home</a></footer>
  </div>
</body>
</html>
'@
Set-Content -LiteralPath $guidePath -Value $guideHtml -Encoding UTF8
$rootGuideDir = Join-Path $Root 'guides'
New-Item -ItemType Directory -Path $rootGuideDir -Force | Out-Null
Copy-Item -LiteralPath $guidePath -Destination (Join-Path $rootGuideDir 'tiktok-video-export-settings.html') -Force
Write-Host 'Created the TikTok video export settings guide.' -ForegroundColor Green

# Add an internal link to the guide in the tutorial page as well.
$tutorialPath = Join-Path $Public 'tutorial.html'
if (Test-Path $tutorialPath) {
    $tutorial = Get-Content -LiteralPath $tutorialPath -Raw -Encoding UTF8
    if (-not $tutorial.Contains('./guides/tiktok-video-export-settings.html')) {
        $marker = '<span>Official Video Guide</span>'
        if ($tutorial.Contains($marker)) {
            $tutorial = $tutorial.Replace($marker, $marker + '<span style="display:block;margin-top:10px"><a href="./guides/tiktok-video-export-settings.html" style="color:#f87171;text-decoration:underline">Read the video export settings guide</a></span>')
            Set-Content -LiteralPath $tutorialPath -Value $tutorial -Encoding UTF8
            Copy-Item -LiteralPath $tutorialPath -Destination (Join-Path $Root 'tutorial.html') -Force
        }
    }
}

$robots = @"
User-agent: *
Allow: /
Disallow: /api/

Sitemap: $Site/sitemap.xml
"@
$sitemap = @"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>$Site/</loc></url>
  <url><loc>$Site/method.html</loc></url>
  <url><loc>$Site/tutorial.html</loc></url>
  <url><loc>$Site/contact.html</loc></url>
  <url><loc>$Site/guides/tiktok-video-export-settings.html</loc></url>
</urlset>
"@
foreach ($base in @($Root, $Public)) {
    Set-Content -LiteralPath (Join-Path $base 'robots.txt') -Value $robots -Encoding UTF8
    Set-Content -LiteralPath (Join-Path $base 'sitemap.xml') -Value $sitemap -Encoding UTF8
}

Write-Host ''
Write-Host 'SEO batch setup finished.' -ForegroundColor Cyan
Write-Host "Backup folder: $Backup"
Write-Host 'Changed deployed files are in public/ and mirrored to the repository root.'
Write-Host 'Next: inspect the diff, test the pages locally, then commit and push.'
