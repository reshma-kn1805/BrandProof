import io
import base64
import pytest
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

from backend.main import app
from backend.models import User, ContentReview, ReviewFinding
from backend.engine.image_analyzer import (
    analyze_image_accessibility,
    compute_wcag_contrast,
    delta_e_cie76,
    rgb_to_lab,
    NILA_FOODS_PALETTE
)

client = TestClient(app)

def create_test_image(bg_rgb, text_rgb, text="Nila Millet Mix", size=(200, 150)) -> bytes:
    """Helper to generate in-memory test PNGs using Pillow with prominent foreground panel."""
    img = Image.new("RGB", size, bg_rgb)
    draw = ImageDraw.Draw(img)
    # Prominent banner/callout panel so foreground color is dominant and measurable
    draw.rectangle([10, 40, size[0] - 10, size[1] - 40], fill=text_rgb)
    draw.text((20, 60), text, fill=bg_rgb)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# 1. Unit test for Alt text rules
def test_alt_text_rules():
    img_bytes = create_test_image((46, 125, 79), (255, 248, 236))  # Nila green + Cream

    # Case A: Missing alt text
    res1 = analyze_image_accessibility(img_bytes, alt_text="")
    f1 = [f for f in res1["findings"] if f["clause_number"] == "5.2"]
    assert len(f1) == 1
    assert "Missing Media Alternative Text" in f1[0]["title"]

    # Case B: Too short (< 5 chars)
    res2 = analyze_image_accessibility(img_bytes, alt_text="pack")
    f2 = [f for f in res2["findings"] if f["clause_number"] == "5.2"]
    assert len(f2) == 1
    assert "Too Short" in f2[0]["title"]

    # Case C: Raw filename
    res3 = analyze_image_accessibility(img_bytes, alt_text="millet_banner.png")
    f3 = [f for f in res3["findings"] if f["clause_number"] == "5.2"]
    assert len(f3) == 1
    assert "Filename Used" in f3[0]["title"]

    # Case D: Redundant prefix ("Image of...")
    res4 = analyze_image_accessibility(img_bytes, alt_text="Image of Nila cereal bowl")
    f4 = [f for f in res4["findings"] if f["clause_number"] == "5.2"]
    assert len(f4) == 1
    assert "Redundant" in f4[0]["title"]

    # Case E: Valid descriptive alt text
    res5 = analyze_image_accessibility(img_bytes, alt_text="Nila Foods traditional millet cereal packaging illustration")
    f5 = [f for f in res5["findings"] if f["clause_number"] == "5.2"]
    assert len(f5) == 0


# 2. Unit test for WCAG 2.2 contrast and color difference
def test_wcag_contrast_and_palette_math():
    # Black on White: 21.0:1
    cr_bw = compute_wcag_contrast((0, 0, 0), (255, 255, 255))
    assert cr_bw == 21.0

    # Cream on Nila Green
    cr_nila = compute_wcag_contrast((46, 125, 79), (255, 248, 236))
    assert cr_nila >= 4.5  # High contrast

    # Dark purple on Magenta: low contrast
    cr_low = compute_wcag_contrast((255, 0, 255), (153, 0, 153))
    assert cr_low < 4.5

    # CIE76 Delta E
    lab_cream = rgb_to_lab(255, 248, 236)
    lab_cream2 = rgb_to_lab(255, 248, 236)
    assert delta_e_cie76(lab_cream, lab_cream2) == 0.0

    lab_magenta = rgb_to_lab(255, 0, 255)
    lab_green = rgb_to_lab(46, 125, 79)
    assert delta_e_cie76(lab_magenta, lab_green) > 50.0  # Distinct off-palette distance

    # Palette threshold boundary tests (threshold = 12.0)
    # Approved Nila Green is (46, 125, 79)
    # Near-green (48, 123, 81) has delta_e ~ 2.0 <= 12.0 (on-palette)
    lab_near_green = rgb_to_lab(48, 123, 81)
    assert delta_e_cie76(lab_green, lab_near_green) <= 12.0

    # Off-palette olive (80, 110, 40) has delta_e > 12.0
    lab_olive = rgb_to_lab(80, 110, 40)
    assert delta_e_cie76(lab_green, lab_olive) > 12.0


# 3. Done when scenario:
# "submitting an image with no alt text, low contrast, and an unapproved magenta background
# produces exactly three cited findings (one for each clause), and the image card displays
# the extracted palette and measured ratio."
def test_done_when_image_scenario():
    # Login as Creator
    login_res = client.post("/api/auth/login", json={
        "email": "creator@nilafoods.com",
        "password": "BrandProof2026!"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Generate non-compliant image:
    # Background: Magenta (255, 0, 255) -> Clause 5.4 unapproved palette
    # Text: Dark Purple (153, 0, 153) -> Clause 5.3 contrast ratio ~1.8:1 < 4.5:1
    bad_img_bytes = create_test_image(
        bg_rgb=(255, 0, 255),
        text_rgb=(153, 0, 153),
        text="Nila Millet Mix"
    )
    bad_img_b64 = base64.b64encode(bad_img_bytes).decode("utf-8")

    # Content copy is compliant text so ONLY the 3 image findings trigger
    compliant_text = "Nila Millet Mix is a healthy breakfast made with 5 whole millets."

    # Submit with NO alt text (alt_text="") -> Clause 5.2
    submit_res = client.post(
        "/api/reviews/submit",
        json={
            "title": "Summer Campaign Packaging Mockup",
            "content": compliant_text,
            "image_filename": "packaging_mockup_magenta.png",
            "image_data": bad_img_b64,
            "image_alt_text": ""
        },
        headers=headers
    )
    assert submit_res.status_code == 200
    data = submit_res.json()

    # Exactly three cited findings!
    findings = data["findings"]
    assert len(findings) == 3, f"Expected exactly 3 findings, got {len(findings)}: {[f['title'] for f in findings]}"

    # Verify Clause 5.2 finding
    f_52 = next((f for f in findings if f["clause_number"] == "5.2"), None)
    assert f_52 is not None
    assert f_52["verification_status"] == "verified_clause"
    assert "Alternative Text" in f_52["title"]

    # Verify Clause 5.3 finding
    f_53 = next((f for f in findings if f["clause_number"] == "5.3"), None)
    assert f_53 is not None
    assert f_53["verification_status"] == "verified_clause"
    assert "Contrast" in f_53["title"]
    assert "Contrast ratio" in f_53["original_text"]
    assert "below 4.5:1 threshold" in f_53["original_text"]

    # Verify Clause 5.4 finding
    f_54 = next((f for f in findings if f["clause_number"] == "5.4"), None)
    assert f_54 is not None
    assert f_54["verification_status"] == "verified_clause"
    assert "Brand Color" in f_54["title"]
    assert "#FF00FF" in f_54["original_text"]

    # Verify image analysis payload on review
    analysis = data["image_analysis"]
    assert analysis is not None
    assert len(analysis["dominant_colors"]) >= 1
    assert analysis["contrast_ratio"] < 4.5
    assert analysis["contrast_pass"] is False
    assert analysis["palette_pass"] is False
    assert analysis["alt_text_pass"] is False
    assert "Image checks evaluate palette proximity and WCAG contrast" in analysis["disclaimer"]


# 4. Compliant visual asset test produces 0 image findings
def test_compliant_visual_asset_zero_findings():
    login_res = client.post("/api/auth/login", json={
        "email": "creator@nilafoods.com",
        "password": "BrandProof2026!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Generate compliant image:
    # Background: Nila Green (46, 125, 79) -> Approved palette
    # Text: Cream (255, 248, 236) -> High contrast 8.5:1 >= 4.5:1
    good_img_bytes = create_test_image(
        bg_rgb=(46, 125, 79),
        text_rgb=(255, 248, 236),
        text="Nila Millet Mix"
    )
    good_img_b64 = base64.b64encode(good_img_bytes).decode("utf-8")

    submit_res = client.post(
        "/api/reviews/submit",
        json={
            "title": "Compliant Packaging Artwork",
            "content": "Nila Millet Mix is a healthy breakfast made with 5 whole millets.",
            "image_filename": "nila_green_pack.png",
            "image_data": good_img_b64,
            "image_alt_text": "Nila Foods traditional millet cereal packaging mockup"
        },
        headers=headers
    )
    assert submit_res.status_code == 200
    data = submit_res.json()

    # Zero violations
    assert len(data["findings"]) == 0
    assert data["overall_score"] == 100.0
    analysis = data["image_analysis"]
    assert analysis is not None
    assert analysis["contrast_pass"] is True
    assert analysis["palette_pass"] is True
    assert analysis["alt_text_pass"] is True
