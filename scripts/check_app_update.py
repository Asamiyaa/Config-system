"""Exercise the actual updater in Chromium without production account writes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
JS = Path('static/app-update.js').read_text(encoding='utf-8')
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for scenario in ['hidden-dialog', 'offline-first', 'dirty-save', 'visible-dialog', 'focused-input', 'unchanged']:
        page = browser.new_page()
        state = {'version': 'v1', 'requests': 0, 'documents': 0}
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        def route(r):
            if '/api/app-version' in r.request.url:
                state['requests'] += 1
                if scenario == 'offline-first' and state['requests'] == 1:
                    r.abort(); return
                r.fulfill(json={'version': state['version']}); return
            state['documents'] += 1
            setup = "let unsavedChanges=false;"
            if state['documents'] == 1 and scenario == 'dirty-save': setup += 'unsavedChanges=true;'
            display = 'block' if scenario == 'visible-dialog' else 'none'
            html = f'<html><head><meta name="app-version" content="{state["version"]}"></head><body><div role="dialog" style="display:{display}">Dialog</div><input id="draft"><script>{setup}</script></body></html>'
            r.fulfill(body=html, content_type='text/html')
        page.route('**/*', route)
        page.goto('http://update.test/')
        page.add_script_tag(content=JS)
        page.wait_for_function('!!window.XindengUpdate')
        page.wait_for_timeout(150)
        if scenario == 'focused-input': page.locator('#draft').focus()
        if scenario != 'unchanged': state['version'] = 'v2'
        page.evaluate('XindengUpdate.check()')
        if scenario in ['dirty-save','visible-dialog','focused-input','unchanged']:
            page.wait_for_timeout(300)
            assert state['documents'] == 1, scenario
            if scenario == 'dirty-save': page.evaluate('unsavedChanges=false')
            if scenario == 'visible-dialog': page.locator('[role=dialog]').evaluate("e=>e.style.display='none'")
            if scenario == 'focused-input': page.locator('#draft').evaluate('e=>e.blur()')
        if scenario != 'unchanged':
            page.wait_for_url('**_release=v2', timeout=7000)
            assert state['documents'] == 2, (scenario,state)
        assert not errors, errors
        print('PASS', scenario)
        page.close()
    browser.close()
