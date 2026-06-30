from playwright.sync_api import sync_playwright

url = 'http://127.0.0.1:18083/'
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})

    # 1. Dashboard
    page.goto(url, wait_until='networkidle')
    page.wait_for_timeout(3000)
    content = page.content()
    assert 'Protein Design Atlas' in content, 'Brand not found'
    assert 'Sequences' in content, 'Metrics not found'
    page.screenshot(path='D:/生信/2026Protein Design/protein-design-atlas/artifacts/e2e_dashboard.png', full_page=True)
    print('Dashboard OK')

    # 2. Theme toggle
    theme_btn = page.locator('text=🌙').first
    if theme_btn.count() == 0:
        theme_btn = page.locator('text=☀').first
    if theme_btn.count() > 0:
        theme_btn.click()
        page.wait_for_timeout(1000)
        page.screenshot(path='D:/生信/2026Protein Design/protein-design-atlas/artifacts/e2e_light_theme.png', full_page=True)
        print('Theme toggle OK')

    # 3. Sequences
    page.get_by_text('Sequences').first.click()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    assert 'Sequence' in page.content() or 'score' in page.content().lower()
    page.screenshot(path='D:/生信/2026Protein Design/protein-design-atlas/artifacts/e2e_sequences.png', full_page=True)
    print('Sequences OK')

    # 4. Network
    page.get_by_text('Network').first.click()
    page.wait_for_timeout(3000)
    page.screenshot(path='D:/生信/2026Protein Design/protein-design-atlas/artifacts/e2e_network.png', full_page=True)
    print('Network OK')

    # 5. Charts
    page.get_by_text('Charts').first.click()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)
    page.screenshot(path='D:/生信/2026Protein Design/protein-design-atlas/artifacts/e2e_charts.png', full_page=True)
    print('Charts OK')

    # 6. Docs
    page.get_by_text('Docs').first.click()
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    page.screenshot(path='D:/生信/2026Protein Design/protein-design-atlas/artifacts/e2e_docs.png', full_page=True)
    print('Docs OK')

    browser.close()
    print('PLAYWRIGHT_OK')
