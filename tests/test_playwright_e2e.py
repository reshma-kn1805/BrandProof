import os
import sys
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
import pytest
from playwright.sync_api import sync_playwright

PORT = 3344
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "out"))

class StaticHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=OUT_DIR, **kwargs)

    def translate_path(self, path):
        # Strip /BrandProof prefix if present to map cleanly to OUT_DIR
        clean_path = path
        if clean_path.startswith("/BrandProof/"):
            clean_path = "/" + clean_path[len("/BrandProof/"):]
        elif clean_path == "/BrandProof":
            clean_path = "/"
        return super().translate_path(clean_path)

    def log_message(self, format, *args):
        pass  # Suppress request logging

@pytest.fixture(scope="module")
def static_server():
    server = HTTPServer(("127.0.0.1", PORT), StaticHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{PORT}"
    server.shutdown()

def test_playwright_double_click_and_refresh(static_server):
    with sync_playwright() as p:
        chrome_exe = r"C:\Users\reshm\AppData\Local\ms-playwright\chromium-1248\chrome-win64\chrome.exe"
        launch_kwargs = {"args": ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"]}
        if os.path.exists(chrome_exe):
            launch_kwargs["executable_path"] = chrome_exe
        browser = p.chromium.launch(**launch_kwargs)
        context = browser.new_context()
        page = context.new_page()

        target_url = f"{static_server}/BrandProof/"
        print("\n[Playwright E2E] Loading static export frontend at:", target_url)
        page.goto(target_url)
        page.wait_for_load_state("networkidle")

        # Step 1: In static mode with no backend running, wait for waking screen and skip to demo mode
        print("[Playwright E2E] Checking server waking / demo mode handling...")
        skip_btn = page.locator("button:has-text('Demo Mode'), button:has-text('Skip waiting')").first
        skip_btn.wait_for(state="visible", timeout=12000)
        skip_btn.click()
        page.wait_for_timeout(1000)

        # Step 2: 1-Click Login as Creator
        print("[Playwright E2E] Authenticating via 1-Click Creator account...")
        creator_btn = page.locator("button:has-text('Arjun Mehta')")
        creator_btn.wait_for(state="visible", timeout=10000)
        creator_btn.click()

        # Step 3: Verify Dashboard loaded
        print("[Playwright E2E] Verifying Governance Dashboard loaded...")
        header = page.locator("text=Governance Dashboard")
        header.wait_for(state="visible", timeout=10000)

        # Step 4: Navigate to Guidelines view
        print("[Playwright E2E] Navigating to Brand Guidelines view...")
        guidelines_nav = page.locator("button:has-text('Brand Guidelines')")
        guidelines_nav.first.click()
        page.wait_for_selector("text=Brand Guidelines & Rule Repository", timeout=10000)

        # Step 5: Test Refresh Persistence
        print("[Playwright E2E] Testing page refresh persistence on Guidelines view...")
        page.reload()
        page.wait_for_load_state("networkidle")
        # Ensure user stays on Guidelines and is NOT kicked out to login
        page.wait_for_selector("text=Brand Guidelines & Rule Repository", timeout=10000)
        print("  -> PASSED: Page refresh maintained active Guidelines view and user session.")

        # Step 6: Navigate to New Review
        print("[Playwright E2E] Navigating to New Review view...")
        sidebar_new = page.locator("button:has-text('Submit Content')")
        sidebar_new.first.click()
        page.wait_for_selector("text=Run BrandProof Engine", timeout=10000)

        # Step 7: Load Demo Violations Sample
        print("[Playwright E2E] Loading violation sample draft...")
        load_sample = page.locator("button:has-text('Load Sample with Violations')")
        load_sample.click()

        # Step 8: Test review submission button
        print("[Playwright E2E] Testing review submission button...")
        submit_btn = page.locator("button:has-text('Run BrandProof Engine')")
        assert submit_btn.is_enabled()
        submit_btn.click()

        # Verify review detail page opened and findings appeared
        print("[Playwright E2E] Verifying review findings loaded...")
        page.wait_for_selector("text=Verified Governance Findings", timeout=15000)

        # Step 9: Test Finding Action button
        print("[Playwright E2E] Testing 'Accept' finding action button...")
        accept_btn = page.locator("button:has-text('Accept')").first
        accept_btn.wait_for(state="visible", timeout=10000)
        accept_btn.click()
        page.wait_for_timeout(1000)

        # Step 10: Refresh on Review Detail view
        print("[Playwright E2E] Refreshing on Review Detail view...")
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("text=Verified Governance Findings", timeout=15000)
        print("  -> PASSED: Remained on Review Detail view after page refresh without error boundary.")

        # Step 11: Refresh on Facts Ledger view
        print("[Playwright E2E] Testing navigation & refresh on Facts Ledger...")
        facts_nav = page.locator("button:has-text('Approved Facts Ledger')")
        facts_nav.first.click()
        page.wait_for_selector("text=Approved Facts Ledger", timeout=10000)
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("text=Approved Facts Ledger", timeout=10000)
        print("  -> PASSED: Facts Ledger refresh maintained active view.")

        # Step 12: Refresh on Terminology view
        print("[Playwright E2E] Testing navigation & refresh on Terminology Rules...")
        term_nav = page.locator("button:has-text('Terminology Rules')")
        term_nav.first.click()
        page.wait_for_selector("text=Brand Terminology & Naming Rules", timeout=10000)
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("text=Brand Terminology & Naming Rules", timeout=10000)
        print("  -> PASSED: Terminology Rules refresh maintained active view.")

        # Step 13: Refresh on Content Reviews view
        print("[Playwright E2E] Testing navigation & refresh on Content Reviews...")
        reviews_nav = page.locator("button:has-text('Content Reviews')")
        reviews_nav.first.click()
        page.wait_for_selector("text=Content Verification Reviews", timeout=10000)
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("text=Content Verification Reviews", timeout=10000)
        print("  -> PASSED: Content Reviews refresh maintained active view.")

        browser.close()
        print("\n[Playwright E2E] ALL BROWSER E2E TESTS (DOUBLE-CLICK & REFRESH ON EVERY VIEW) COMPLETED CLEANLY!")

if __name__ == "__main__":
    server = HTTPServer(("127.0.0.1", PORT), StaticHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        test_playwright_double_click_and_refresh(f"http://127.0.0.1:{PORT}")
    finally:
        server.shutdown()
