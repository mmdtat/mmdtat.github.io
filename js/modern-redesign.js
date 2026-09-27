/* ============================================================
   MMDT.at — Swiss Minimalist Redesign JS
   Simplified: header/footer replacement + hamburger + iframes
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {

    // 1. Detect relative root prefix
    function getRelativeRoot() {
        const scriptTag = document.querySelector('script[src*="modern-redesign.js"]');
        if (scriptTag) {
            const src = scriptTag.getAttribute('src');
            const index = src.indexOf('js/modern-redesign.js');
            if (index !== -1) {
                return src.substring(0, index);
            }
        }
        const path = window.location.pathname;
        if (path.includes('/pages/festivals/') || path.includes('/pages/projects/') || path.includes('/pages/legal/') || path.includes('/pages/CI_Fest_202')) {
            return '../../';
        } else if (path.includes('/pages/')) {
            return '../';
        }
        return '';
    }

    const relRoot = getRelativeRoot();

    // 2. Replace header with clean Swiss-style navigation
    const oldHeader = document.querySelector('header');
    if (oldHeader) {
        const isDarkHeroPage = !!document.querySelector('.intro_home, .intro_festival');
        const logoSrc = isDarkHeroPage ? `${relRoot}img/common/brand/logo.png` : `${relRoot}img/common/brand/logo_black.png`;
        const logoFallbackSrc = isDarkHeroPage ? `${relRoot}img/common/brand/logo.png` : `${relRoot}img/common/brand/logo_black.png`;

        const path = window.location.pathname.toLowerCase();
        const isProjects = path.includes('/projects.') || path.includes('/projects/');
        const isFestival = path.includes('/festival.') || path.includes('/festivals/') || path.includes('ci_fest') || path.includes('cityrolfest') || path.includes('west_meets_east');
        const isClasses = path.includes('/classes.');
        const isEvents = path.includes('/events.');
        const isPartners = path.includes('/partners.');
        const isMembership = path.includes('/membership.');
        const isContacts = path.includes('/contacts.');

        const headerInner = `
            <div class="header__inner">
                <div class="header__logo">
                    <a href="${relRoot}index.html" aria-label="MMDT Home">
                        <img src="${logoSrc}" alt="MMDT" onerror="this.src='${logoFallbackSrc}'">
                    </a>
                </div>
                <nav class="nav">
                    <a class="nav__link ${isProjects ? 'active' : ''}" href="${relRoot}pages/projects.html">Projects</a>
                    <a class="nav__link ${isFestival ? 'active' : ''}" href="${relRoot}pages/festival.html">Festival</a>
                    <a class="nav__link ${isClasses ? 'active' : ''}" href="${relRoot}pages/classes.html">Classes</a>
                    <a class="nav__link ${isEvents ? 'active' : ''}" href="${relRoot}pages/events.html">Events</a>
                    <a class="nav__link ${isPartners ? 'active' : ''}" href="${relRoot}pages/partners.html">Partners</a>
                    <a class="nav__link ${isMembership ? 'active' : ''}" href="${relRoot}pages/membership.html">Membership</a>
                    <a class="nav__link ${isContacts ? 'active' : ''}" href="${relRoot}pages/contacts.html">Contacts</a>
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
        `;
        oldHeader.className = isDarkHeroPage ? 'header header_home' : 'header';
        oldHeader.innerHTML = headerInner;

        // Mobile overlay menu
        const mobileOverlayHTML = `
            <div class="mobile-nav-overlay" id="mobileNavOverlay">
                <a class="mobile-nav-logo" href="${relRoot}index.html" aria-label="MMDT Home">
                    <img src="${relRoot}img/common/brand/logo_black.png" alt="MMDT">
                </a>
                <button class="mobile-nav-close" id="mobileNavClose" aria-label="Close menu">&times;</button>
                <ul class="mobile-nav-menu">
                    <li><a class="mobile-nav-link ${isProjects ? 'active' : ''}" href="${relRoot}pages/projects.html">Projects</a></li>
                    <li><a class="mobile-nav-link ${isFestival ? 'active' : ''}" href="${relRoot}pages/festival.html">Festival</a></li>
                    <li><a class="mobile-nav-link ${isClasses ? 'active' : ''}" href="${relRoot}pages/classes.html">Classes</a></li>
                    <li><a class="mobile-nav-link ${isEvents ? 'active' : ''}" href="${relRoot}pages/events.html">Events</a></li>
                    <li><a class="mobile-nav-link ${isPartners ? 'active' : ''}" href="${relRoot}pages/partners.html">Partners</a></li>
                    <li><a class="mobile-nav-link ${isMembership ? 'active' : ''}" href="${relRoot}pages/membership.html">Membership</a></li>
                    <li><a class="mobile-nav-link ${isContacts ? 'active' : ''}" href="${relRoot}pages/contacts.html">Contacts</a></li>
                </ul>
                <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--border); width: 100%;">
                    <a href="mailto:mm.of.dialogue.in.tyrol@gmail.com" style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.95rem; color: var(--text-meta); text-decoration: none;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                        mm.of.dialogue.in.tyrol@gmail.com
                    </a>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', mobileOverlayHTML);

        // Hamburger toggle
        const burgerBtn = document.getElementById('burgerBtn');
        const mobileOverlay = document.getElementById('mobileNavOverlay');
        const mobileNavClose = document.getElementById('mobileNavClose');

        if (burgerBtn && mobileOverlay) {
            burgerBtn.addEventListener('click', function () {
                burgerBtn.classList.toggle('active');
                mobileOverlay.classList.toggle('active');
                document.body.style.overflow = mobileOverlay.classList.contains('active') ? 'hidden' : '';
            });

            if (mobileNavClose) {
                mobileNavClose.addEventListener('click', function () {
                    burgerBtn.classList.remove('active');
                    mobileOverlay.classList.remove('active');
                    document.body.style.overflow = '';
                });
            }

            mobileOverlay.querySelectorAll('.mobile-nav-link').forEach(link => {
                link.addEventListener('click', function () {
                    burgerBtn.classList.remove('active');
                    mobileOverlay.classList.remove('active');
                    document.body.style.overflow = '';
                });
            });
        }
    }

    // 3. Replace footer with clean version
    const oldFooter = document.querySelector('footer');
    if (oldFooter) {
        const footerInner = `
            <div class="footer">
                <div class="footer__top">
                    <div class="footer__col footer__sitemap">
                        <span class="footer__heading">Sitemap</span>
                        <div class="footer__links-grid">
                            <a href="${relRoot}index.html">Home</a>
                            <a href="${relRoot}pages/projects.html">Projects</a>
                            <a href="${relRoot}pages/festival.html">Festival</a>
                            <a href="${relRoot}pages/classes.html">Classes</a>
                            <a href="${relRoot}pages/events.html">Events</a>
                            <a href="${relRoot}pages/partners.html">Partners</a>
                            <a href="${relRoot}pages/membership.html">Membership</a>
                            <a href="${relRoot}pages/contacts.html">Contacts</a>
                        </div>
                    </div>
                    <div class="footer__col footer__legal">
                        <span class="footer__heading">Legal</span>
                        <div class="footer__links-list">
                            <a href="${relRoot}pages/legal/Privacy_policy.html">Privacy Policy</a>
                            <a href="${relRoot}pages/legal/Refund_policy.html">Refund &amp; Return Policy</a>
                            <a href="${relRoot}pages/legal/Terms&Conditions.html">Terms &amp; Conditions</a>
                            <a href="${relRoot}pages/legal/GEP.html">Gender Equality Plan</a>
                        </div>
                    </div>
                    <div class="footer__col footer__payments">
                        <span class="footer__heading">Payment Methods</span>
                        <img src="${relRoot}img/common/brand/visa_mc.png" alt="Visa & MasterCard" onerror="this.style.display='none'">
                    </div>
                </div>
                <div class="footer__bottom">
                    <a href="${relRoot}index.html" class="footer__brand">
                        Motion Mode of Dialogue in Tirol
                    </a>
                    <span class="footer__copy">Association for Visual &amp; Performative Art · Innsbruck, Austria</span>
                </div>
            </div>
        `;
        oldFooter.innerHTML = footerInner;
        // Remove any inline styles that conflict
        oldFooter.removeAttribute('style');
    }

    // 4. Responsive iframe wrapping for YouTube
    document.querySelectorAll('iframe[src*="youtube"]').forEach(iframe => {
        if (!iframe.parentElement.classList.contains('video-responsive') &&
            !iframe.parentElement.classList.contains('maitane-videos')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'video-responsive';
            iframe.parentNode.insertBefore(wrapper, iframe);
            wrapper.appendChild(iframe);
        }
    });

    // 5. Simple scroll reveal (subtle, minimal)
    const revealElements = document.querySelectorAll('.projects_item, .teacher, .founders_item, .concert-item, #container');
    
    if (revealElements.length > 0 && 'IntersectionObserver' in window) {
        revealElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(12px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        });

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

        revealElements.forEach(el => observer.observe(el));
        window.revealObserver = observer;
    }

    // 6. Tabs logic for events page
    window.switchEventTab = function(tabId) {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        const clickedBtn = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        if (clickedBtn) clickedBtn.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        const activeContent = document.getElementById(tabId);
        if (activeContent) {
            activeContent.style.display = 'block';
            
            // Re-trigger scroll reveal for newly visible elements
            if (window.revealObserver) {
                activeContent.querySelectorAll('.concert-item').forEach(el => {
                    window.revealObserver.observe(el);
                });
            }
        }
    };

    // 7. Tabs logic for Festival Template pages
    window.switchFestivalTab = function(tabId, shouldScroll) {
        document.querySelectorAll('.fest-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const clickedBtn = document.querySelector(`.fest-tab-btn[data-fest-tab="${tabId}"]`);
        if (clickedBtn) clickedBtn.classList.add('active');

        document.querySelectorAll('.fest-tab-panel').forEach(panel => {
            panel.style.display = 'none';
        });
        const activePanel = document.getElementById(`fest-tab-${tabId}`);
        if (activePanel) {
            activePanel.style.display = 'block';
            if (window.revealObserver) {
                activePanel.querySelectorAll('.concert-item, .teacher, .fest-price-card').forEach(el => {
                    window.revealObserver.observe(el);
                });
            }
        }
        if (shouldScroll) {
            const tabsBar = document.getElementById('festTabsAnchor');
            if (tabsBar) {
                const y = tabsBar.getBoundingClientRect().top + window.pageYOffset - 64;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        }
    };

    if (window.location.hash) {
        const hashTab = window.location.hash.substring(1);
        if (document.querySelector(`.fest-tab-btn[data-fest-tab="${hashTab}"]`)) {
            window.switchFestivalTab(hashTab, false);
        }
    }

    // 8. Lightbox helper for Festival galleries (with Prev/Next & Keyboard arrows)
    let currentGalleryImgs = [];
    let currentGalleryIndex = 0;

    window.openFestLightbox = function(src, clickedEl) {
        let lb = document.getElementById('festLightbox');
        if (!lb) {
            lb = document.createElement('div');
            lb.id = 'festLightbox';
            lb.className = 'fest-lightbox';
            lb.innerHTML = `
                <button class="fest-lightbox-close" id="festLbClose" aria-label="Close">&times;</button>
                <button class="fest-lightbox-arrow fest-lightbox-arrow--prev" id="festLbPrev" aria-label="Previous">&#10094;</button>
                <img id="festLightboxImg" src="" alt="Enlarged photo">
                <button class="fest-lightbox-arrow fest-lightbox-arrow--next" id="festLbNext" aria-label="Next">&#10095;</button>
            `;
            lb.addEventListener('click', function(e) {
                if (e.target === lb || e.target.id === 'festLbClose') {
                    lb.classList.remove('active');
                }
            });
            document.body.appendChild(lb);

            document.getElementById('festLbPrev').addEventListener('click', function(e) {
                e.stopPropagation();
                if (currentGalleryImgs.length > 0) {
                    currentGalleryIndex = (currentGalleryIndex - 1 + currentGalleryImgs.length) % currentGalleryImgs.length;
                    document.getElementById('festLightboxImg').src = currentGalleryImgs[currentGalleryIndex].src;
                }
            });
            document.getElementById('festLbNext').addEventListener('click', function(e) {
                e.stopPropagation();
                if (currentGalleryImgs.length > 0) {
                    currentGalleryIndex = (currentGalleryIndex + 1) % currentGalleryImgs.length;
                    document.getElementById('festLightboxImg').src = currentGalleryImgs[currentGalleryIndex].src;
                }
            });
            document.addEventListener('keydown', function(e) {
                if (!lb.classList.contains('active')) return;
                if (e.key === 'Escape') lb.classList.remove('active');
                if (e.key === 'ArrowRight' && currentGalleryImgs.length > 0) {
                    currentGalleryIndex = (currentGalleryIndex + 1) % currentGalleryImgs.length;
                    document.getElementById('festLightboxImg').src = currentGalleryImgs[currentGalleryIndex].src;
                }
                if (e.key === 'ArrowLeft' && currentGalleryImgs.length > 0) {
                    currentGalleryIndex = (currentGalleryIndex - 1 + currentGalleryImgs.length) % currentGalleryImgs.length;
                    document.getElementById('festLightboxImg').src = currentGalleryImgs[currentGalleryIndex].src;
                }
            });
        }

        // Collect all images in the same gallery container
        const allImgs = Array.from(document.querySelectorAll('.fest-gallery-grid img'));
        currentGalleryImgs = allImgs;
        currentGalleryIndex = allImgs.findIndex(i => i.src === src || i.getAttribute('src') === src);
        if (currentGalleryIndex === -1) currentGalleryIndex = 0;

        const img = document.getElementById('festLightboxImg');
        if (img) img.src = src;
        lb.classList.add('active');
    };
});

