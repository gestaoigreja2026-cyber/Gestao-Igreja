Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\eduka\Downloads\App Gestão Igreja\public\logo-app-v3.png"
$img = [System.Drawing.Image]::FromFile($sourcePath)

function Resize-Image {
    param(
        [int]$size,
        [string]$outputPath
    )
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Configure high quality resizing
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    
    # Draw transparent background
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # Scale image to fit, maintaining aspect ratio but centering in the square canvas
    $ratio = [math]::Min($size / $img.Width, $size / $img.Height)
    $newWidth = [int]($img.Width * $ratio)
    $newHeight = [int]($img.Height * $ratio)
    $xOffset = [int](($size - $newWidth) / 2)
    $yOffset = [int](($size - $newHeight) / 2)
    
    $g.DrawImage($img, $xOffset, $yOffset, $newWidth, $newHeight)
    
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Resize-Image -size 192 -outputPath "C:\Users\eduka\Downloads\App Gestão Igreja\public\logo-192.png"
Resize-Image -size 512 -outputPath "C:\Users\eduka\Downloads\App Gestão Igreja\public\logo-512.png"

$img.Dispose()
Write-Host "Imagens redimensionadas com sucesso."
