import os
import json
import re

deploy_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data_dir = os.path.join(deploy_root, "data")

def load_json(name):
    clean_name = name[:-5] if name.endswith(".json") else name
    path = os.path.normpath(os.path.join(data_dir, f"{clean_name}.json"))
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

def save_json(name, data):
    clean_name = name[:-5] if name.endswith(".json") else name
    path = os.path.normpath(os.path.join(data_dir, f"{clean_name}.json"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Mirror to workspace root
    workspace_root = os.path.dirname(deploy_root)
    if workspace_root and os.path.isdir(workspace_root) and workspace_root != deploy_root:
        try:
            ws_path = os.path.normpath(os.path.join(workspace_root, "data", f"{clean_name}.json"))
            os.makedirs(os.path.dirname(ws_path), exist_ok=True)
            with open(ws_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

def format_page_img_url(path, depth=1):
    if not path:
        return ""
    if path.startswith(("http://", "https://", "data:", "blob:")):
        return path
    clean = re.sub(r"^(\.\./)+", "", path).lstrip("/")
    prefix = "../../" if depth == 2 else ("../" if depth == 1 else "")
    return f"{prefix}{clean}"

def write_page_file(rel_path, html):
    target = os.path.normpath(os.path.join(deploy_root, rel_path))
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, "w", encoding="utf-8") as f:
        f.write(html)

    # Mirror to workspace root
    workspace_root = os.path.dirname(deploy_root)
    if workspace_root and os.path.isdir(workspace_root) and workspace_root != deploy_root:
        try:
            ws_target = os.path.normpath(os.path.join(workspace_root, rel_path))
            os.makedirs(os.path.dirname(ws_target), exist_ok=True)
            with open(ws_target, "w", encoding="utf-8") as f:
                f.write(html)
        except Exception:
            pass
    return True

def render_concert_item(item, is_event=True):
    title = item.get("title", "")
    subtitle = item.get("subtitle", "")
    img_src = format_page_img_url(item.get("image", ""), depth=1)
    video_url = item.get("video_url", "")
    content = item.get("content", [])
    price_html = item.get("price_html", "")
    buttons = item.get("buttons", [])
    learn_more_html = item.get("learn_more_html", "")
    learn_more_id = item.get("learn_more_id", "") or f"info_{abs(hash(title)) % 100000}"
    card_link = item.get("card_link", "")

    has_media = bool(img_src or video_url)
    cls = "concert-item" if has_media else "concert-item concert-item--no-media"

    media_html = ""
    if has_media:
        media_inner = ""
        if img_src:
            if card_link:
                media_inner += f'<a href="{card_link}"><img src="{img_src}" alt="{title}"></a>'
            else:
                media_inner += f'<img src="{img_src}" alt="{title}">'
        if video_url:
            style_attr = ' style="margin-top: 16px;"' if img_src else ''
            media_inner += f'<div class="video-responsive-frame"{style_attr}><iframe src="{video_url}" title="{title}" allowfullscreen></iframe></div>'
        media_html = f"<div>\n                    {media_inner}\n                </div>"

    info_parts = [f"<h2>{title}</h2>"]
    if subtitle:
        info_parts.append(f'<p style="color: var(--text-meta) !important; font-weight: 500; margin-bottom: 12px;">{subtitle}</p>')

    for p in content:
        if p.strip().startswith("<p"):
            info_parts.append(p)
        else:
            info_parts.append(f"<p>\n                        {p}\n                    </p>")

    if price_html:
        if price_html.strip().startswith("<p"):
            info_parts.append(price_html)
        else:
            info_parts.append(f'<p class="price" style="margin-top: 16px;">\n                        {price_html}\n                    </p>')

    if buttons:
        btn_tags = []
        for b in buttons:
            label = b.get("label", "")
            url = b.get("url", "")
            target = ' target="_blank" rel="noopener"' if url.startswith("http") else ""
            btn_tags.append(f'<a href="{url}" class="buy-button"{target}>{label}</a>')
        info_parts.append(f'<div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px;">\n                        {" ".join(btn_tags)}\n                    </div>')

    if learn_more_html:
        accordion = f'''<div class="info">
                        <input id="{learn_more_id}" class="info__switch" type="checkbox">
                        <label for="{learn_more_id}" class="info__headline">Learn more</label>
                        <div class="info__body">
                            {learn_more_html}
                        </div>
                    </div>'''
        info_parts.append(accordion)

    info_html = f'<div class="concert-info">\n                    ' + "\n                    ".join(info_parts) + "\n                </div>"

    if has_media:
        return f'<div class="{cls}">\n                {media_html}\n                {info_html}\n            </div>'
    else:
        return f'<div class="{cls}">\n                {info_html}\n            </div>'

def build_events_page():
    data = load_json("events")
    if not data:
        return False

    upcoming_items = "\n\n".join(render_concert_item(it) for it in data.get("upcoming", []))
    past_tirol_items = "\n\n".join(render_concert_item(it) for it in data.get("past_tirol", []))
    past_abroad_items = "\n\n".join(render_concert_item(it) for it in data.get("past_abroad", []))

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Events — MMDT</title>
    <meta name="description" content="Upcoming and past visual and performative art events by Motion Mode of Dialogue in Tirol.">
    <link rel="shortcut icon" href="../img/common/brand/lg.png" type="image/x-icon">
    <link rel="stylesheet" href="../css/modern-redesign.css">
    <script src="../js/modern-redesign.js" defer></script>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header__inner">
                <div class="header__logo">
                    <a href="../index.html" aria-label="MMDT Home"><img src="../img/common/brand/logo_black.png" alt="MMDT"></a>
                </div>
                <nav class="nav">
                    <a class="nav__link" href="projects.html">Projects</a>
                    <a class="nav__link" href="festival.html">Festival</a>
                    <a class="nav__link" href="classes.html">Classes</a>
                    <a class="nav__link active" href="events.html">Events</a>
                    <a class="nav__link" href="partners.html">Partners</a>
                    <a class="nav__link" href="membership.html">Membership</a>
                    <a class="nav__link" href="contacts.html">Contacts</a>
                </nav>
                <div class="header__actions">
                    <a class="header__cta-mail" href="mailto:mm.of.dialogue.in.tyrol@gmail.com" title="Get in touch via email" aria-label="Contact MMDT via email">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                        </svg>
                        <span class="mail-text">Get in touch</span>
                    </a>
                    <button class="burger-menu-btn" aria-label="Menu" id="burgerBtn">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <section class="intro">
        <div class="container">
            <span class="section-tag">Program &amp; Schedule</span>
            <div class="intro__projects">Events</div>
        </div>
    </section>

    <!-- Tabs Navigation -->
    <div class="tabs-container">
        <button class="tab-button active" data-tab="upcoming" onclick="switchEventTab('upcoming')">Upcoming</button>
        <button class="tab-button" data-tab="past-tirol" onclick="switchEventTab('past-tirol')">Past (In Tirol)</button>
        <button class="tab-button" data-tab="past-abroad" onclick="switchEventTab('past-abroad')">Past (Abroad)</button>
    </div>

    <main class="container" style="padding-bottom: 64px;">

        <!-- Tab 1: Upcoming Events -->
        <div id="upcoming" class="tab-content" style="display: block;">
            <div class="concert-list">
{upcoming_items}
            </div>
        </div>

        <!-- Tab 2: Past Events (In Tirol) -->
        <div id="past-tirol" class="tab-content" style="display: none;">
            <div class="concert-list">
{past_tirol_items}
            </div>
        </div>

        <!-- Tab 3: Past Events (Abroad) -->
        <div id="past-abroad" class="tab-content" style="display: none;">
            <div class="concert-list">
{past_abroad_items}
            </div>
        </div>

    </main>

    <footer>
        <div class="footer">
            <div class="footer_element">
                <a href="../index.html" style="text-decoration: none; font-weight: 500; font-size: 0.9rem; letter-spacing: 0.05em; text-transform: uppercase;">Motion Mode of Dialogue in Tirol</a><br><br>
                <img src="../img/common/brand/visa_mc.png" alt="Payment Methods">
            </div>
            <div class="footer_element" style="display: flex; flex-direction: column; align-items: flex-end;">
                <a href="legal/Privacy_policy.html">Privacy Policy</a>
                <a href="legal/Refund_policy.html">Refund &amp; Return Policy</a>
                <a href="legal/Terms&Conditions.html">Terms &amp; Conditions</a>
                <a href="legal/GEP.html">Gender Equality Plan</a>
            </div>
        </div>
    </footer>
</body>
</html>'''
    return write_page_file("pages/events.html", html)

def build_classes_page():
    raw_data = load_json("classes")
    if not raw_data:
        return False

    classes_list = raw_data if isinstance(raw_data, list) else [raw_data]

    items_html = []
    for data in classes_list:
        title = data.get("title", "")
        tag = data.get("tag", "")
        img_src = format_page_img_url(data.get("image", ""), depth=1)
        intro = data.get("intro", "")
        schedule = data.get("schedule", "")
        time_info = data.get("time", "")
        venue = data.get("venue", "")
        group_size = data.get("group_size", "")
        dates = data.get("upcoming_dates", {})
        price_info = data.get("price_info", "")
        policy = data.get("policy", "")
        contact_note = data.get("contact_note", "")
        buttons = data.get("buttons", [])

        dates_lines = "<br>\n".join(f"<strong>{month}:</strong> {d_str}" for month, d_str in dates.items())

        btn_tags = []
        for b in buttons:
            btn_tags.append(f'<a href="{b.get("url", "")}" class="buy-button" target="_blank" rel="noopener">{b.get("label", "")}</a>')
        buttons_html = " ".join(btn_tags)

        img_html = f'<div><img src="{img_src}" alt="{title}"></div>' if img_src else ""
        intro_html = f'<p>{intro.replace(chr(10)+chr(10), "<br><br>").replace(chr(10), "<br>")}</p>' if intro else ""

        has_specs = bool(schedule or time_info or venue or group_size or dates)
        specs_html = ""
        if has_specs:
            time_loc = ""
            if schedule: time_loc += f"<strong>Schedule:</strong> {schedule}<br>"
            if time_info: time_loc += f"<strong>Time:</strong> {time_info}<br>"
            if venue: time_loc += f"<strong>Venue:</strong> {venue}<br>"
            if group_size: time_loc += f"<strong>Group size:</strong> {group_size}"

            time_loc_box = f'<div><div class="manifesto-label" style="margin-bottom: 8px;">Time &amp; Location</div><p style="margin: 0;">{time_loc}</p></div>' if time_loc else ''
            dates_box = f'<div><div class="manifesto-label" style="margin-bottom: 8px;">Upcoming Dates</div><p style="margin: 0;">{dates_lines}</p></div>' if dates else ''

            specs_html = f'''<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin: 28px 0; padding: 24px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
                        {time_loc_box}
                        {dates_box}
                    </div>'''

        price_html = f'<p>{price_info}</p>' if price_info else ""
        policy_html = f'<p style="color: var(--text-meta) !important; font-size: 0.9rem !important;">{policy}</p>' if policy else ""
        contact_html = f'<p style="margin-top: 16px;"><em>{contact_note}</em></p>' if contact_note else ""
        btns_container = f'<div style="margin-top: 24px; display: flex; flex-wrap: wrap; gap: 12px;">{buttons_html}</div>' if buttons_html else ""

        tag_html = f'<span class="section-tag" style="margin-bottom: 8px;">{tag}</span>' if tag else ""

        items_html.append(f'''            <div class="concert-item" style="border-top: 1px solid var(--border); padding-top: 48px !important;">
                {img_html}
                <div class="concert-info">
                    {tag_html}
                    <h2>{title}</h2>
                    {intro_html}
                    {specs_html}
                    {price_html}
                    {policy_html}
                    {contact_html}
                    {btns_container}
                </div>
            </div>''')

    all_items_str = "\n\n".join(items_html)

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Classes — MMDT</title>
    <meta name="description" content="Weekly somatic and movement classes in Innsbruck by Motion Mode of Dialogue in Tirol.">
    <link rel="shortcut icon" href="../img/common/brand/lg.png" type="image/x-icon">
    <link rel="stylesheet" href="../css/modern-redesign.css">
    <script src="../js/modern-redesign.js" defer></script>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header__inner">
                <div class="header__logo">
                    <a href="../index.html" aria-label="MMDT Home"><img src="../img/common/brand/logo_black.png" alt="MMDT"></a>
                </div>
                <nav class="nav">
                    <a class="nav__link" href="projects.html">Projects</a>
                    <a class="nav__link" href="festival.html">Festival</a>
                    <a class="nav__link active" href="classes.html">Classes</a>
                    <a class="nav__link" href="events.html">Events</a>
                    <a class="nav__link" href="partners.html">Partners</a>
                    <a class="nav__link" href="membership.html">Membership</a>
                    <a class="nav__link" href="contacts.html">Contacts</a>
                </nav>
                <div class="header__actions">
                    <a class="header__cta-mail" href="mailto:mm.of.dialogue.in.tyrol@gmail.com" title="Get in touch via email" aria-label="Contact MMDT via email">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                        </svg>
                        <span class="mail-text">Get in touch</span>
                    </a>
                    <button class="burger-menu-btn" aria-label="Menu" id="burgerBtn">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <section class="intro">
        <div class="container">
            <span class="section-tag">Weekly Practice &amp; Somatic Movement</span>
            <div class="intro__projects">Classes</div>
        </div>
    </section>

    <main class="container" style="padding-bottom: 80px;">
        <div class="concert-list">
{all_items_str}
        </div>
    </main>

    <footer>
        <div class="footer">
            <div class="footer_element">
                <a href="../index.html" style="text-decoration: none; font-weight: 500; font-size: 0.9rem; letter-spacing: 0.05em; text-transform: uppercase;">Motion Mode of Dialogue in Tirol</a><br><br>
                <img src="../img/common/brand/visa_mc.png" alt="Payment Methods">
            </div>
            <div class="footer_element" style="display: flex; flex-direction: column; align-items: flex-end;">
                <a href="legal/Privacy_policy.html">Privacy Policy</a>
                <a href="legal/Refund_policy.html">Refund &amp; Return Policy</a>
                <a href="legal/Terms&Conditions.html">Terms &amp; Conditions</a>
                <a href="legal/GEP.html">Gender Equality Plan</a>
            </div>
        </div>
    </footer>
</body>
</html>'''
    return write_page_file("pages/classes.html", html)

def build_news_page():
    data = load_json("news")
    if not data:
        return False

    items_html = []
    for item in data:
        title = item.get("title", "")
        subtitle = item.get("subtitle", "")
        img_src = format_page_img_url(item.get("image", ""), depth=1)
        content = item.get("content", [])
        buttons = item.get("buttons", [])

        img_tag = f'<img src="{img_src}" alt="{title}">' if img_src else ""
        media_html = f"<div>\n                    {img_tag}\n                </div>" if img_src else ""

        info_parts = [f"<h2>{title}</h2>"]
        if subtitle:
            info_parts.append(f'<p style="color: var(--text-meta) !important; font-weight: 500; margin-bottom: 12px;">{subtitle}</p>')
        for p in content:
            info_parts.append(f"<p>\n                        {p}\n                    </p>")

        if buttons:
            btn_tags = []
            for b in buttons:
                label = b.get("label", "")
                url = b.get("url", "")
                target = ' target="_blank" rel="noopener"' if url.startswith("http") else ""
                btn_tags.append(f'<a href="{url}" class="buy-button"{target}>{label}</a>')
            info_parts.append(f'<div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px;">\n                        {" ".join(btn_tags)}\n                    </div>')

        info_html = f'<div class="concert-info">\n                    ' + "\n                    ".join(info_parts) + "\n                </div>"

        items_html.append(f'<div class="concert-item">\n                {media_html}\n                {info_html}\n            </div>')

    news_items = "\n\n".join(items_html)

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>News &amp; Updates — MMDT</title>
    <meta name="description" content="Latest news, workshops, and updates from Motion Mode of Dialogue in Tirol.">
    <link rel="shortcut icon" href="../img/common/brand/lg.png" type="image/x-icon">
    <link rel="stylesheet" href="../css/modern-redesign.css">
    <script src="../js/modern-redesign.js" defer></script>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header__inner">
                <div class="header__logo">
                    <a href="../index.html" aria-label="MMDT Home"><img src="../img/common/brand/logo_black.png" alt="MMDT"></a>
                </div>
                <nav class="nav">
                    <a class="nav__link" href="projects.html">Projects</a>
                    <a class="nav__link" href="festival.html">Festival</a>
                    <a class="nav__link" href="classes.html">Classes</a>
                    <a class="nav__link" href="events.html">Events</a>
                    <a class="nav__link" href="partners.html">Partners</a>
                    <a class="nav__link" href="membership.html">Membership</a>
                    <a class="nav__link" href="contacts.html">Contacts</a>
                </nav>
                <div class="header__actions">
                    <a class="header__cta-mail" href="mailto:mm.of.dialogue.in.tyrol@gmail.com" title="Get in touch via email" aria-label="Contact MMDT via email">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                        </svg>
                        <span class="mail-text">Get in touch</span>
                    </a>
                    <button class="burger-menu-btn" aria-label="Menu" id="burgerBtn">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <section class="intro">
        <div class="container">
            <span class="section-tag">Journal &amp; Announcements</span>
            <div class="intro__projects">News &amp; Updates</div>
        </div>
    </section>

    <main class="container" style="padding-bottom: 80px;">
        <div class="concert-list">
{news_items}
        </div>
    </main>

    <footer>
        <div class="footer">
            <div class="footer_element">
                <a href="../index.html" style="text-decoration: none; font-weight: 500; font-size: 0.9rem; letter-spacing: 0.05em; text-transform: uppercase;">Motion Mode of Dialogue in Tirol</a><br><br>
                <img src="../img/common/brand/visa_mc.png" alt="Payment Methods">
            </div>
            <div class="footer_element" style="display: flex; flex-direction: column; align-items: flex-end;">
                <a href="legal/Privacy_policy.html">Privacy Policy</a>
                <a href="legal/Refund_policy.html">Refund &amp; Return Policy</a>
                <a href="legal/Terms&Conditions.html">Terms &amp; Conditions</a>
                <a href="legal/GEP.html">Gender Equality Plan</a>
            </div>
        </div>
    </footer>
</body>
</html>'''
    return write_page_file("pages/news.html", html)

def build_projects_page():
    data = load_json("projects")
    if not data:
        return False

    items = []
    for p in data:
        title = p.get("title", "")
        year = p.get("year", "")
        img = format_page_img_url(p.get("image", ""), depth=1)
        url = p.get("url", "")

        year_html = f" <strong>{year}</strong>" if year else ""
        items.append(f'''        <div class="projects_item">
            <a href="{url}"><img src="{img}" alt="{title}"></a>
            <p><span>{title}{year_html}</span></p>
        </div>''')

    cards_html = "\n".join(items)

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Projects — MMDT</title>
    <meta name="description" content="Visual and performative art projects by Motion Mode of Dialogue in Tirol.">
    <link rel="shortcut icon" href="../img/common/brand/lg.png" type="image/x-icon">
    <link rel="stylesheet" href="../css/modern-redesign.css">
    <script src="../js/modern-redesign.js" defer></script>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header__inner">
                <div class="header__logo">
                    <a href="../index.html" aria-label="MMDT Home"><img src="../img/common/brand/logo_black.png" alt="MMDT"></a>
                </div>
                <nav class="nav">
                    <a class="nav__link active" href="projects.html">Projects</a>
                    <a class="nav__link" href="festival.html">Festival</a>
                    <a class="nav__link" href="classes.html">Classes</a>
                    <a class="nav__link" href="events.html">Events</a>
                    <a class="nav__link" href="partners.html">Partners</a>
                    <a class="nav__link" href="membership.html">Membership</a>
                    <a class="nav__link" href="contacts.html">Contacts</a>
                </nav>
                <div class="header__actions">
                    <a class="header__cta-mail" href="mailto:mm.of.dialogue.in.tyrol@gmail.com" title="Get in touch via email" aria-label="Contact MMDT via email">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                        </svg>
                        <span class="mail-text">Get in touch</span>
                    </a>
                    <button class="burger-menu-btn" aria-label="Menu" id="burgerBtn">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <section class="intro">
        <div class="container">
            <span class="section-tag">Performative &middot; Research &middot; Dance</span>
            <div class="intro__projects">Projects</div>
        </div>
    </section>

    <div class="projects">
{cards_html}
    </div>

    <section class="container" style="padding-bottom: 80px;">
        <div style="border-top: 1px solid var(--border); padding-top: 48px;">
            <span class="section-tag">Featured Video Work</span>
            <h2 style="margin-bottom: 20px;">the WAReHAUSE of the nightmares</h2>
            <div class="video-responsive-frame">
                <iframe src="https://www.youtube-nocookie.com/embed/HD3r4iT8faQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <p style="margin-top: 18px; color: var(--text-meta) !important; font-size: 0.95rem !important;">The film is dedicated to all affected people in Russo-Ukrainian War 2022. The group of artists of the Contact Improvisation Festival in Turkey "West meets East" 2022 condolences to everyone who has lost their home. Movement material, as well as the images, were found during the Butoh course with Santeri Vikstr&ouml;m.</p>
        </div>
    </section>

    <footer>
        <div class="footer">
            <div class="footer_element">
                <a href="../index.html" style="text-decoration: none; font-weight: 500; font-size: 0.9rem; letter-spacing: 0.05em; text-transform: uppercase;">Motion Mode of Dialogue in Tirol</a><br><br>
                <img src="../img/common/brand/visa_mc.png" alt="Payment Methods">
            </div>
            <div class="footer_element" style="display: flex; flex-direction: column; align-items: flex-end;">
                <a href="legal/Privacy_policy.html">Privacy Policy</a>
                <a href="legal/Refund_policy.html">Refund &amp; Return Policy</a>
                <a href="legal/Terms&Conditions.html">Terms &amp; Conditions</a>
                <a href="legal/GEP.html">Gender Equality Plan</a>
            </div>
        </div>
    </footer>
</body>
</html>'''
    return write_page_file("pages/projects.html", html)

def build_festivals_page():
    data = load_json("festivals")
    if not data:
        return False

    items = []
    for p in data:
        title = p.get("title", "")
        year = p.get("year", "")
        img = format_page_img_url(p.get("image", ""), depth=1)
        url = p.get("url", "")
        href = f"../{url}" if not url.startswith("../") else url

        year_html = f" <strong>{year}</strong>" if year else ""
        items.append(f'''        <div class="projects_item">
            <a href="{href}"><img src="{img}" alt="{title}"></a>
            <p><span>{title}{year_html}</span></p>
        </div>''')

    cards_html = "\n".join(items)

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Festivals — MMDT</title>
    <meta name="description" content="Contact improvisation festivals organized by Motion Mode of Dialogue in Tirol.">
    <link rel="shortcut icon" href="../img/common/brand/lg.png" type="image/x-icon">
    <link rel="stylesheet" href="../css/modern-redesign.css">
    <script src="../js/modern-redesign.js" defer></script>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header__inner">
                <div class="header__logo">
                    <a href="../index.html" aria-label="MMDT Home"><img src="../img/common/brand/logo_black.png" alt="MMDT"></a>
                </div>
                <nav class="nav">
                    <a class="nav__link" href="projects.html">Projects</a>
                    <a class="nav__link active" href="festival.html">Festival</a>
                    <a class="nav__link" href="classes.html">Classes</a>
                    <a class="nav__link" href="events.html">Events</a>
                    <a class="nav__link" href="partners.html">Partners</a>
                    <a class="nav__link" href="membership.html">Membership</a>
                    <a class="nav__link" href="contacts.html">Contacts</a>
                </nav>
                <div class="header__actions">
                    <a class="header__cta-mail" href="mailto:mm.of.dialogue.in.tyrol@gmail.com" title="Get in touch via email" aria-label="Contact MMDT via email">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                        </svg>
                        <span class="mail-text">Get in touch</span>
                    </a>
                    <button class="burger-menu-btn" aria-label="Menu" id="burgerBtn">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <section class="intro">
        <div class="container">
            <span class="section-tag">Archive &middot; Annual Editions</span>
            <div class="intro__projects">Festivals</div>
        </div>
    </section>

    <div class="festivals">
{cards_html}
    </div>

    <footer>
        <div class="footer">
            <div class="footer_element">
                <a href="../index.html" style="text-decoration: none; font-weight: 500; font-size: 0.9rem; letter-spacing: 0.05em; text-transform: uppercase;">Motion Mode of Dialogue in Tirol</a><br><br>
                <img src="../img/common/brand/visa_mc.png" alt="Payment Methods">
            </div>
            <div class="footer_element" style="display: flex; flex-direction: column; align-items: flex-end;">
                <a href="legal/Privacy_policy.html">Privacy Policy</a>
                <a href="legal/Refund_policy.html">Refund &amp; Return Policy</a>
                <a href="legal/Terms&Conditions.html">Terms &amp; Conditions</a>
                <a href="legal/GEP.html">Gender Equality Plan</a>
            </div>
        </div>
    </footer>
</body>
</html>'''
    return write_page_file("pages/festival.html", html)

def build_index_page():
    settings = load_json("settings")
    if not settings:
        return False

    badge = settings.get("next_event_badge", {})
    badge_label = badge.get("label", "Next: Solo & CI Tirol Fest 2026 →")
    badge_url = badge.get("url", "CITyrolFest2026.html")

    news_badge = settings.get("news_badge", {})
    news_label = news_badge.get("label", "News & Updates →")
    news_url = news_badge.get("url", "pages/news.html")

    target = os.path.join(deploy_root, "index.html")
    with open(target, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace badge row in index.html cleanly
    pattern = r'<div class="intro__badge-row">.*?</div>'
    new_badge_row = f'''<div class="intro__badge-row">
                <a href="{badge_url}" class="intro__badge">
                    <span class="badge__dot"></span> {badge_label}
                </a>
                <a href="{news_url}" class="intro__badge intro__badge--ghost">
                    {news_label}
                </a>
            </div>'''
    content = re.sub(pattern, new_badge_row, content, flags=re.DOTALL)

    return write_page_file("index.html", content)

def build_all():
    res = {
        "events": build_events_page(),
        "classes": build_classes_page(),
        "news": build_news_page(),
        "projects": build_projects_page(),
        "festivals": build_festivals_page(),
        "index": build_index_page()
    }
    return res

if __name__ == "__main__":
    results = build_all()
    print("Build results:", results)
