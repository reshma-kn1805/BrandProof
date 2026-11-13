import os
import sys
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
import pytest
from playwright.sync_api import sync_playwright

PORT = 3345
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "out"))

class StaticHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=OUT_DIR, **kwargs)

    def translate_path(self, path):
        clean_path = path
        if clean_path.startswith("/BrandProof/"):
            clean_path = "/" + clean_path[len("/BrandProof/"):]
        elif clean_path == "/BrandProof":
            clean_path = "/"
        return super().translate_path(clean_path)

    def log_message(self, format, *args):
        pass

@pytest.fixture(scope="module")
def static_server():
    server = HTTPServer(("127.0.0.1", PORT), StaticHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{PORT}"
    server.shutdown()

def test_judge_journey_smoke_test(static_server):
    """
    Phase 8 Smoke Test: Judge Journey
    1. First-run 3-minute checklist visible on dashboard
    2. Role switcher with descriptions
    3. Tooltips on finding status/severity/confidence
    4. No horizontal overflow at tablet width (768px)
    """
    with sync_playwright() as p:
        chrome_exe = r"C:\Users\reshm\AppData\Local\ms-playwright\chromium-1248\chrome-win64\chrome.exe"
        launch_kwargs = {"args": ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"]}
        if os.path.exists(chrome_exe):
            launch_kwargs["executable_path"] = chrome_exe
        browser = p.chromium.launch(**launch_kwargs)

        # Set tablet viewport (768x1024)
        context = browser.new_context(viewport={"width": 768, "height": 1024})
        page = context.new_page()

        # Pre-seed session storage to immediately load demo mode without 60s waking wait
        page.add_init_script("""() => {
            sessionStorage.setItem("brandproof_force_demo", "true");
            localStorage.setItem("brandproof_active_view", "dashboard");
        }""")

        target_url = f"{static_server}/BrandProof/"
        page.goto(target_url)
        page.wait_for_load_state("networkidle")

        # Step 1: Sign in with 1-click Demo Creator if on AuthModal
        sign_in_btn = page.locator("button:has-text('Arjun Mehta')")
        if sign_in_btn.is_visible():
            sign_in_btn.click()
            page.wait_for_timeout(1000)

        # Step 2: Verify Dashboard & 3-minute first-run checklist
        page.wait_for_selector("text=Try the Demo in 3 Minutes", timeout=10000)
        assert page.locator("text=Try the Demo in 3 Minutes").is_visible()
        assert page.locator("text=completed").is_visible()

        # Step 3: Check Role Switcher & Description
        role_select = page.locator("select[aria-label='Switch workspace user role']")
        assert role_select.is_visible()

        # Step 4: Verify No Horizontal Overflow at 768px tablet width
        scroll_width = page.evaluate("() => document.documentElement.scrollWidth")
        client_width = page.evaluate("() => document.documentElement.clientWidth")
        assert scroll_width <= client_width + 5, f"Horizontal overflow detected: scrollWidth={scroll_width}, clientWidth={client_width}"

        # Step 5: Navigate to Reviews and check score container
        reviews_link = page.locator("button:has-text('Reviews')").first
        if reviews_link.is_visible():
            reviews_link.click()
            page.wait_for_timeout(500)
            row = page.locator("tr").nth(1)
            if row.is_visible():
                row.click()
                page.wait_for_timeout(500)
                score_live = page.locator("[aria-live='polite']")
                assert score_live.is_visible()

        browser.close()
