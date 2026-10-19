// ============================================================
// MMDT In-Browser Template Generator
// Generates identical Swiss minimalist HTML pages on the client
// ============================================================

window.MMDTTemplates = {

    formatPageImgUrl: function(path, depth = 1) {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
            return path;
        }
        const clean = path.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
        const prefix = depth === 2 ? '../../' : (depth === 1 ? '../' : '');
        return `${prefix}${clean}`;
    },

    renderConcertItem: function(item) {
        const title = item.title || '';
        const subtitle = item.subtitle || '';
        const imgSrc = this.formatPageImgUrl(item.image, 1);
        const videoUrl = item.video_url || '';
        const content = item.content || [];
        const priceHtml = item.price_html || '';
        const buttons = item.buttons || [];
        const learnMoreHtml = item.learn_more_html || '';
        const learnMoreId = item.learn_more_id || `info_${Math.floor(Math.random() * 100000)}`;
        const cardLink = item.card_link || '';

        const hasMedia = Boolean(imgSrc || videoUrl);
        const cls = hasMedia ? "concert-item" : "concert-item concert-item--no-media";

        let mediaHtml = "";
        if (hasMedia) {
            let mediaInner = "";
            if (imgSrc) {
                if (cardLink) {
                    mediaInner += `<a href="${cardLink}"><img src="${imgSrc}" alt="${title}"></a>`;
                } else {
                    mediaInner += `<img src="${imgSrc}" alt="${title}">`;
                }
            }
            if (videoUrl) {
                const styleAttr = imgSrc ? ' style="margin-top: 16px;"' : '';
                mediaInner += `<div class="video-responsive-frame"${styleAttr}><iframe src="${videoUrl}" title="${title}" allowfullscreen></iframe></div>`;
            }
            mediaHtml = `<div>\n                    ${mediaInner}\n                </div>`;
        }

        const infoParts = [`<h2>${title}</h2>`];
        if (subtitle) {
            infoParts.push(`<p style="color: var(--text-meta) !important; font-weight: 500; margin-bottom: 12px;">${subtitle}</p>`);
        }

        content.forEach(p => {
            if (p.trim().startsWith('<p')) {
                infoParts.push(p);
            } else {
                infoParts.push(`<p>\n                        ${p}\n                    </p>`);
            }
        });

        if (priceHtml) {
            if (priceHtml.trim().startsWith('<p')) {
                infoParts.push(priceHtml);
            } else {
                infoParts.push(`<p class="price" style="margin-top: 16px;">\n                        ${priceHtml}\n                    </p>`);
            }
        }

        if (buttons && buttons.length > 0) {
            const btnTags = buttons.map(b => {
                const target = (b.url && b.url.startsWith('http')) ? ' target="_blank" rel="noopener"' : '';
                return `<a href="${b.url}" class="buy-button"${target}>${b.label}</a>`;
            });
            infoParts.push(`<div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px;">\n                        ${btnTags.join(' ')}\n                    </div>`);
        }

        if (learnMoreHtml) {
            infoParts.push(`<div class="info">
                        <input id="${learnMoreId}" class="info__switch" type="checkbox">
                        <label for="${learnMoreId}" class="info__headline">Learn more</label>
                        <div class="info__body">
                            ${learnMoreHtml}
                        </div>
                    </div>`);
        }

        const infoHtml = `<div class="concert-info">\n                    ${infoParts.join('\n                    ')}\n                </div>`;

        if (hasMedia) {
            return `<div class="${cls}">\n                ${mediaHtml}\n                ${infoHtml}\n            </div>`;
        } else {
            return `<div class="${cls}">\n                ${infoHtml}\n            </div>`;
        }
    },

    generateEventsPage: function(eventsData) {
        const upcomingItems = (eventsData.upcoming || []).map(it => this.renderConcertItem(it)).join('\n\n');
        const pastTirolItems = (eventsData.past_tirol || []).map(it => this.renderConcertItem(it)).join('\n\n');
        const pastAbroadItems = (eventsData.past_abroad || []).map(it => this.renderConcertItem(it)).join('\n\n');

        return `<!DOCTYPE html>
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
${upcomingItems}
            </div>
        </div>

        <!-- Tab 2: Past Events (In Tirol) -->
        <div id="past-tirol" class="tab-content" style="display: none;">
            <div class="concert-list">
${pastTirolItems}
            </div>
        </div>

        <!-- Tab 3: Past Events (Abroad) -->
        <div id="past-abroad" class="tab-content" style="display: none;">
            <div class="concert-list">
${pastAbroadItems}
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
</html>`;
    },

    generateClassesPage: function(classesData) {
        const list = Array.isArray(classesData) ? classesData : (classesData ? [classesData] : []);

        const itemsHtml = list.map(item => {
            const title = item.title || '';
            const tag = item.tag || '';
            const imgSrc = this.formatPageImgUrl(item.image, 1);
            const intro = item.intro || '';
            const schedule = item.schedule || '';
            const timeInfo = item.time || '';
            const venue = item.venue || '';
            const groupSize = item.group_size || '';
            const dates = item.upcoming_dates || {};
            const priceInfo = item.price_info || '';
            const policy = item.policy || '';
            const contactNote = item.contact_note || '';
            const buttons = item.buttons || [];

            const datesLines = Object.entries(dates).map(([m, val]) => `<strong>${m}:</strong> ${val}`).join('<br>\n');
            const buttonsHtml = buttons.map(b => `<a href="${b.url}" class="buy-button" target="_blank" rel="noopener">${b.label}</a>`).join(' ');

            return `            <div class="concert-item" style="border-top: 1px solid var(--border); padding-top: 48px !important;">
                ${imgSrc ? `<div><img src="${imgSrc}" alt="${title}"></div>` : ''}
                <div class="concert-info">
                    ${tag ? `<span class="section-tag" style="margin-bottom: 8px;">${tag}</span>` : ''}
                    <h2>${title}</h2>
                    ${intro ? `<p>${intro.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</p>` : ''}

                    ${(schedule || timeInfo || venue || groupSize || Object.keys(dates).length > 0) ? `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin: 28px 0; padding: 24px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);">
                        ${(schedule || timeInfo || venue || groupSize) ? `
                        <div>
                            <div class="manifesto-label" style="margin-bottom: 8px;">Time &amp; Location</div>
                            <p style="margin: 0;">
                                ${schedule ? `<strong>Schedule:</strong> ${schedule}<br>` : ''}
                                ${timeInfo ? `<strong>Time:</strong> ${timeInfo}<br>` : ''}
                                ${venue ? `<strong>Venue:</strong> ${venue}<br>` : ''}
                                ${groupSize ? `<strong>Group size:</strong> ${groupSize}` : ''}
                            </p>
                        </div>` : ''}
                        ${Object.keys(dates).length > 0 ? `
                        <div>
                            <div class="manifesto-label" style="margin-bottom: 8px;">Upcoming Dates</div>
                            <p style="margin: 0;">
                                ${datesLines}
                            </p>
                        </div>` : ''}
                    </div>` : ''}

                    ${priceInfo ? `<p>${priceInfo}</p>` : ''}
                    ${policy ? `<p style="color: var(--text-meta) !important; font-size: 0.9rem !important;">${policy}</p>` : ''}
                    ${contactNote ? `<p style="margin-top: 16px;"><em>${contactNote}</em></p>` : ''}

                    ${buttonsHtml ? `
                    <div style="margin-top: 24px; display: flex; flex-wrap: wrap; gap: 12px;">
                        ${buttonsHtml}
                    </div>` : ''}
                </div>
            </div>`;
        }).join('\n\n');

        return `<!DOCTYPE html>
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
${itemsHtml}
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
</html>`;
    },

    generateProjectsPage: function(projectsData) {
        const cardsHtml = projectsData.map(p => {
            const imgSrc = this.formatPageImgUrl(p.image, 1);
            return `        <div class="projects_item">
            <a href="${p.url}"><img src="${imgSrc}" alt="${p.title}"></a>
            <p><span>${p.title}${p.year ? ` <strong>${p.year}</strong>` : ''}</span></p>
        </div>`;
        }).join('\n');

        return `<!DOCTYPE html>
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
${cardsHtml}
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
</html>`;
    },

    generateFestivalsPage: function(festivalsData) {
        const cardsHtml = festivalsData.map(f => {
            const href = f.url.startsWith('../') ? f.url : `../${f.url}`;
            const imgSrc = this.formatPageImgUrl(f.image, 1);
            return `        <div class="projects_item">
            <a href="${href}"><img src="${imgSrc}" alt="${f.title}"></a>
            <p><span>${f.title}${f.year ? ` <strong>${f.year}</strong>` : ''}</span></p>
        </div>`;
        }).join('\n');

        return `<!DOCTYPE html>
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
${cardsHtml}
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
</html>`;
    },

    /**
     * Helper to normalize image paths for pages/projects/{slug}.html
     */
    normalizeProjectImgPath: function(path) {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
        const clean = path.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
        return `../../${clean}`;
    },

    /**
     * Generates a brand new or updated Project page in pages/projects/{slug}.html
     * Supports rich structured fields (Facts, Manifesto, Concept Cards, Video, Tickets, Team, Partners, Gallery)
     * All non-mandatory fields are conditionally rendered — if empty, they are completely omitted.
     */
    generateNewProjectPage: function(proj) {
        const title = proj.title || 'New Project';
        const year = proj.year || new Date().getFullYear();
        const tag = proj.tag || (year ? `${year} · Performative Project` : '');
        const heroBg = this.normalizeProjectImgPath(proj.hero_bg || proj.image || 'img/projects/covers/TheSilenceoftheMass.jpg');
        const subtitle = proj.subtitle || '';

        // Check which tabs have content
        const hasTeam = Boolean(
            (proj.team && proj.team.credits && proj.team.credits.length > 0) ||
            (proj.team && proj.team.statement && proj.team.statement.trim()) ||
            (proj.team && proj.team.image && proj.team.image.trim())
        );

        const hasPartners = Boolean(
            proj.partners && proj.partners.list && proj.partners.list.length > 0
        );

        const hasGallery = Boolean(
            proj.gallery && proj.gallery.photos && proj.gallery.photos.length > 0
        );

        // Build active tabs list
        const tabs = [{ id: 'overview', label: 'Overview & Concept', active: true }];
        if (hasTeam) {
            tabs.push({ id: 'team', label: (proj.team && proj.team.title) ? proj.team.title : 'Artistic Team' });
        }
        if (hasPartners) {
            tabs.push({ id: 'partners', label: (proj.partners && proj.partners.title) ? proj.partners.title : 'Partners' });
        }
        if (hasGallery) {
            tabs.push({ id: 'gallery', label: (proj.gallery && proj.gallery.title) ? proj.gallery.title : 'Photomaterial' });
        }

        // Tabs bar HTML (only if more than 1 tab exists)
        let tabsBarHtml = '';
        if (tabs.length > 1) {
            const tabsBtns = tabs.map(t => {
                const cls = `fest-tab-btn${t.active ? ' active' : ''}`;
                return `<button class="${cls}" data-fest-tab="${t.id}" onclick="switchFestivalTab('${t.id}', false)">${t.label}</button>`;
            }).join('\n            ');

            tabsBarHtml = `
    <!-- Sticky Sub-Navigation Tabs -->
    <div class="fest-tabs-wrapper" id="festTabsAnchor">
        <div class="fest-tabs-bar">
            ${tabsBtns}
        </div>
    </div>`;
        }

        // 1. Quick Facts Strip (conditionally rendered)
        let quickFactsHtml = '';
        const rawFacts = (proj.overview && proj.overview.quick_facts) || [];
        const activeFacts = rawFacts.filter(f => f && (f.label || f.value || f.sub));
        if (activeFacts.length > 0) {
            const factsInner = activeFacts.map(f => `
                <div class="fest-fact-item">
                    ${f.label ? `<span class="fest-fact-label">${f.label}</span>` : ''}
                    ${f.value ? `<span class="fest-fact-value">${f.value}</span>` : ''}
                    ${f.sub ? `<span class="fest-fact-sub">${f.sub}</span>` : ''}
                </div>`).join('');
            quickFactsHtml = `
            <div class="fest-facts-grid">
                ${factsInner}
            </div>`;
        }

        // 2. Manifesto / Tagline Quote (conditionally rendered)
        let manifestoHtml = '';
        const manifestoQuote = (proj.overview && proj.overview.manifesto_quote) ? proj.overview.manifesto_quote.trim() : '';
        const manifestoTag = (proj.overview && proj.overview.manifesto_tag) ? proj.overview.manifesto_tag.trim() : '';
        if (manifestoQuote) {
            manifestoHtml = `
            <div class="manifesto-header">
                ${manifestoTag ? `<span class="section-tag">${manifestoTag}</span>` : ''}
                <h2 class="manifesto-title">
                    &ldquo;${manifestoQuote}&rdquo;
                </h2>
            </div>`;
        }

        // 3. Concept Cards (conditionally rendered)
        let conceptCardsHtml = '';
        const rawCards = (proj.overview && proj.overview.concept_cards) || [];
        const validCards = rawCards.filter(c => c && (c.content || c.title || c.label));
        if (validCards.length > 0) {
            const cardsInner = validCards.map(c => {
                const paragraphs = (c.content || '').split(/\n\n+/).filter(Boolean).map(p => {
                    if (p.trim().startsWith('<p')) return p;
                    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
                }).join('\n                    ');
                return `
                <div class="manifesto-card">
                    ${c.label ? `<span class="manifesto-label">${c.label}</span>` : ''}
                    ${c.title ? `<h3>${c.title}</h3>` : ''}
                    ${paragraphs}
                </div>`;
            }).join('');
            conceptCardsHtml = `
            <div class="manifesto-grid" style="margin-bottom: 48px;">
                ${cardsInner}
            </div>`;
        }

        // 4. Fallback General Overview (if no concept cards, but general text exists)
        let generalOverviewHtml = '';
        if (validCards.length === 0) {
            const rawText = proj.overview_html || (typeof proj.overview === 'string' ? proj.overview : (proj.overview && proj.overview.general_text ? proj.overview.general_text : ''));
            if (rawText && rawText.trim()) {
                const paragraphs = rawText.split(/\n\n+/).filter(Boolean).map(p => {
                    if (p.trim().startsWith('<p')) return p;
                    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
                }).join('\n                ');
                generalOverviewHtml = `
            <div style="max-width: 880px; margin-top: 24px; font-size: 1.05rem; line-height: 1.7; margin-bottom: 40px;">
                ${paragraphs}
            </div>`;
            }
        }

        // 5. Performance Video (conditionally rendered)
        let videoHtml = '';
        const videoUrl = (proj.overview && proj.overview.video_url) || proj.video_url || '';
        if (videoUrl.trim()) {
            const videoTag = (proj.overview && proj.overview.video_tag) || 'Performance Video';
            const videoTitle = (proj.overview && proj.overview.video_title) || proj.title;
            videoHtml = `
            <div style="border-top: 1px solid var(--border); padding-top: 36px; margin-bottom: 48px;">
                <span class="section-tag">${videoTag}</span>
                <h3 style="margin-bottom: 16px;">${videoTitle}</h3>
                <div class="video-responsive-frame">
                    <iframe src="${videoUrl.trim()}" title="${videoTitle}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                </div>
            </div>`;
        }

        // 6. Premiere & Tickets / Booking (conditionally rendered)
        let ticketsHtml = '';
        const t = (proj.overview && proj.overview.tickets) || {};
        if (t.venue || t.when || t.where || t.price || t.booking_text || t.booking_link) {
            const hasDetails = Boolean(t.when || t.where || t.price);
            const hasBooking = Boolean(t.booking_text || t.booking_link);
            ticketsHtml = `
            <div style="border: 1px solid var(--border); padding: 36px; background: var(--bg-off); margin-bottom: 48px;">
                <span class="section-tag">${t.tag || 'Premiere &amp; Tickets'}</span>
                ${t.venue ? `<h3 style="margin-bottom: 12px;">${t.venue}</h3>` : ''}
                ${hasDetails ? `
                <p>
                    ${t.when ? `<strong>When:</strong> ${t.when}<br>` : ''}
                    ${t.where ? `<strong>Where:</strong> ${t.where}<br>` : ''}
                    ${t.price ? `<strong>Price:</strong> ${t.price}` : ''}
                </p>` : ''}
                ${hasBooking ? `
                <p style="margin-bottom: 0;">
                    <strong>Tickets &amp; Reservation:</strong> ${t.booking_link ? `<a href="${t.booking_link}" target="_blank" rel="noopener" style="color: var(--accent) !important; font-weight: 600;">${t.booking_text || 'Reserve Tickets'}</a>` : (t.booking_text || '')}
                </p>` : ''}
            </div>`;
        }

        // 7. Crowdfunding / Support (conditionally rendered)
        let crowdfundingHtml = '';
        const cf = (proj.overview && proj.overview.crowdfunding) || {};
        if (cf.title || cf.desc || cf.link_url) {
            crowdfundingHtml = `
            <div style="border: 1px solid var(--border); padding: 36px; background: #fafafa; margin-bottom: 48px;">
                <span class="section-tag">${cf.tag || 'Support &amp; Production'}</span>
                ${cf.title ? `<h3 style="margin-bottom: 12px;">${cf.title}</h3>` : ''}
                ${cf.desc ? `<p style="margin-bottom: 16px;">${cf.desc}</p>` : ''}
                ${cf.link_url ? `<a href="${cf.link_url}" class="buy-button" target="_blank" rel="noopener">${cf.link_text || 'Support the Project'} &rarr;</a>` : ''}
            </div>`;
        }

        // 8. Project Directory Portal (conditionally rendered only if secondary tabs exist)
        let portalHtml = '';
        if (tabs.length > 1) {
            const portalCards = [];
            if (hasTeam) {
                portalCards.push(`
                    <a href="#festTabsAnchor" onclick="switchFestivalTab('team', true); return false;" class="home-portal-card">
                        <div>
                            <span class="manifesto-label">01 / Creators</span>
                            <h3>${(proj.team && proj.team.title) || 'Artistic Team'}</h3>
                            <p>Artistic direction, choreography, dancers, musicians, and collaborators.</p>
                        </div>
                        <span class="home-portal-link">View Team <span>&rarr;</span></span>
                    </a>`);
            }
            if (hasPartners) {
                portalCards.push(`
                    <a href="#festTabsAnchor" onclick="switchFestivalTab('partners', true); return false;" class="home-portal-card">
                        <div>
                            <span class="manifesto-label">02 / Collaboration</span>
                            <h3>${(proj.partners && proj.partners.title) || 'Partners &amp; Institutions'}</h3>
                            <p>Institutions, funders, and partner organizations supporting this creation.</p>
                        </div>
                        <span class="home-portal-link">View Partners <span>&rarr;</span></span>
                    </a>`);
            }
            if (hasGallery) {
                portalCards.push(`
                    <a href="#festTabsAnchor" onclick="switchFestivalTab('gallery', true); return false;" class="home-portal-card">
                        <div>
                            <span class="manifesto-label">03 / Visual Archive</span>
                            <h3>${(proj.gallery && proj.gallery.title) || 'Photomaterial'}</h3>
                            <p>Complete performance and rehearsal photography gallery.</p>
                        </div>
                        <span class="home-portal-link">View Gallery <span>&rarr;</span></span>
                    </a>`);
            }

            if (portalCards.length > 0) {
                portalHtml = `
            <div style="border-top: 1px solid var(--border); padding-top: 36px; margin-top: 40px;">
                <span class="section-tag">Explore Project Sections</span>
                <h3>Project Directory</h3>
                <div class="home-portal-grid">
                    ${portalCards.join('\n                    ')}
                </div>
            </div>`;
            }
        }

        // 9. Tab 2: Artistic Team (conditionally rendered)
        let teamTabHtml = '';
        if (hasTeam) {
            const tm = proj.team || {};
            const teamImg = tm.image ? this.normalizeProjectImgPath(tm.image) : '';
            const teamTag = tm.tag || 'Collective Creation · By MMDT';
            const teamTitle = tm.title || 'Artistic Direction & Team';
            const teamStatement = tm.statement || '';
            const credits = tm.credits || [];

            const statementParagraphs = teamStatement.split(/\n\n+/).filter(Boolean).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n                        ');

            let creditsBlock = '';
            if (credits.length > 0) {
                const lines = credits.map(c => `<b>${c.name}</b> - ${c.role}${c.bio ? ` (${c.bio})` : ''}`).join('<br>\n                                ');
                creditsBlock = `
                        <div style="border-top: 1px solid var(--border); padding-top: 20px; margin-top: 20px;">
                            <span class="manifesto-label">Credits</span>
                            <h3 style="margin-bottom: 12px;">Artistic team:</h3>
                            <p style="margin-bottom: 0; line-height: 1.9 !important;">
                                ${lines}
                            </p>
                        </div>`;
            }

            teamTabHtml = `
        <!-- ==========================================
             TAB: ARTISTIC TEAM
             ========================================== -->
        <div id="fest-tab-team" class="fest-tab-panel" style="display: none;">
            <span class="section-tag">${teamTag}</span>
            <h2 style="margin-bottom: 8px;">${teamTitle}</h2>

            <div class="concert-list">
                <div class="concert-item">
                    ${teamImg ? `
                    <div>
                        <img src="${teamImg}" alt="${teamTitle}" loading="lazy" onclick="openFestLightbox(this.src)" style="cursor: pointer;">
                    </div>` : ''}
                    <div class="concert-info">
                        <span class="section-tag" style="margin-bottom: 6px;">${teamTag}</span>
                        <h2>${teamTitle}</h2>
                        ${statementParagraphs}
                        ${creditsBlock}
                    </div>
                </div>
            </div>
        </div>`;
        }

        // 10. Tab 3: Partners & Institutions (conditionally rendered)
        let partnersTabHtml = '';
        if (hasPartners) {
            const pt = proj.partners || {};
            const partnerList = pt.list || [];
            partnersTabHtml = `
        <!-- ==========================================
             TAB: PARTNERS & INSTITUTIONS
             ========================================== -->
        <div id="fest-tab-partners" class="fest-tab-panel" style="display: none;">
            <span class="section-tag">${pt.tag || 'Supported By &amp; In Collaboration With'}</span>
            <h2 style="margin-bottom: 24px;">${pt.title || 'Partners &amp; Institutions'}</h2>
            <div class="fest-partners-logos">
                ${partnerList.map(p => `
                <div class="fest-partner-logo-box">
                    ${p.url ? `<a href="${p.url}" target="_blank" rel="noopener"><img src="${this.normalizeProjectImgPath(p.logo)}" alt="${p.name || 'Partner'}" loading="lazy"></a>` : `<img src="${this.normalizeProjectImgPath(p.logo)}" alt="${p.name || 'Partner'}" loading="lazy">`}
                </div>`).join('\n                ')}
            </div>
        </div>`;
        }

        // 11. Tab 4: Photomaterial / Gallery (conditionally rendered)
        let galleryTabHtml = '';
        if (hasGallery) {
            const gl = proj.gallery || {};
            const photos = gl.photos || [];
            galleryTabHtml = `
        <!-- ==========================================
             TAB: PHOTOMATERIAL
             ========================================== -->
        <div id="fest-tab-gallery" class="fest-tab-panel" style="display: none;">
            ${gl.tag ? `<span class="section-tag">${gl.tag}</span>` : ''}
            <h2 style="margin-bottom: ${gl.credits ? '8px' : '16px'};">${gl.title || 'Photomaterial'}</h2>
            ${gl.credits ? `<p style="color:var(--text-meta); margin-bottom:16px;">${gl.credits}</p>` : ''}

            <div class="fest-gallery-grid">
                ${photos.map((p, i) => `<img src="${this.normalizeProjectImgPath(p)}" alt="${title} ${i + 1}" loading="lazy" onclick="openFestLightbox(this.src)">`).join('\n                ')}
            </div>
        </div>`;
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} — MMDT</title>
    ${subtitle ? `<meta name="description" content="${subtitle.replace(/"/g, '&quot;')}">` : ''}
    <link rel="shortcut icon" href="../../img/common/brand/lg.png" type="image/x-icon">
    <link rel="stylesheet" href="../../css/modern-redesign.css">
    <script src="../../js/modern-redesign.js" defer></script>
</head>
<body>
    <header class="header header_home">
        <div class="container">
            <div class="header__inner">
                <div class="header__logo">
                    <a href="../../index.html" aria-label="MMDT Home"><img src="../../img/common/brand/logo.png" alt="MMDT"></a>
                </div>
                <nav class="nav">
                    <a class="nav__link active" href="../projects.html">Projects</a>
                    <a class="nav__link" href="../festival.html">Festival</a>
                    <a class="nav__link" href="../classes.html">Classes</a>
                    <a class="nav__link" href="../events.html">Events</a>
                    <a class="nav__link" href="../partners.html">Partners</a>
                    <a class="nav__link" href="../membership.html">Membership</a>
                    <a class="nav__link" href="../contacts.html">Contacts</a>
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

    <!-- Full-Screen Project Hero -->
    <section class="intro_festival" style="background-image: url('${heroBg}'); background-position: center center !important;">
        <div class="container">
            <div>
                <a href="../projects.html" class="fest-hero-back">&larr; All Projects</a>
            </div>
            ${tag ? `<span class="fest-hero-tag">${tag}</span>` : ''}
            <h1 class="fest-hero-title">${title}</h1>
            ${subtitle ? `<p class="fest-hero-subtitle">${subtitle}</p>` : ''}
        </div>
    </section>
${tabsBarHtml}
    <main class="container">

        <!-- ==========================================
             TAB 1: OVERVIEW & CONCEPT
             ========================================== -->
        <div id="fest-tab-overview" class="fest-tab-panel" style="display: block;">
            ${quickFactsHtml}
            ${manifestoHtml}
            ${conceptCardsHtml}
            ${generalOverviewHtml}
            ${videoHtml}
            ${ticketsHtml}
            ${crowdfundingHtml}
            ${portalHtml}
        </div>
${teamTabHtml}
${partnersTabHtml}
${galleryTabHtml}
    </main>

    <footer>
        <div class="footer">
            <div class="footer_element">
                <a href="../../index.html" style="text-decoration: none; font-weight: 500; font-size: 0.9rem; letter-spacing: 0.05em; text-transform: uppercase;">Motion Mode of Dialogue in Tirol</a><br><br>
                <img src="../../img/common/brand/visa_mc.png" alt="Payment Methods">
            </div>
            <div class="footer_element" style="display: flex; flex-direction: column; align-items: flex-end;">
                <a href="../legal/Privacy_policy.html">Privacy Policy</a>
                <a href="../legal/Refund_policy.html">Refund &amp; Return Policy</a>
                <a href="../legal/Terms&amp;Conditions.html">Terms &amp; Conditions</a>
                <a href="../legal/GEP.html">Gender Equality Plan</a>
            </div>
        </div>
    </footer>
</body>
</html>`;
    },

    /**
     * Generates a complete 9-tab Festival edition page matching CITyrolFest2026/2025 standard
     */
    generateFestivalPage: function(fest) {
        const title = fest.title || 'Solo & CI Tirol Fest';
        const year = fest.year || new Date().getFullYear();
        const dates = fest.dates || `August ${year} · Innsbruck, Austria`;
        const subtitle = fest.subtitle || '';
        const topicAuthor = fest.topic_author || '';
        const heroBg = this.formatPageImgUrl(fest.hero_bg, 0) || 'img/festivals/2026/bg.jpg';
        const isArchived = fest.status === 'archived';

        // Overview data
        const ov = fest.overview || {};
        const qf = ov.quick_facts || {};
        const manTag = ov.manifesto_tag || `Festival ${year} · ${dates}`;
        const manTitle = ov.manifesto_title || (subtitle || `Solo & CI Tirol Fest ${year}`);
        const conceptBlocks = ov.concept_blocks || [];
        const highlights = ov.highlights || [];
        const conclusion = ov.conclusion || '';

        // Registration data
        const reg = fest.registration || {};
        const isClosed = reg.is_closed || isArchived;
        const closedNotice = reg.closed_notice || 'Registration is now officially closed. Thank you for your interest in our festival!';
        const whatsapp = reg.whatsapp_contact || '+43 677 630 27506';
        const regIntro = reg.intro_text || '';
        const passes = reg.passes || [];
        const helper = reg.helper || {};
        const support = reg.support || {};

        // Teachers, Performances, Musicians, Program, Venue, Team, Archive
        const teachers = fest.teachers || [];
        const perfs = fest.performances || [];
        const musicians = fest.musicians || [];
        const prog = fest.program || {};
        const schedule = prog.schedule || [];
        const vf = fest.venue_food || {};
        const tp = fest.team_partners || {};
        const team = tp.team || [];
        const partners = tp.partners || [];
        const arch = fest.archive || {};
        const archVideos = arch.videos || [];
        const archPhotos = arch.photos || [];

        // Build active tabs list
        const tabs = [];
        tabs.push({ id: 'overview', label: 'Overview', active: true });

        if (isArchived) {
            if (archVideos.length > 0 || archPhotos.length > 0 || arch.audio_link) {
                tabs.push({ id: 'archive', label: 'Archive', highlight: true });
            }
        } else {
            tabs.push({ id: 'registration', label: 'Registration', highlight: true });
        }

        if (teachers.length > 0) tabs.push({ id: 'teachers', label: 'Teachers & Classes' });
        if (perfs.length > 0) tabs.push({ id: 'performances', label: 'Performances' });
        if (musicians.length > 0) tabs.push({ id: 'musicians', label: 'Musicians & Guests' });
        if (schedule.length > 0 || prog.intro || prog.google_sheets_url || prog.image) tabs.push({ id: 'program', label: 'Program' });
        if (vf.venue_name || vf.venue_desc) tabs.push({ id: 'venue', label: 'Venue & Food' });
        if (team.length > 0 || partners.length > 0) tabs.push({ id: 'team', label: 'Team & Partners' });

        if (isArchived) {
            tabs.push({ id: 'registration', label: 'Registration' });
        } else if (archVideos.length > 0 || archPhotos.length > 0 || arch.audio_link) {
            tabs.push({ id: 'archive', label: 'Archive' });
        }

        // Generate Tabs Bar HTML
        const tabsBarHtml = tabs.map(t => {
            const cls = `fest-tab-btn${t.active ? ' active' : ''}${t.highlight ? ' fest-tab-btn--highlight' : ''}`;
            return `<button class="${cls}" data-fest-tab="${t.id}" onclick="switchFestivalTab('${t.id}', false)">${t.label}</button>`;
        }).join('\n            ');

        // Quick facts HTML
        let quickFactsHtml = '';
        if (qf.dates || qf.location || qf.teachers || qf.format) {
            quickFactsHtml = `
            <div class="fest-facts-grid">
                ${qf.dates ? `<div class="fest-fact-item"><span class="fest-fact-label">Dates</span><span class="fest-fact-value">${qf.dates}</span><span class="fest-fact-sub">Festival ${year}</span></div>` : ''}
                ${qf.location ? `<div class="fest-fact-item"><span class="fest-fact-label">Location</span><span class="fest-fact-value">${qf.location}</span><span class="fest-fact-sub">Innsbruck, Austria</span></div>` : ''}
                ${qf.teachers ? `<div class="fest-fact-item"><span class="fest-fact-label">Faculty</span><span class="fest-fact-value">${qf.teachers}</span><span class="fest-fact-sub">Core Artists</span></div>` : ''}
                ${qf.format ? `<div class="fest-fact-item"><span class="fest-fact-label">Format</span><span class="fest-fact-value">${qf.format}</span><span class="fest-fact-sub">Improvisation &amp; Research</span></div>` : ''}
            </div>`;
        }

        // Concept blocks HTML
        const conceptBlocksHtml = conceptBlocks.map(cb => `
                <div class="manifesto-card">
                    <span class="manifesto-label">${cb.label || ''}</span>
                    <p>${(cb.text || '').replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</p>
                </div>`).join('');

        // Highlights list HTML
        const highlightsHtml = highlights.map((h, i) => `
                <div class="fest-include-card">
                    <span>${String(i + 1).padStart(2, '0')} / HIGHLIGHT</span>
                    <p>${h}</p>
                </div>`).join('');

        // Portal cards in Overview (Explore the festival)
        const portalFourthTab = isArchived ? 'archive' : 'registration';
        const portalFourthTitle = isArchived ? 'Archive' : 'Registration';
        const portalFourthDesc = isArchived ? `Photos, videos and official documentation from the festival.` : `Secure your pass for the festival week in Innsbruck.`;

        // Registration Passes HTML
        const passesHtml = passes.map(p => {
            const soldoutCls = (p.is_soldout || isClosed) ? ' fest-price-card--soldout' : '';
            return `
                <div class="fest-price-card${soldoutCls}">
                    <div>
                        <span class="manifesto-label">${p.label || ''}</span>
                        <h3 style="margin: 8px 0 12px;">${p.title || ''}</h3>
                        ${p.desc ? `<p style="font-size: 0.92rem !important; color: var(--text-meta) !important; margin-bottom: 24px;">${p.desc}</p>` : ''}
                    </div>
                    <div>
                        <div style="margin-bottom: 20px; padding-top: 20px; border-top: 1px solid var(--border-light);">
                            ${p.price_old ? `<span class="fest-price-old">${p.price_old}</span>` : ''}
                            <span class="fest-price-current">${p.price_current || ''}</span>
                        </div>
                        ${(p.is_soldout || isClosed) ? `
                        <span class="buy-button" style="width: 100%; text-align: center; margin-top: 0 !important; opacity: 0.6; cursor: not-allowed;">
                            REGISTRATION CLOSED
                        </span>` : `
                        <a href="${p.url || '#'}" target="_blank" rel="noopener" class="buy-button" style="width: 100%; text-align: center; margin-top: 0 !important;">
                            REGISTRATION* &rarr;
                        </a>`}
                        <p style="font-size: 0.75rem !important; color: var(--text-meta) !important; margin-top: 10px; margin-bottom: 0;">
                            *By clicking on this button you confirm that you agree with the refund and privacy policies
                        </p>
                    </div>
                </div>`;
        }).join('');

        // Teachers concert list HTML
        const teachersHtml = teachers.map(t => {
            const classesList = (t.classes && Array.isArray(t.classes) && t.classes.length > 0)
                ? t.classes
                : ((t.topic || t.class_desc) ? [{
                    title: t.topic || '',
                    label: t.class_label || 'WORKSHOP',
                    desc: t.class_desc || '',
                    video_url: t.class_video || ''
                }] : []);

            const classesRendered = classesList.map(c => `
                        <div style="border-top: 1px solid var(--border); padding-top: 20px; margin-top: 24px;">
                            ${c.label ? `<span class="manifesto-label">${c.label}</span>` : ''}
                            ${c.title ? `<h3 style="margin: 6px 0 12px; font-size: 1.15rem; color: var(--text-main); font-weight: 600;">${c.title}</h3>` : ''}
                            ${c.desc ? `<p style="font-size: 0.98rem; line-height: 1.65; color: var(--text-main);">${(c.desc || '').replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</p>` : ''}
                            ${c.video_url ? `
                            <div class="video-responsive-frame" style="margin-top: 16px;">
                                <iframe src="${c.video_url}" title="${c.title || t.name}" loading="lazy" allowfullscreen></iframe>
                            </div>` : ''}
                        </div>`).join('');

            return `
                <div class="concert-item">
                    ${t.photo ? `<div>
                        <img src="${this.formatPageImgUrl(t.photo, 0)}" alt="${t.name}" loading="lazy"${t.photo2 ? ' style="margin-bottom: 16px;"' : ''}>
                        ${t.photo2 ? `<img src="${this.formatPageImgUrl(t.photo2, 0)}" alt="${t.name} Class" loading="lazy">` : ''}
                    </div>` : ''}
                    <div class="concert-info">
                        ${t.role ? `<span class="section-tag" style="margin-bottom: 6px;">${t.role}</span>` : ''}
                        <h2>${t.name}</h2>
                        ${t.bio ? `<div style="margin-top: 10px; font-size: 0.98rem; line-height: 1.65; color: var(--text-main);">${(t.bio || '').replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</div>` : ''}
                        ${t.video_url && (!classesList.length || !classesList.some(c => c.video_url === t.video_url)) ? `
                        <div class="video-responsive-frame" style="margin-top: 20px;">
                            <iframe src="${t.video_url}" title="${t.name}" loading="lazy" allowfullscreen></iframe>
                        </div>` : ''}
                        ${classesRendered}
                    </div>
                </div>`;
        }).join('\n\n');

        // Performances HTML
        const perfsHtml = perfs.map(pf => `
                <div class="concert-item">
                    <div class="concert-info" style="width: 100%;">
                        ${pf.date_time ? `<span class="section-tag" style="margin-bottom: 6px;">${pf.date_time}</span>` : ''}
                        <h2>${pf.title}</h2>
                        ${pf.venue ? `<p style="font-weight: 500; color: var(--text-meta); margin-bottom: 12px;"><strong>Venue:</strong> ${pf.venue}${pf.artists ? ` &middot; <strong>Artists:</strong> ${pf.artists}` : ''}</p>` : ''}
                        <p>${(pf.desc || '').replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</p>
                        ${pf.video_url ? `
                        <div class="video-responsive-frame" style="margin-top: 20px;">
                            <iframe src="${pf.video_url}" title="${pf.title}" loading="lazy" allowfullscreen></iframe>
                        </div>` : ''}
                        ${pf.ticket_info ? `<p style="margin-top: 14px; font-size: 0.9rem; color: var(--text-meta);"><em>${pf.ticket_info}</em></p>` : ''}
                    </div>
                </div>`).join('\n\n');

        // Musicians HTML
        const musiciansHtml = musicians.map(m => `
                <div class="concert-item">
                    ${m.photo ? `<div><img src="${this.formatPageImgUrl(m.photo, 0)}" alt="${m.name}" loading="lazy"></div>` : ''}
                    <div class="concert-info">
                        ${m.role ? `<span class="section-tag" style="margin-bottom: 6px;">${m.role}</span>` : ''}
                        <h2>${m.name}</h2>
                        <p>${(m.bio || '').replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</p>
                    </div>
                </div>`).join('\n\n');

        // Program Schedule HTML
        const scheduleHtml = schedule.map(s => `
                <div style="display: grid; grid-template-columns: 160px 1fr; gap: 20px; padding: 18px 0; border-bottom: 1px solid var(--border-light);">
                    <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main);">${s.time || ''}</div>
                    <div style="font-size: 1rem; color: var(--text-main);">${s.title || ''}</div>
                </div>`).join('');

        // Program Google Sheets Embed HTML
        let sheetsHtml = '';
        if (prog.google_sheets_url) {
            let cleanUrl = String(prog.google_sheets_url).trim();
            const iframeMatch = cleanUrl.match(/src=["']([^"']+)["']/i);
            if (iframeMatch) cleanUrl = iframeMatch[1];

            let embedUrl = cleanUrl;
            const rawUrl = cleanUrl;

            if (cleanUrl.includes('docs.google.com/spreadsheets')) {
                if (cleanUrl.includes('/pubhtml')) {
                    embedUrl = cleanUrl;
                    if (!embedUrl.includes('widget=')) {
                        embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'widget=false&headers=false';
                    }
                } else if (!cleanUrl.includes('/htmlembed')) {
                    const dMatch = cleanUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                    if (dMatch) {
                        const sheetId = dMatch[1];
                        const gidMatch = cleanUrl.match(/[?&#]gid=([0-9]+)/);
                        const gidPart = gidMatch ? `&gid=${gidMatch[1]}` : '';
                        embedUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlembed?widget=false&headers=false${gidPart}`;
                    }
                }
            }

            sheetsHtml = `
            <div style="border: 1px solid var(--border); background: #fff; padding: 14px; margin-bottom: 32px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <span class="manifesto-label" style="margin: 0;">Interactive Timetable</span>
                    <a href="${rawUrl}" target="_blank" rel="noopener" class="buy-button" style="margin: 0; padding: 6px 14px; font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                        Open in Google Sheets ↗
                    </a>
                </div>
                <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                    <iframe src="${embedUrl}" width="100%" style="height: 640px !important; min-height: 520px; aspect-ratio: unset !important; border: 1px solid var(--border-light); border-radius: 4px;" loading="lazy"></iframe>
                </div>
            </div>`;
        }

        // Program Graphic Poster HTML
        let posterHtml = '';
        if (prog.image) {
            const progImg = this.formatPageImgUrl(prog.image, 0);
            posterHtml = `
            <div style="margin-bottom: 32px; border: 1px solid var(--border); padding: 18px; background: #fff;">
                <span class="manifesto-label" style="margin-bottom: 12px; display: inline-block;">Visual Timetable</span>
                <div style="text-align: center; overflow: hidden;">
                    <a href="${progImg}" target="_blank" rel="noopener" title="Click to view full image">
                        <img src="${progImg}" alt="Festival Program Schedule" style="max-width: 100%; height: auto; display: inline-block; border-radius: 4px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);" onclick="if(window.openFestLightbox){ openFestLightbox(this.src); return false; }">
                    </a>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-meta); margin-top: 10px; margin-bottom: 0; text-align: center;">Click image to expand / zoom</p>
            </div>`;
        }

        // Venue Photos Grid
        const venuePhotosHtml = (vf.venue_photos || []).map(p => `
            <img src="${this.formatPageImgUrl(p, 0)}" alt="Venue photo" loading="lazy" onclick="openFestLightbox(this.src)">
        `).join('');

        // Team HTML
        const teamHtml = team.map(tm => `
                <div class="concert-item">
                    ${tm.photo ? `<div><img src="${this.formatPageImgUrl(tm.photo, 0)}" alt="${tm.name}" loading="lazy"></div>` : ''}
                    <div class="concert-info">
                        ${tm.role ? `<span class="section-tag" style="margin-bottom: 6px;">${tm.role}</span>` : ''}
                        <h2>${tm.name}</h2>
                        <p>${(tm.bio || '').replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</p>
                    </div>
                </div>`).join('\n\n');

        // Partners HTML
        const partnersHtml = partners.map(pt => `
            <a href="${pt.url || '#'}" target="_blank" rel="noopener" style="display: flex; align-items: center; justify-content: center; padding: 16px;">
                <img src="${this.formatPageImgUrl(pt.logo || '', 0)}" alt="${pt.name || 'Partner'}" style="max-height: 52px; max-width: 140px; object-fit: contain; filter: grayscale(100%); opacity: 0.8; transition: all 0.2s ease;">
            </a>`).join('');

        // Archive Videos & Photos HTML
        const archVideosHtml = archVideos.map(v => `
                <div class="video-responsive-frame">
                    <iframe src="${v}" title="Festival Archive Video" loading="lazy" allowfullscreen></iframe>
                </div>`).join('');

        const archPhotosHtml = archPhotos.map(p => `
                <img src="${this.formatPageImgUrl(p, 0)}" alt="Festival Archive" loading="lazy" onclick="openFestLightbox(this.src)">`).join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} ${year} — MMDT</title>
    <meta name="description" content="${subtitle || `${title} ${year} in Innsbruck, Austria.`}">
    <link rel="shortcut icon" href="img/common/brand/lg.png" type="image/x-icon">
    <link rel="stylesheet" href="css/modern-redesign.css">
    <script src="js/modern-redesign.js" defer></script>
</head>
<body>
    <header class="header header_home">
        <div class="container">
            <div class="header__inner">
                <div class="header__logo">
                    <a href="index.html" aria-label="MMDT Home"><img src="img/common/brand/logo.png" alt="MMDT"></a>
                </div>
                <nav class="nav">
                    <a class="nav__link" href="pages/projects.html">Projects</a>
                    <a class="nav__link active" href="pages/festival.html">Festival</a>
                    <a class="nav__link" href="pages/classes.html">Classes</a>
                    <a class="nav__link" href="pages/events.html">Events</a>
                    <a class="nav__link" href="pages/partners.html">Partners</a>
                    <a class="nav__link" href="pages/membership.html">Membership</a>
                    <a class="nav__link" href="pages/contacts.html">Contacts</a>
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

    <!-- Festival Hero -->
    <section class="intro_festival" style="background-image: url('${heroBg}');">
        <div class="container">
            <div>
                <a href="pages/festival.html" class="fest-hero-back">&larr; All Festivals</a>
            </div>
            <span class="fest-hero-tag">${dates}</span>
            <h1 class="fest-hero-title">${title} ${year}</h1>
            ${subtitle ? `<p class="fest-hero-subtitle">&ldquo;${subtitle}&rdquo;</p>` : ''}
            ${topicAuthor ? `<p class="fest-hero-author">${topicAuthor}</p>` : ''}
        </div>
    </section>

    <!-- Sticky Sub-Navigation Tabs -->
    <div class="fest-tabs-wrapper" id="festTabsAnchor">
        <div class="fest-tabs-bar">
            ${tabsBarHtml}
        </div>
    </div>

    <main class="container">

        <!-- ==========================================
             TAB 1: OVERVIEW
             ========================================== -->
        <div id="fest-tab-overview" class="fest-tab-panel" style="display: block;">
            ${quickFactsHtml}

            <div class="manifesto-header">
                <span class="section-tag">${manTag}</span>
                <h2 class="manifesto-title">${manTitle}</h2>
            </div>

            ${conceptBlocks.length > 0 ? `
            <div class="manifesto-grid" style="margin-bottom: 48px;">
                ${conceptBlocksHtml}
            </div>` : ''}

            ${highlights.length > 0 ? `
            <span class="section-tag">Program Highlights</span>
            <h3>As always, the festival will include:</h3>
            <div class="fest-includes-grid">
                ${highlightsHtml}
            </div>` : ''}

            ${conclusion ? `
            <div style="margin-top: 36px; max-width: 820px; font-size: 1.05rem; line-height: 1.7; color: var(--text-main);">
                <p>${conclusion.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</p>
            </div>` : ''}

            <!-- Explore Section Grid -->
            <div style="margin-top: 48px; padding-top: 36px; border-top: 1px solid var(--border);">
                <span class="section-tag">Explore the Festival</span>
                <div class="home-portal-grid" style="margin-top: 24px;">
                    <a href="#festTabsAnchor" onclick="switchFestivalTab('teachers', true); return false;" class="home-portal-card">
                        <div>
                            <span class="manifesto-label">01 / Faculty</span>
                            <h3>Teachers &amp; Classes</h3>
                            <p>International facilitators, workshop themes, and physical research labs.</p>
                        </div>
                        <span class="home-portal-link">View Teachers <span>&rarr;</span></span>
                    </a>
                    <a href="#festTabsAnchor" onclick="switchFestivalTab('${perfs.length > 0 ? 'performances' : 'venue'}', true); return false;" class="home-portal-card">
                        <div>
                            <span class="manifesto-label">02 / ${perfs.length > 0 ? 'Public Program' : 'Logistics'}</span>
                            <h3>${perfs.length > 0 ? 'Performances' : 'Venue &amp; Food'}</h3>
                            <p>${perfs.length > 0 ? 'Site-specific improvisations and theater works.' : 'Studio spaces, accommodation guidance, and organic meals.'}</p>
                        </div>
                        <span class="home-portal-link">${perfs.length > 0 ? 'View Performances' : 'Venue &amp; Food'} <span>&rarr;</span></span>
                    </a>
                    <a href="#festTabsAnchor" onclick="switchFestivalTab('venue', true); return false;" class="home-portal-card">
                        <div>
                            <span class="manifesto-label">03 / Logistics</span>
                            <h3>Venue &amp; Food</h3>
                            <p>Studio location, accommodation advice, and communal fresh meals.</p>
                        </div>
                        <span class="home-portal-link">Venue &amp; Meals <span>&rarr;</span></span>
                    </a>
                    <a href="#festTabsAnchor" onclick="switchFestivalTab('${portalFourthTab}', true); return false;" class="home-portal-card">
                        <div>
                            <span class="manifesto-label">04 / ${portalFourthTitle}</span>
                            <h3>${portalFourthTitle}</h3>
                            <p>${portalFourthDesc}</p>
                        </div>
                        <span class="home-portal-link">Open ${portalFourthTitle} <span>&rarr;</span></span>
                    </a>
                </div>
            </div>
        </div>

        <!-- ==========================================
             TAB 2: REGISTRATION
             ========================================== -->
        <div id="fest-tab-registration" class="fest-tab-panel" style="display: none;">
            <span class="section-tag">Passes &amp; Booking</span>
            <h2 style="margin-bottom: 16px;">Registration</h2>

            ${isClosed ? `
            <div style="border: 1px solid var(--border); padding: 36px; background: var(--bg-off); margin-bottom: 48px;">
                <h2 style="margin-top: 0; margin-bottom: 12px;">Registration is now officially closed</h2>
                <p>${closedNotice}</p>
                ${whatsapp ? `
                <p>
                    If you have any urgent questions or special circumstances,<br>
                    please contact Tamara directly via WhatsApp:<br>
                    <a href="tel:${whatsapp.replace(/\s+/g, '')}" style="color: var(--accent) !important; font-weight: 500;">${whatsapp}</a>
                </p>` : ''}
                <h3 style="margin-top: 24px; margin-bottom: 0;">We look forward to dancing with you soon!</h3>
            </div>` : ''}

            ${regIntro ? `
            <p style="max-width: 820px; font-size: 1.05rem; line-height: 1.7;">
                ${regIntro.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}
            </p>` : ''}

            ${passes.length > 0 ? `
            <div class="fest-pricing-grid">
                ${passesHtml}
            </div>` : ''}

            ${helper.title ? `
            <div style="border: 1px solid var(--border); padding: 36px; background: var(--bg-off); margin-bottom: 48px; margin-top: 36px;">
                <span class="section-tag">Community Contribution</span>
                <h3 style="margin-bottom: 12px;">${helper.title}</h3>
                ${helper.desc ? `<p>${helper.desc}</p>` : ''}
                ${helper.status_note ? `<p style="margin-bottom: 0;"><strong>${helper.status_note}</strong></p>` : ''}
            </div>` : ''}

            ${support.title ? `
            <div style="border: 1px solid var(--border); padding: 40px; background: var(--bg-white);">
                <span class="section-tag">Community Solidarity</span>
                <h3 style="margin-bottom: 16px;">${support.title}</h3>
                <div style="max-width: 780px;">
                    <p>${(support.text || '').replace(/\n\n/g, '<br><br>')}</p>
                </div>
            </div>` : ''}
        </div>

        ${teachers.length > 0 ? `
        <!-- ==========================================
             TAB 3: TEACHERS & CLASSES
             ========================================== -->
        <div id="fest-tab-teachers" class="fest-tab-panel" style="display: none;">
            <span class="section-tag">Faculty &amp; Workshops</span>
            <h2 style="margin-bottom: 32px;">Teachers &amp; Classes</h2>
            <div class="concert-list">
                ${teachersHtml}
            </div>
        </div>` : ''}

        ${perfs.length > 0 ? `
        <!-- ==========================================
             TAB 4: PERFORMANCES
             ========================================== -->
        <div id="fest-tab-performances" class="fest-tab-panel" style="display: none;">
            <span class="section-tag">Public Program &amp; Stage</span>
            <h2 style="margin-bottom: 32px;">Performances</h2>
            <div class="concert-list">
                ${perfsHtml}
            </div>
        </div>` : ''}

        ${musicians.length > 0 ? `
        <!-- ==========================================
             TAB 5: MUSICIANS & GUESTS
             ========================================== -->
        <div id="fest-tab-musicians" class="fest-tab-panel" style="display: none;">
            <span class="section-tag">Live Music &amp; Soundscapes</span>
            <h2 style="margin-bottom: 32px;">Musicians &amp; Guests</h2>
            <div class="concert-list">
                ${musiciansHtml}
            </div>
        </div>` : ''}

        ${(schedule.length > 0 || prog.intro || prog.google_sheets_url || prog.image) ? `
        <!-- ==========================================
             TAB 6: PROGRAM / SCHEDULE
             ========================================== -->
        <div id="fest-tab-program" class="fest-tab-panel" style="display: none;">
            <span class="section-tag">Daily Timetable</span>
            <h2 style="margin-bottom: 16px;">Program</h2>
            ${prog.intro ? `<p style="max-width: 820px; font-size: 1.05rem; line-height: 1.7; margin-bottom: 28px;">${prog.intro.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}</p>` : ''}
            
            ${sheetsHtml}

            ${posterHtml}

            ${schedule.length > 0 ? `
            <div style="margin-top: ${(sheetsHtml || posterHtml) ? '40px' : '0'};">
                <span class="manifesto-label" style="margin-bottom: 14px; display: inline-block;">Daily Schedule &amp; Flow</span>
                <div style="max-width: 820px; border-top: 1px solid var(--border);">
                    ${scheduleHtml}
                </div>
            </div>` : ''}
        </div>` : ''}

        ${(vf.venue_name || vf.venue_desc) ? `
        <!-- ==========================================
             TAB 7: VENUE & FOOD
             ========================================== -->
        <div id="fest-tab-venue" class="fest-tab-panel" style="display: none;">
            <span class="section-tag">Location &amp; Logistics</span>
            <h2 style="margin-bottom: 16px;">${vf.venue_name || 'Venue'}</h2>
            ${vf.venue_address ? `<p style="font-weight: 500; color: var(--text-meta); margin-bottom: 24px;">📍 ${vf.venue_address}</p>` : ''}
            ${vf.venue_desc ? `<p style="max-width: 820px; font-size: 1.05rem; line-height: 1.7; margin-bottom: 32px;">${vf.venue_desc.replace(/\n\n/g, '<br><br>')}</p>` : ''}

            ${venuePhotosHtml ? `
            <div class="fest-gallery-grid" style="margin-bottom: 48px;">
                ${venuePhotosHtml}
            </div>` : ''}

            ${vf.accommodation_info ? `
            <div style="border: 1px solid var(--border); padding: 36px; background: var(--bg-off); margin-bottom: 48px;">
                <span class="section-tag">Accommodation Guidance</span>
                <h3 style="margin-bottom: 12px;">Where to Stay</h3>
                <p>${vf.accommodation_info.replace(/\n\n/g, '<br><br>')}</p>
            </div>` : ''}

            ${vf.food_chef || vf.food_desc ? `
            <div style="border-top: 1px solid var(--border); padding-top: 36px;">
                <span class="section-tag">Nourishment</span>
                <h3 style="margin-bottom: 12px;">${vf.food_chef || 'Communal Meals'}</h3>
                ${vf.food_desc ? `<p style="max-width: 820px; font-size: 1.05rem; line-height: 1.7;">${vf.food_desc.replace(/\n\n/g, '<br><br>')}</p>` : ''}
            </div>` : ''}
        </div>` : ''}

        ${(team.length > 0 || partners.length > 0) ? `
        <!-- ==========================================
             TAB 8: TEAM & PARTNERS
             ========================================== -->
        <div id="fest-tab-team" class="fest-tab-panel" style="display: none;">
            ${team.length > 0 ? `
            <span class="section-tag">Organization Team</span>
            <h2 style="margin-bottom: 32px;">Our Team</h2>
            <div class="concert-list" style="margin-bottom: 56px;">
                ${teamHtml}
            </div>` : ''}

            ${partners.length > 0 ? `
            <div style="border-top: 1px solid var(--border); padding-top: 40px;">
                <span class="section-tag">Institutional Support</span>
                <h2 style="margin-bottom: 24px;">Partners &amp; Supporters</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 24px; align-items: center;">
                    ${partnersHtml}
                </div>
            </div>` : ''}
        </div>` : ''}

        ${(archVideos.length > 0 || archPhotos.length > 0 || arch.audio_link) ? `
        <!-- ==========================================
             TAB 9: ARCHIVE & MEDIA
             ========================================== -->
        <div id="fest-tab-archive" class="fest-tab-panel" style="display: none;">
            <span class="section-tag">Documentation &amp; Memories</span>
            <h2 style="margin-bottom: 16px;">Videos</h2>

            ${archVideos.length > 0 ? `
            <div class="manifesto-grid" style="border-top: none; padding-top: 0; margin-top: 0; margin-bottom: 40px; gap: 24px;">
                ${archVideosHtml}
            </div>` : ''}

            ${arch.audio_link ? `
            <div style="border-top: 1px solid var(--border); padding-top: 32px; margin-bottom: 40px;">
                <span class="section-tag">Audio Archive</span>
                <h2 style="margin-bottom: 16px;">Audios</h2>
                <a href="${arch.audio_link}" target="_blank" rel="noopener" class="buy-button" style="margin-top: 0 !important;">
                    Access only for verified users &rarr;
                </a>
            </div>` : ''}

            ${archPhotos.length > 0 ? `
            <div style="border-top: 1px solid var(--border); padding-top: 32px;">
                <span class="section-tag">${arch.photographer || 'Photomaterial'}</span>
                <h3>Photomaterial</h3>
            </div>
            <div class="fest-gallery-grid" id="festArchiveGallery">
                ${archPhotosHtml}
            </div>` : ''}
        </div>` : ''}

    </main>

    <!-- Lightbox Modal -->
    <div class="fest-lightbox-modal" id="festLightbox" onclick="closeFestLightbox(event)">
        <span class="fest-lightbox-close" onclick="closeFestLightbox(event)">&times;</span>
        <img class="fest-lightbox-img" id="festLightboxImg" src="" alt="Enlarged view">
    </div>

    <footer>
        <div class="footer">
            <div class="footer_element">
                <a href="index.html" style="text-decoration: none; font-weight: 500; font-size: 0.9rem; letter-spacing: 0.05em; text-transform: uppercase;">Motion Mode of Dialogue in Tirol</a><br><br>
                <img src="img/common/brand/visa_mc.png" alt="Payment Methods">
            </div>
            <div class="footer_element" style="display: flex; flex-direction: column; align-items: flex-end;">
                <a href="pages/legal/Privacy_policy.html">Privacy Policy</a>
                <a href="pages/legal/Refund_policy.html">Refund &amp; Return Policy</a>
                <a href="pages/legal/Terms&Conditions.html">Terms &amp; Conditions</a>
                <a href="pages/legal/GEP.html">Gender Equality Plan</a>
            </div>
        </div>
    </footer>
</body>
</html>`;
    },

    // Retain backwards-compatibility alias
    generateNewFestivalPage: function(fest) {
        return this.generateFestivalPage(fest);
    },

    generateNewsPage: function(newsData) {
        const itemsHtml = (newsData || []).map(item => {
            const title = item.title || '';
            const subtitle = item.subtitle || '';
            const imgSrc = this.formatPageImgUrl(item.image, 1);
            const content = item.content || [];
            const buttons = item.buttons || [];

            const imgTag = imgSrc ? `<img src="${imgSrc}" alt="${title}">` : '';
            const mediaHtml = imgSrc ? `<div>\n                    ${imgTag}\n                </div>` : '';

            const infoParts = [`<h2>${title}</h2>`];
            if (subtitle) {
                infoParts.push(`<p style="color: var(--text-meta) !important; font-weight: 500; margin-bottom: 12px;">${subtitle}</p>`);
            }
            content.forEach(p => {
                infoParts.push(`<p>\n                        ${p}\n                    </p>`);
            });

            if (buttons && buttons.length) {
                const btnTags = buttons.map(b => {
                    const label = b.label || '';
                    const url = b.url || '';
                    const target = url.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
                    return `<a href="${url}" class="buy-button"${target}>${label}</a>`;
                }).join(' ');
                infoParts.push(`<div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px;">\n                        ${btnTags}\n                    </div>`);
            }

            const infoHtml = `<div class="concert-info">\n                    ` + infoParts.join('\n                    ') + `\n                </div>`;

            return `<div class="concert-item">\n                ${mediaHtml}\n                ${infoHtml}\n            </div>`;
        }).join('\n\n');

        return `<!DOCTYPE html>
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
${itemsHtml}
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
</html>`;
    }
};
