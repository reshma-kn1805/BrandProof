import io
import math
import re
from typing import Dict, List, Any, Optional, Tuple
from PIL import Image

# Approved Brand Palette for Nila Foods
NILA_FOODS_PALETTE = [
    {"name": "Nila Green", "hex": "#2E7D4F", "rgb": (46, 125, 79)},
    {"name": "Millet Gold", "hex": "#D9A441", "rgb": (217, 164, 65)},
    {"name": "Cream", "hex": "#FFF8EC", "rgb": (255, 248, 236)},
    {"name": "Charcoal", "hex": "#2B2B2B", "rgb": (43, 43, 43)},
]

def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02X}{g:02X}{b:02X}"

def hex_to_rgb(hex_code: str) -> Tuple[int, int, int]:
    clean = hex_code.lstrip('#')
    return tuple(int(clean[i:i+2], 16) for i in (0, 2, 4))

def relative_luminance(r: int, g: int, b: int) -> float:
    """Computes WCAG 2.2 relative luminance for sRGB color."""
    def channel_linear(c: int) -> float:
        val = c / 255.0
        return val / 12.92 if val <= 0.04045 else ((val + 0.055) / 1.055) ** 2.4

    return 0.2126 * channel_linear(r) + 0.7152 * channel_linear(g) + 0.0722 * channel_linear(b)

def compute_wcag_contrast(rgb1: Tuple[int, int, int], rgb2: Tuple[int, int, int]) -> float:
    """Computes WCAG 2.2 contrast ratio between two colors."""
    l1 = relative_luminance(*rgb1)
    l2 = relative_luminance(*rgb2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return round((lighter + 0.05) / (darker + 0.05), 2)

def rgb_to_lab(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """Converts sRGB to CIE L*a*b* color space."""
    def to_lin(c: int) -> float:
        v = c / 255.0
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

    r_lin = to_lin(r)
    g_lin = to_lin(g)
    b_lin = to_lin(b)

    # Standard D65 illuminant observer matrix
    X = (r_lin * 0.4124564 + g_lin * 0.3575761 + b_lin * 0.1804375) / 0.95047
    Y = (r_lin * 0.2126729 + g_lin * 0.7151522 + b_lin * 0.0721750) / 1.00000
    Z = (r_lin * 0.0193339 + g_lin * 0.1191920 + b_lin * 0.9503041) / 1.08883

    def f(t: float) -> float:
        return t ** (1.0 / 3.0) if t > 0.008856 else (7.787 * t) + (16.0 / 116.0)

    L = (116.0 * f(Y)) - 16.0
    a = 500.0 * (f(X) - f(Y))
    b = 200.0 * (f(Y) - f(Z))
    return L, a, b

def delta_e_cie76(lab1: Tuple[float, float, float], lab2: Tuple[float, float, float]) -> float:
    """Computes Euclidean CIE76 color difference."""
    return math.sqrt((lab1[0] - lab2[0]) ** 2 + (lab1[1] - lab2[1]) ** 2 + (lab1[2] - lab2[2]) ** 2)

def find_closest_palette_color(
    rgb: Tuple[int, int, int],
    palette: List[Dict[str, Any]] = NILA_FOODS_PALETTE
) -> Dict[str, Any]:
    lab = rgb_to_lab(*rgb)
    best_color = None
    min_dist = float('inf')

    for p in palette:
        p_lab = rgb_to_lab(*p["rgb"])
        dist = delta_e_cie76(lab, p_lab)
        if dist < min_dist:
            min_dist = dist
            best_color = p

    return {
        "name": best_color["name"],
        "hex": best_color["hex"],
        "delta_e": round(min_dist, 1)
    }

def extract_dominant_colors(
    image: Image.Image,
    max_colors: int = 5
) -> List[Dict[str, Any]]:
    """Extracts dominant colors from an image using adaptive color quantization."""
    # Convert RGBA to RGB on white background if transparent
    if image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info):
        bg = Image.new("RGB", image.size, (255, 255, 255))
        if image.mode != 'RGBA':
            image = image.convert('RGBA')
        bg.paste(image, mask=image.split()[3])
        img = bg
    else:
        img = image.convert('RGB')

    # Downscale for performance and noise smoothing
    img.thumbnail((150, 150))
    total_pixels = img.width * img.height

    # Quantize to 8 colors using adaptive palette
    quantized = img.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette()[:24]  # 8 colors * 3 channels
    colors = quantized.getcolors()

    if not colors or not palette:
        # Fallback to simple average color
        avg_r, avg_g, avg_b = [int(sum(img.getdata(band)) / total_pixels) for band in range(3)]
        return [{
            "hex": rgb_to_hex(avg_r, avg_g, avg_b),
            "rgb": [avg_r, avg_g, avg_b],
            "percentage": 100.0,
            "closest_approved": find_closest_palette_color((avg_r, avg_g, avg_b))
        }]

    # Sort colors by frequency descending
    colors.sort(key=lambda x: x[0], reverse=True)
    dominant = []

    for count, idx in colors[:max_colors]:
        r = palette[idx * 3]
        g = palette[idx * 3 + 1]
        b = palette[idx * 3 + 2]
        pct = round((count / total_pixels) * 100.0, 1)
        rgb_tuple = (r, g, b)
        closest = find_closest_palette_color(rgb_tuple)
        dominant.append({
            "hex": rgb_to_hex(r, g, b),
            "rgb": [r, g, b],
            "percentage": pct,
            "closest_approved": closest
        })

    return dominant


def analyze_image_accessibility(
    image_bytes: bytes,
    alt_text: Optional[str] = None,
    approved_palette: List[Dict[str, Any]] = NILA_FOODS_PALETTE
) -> Dict[str, Any]:
    """
    Performs deterministic image and visual-asset accessibility checks per Improvement 2:
    1. Alt text quality -> Clause 5.2 (Media Alt Text)
    2. WCAG 2.2 contrast ratio -> Clause 5.3 (Contrast)
    3. Approved color palette adherence -> Clause 5.4 (Approved Palette)
    """
    findings = []
    clean_alt = (alt_text or "").strip()

    # --- 1. Alt Text Quality Check (Clause 5.2) ---
    alt_finding = None
    if not clean_alt:
        alt_finding = {
            "clause_number": "5.2",
            "title": "Missing Media Alternative Text",
            "original_text": "Image attached without alternative text",
            "severity": "warning",
            "explanation": "Clause 5.2 requires clear, descriptive alternative text for screen readers and accessibility conformance on all media assets.",
            "suggested_correction": "Add descriptive alt text describing the subject and content of the asset (minimum 5 characters).",
            "confidence": 1.0,
            "verification_status": "verified_clause"
        }
    elif len(clean_alt) < 5:
        alt_finding = {
            "clause_number": "5.2",
            "title": "Alternative Text Too Short",
            "original_text": clean_alt,
            "severity": "warning",
            "explanation": f"Clause 5.2 requires meaningful alt text. '{clean_alt}' is shorter than the 5-character minimum threshold.",
            "suggested_correction": "Provide a descriptive sentence summarizing the image content.",
            "confidence": 1.0,
            "verification_status": "verified_clause"
        }
    elif re.search(r'\.(png|jpe?g|webp|gif|svg|bmp)$', clean_alt, re.IGNORECASE) or clean_alt.startswith("IMG_") or clean_alt.startswith("DSC_"):
        alt_finding = {
            "clause_number": "5.2",
            "title": "Filename Used as Alternative Text",
            "original_text": clean_alt,
            "severity": "warning",
            "explanation": f"Clause 5.2 prohibits raw filenames ('{clean_alt}') as alternative text. Screen reader users require human-readable descriptions.",
            "suggested_correction": "Replace the filename with a descriptive phrase describing what the image depicts.",
            "confidence": 1.0,
            "verification_status": "verified_clause"
        }
    elif clean_alt.lower().startswith("image of") or clean_alt.lower().startswith("picture of") or clean_alt.lower().startswith("photo of"):
        prefix = clean_alt[:clean_alt.find(" ") + 3]
        alt_finding = {
            "clause_number": "5.2",
            "title": "Redundant Alternative Text Prefix",
            "original_text": clean_alt,
            "severity": "warning",
            "explanation": f"Clause 5.2 discourages redundant introductory phrases like '{prefix}'. Screen readers automatically announce images to users.",
            "suggested_correction": clean_alt[clean_alt.find(" ") + 3:].strip().capitalize(),
            "confidence": 1.0,
            "verification_status": "verified_clause"
        }

    if alt_finding:
        findings.append(alt_finding)

    # Load image with Pillow
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.verify()
        # Re-open after verify()
        img = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        return {
            "error": f"Invalid or corrupt image format: {str(e)}",
            "findings": findings,
            "dominant_colors": [],
            "contrast_ratio": 1.0,
            "contrast_pass": False,
            "palette_pass": False,
            "alt_text_pass": alt_finding is None
        }

    all_dominant = extract_dominant_colors(img, max_colors=8)
    dominant_colors = all_dominant[:5]

    # --- 2. WCAG Contrast Check (Clause 5.3) ---
    # Find two most distant colors among dominant and accent color clusters by contrast ratio
    max_contrast = 1.0
    color_pair = None

    if len(all_dominant) >= 2:
        for i in range(len(all_dominant)):
            for j in range(i + 1, len(all_dominant)):
                c1 = tuple(all_dominant[i]["rgb"])
                c2 = tuple(all_dominant[j]["rgb"])
                cr = compute_wcag_contrast(c1, c2)
                if cr > max_contrast:
                    max_contrast = cr
                    color_pair = (all_dominant[i]["hex"], all_dominant[j]["hex"])
    elif len(all_dominant) == 1:
        # Single dominant color (monochromatic)
        max_contrast = 1.0
        color_pair = (all_dominant[0]["hex"], all_dominant[0]["hex"])

    contrast_pass = max_contrast >= 4.5

    if not contrast_pass:
        c1_str = color_pair[0] if color_pair else "foreground"
        c2_str = color_pair[1] if color_pair else "background"
        findings.append({
            "clause_number": "5.3",
            "title": "Insufficient WCAG Visual Contrast",
            "original_text": f"Contrast ratio {max_contrast:.1f}:1 below 4.5:1 threshold",
            "severity": "warning",
            "explanation": f"Clause 5.3 requires a minimum WCAG 2.2 contrast ratio of 4.5:1 for graphical legibility. Measured dominant ratio is {max_contrast:.1f}:1 between {c1_str} and {c2_str}.",
            "suggested_correction": "Adjust foreground/background luminance to achieve at least 4.5:1 contrast ratio.",
            "confidence": 1.0,
            "verification_status": "verified_clause"
        })

    # --- 3. Approved Brand Palette Check (Clause 5.4) ---
    # Tolerance threshold: delta_e > 25 indicates distinct off-palette color
    PALETTE_DELTA_E_THRESHOLD = 25.0
    off_palette_colors = []

    for c in dominant_colors:
        if c["closest_approved"]["delta_e"] > PALETTE_DELTA_E_THRESHOLD and c["percentage"] >= 15.0:
            off_palette_colors.append(c)

    # If even the top dominant color is off-palette regardless of threshold percentage
    if dominant_colors and dominant_colors[0]["closest_approved"]["delta_e"] > PALETTE_DELTA_E_THRESHOLD:
        if dominant_colors[0] not in off_palette_colors:
            off_palette_colors.insert(0, dominant_colors[0])

    palette_pass = len(off_palette_colors) == 0

    if not palette_pass:
        primary_off = off_palette_colors[0]
        off_hex = primary_off["hex"]
        closest_name = primary_off["closest_approved"]["name"]
        closest_hex = primary_off["closest_approved"]["hex"]
        dist = primary_off["closest_approved"]["delta_e"]

        findings.append({
            "clause_number": "5.4",
            "title": "Unapproved Brand Color Detected",
            "original_text": f"Off-palette color {off_hex} detected, closest approved: {closest_hex}",
            "severity": "warning",
            "explanation": f"Clause 5.4 restricts dominant brand graphics to Nila Foods' approved palette (Nila Green, Millet Gold, Cream, Charcoal). Detected off-palette color {off_hex} (CIE76 distance {dist}).",
            "suggested_correction": f"Replace with nearest approved brand color {closest_name} ({closest_hex}).",
            "confidence": 1.0,
            "verification_status": "verified_clause"
        })

    return {
        "format": img.format or "UNKNOWN",
        "dimensions": {"width": img.width, "height": img.height},
        "alt_text": clean_alt,
        "alt_text_pass": alt_finding is None,
        "dominant_colors": dominant_colors,
        "contrast_ratio": max_contrast,
        "contrast_pass": contrast_pass,
        "palette_pass": palette_pass,
        "findings": findings,
        "disclaimer": "Image checks evaluate palette proximity and WCAG contrast. They do not perform optical character recognition. Contrast is estimated from dominant colors unless text/background colors are explicitly picked."
    }

