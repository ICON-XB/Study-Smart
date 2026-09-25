"""End-to-end browser tests for Study-Smart (Playwright + Chromium).

Run from the project root:
    python -m http.server 8802 &            # serve the app
    python tests/e2e_test.py http://localhost:8802

External services are never contacted: Google Fonts is blocked and the
Gemini API is replaced by a local fake (page.route), so the tests are
repeatable offline and never use a real API key.
"""
import asyncio
import json
import os
import sys
import traceback

from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8802"
HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "screenshots")
os.makedirs(SHOTS, exist_ok=True)
PIN = "482913"
FAKE_KEY = "AIzaTESTKEY_not_real_0123456789abcdef"
XSS = '<img src=x onerror="window.__xss=(window.__xss||0)+1">'

results = []


def record(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))


async def new_page(browser, viewport=None):
    ctx = await browser.new_context(viewport=viewport or {"width": 1280, "height": 900}, accept_downloads=True)
    page = await ctx.new_page()
    page.errors = []
    page.csp = []
    page.on("pageerror", lambda e: page.errors.append(str(e)))

    def on_console(msg):
        if "Content Security Policy" in msg.text:
            page.csp.append(msg.text[:200])
    page.on("console", on_console)
    await ctx.route("https://fonts.googleapis.com/**", lambda r: r.abort())
    await ctx.route("https://fonts.gstatic.com/**", lambda r: r.abort())
    return ctx, page


async def setup_pin(page, pin=PIN):
    await page.goto(BASE + "/app.html")
    await page.wait_for_selector("#setup-overlay", state="visible")
    await page.fill("#setup-pin", pin)
    await page.fill("#setup-pin-confirm", pin)
    await page.click("#setup-confirm-btn")
    await page.wait_for_function("document.getElementById('setup-overlay').style.display==='none'", timeout=20000)
    await page.wait_for_timeout(300)


async def unlock(page, pin=PIN):
    await page.wait_for_selector("#lock-overlay", state="visible")
    await page.fill("#lock-pin", pin)
    await page.click("#unlock-btn")
    await page.wait_for_function("document.getElementById('lock-overlay').style.display==='none'", timeout=20000)
    await page.wait_for_timeout(300)


async def go_tab(page, tab):
    await page.evaluate(f"switchTab('{tab}')")
    await page.wait_for_timeout(150)


async def add_module(page, code, name):
    await go_tab(page, "modules")
    await page.click("#add-module-modal-btn")
    await page.fill("#module-code", code)
    await page.fill("#module-name", name)
    await page.click("#module-form button[type=submit]")
    await page.wait_for_timeout(200)


async def test_first_run_and_csp(browser):
    ctx, page = await new_page(browser, {"width": 390, "height": 844})
    await page.goto(BASE + "/app.html")
    await page.wait_for_timeout(1500)
    setup = await page.evaluate("getComputedStyle(document.getElementById('setup-overlay')).display")
    lock = await page.evaluate("getComputedStyle(document.getElementById('lock-overlay')).display")
    await page.screenshot(path=os.path.join(SHOTS, "after_first_visit_mobile.png"))
    record("first visit shows PIN setup (not the lock screen)", setup != "none" and lock == "none", f"setup={setup} lock={lock}")
    await page.fill("#setup-pin", PIN)
    await page.fill("#setup-pin-confirm", PIN)
    await page.click("#setup-confirm-btn")
    await page.wait_for_function("document.getElementById('setup-overlay').style.display==='none'", timeout=20000)
    await page.wait_for_timeout(1500)
    record("no Content-Security-Policy violations", not page.csp, "; ".join(page.csp[:3]))
    record("no uncaught page errors", not page.errors, "; ".join(page.errors[:3]))
    overflow = await page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    await page.screenshot(path=os.path.join(SHOTS, "after_unlocked_mobile.png"))
    record("no horizontal page scroll at 390px", overflow <= 1, f"overflow={overflow}px")
    empty = await page.evaluate("appState.modules.length")
    record("no demo data is seeded into a new user's data", empty == 0, f"modules={empty}")
    await ctx.close()


async def test_key_separation(browser):
    ctx, page = await new_page(browser)
    await setup_pin(page)
    await add_module(page, "NET301", "Networks")
    verdict = await page.evaluate("""(async()=>{
      const hex = s => new Uint8Array(s.match(/../g).map(x=>parseInt(x,16)));
      const ver = localStorage.getItem('ss_pin_verifier');
      if (!ver) return 'no verifier stored';
      if (localStorage.getItem('ss_pin_hash')) return 'legacy hash still stored';
      const key = await crypto.subtle.importKey('raw', hex(ver), {name:'AES-GCM'}, false, ['decrypt']);
      const k = Object.keys(localStorage).find(k => k.startsWith('ss_enc_'));
      const [iv, c] = localStorage.getItem(k).split(':');
      try { await crypto.subtle.decrypt({name:'AES-GCM', iv: hex(iv)}, key, hex(c)); return 'DECRYPTED WITH STORED VALUE'; }
      catch { return 'ok'; }
    })()""")
    kdf = await page.evaluate("localStorage.getItem('ss_kdf')")
    record("stored PIN verifier cannot decrypt data (v2 key separation)", verdict == "ok", f"{verdict}; kdf={kdf}")
    await ctx.close()


async def test_legacy_migration(browser):
    ctx, page = await new_page(browser)
    await page.goto(BASE + "/404.html")  # same origin, without the app running
    await page.evaluate("""(async()=>{
      const pin='1234', enc=new TextEncoder();
      const salt=crypto.getRandomValues(new Uint8Array(16));
      const mat=await crypto.subtle.importKey('raw',enc.encode(pin),{name:'PBKDF2'},false,['deriveBits','deriveKey']);
      const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},mat,256));
      const key=await crypto.subtle.importKey('raw',bits,{name:'AES-GCM'},false,['encrypt']);
      const hex=b=>Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('');
      const put=async(k,v)=>{const iv=crypto.getRandomValues(new Uint8Array(12));const c=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(v))));localStorage.setItem('ss_enc_'+k,hex(iv)+':'+hex(c));};
      localStorage.setItem('ss_pin_hash',hex(bits)); localStorage.setItem('ss_pin_salt',hex(salt)); localStorage.setItem('ss_setup_done','true');
      await put('studysmart_modules',[{id:'m1',code:'OLD101',name:'Legacy module',examDate:'',difficulty:'easy',color:'#123456',topics:[]}]);
      await put('studysmart_flashcards',[]);
    })()""")
    await page.goto(BASE + "/app.html")
    await unlock(page, "1234")
    await page.wait_for_timeout(500)
    state = await page.evaluate("({mods: appState.modules.map(m=>m.code), kdf: localStorage.getItem('ss_kdf'), legacy: localStorage.getItem('ss_pin_hash')})")
    record("legacy (v1) data unlocks and is upgraded to v2", state["mods"] == ["OLD101"] and state["kdf"] and not state["legacy"], json.dumps(state))
    await ctx.close()


async def test_xss_and_duplicates(browser):
    ctx, page = await new_page(browser)
    await setup_pin(page)
    await add_module(page, "XSS1", XSS)
    for tab in ["modules", "dashboard", "flashcards", "pomodoro", "schedule"]:
        await go_tab(page, tab)
    fired = await page.evaluate("window.__xss || 0")
    record("module names are escaped everywhere (no stored XSS)", fired == 0, f"handlers fired={fired}")
    # lock and unlock, then add a module once: must create exactly one
    await page.click("#manual-lock-btn")
    await unlock(page)
    before = await page.evaluate("appState.modules.length")
    await add_module(page, "DUP1", "Duplicate check")
    after = await page.evaluate("appState.modules.length")
    record("unlocking again does not duplicate submissions", after - before == 1, f"added {after - before}")
    await ctx.close()


async def test_persistence_export_import(browser):
    ctx, page = await new_page(browser)
    await setup_pin(page)
    await page.evaluate("""(async()=>{appState.assessments.push({id:'as_1',moduleId:'x',name:'Final exam',date:'2026-11-20'}); appState.settings.geminiKey='%s'; await saveState();})()""" % FAKE_KEY)
    await page.reload()
    await unlock(page)
    kept = await page.evaluate("appState.assessments.length")
    record("assessments survive a reload (were never saved before)", kept == 1, f"assessments={kept}")

    async with page.expect_download() as dl:
        await page.click("#export-data-btn")
    path = await (await dl.value).path()
    exported = json.load(open(path))
    leaked = FAKE_KEY in json.dumps(exported) or "isPremium" in exported or "aiConsent" in exported.get("settings", {})
    record("backup export excludes the Gemini key and premium flag", not leaked)

    evil = {"modules": [{"id": "m1", "code": "EV1", "name": XSS, "color": "red;background:url(https://evil.example/x)", "topics": "nope"}],
            "flashcards": [{"id": "c1", "moduleId": "m1", "front": XSS, "back": "b", "box": 99}],
            "isPremium": True, "settings": {"geminiKey": "stolen", "weekdayHours": 999}}
    evil_path = os.path.join(HERE, "evil_backup.json")
    json.dump(evil, open(evil_path, "w"))
    page.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
    await page.set_input_files("#backup-file-input", evil_path)
    await page.wait_for_timeout(1500)
    await unlock(page)
    st = await page.evaluate("({premium: !!appState.isPremium, color: appState.modules[0] && appState.modules[0].color, box: appState.flashcards[0] && appState.flashcards[0].box, key: appState.settings.geminiKey, hours: appState.settings.weekdayHours, topics: Array.isArray(appState.modules[0].topics)})")
    for tab in ["modules", "flashcards", "dashboard"]:
        await go_tab(page, tab)
    fired = await page.evaluate("window.__xss || 0")
    ok = (not st["premium"] and st["color"] == "#8b5cf6" and st["box"] == 1 and st["key"] == FAKE_KEY and st["hours"] == 24 and st["topics"] and fired == 0)
    record("malicious backup import is sanitised (no premium, no CSS/HTML injection, key kept)", ok, json.dumps(st) + f" xss={fired}")
    os.remove(evil_path)
    await ctx.close()


async def test_lockout_persists(browser):
    ctx, page = await new_page(browser)
    await setup_pin(page)
    await page.reload()
    await page.wait_for_selector("#lock-overlay", state="visible")
    for _ in range(3):
        await page.fill("#lock-pin", "000000")
        await page.click("#unlock-btn")
        await page.wait_for_timeout(1200)
    await page.reload()
    await page.wait_for_selector("#lock-overlay", state="visible")
    await page.wait_for_timeout(500)
    disabled = await page.evaluate("document.getElementById('lock-pin').disabled")
    attempts = await page.evaluate("JSON.parse(localStorage.getItem('ss_lockout')||'{}').attempts")
    record("PIN lockout survives a reload / closing the tab", disabled and attempts == 3, f"disabled={disabled} attempts={attempts}")
    await ctx.close()


async def test_premium_gate_off(browser):
    ctx, page = await new_page(browser)
    await setup_pin(page)
    for i in range(6):
        await add_module(page, f"M{i}", f"Module {i}")
    count = await page.evaluate("appState.modules.length")
    modal = await page.evaluate("document.getElementById('premium-modal').classList.contains('active')")
    btn = await page.evaluate("getComputedStyle(document.getElementById('premium-upgrade-btn')).display")
    record("with billing unconfigured, nobody is blocked by an upgrade they cannot buy", count == 6 and not modal and btn == "none", f"modules={count} modal={modal} button={btn}")
    ok = await page.evaluate("typeof window.__backdoor === 'undefined' && !document.getElementById('license-key-input')")
    record("PREMIUM-TEST licence backdoor removed", ok)
    await ctx.close()


async def test_ai_consent_and_scan(browser):
    ctx, page = await new_page(browser)
    calls = []

    async def fake_gemini(route):
        req = route.request
        calls.append({"url": req.url, "key_header": req.headers.get("x-goog-api-key"), "body": req.post_data or ""})
        body = json.loads(req.post_data or "{}")
        has_image = any("inlineData" in p for p in body.get("contents", [{}])[0].get("parts", []))
        if has_image:
            text = json.dumps({"topic": "Subnetting " + XSS, "concepts": ["CIDR"], "flashcards": [
                {"q": "What is CIDR? " + XSS, "a": "Classless Inter-Domain Routing"},
                {"q": "How many addresses in a /24?", "a": "256"}]})
        else:
            text = "Here is an answer " + XSS
        await route.fulfill(status=200, content_type="application/json",
                            body=json.dumps({"candidates": [{"content": {"parts": [{"text": text}]}}]}))
    await ctx.route("https://generativelanguage.googleapis.com/**", fake_gemini)

    await setup_pin(page)
    await go_tab(page, "jarvis")
    await page.fill("#gemini-api-key", FAKE_KEY)
    await page.click("#save-gemini-key-btn")
    await page.fill("#jarvis-input", "hello")
    await page.click("#jarvis-send-btn")
    await page.wait_for_selector("#ai-consent-modal.active")
    await page.click("#ai-consent-decline")
    await page.wait_for_timeout(300)
    record("no data is sent to Gemini before consent", len(calls) == 0, f"calls={len(calls)}")

    await page.click("#jarvis-send-btn")
    await page.wait_for_selector("#ai-consent-modal.active")
    await page.click("#ai-consent-accept")  # without the 18+ box: must refuse
    await page.wait_for_timeout(200)
    still_open = await page.evaluate("document.getElementById('ai-consent-modal').classList.contains('active')")
    await page.check("#ai-consent-age")
    await page.click("#ai-consent-accept")
    await page.wait_for_timeout(800)
    key_in_url = any(FAKE_KEY in c["url"] for c in calls)
    header_ok = bool(calls) and calls[-1]["key_header"] == FAKE_KEY
    record("AI consent requires the 18+ confirmation", still_open)
    record("Gemini key is sent in a header, not the URL", header_ok and not key_in_url, f"calls={len(calls)}")
    fired = await page.evaluate("window.__xss || 0")
    record("AI chat replies are shown as text (no XSS)", fired == 0)

    # Smart Scan with real OpenCV processing on a synthetic page photo
    await go_tab(page, "smartscan")
    await page.wait_for_function("window.VisionSystem && VisionSystem.isReady", timeout=90000)
    await page.set_input_files("#file-upload", os.path.join(HERE, "fixture_page.jpg"))
    await page.wait_for_function("document.getElementById('btn-scan').style.display==='block'")
    await page.wait_for_timeout(300)
    await page.click("#btn-scan")
    await page.wait_for_selector("#scan-review textarea", timeout=30000)
    trace = await page.inner_text("#agent-trace-list")
    record("OpenCV finds and straightens the page on the device", "straightened" in trace, trace.replace("\n", " | ")[:200])
    await page.screenshot(path=os.path.join(SHOTS, "after_scan_review.png"), full_page=True)
    before = await page.evaluate("appState.flashcards.length")
    await page.click("#btn-approve-plan")
    await page.wait_for_timeout(500)
    after = await page.evaluate("appState.flashcards.length")
    labelled = await page.evaluate("appState.flashcards.slice(-2).every(c => c.aiGenerated === true && c.box === 1)")
    for tab in ["flashcards", "modules", "dashboard"]:
        await go_tab(page, tab)
    fired = await page.evaluate("window.__xss || 0")
    record("reviewed AI flashcards are saved once, labelled, with no XSS", after - before == 2 and labelled and fired == 0, f"added={after - before} xss={fired}")
    record("no CSP violations during AI and scan flows", not page.csp, "; ".join(page.csp[:2]))
    await ctx.close()


async def test_erase_all(browser):
    ctx, page = await new_page(browser)
    await setup_pin(page)
    await add_module(page, "ER1", "Erase me")
    page.on("dialog", lambda d: asyncio.ensure_future(d.accept("ERASE") if d.type == "prompt" else d.accept()))
    await go_tab(page, "settings")
    await page.click("#settings-erase-btn")
    await page.wait_for_timeout(1500)
    await page.wait_for_selector("#setup-overlay", state="visible")
    left = await page.evaluate("Object.keys(localStorage).filter(k => k.startsWith('ss_enc_') || k === 'ss_pin_verifier')")
    record("Erase all data removes study data and the PIN", left == [], f"left={left}")
    await ctx.close()


async def test_offline_and_pages(browser):
    ctx, page = await new_page(browser)
    await setup_pin(page)
    await page.wait_for_timeout(2500)  # let the service worker install
    await ctx.set_offline(True)
    await page.reload()
    ok = await page.evaluate("!!document.getElementById('lock-overlay')")
    record("app opens offline after the first visit", ok)
    await ctx.set_offline(False)
    statuses = {}
    for path in ["/", "/index.html", "/privacy.html", "/terms.html", "/copyright.html", "/notices.html", "/404.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png", "/landing.js", "/legal.css"]:
        r = await page.request.get(BASE + path)
        statuses[path] = r.status
    record("landing, legal pages, icons and manifest are served", all(v == 200 for v in statuses.values()), json.dumps({k: v for k, v in statuses.items() if v != 200}))
    await ctx.close()

    ctx, page = await new_page(browser, {"width": 390, "height": 844})
    await page.goto(BASE + "/index.html")
    await page.wait_for_timeout(500)
    overflow = await page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    await page.screenshot(path=os.path.join(SHOTS, "landing_mobile.png"), full_page=False)
    record("landing page: no horizontal scroll at 390px and no CSP errors", overflow <= 1 and not page.csp and not page.errors,
           f"overflow={overflow} csp={page.csp[:1]} errors={page.errors[:1]}")
    await page.goto(BASE + "/privacy.html")
    has_banner = await page.evaluate("!!document.querySelector('.legal-draft')")
    record("unfinished legal pages show a visible draft banner", has_banner)
    await ctx.close()


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for t in [test_first_run_and_csp, test_key_separation, test_legacy_migration, test_xss_and_duplicates,
                  test_persistence_export_import, test_lockout_persists, test_premium_gate_off,
                  test_ai_consent_and_scan, test_erase_all, test_offline_and_pages]:
            try:
                await t(browser)
            except Exception as e:  # noqa: BLE001
                record(t.__name__, False, f"exception: {e!r}"[:300])
                traceback.print_exc()
        await browser.close()
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    asyncio.run(main())
