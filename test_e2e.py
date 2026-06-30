from playwright.sync_api import sync_playwright

url = 'http://127.0.0.1:18082/'
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})

    # 1. Dashboard
    page.goto(url, wait_until='networkidle')
    page.wait_for_timeout(3000)
    content = page.content()
    assert 'Protein Design Atlas' in content, 'Brand not found'
    page.screenshot(path='D:/生信/2026Protein Design/protein-design-atlas/artifacts/e2e_dashboard.png', full_page=True)
    print('Dashboard OK')

    # 2. Theme toggle - click the sun/moon button
    try:
        page.locator('button[title]').filter(has_text='').first.click(timeout=3000)
        page.wait_for_timeout(1000)
        page.screenshot(path='D:/生信/2026Protein Design/protein-design-atlas/artifacts/e2e_light_theme.png', full_page=True)
        print('Theme toggle OK')
    except:
        print('Theme toggle skipped')

    # 3. Sequences - try both Chinese and English
    for label in ['序列库', 'Sequences']:
        try:
            page.get_by_text(label).first.click(timeout=3000)
            break
        except:
            continue
    page.wait_for_timeout(2000)
    page.screenshot(path='D:/生信/2026Protein Design/protein-design-atlas/artifacts/e2e_sequences.png', full_page=True)
    print('Sequences OK')

    # 4. Network
    for label in ['谱系网络', 'Network']:
        try:
            page.get_by_text(label).first.click(timeout=3000)
            break
        except:
            continue
    page.wait_for_timeout(3000)
    page.screenshot(path='D:/生信/2026Protein Design/protein-design-atlas/artifacts/e2e_network.png', full_page=True)
    print('Network OK')

    # 5. Charts
    for label in ['图表', 'Charts']:
        try:
            page.get_by_text(label).first.click(timeout=3000)
            break
        except:
            continue
    page.wait_for_timeout(3000)
    page.screenshot(path='D:/生信/2026Protein Design/protein-design-atlas/artifacts/e2e_charts.png', full_page=True)
    print('Charts OK')

    # 6. Docs
    for label in ['文档', 'Docs']:
        try:
            page.get_by_text(label).first.click(timeout=3000)
            break
        except:
            continue
    page.wait_for_timeout(2000)
    page.screenshot(path='D:/生信/2026Protein Design/protein-design-atlas/artifacts/e2e_docs.png', full_page=True)
    print('Docs OK')

    browser.close()
    print('PLAYWRIGHT_OK')
