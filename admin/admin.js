// ============================================================
// MMDT Swiss Minimalist Admin Panel Client JS
// Universal: Works in Local Mode (Python) & Web Mode (GitHub API for Tamara)
// ============================================================

let currentSection = 'news';
let currentEventSubtab = 'upcoming';

let allEventsData = { upcoming: [], past_tirol: [], past_abroad: [] };
let classesData = {};
let newsData = [];
let settingsData = {};
let projectsData = [];
let festivalsData = [];

// Track pending uploaded image blobs for GitHub commit mode
let pendingImageBlobs = [];

// Helper: Toast notifications
function showToast(message, isError = false) {
    const box = document.getElementById('toastBox');
    if (!box) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (isError) toast.style.background = '#ef4444';
    toast.textContent = message;
    box.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Helper: Escape HTML strings for form inputs and templates
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Helper: Resolve thumbnail URLs correctly from inside /admin/
function getAdminThumbUrl(imgPath, defaultImg = '') {
    if (!imgPath) return defaultImg ? getAdminThumbUrl(defaultImg) : '';
    const clean = String(imgPath).trim();
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:') || clean.startsWith('blob:')) {
        return clean;
    }
    const relative = clean.replace(/^(\.\.\/)+/, '').replace(/^\//, '');
    return `../${relative}`;
}

// Helper: Dynamic image upload binding for repeater cards
function attachImageUpload(btn, inputEl, previewEl = null, subpath = 'festivals') {
    if (!btn || !inputEl) return;
    btn.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        fileInput.addEventListener('change', async function() {
            if (!this.files || !this.files[0]) {
                fileInput.remove();
                return;
            }
            const file = this.files[0];
            try {
                const compressed = await window.MMDTCompressor.compressImage(file, 1920, 0.84);
                const baseName = file.name.replace(/\.[^/.]+$/, "").trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'image';
                const filename = `${baseName}.jpg`;
                const cleanPath = `img/${subpath}/${filename}`;
                inputEl.value = cleanPath;
                if (previewEl) previewEl.src = compressed.dataUrl;

                pendingImageBlobs.push({
                    path: cleanPath,
                    content: compressed.base64,
                    isBase64: true
                });

                if (isLocalServerRunning) {
                    const formData = new FormData();
                    formData.append('file', compressed.blob, filename);
                    formData.append('filename', filename);
                    formData.append('subpath', subpath);
                    formData.append('is_cover', 'false');
                    await fetch('/api/upload', { method: 'POST', body: formData });
                }
                showToast(`Фото ${filename} оптимизировано и сохранено!`);
            } catch (e) {
                showToast('Ошибка загрузки: ' + e.message, true);
            } finally {
                fileInput.remove();
            }
        });

        fileInput.click();
    });
}

// Check if running on local Python server
let isLocalServerRunning = false;
async function detectEnvironment() {
    try {
        const res = await fetch('/api/data/all', { method: 'GET' });
        isLocalServerRunning = res.ok;
    } catch {
        isLocalServerRunning = false;
    }
    updateAuthBadge();
}

// Update authentication & mode indicator in sidebar
async function updateAuthBadge() {
    const dot = document.getElementById('authDot');
    const label = document.getElementById('authLabel');
    const details = document.getElementById('repoModeDetails');

    if (isLocalServerRunning) {
        dot.style.background = '#10b981';
        label.textContent = 'Локальный режим (Git)';
        if (details) details.textContent = 'Локальный сервер активен. Изменения сохраняются на диск и пушатся через Git.';
    } else if (window.MMDTGithub && window.MMDTGithub.hasToken()) {
        dot.style.background = '#10b981';
        label.textContent = 'GitHub API активен';
        if (details) details.textContent = 'Режим Веб-админки: публикация напрямую в репозиторий mmdtat/mmdtat.github.io.';
    } else {
        dot.style.background = '#f59e0b';
        label.textContent = 'Настроить токен GitHub';
        if (details) details.textContent = 'Для публикации без локального сервера требуется указать GitHub Token.';
    }
}

// Unified API GET
async function apiGet(name) {
    if (isLocalServerRunning) {
        try {
            const res = await fetch(`/api/data?file=${name}`);
            if (res.ok) return await res.json();
        } catch {}
    }

    // Fallback to static data file or GitHub API
    try {
        const staticRes = await fetch(`../data/${name}.json?_t=${Date.now()}`);
        if (staticRes.ok) return await staticRes.json();
    } catch {}

    if (window.MMDTGithub && window.MMDTGithub.hasToken()) {
        const gh = await window.MMDTGithub.readFile(`data/${name}.json`);
        if (gh && gh.text) {
            try { return JSON.parse(gh.text); } catch {}
        }
    }
    return null;
}

// Unified API POST
async function apiSave(name, data) {
    // Queue updated JSON for Git commit (both local server and GitHub web mode)
    const cleanJsonPath = name.endsWith('.json') ? `data/${name}` : `data/${name}.json`;
    pendingImageBlobs = pendingImageBlobs.filter(b => b.path !== cleanJsonPath);
    pendingImageBlobs.push({
        path: cleanJsonPath,
        content: JSON.stringify(data, null, 2),
        isBase64: false
    });

    if (isLocalServerRunning) {
        try {
            const res = await fetch(`/api/data?file=${name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await res.json();
        } catch (e) {
            console.error('Local save error:', e);
        }
    }

    // In web mode, memory update is maintained; commit happens on "Publish"
    return { success: true, saved: name, webMode: true };
}

// Helper: Save generated HTML or text file locally (if server active) and queue for GitHub commit
async function saveGeneratedFile(relPath, content) {
    const cleanPath = relPath.replace(/^Deploy[/\\]/, '');
    if (isLocalServerRunning) {
        try {
            await fetch('/api/save-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: cleanPath, content: content })
            });
        } catch (e) {
            console.error('Local save-file error:', e);
        }
    }

    pendingImageBlobs = pendingImageBlobs.filter(b => b.path !== cleanPath);
    pendingImageBlobs.push({
        path: cleanPath,
        content: content,
        isBase64: false
    });
}

// Full-page Entity Editor View Controller
function showEntityEditor(entity) {
    const listEl = document.getElementById(`${entity}ListView`);
    const editEl = document.getElementById(`${entity}EditorView`);
    if (listEl) listEl.style.display = 'none';
    if (editEl) {
        editEl.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const topActions = document.getElementById('topActions');
    if (topActions) topActions.style.visibility = 'hidden';
}

function hideEntityEditor(entity) {
    const listEl = document.getElementById(`${entity}ListView`);
    const editEl = document.getElementById(`${entity}EditorView`);
    if (listEl) listEl.style.display = 'block';
    if (editEl) editEl.style.display = 'none';
    const topActions = document.getElementById('topActions');
    if (topActions) topActions.style.visibility = 'visible';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getSavedSection() {
    const hash = (window.location.hash || '').replace(/^#/, '').trim();
    const validSections = ['news', 'projects', 'festivals', 'classes', 'events', 'publish'];
    if (validSections.includes(hash)) return hash;
    const saved = localStorage.getItem('mmdt_admin_active_section');
    if (validSections.includes(saved)) return saved;
    return 'news';
}

// Sidebar navigation
document.querySelectorAll('.admin-sidebar .nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
});

function switchSection(sec, updateUrl = true) {
    const validSections = ['news', 'projects', 'festivals', 'classes', 'events', 'publish'];
    if (!validSections.includes(sec)) sec = 'news';

    currentSection = sec;
    try {
        localStorage.setItem('mmdt_admin_active_section', sec);
    } catch {}

    if (updateUrl && window.location.hash !== '#' + sec) {
        history.replaceState(null, '', '#' + sec);
    }

    ['events', 'news', 'projects', 'festivals', 'classes'].forEach(hideEntityEditor);

    document.querySelectorAll('.admin-sidebar .nav-item').forEach(b => {
        b.classList.toggle('active', b.dataset.section === sec);
    });
    document.querySelectorAll('.admin-panel-section').forEach(el => {
        el.classList.toggle('active', el.id === `sec-${sec}`);
    });

    const titles = {
        news: {
            title: 'Главная страница & Новости',
            sub: 'Бейдж первого экрана на <a href="../index.html" target="_blank" class="admin-page-link">index.html ↗</a> и анонсы на <a href="../pages/news.html" target="_blank" class="admin-page-link">pages/news.html ↗</a>'
        },
        projects: {
            title: 'Арт-проекты',
            sub: 'Реестр проектов на странице <a href="../pages/projects.html" target="_blank" class="admin-page-link">pages/projects.html ↗</a>'
        },
        festivals: {
            title: 'Фестивали',
            sub: 'Архив и актуальный выпуск на странице <a href="../pages/festival.html" target="_blank" class="admin-page-link">pages/festival.html ↗</a>'
        },
        classes: {
            title: 'Регулярные классы (Body Work)',
            sub: 'Расписание, залы и абонементы на странице <a href="../pages/classes.html" target="_blank" class="admin-page-link">pages/classes.html ↗</a>'
        },
        events: {
            title: 'События и воркшопы',
            sub: 'Управление афишей на странице <a href="../pages/events.html" target="_blank" class="admin-page-link">pages/events.html ↗</a>'
        },
        publish: {
            title: 'Публикация & Git',
            sub: 'Синхронизация и отправка изменений в репозиторий mmdtat/mmdtat.github.io'
        }
    };

    const info = titles[sec] || { title: 'MMDT Control', sub: '' };
    document.getElementById('topTitle').textContent = info.title;
    document.getElementById('topSub').innerHTML = info.sub;

    const topActions = document.getElementById('topActions');
    if (sec === 'events') {
        topActions.innerHTML = `<button class="btn btn-primary" id="addEventBtn">+ Добавить событие</button>`;
        document.getElementById('addEventBtn').addEventListener('click', () => openEventModal(currentEventSubtab));
    } else if (sec === 'news') {
        topActions.innerHTML = `<button class="btn btn-primary" id="topAddNewsBtn">+ Добавить новость</button>`;
        document.getElementById('topAddNewsBtn').addEventListener('click', () => openAddNews());
    } else if (sec === 'projects') {
        topActions.innerHTML = `<button class="btn btn-primary" id="topAddProjectBtn">+ Новый проект</button>`;
        document.getElementById('topAddProjectBtn').addEventListener('click', () => openAddProject());
    } else if (sec === 'festivals') {
        topActions.innerHTML = `<button class="btn btn-primary" id="topAddFestBtn">+ Новый фестиваль</button>`;
        document.getElementById('topAddFestBtn').addEventListener('click', () => openAddFestival());
    } else if (sec === 'classes') {
        topActions.innerHTML = `<button class="btn btn-primary" id="topAddClassBtn">+ Добавить курс</button>`;
        document.getElementById('topAddClassBtn').addEventListener('click', () => openAddClass());
    } else {
        topActions.innerHTML = '';
    }
}

// ==========================================
// 1. EVENTS MANAGEMENT
// ==========================================

async function loadEvents() {
    allEventsData = await apiGet('events') || { upcoming: [], past_tirol: [], past_abroad: [] };
    renderEvents();
}

function renderEvents() {
    const subtab = currentEventSubtab;
    const items = allEventsData[subtab] || [];

    document.getElementById('count-upcoming').textContent = allEventsData.upcoming?.length || 0;
    document.getElementById('count-past-tirol').textContent = allEventsData.past_tirol?.length || 0;
    document.getElementById('count-past-abroad').textContent = allEventsData.past_abroad?.length || 0;

    const list = document.getElementById('eventsList');
    if (items.length === 0) {
        list.innerHTML = `<div style="padding:48px; text-align:center; color:var(--text-meta); background:#fff; border:1px solid var(--border); border-radius:8px;">В этой категории пока нет событий. Нажмите «+ Добавить событие».</div>`;
        return;
    }

    list.innerHTML = items.map((evt, idx) => {
        const thumb = evt.image
            ? `<img src="${evt.image}" class="item-card-thumb" onerror="this.outerHTML='<div class=\\'item-card-nothumb\\'>NO IMAGE</div>'">`
            : `<div class="item-card-nothumb">NO IMAGE</div>`;

        let actionBtns = `<button class="btn btn-sm" onclick="editEvent('${subtab}', ${idx})">Редактировать</button>`;

        if (subtab === 'upcoming') {
            actionBtns += `
                <button class="btn btn-sm" onclick="moveEvent('${subtab}', ${idx}, 'past_tirol')">В архив (Тироль)</button>
                <button class="btn btn-sm" onclick="moveEvent('${subtab}', ${idx}, 'past_abroad')">В архив (Зарубеж)</button>
            `;
        } else {
            actionBtns += `<button class="btn btn-sm" onclick="moveEvent('${subtab}', ${idx}, 'upcoming')">В предстоящие</button>`;
        }

        actionBtns += `<button class="btn btn-sm btn-danger" onclick="deleteEvent('${subtab}', ${idx})">Удалить</button>`;

        const desc = (evt.content && evt.content.length > 0) ? evt.content[0] : '';
        const buttonsBadge = (evt.buttons && evt.buttons.length > 0)
            ? `<span class="badge" style="background:#e0f2fe; color:#0369a1;">Кнопок Stripe: ${evt.buttons.length}</span>`
            : '';

        return `
            <div class="item-card">
                ${thumb}
                <div class="item-card-details">
                    <h3>${evt.title}</h3>
                    ${evt.subtitle ? `<div class="item-card-meta">${evt.subtitle}</div>` : ''}
                    <div class="item-card-desc">${desc}</div>
                    <div class="item-card-tags">
                        ${evt.price_html ? `<span class="badge">${evt.price_html.replace(/<[^>]+>/g, '').trim()}</span>` : ''}
                        ${buttonsBadge}
                    </div>
                </div>
                <div class="item-card-actions">
                    ${actionBtns}
                </div>
            </div>
        `;
    }).join('');
}

document.querySelectorAll('#sec-events .subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#sec-events .subtab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentEventSubtab = btn.dataset.tab;
        renderEvents();
    });
});

async function moveEvent(fromTab, index, toTab) {
    const item = allEventsData[fromTab].splice(index, 1)[0];
    allEventsData[toTab].unshift(item);
    renderEvents();
    await apiSave('events', allEventsData);
    if (window.MMDTTemplates && window.MMDTTemplates.generateEventsPage) {
        const eventsHtml = window.MMDTTemplates.generateEventsPage(allEventsData);
        await saveGeneratedFile('pages/events.html', eventsHtml);
    }
    showToast(`Событие перенесено в «${toTab === 'upcoming' ? 'Предстоящие' : 'Архив'}»!`);
}

async function deleteEvent(fromTab, index) {
    if (!confirm('Вы уверены, что хотите удалить это событие?')) return;
    allEventsData[fromTab].splice(index, 1);
    renderEvents();
    await apiSave('events', allEventsData);
    if (window.MMDTTemplates && window.MMDTTemplates.generateEventsPage) {
        const eventsHtml = window.MMDTTemplates.generateEventsPage(allEventsData);
        await saveGeneratedFile('pages/events.html', eventsHtml);
    }
    showToast('Событие удалено');
}

let editingEventContext = null;

function openEventModal(tab = 'upcoming', index = null) {
    editingEventContext = { tab, index };
    const form = document.getElementById('eventModalForm');

    if (index !== null) {
        const evt = allEventsData[tab][index];
        document.getElementById('modalEventTitle').textContent = 'Редактировать событие';
        document.getElementById('evtCategory').value = tab;
        document.getElementById('evtTitle').value = evt.title || '';
        document.getElementById('evtSubtitle').value = evt.subtitle || '';
        document.getElementById('evtCardLink').value = evt.card_link || '';
        document.getElementById('evtImagePath').value = evt.image || '';
        document.getElementById('evtImgPreview').src = evt.image || '../img/pages/events/jam.jpg';
        document.getElementById('evtContent').value = (evt.content || []).join('\n\n');
        document.getElementById('evtPrice').value = evt.price_html || '';
        document.getElementById('evtLearnMore').value = evt.learn_more_html || '';
        renderEventModalButtons(evt.buttons || []);
    } else {
        document.getElementById('modalEventTitle').textContent = 'Добавить новое событие';
        form.reset();
        document.getElementById('evtCategory').value = tab;
        document.getElementById('evtImagePath').value = '';
        document.getElementById('evtImgPreview').src = '../img/pages/events/jam.jpg';
        renderEventModalButtons([]);
    }
    showEntityEditor('events');
}

function renderEventModalButtons(buttons) {
    const container = document.getElementById('evtButtonsContainer');
    container.innerHTML = buttons.map((b, i) => `
        <div style="display:flex; gap:8px;" data-idx="${i}">
            <input type="text" class="form-control evt-btn-label" placeholder="Название кнопки (Buy Ticket)" value="${b.label || ''}" style="flex:1;">
            <input type="text" class="form-control evt-btn-url" placeholder="Ссылка Stripe (https://...)" value="${b.url || ''}" style="flex:2;">
            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">&times;</button>
        </div>
    `).join('');
}

document.getElementById('addEvtBtnRow').addEventListener('click', () => {
    const container = document.getElementById('evtButtonsContainer');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; gap:8px;';
    div.innerHTML = `
        <input type="text" class="form-control evt-btn-label" placeholder="Название кнопки" style="flex:1;">
        <input type="text" class="form-control evt-btn-url" placeholder="Ссылка (https://...)" style="flex:2;">
        <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(div);
});

const closeEvtBtn = document.getElementById('closeEventModal');
if (closeEvtBtn) closeEvtBtn.addEventListener('click', () => hideEntityEditor('events'));
const cancelEvtBtn = document.getElementById('cancelEventModal');
if (cancelEvtBtn) cancelEvtBtn.addEventListener('click', () => hideEntityEditor('events'));
const backEvtBtn = document.getElementById('backEventsBtn');
if (backEvtBtn) backEvtBtn.addEventListener('click', () => hideEntityEditor('events'));

// Client-side image upload with automatic canvas compression
document.getElementById('evtImgFileInput').addEventListener('change', async function() {
    if (!this.files || !this.files[0]) return;
    const file = this.files[0];

    try {
        const compressed = await window.MMDTCompressor.compressImage(file, 1920, 0.84);
        const baseName = file.name.replace(/\.[^/.]+$/, "").trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'event';
        const filename = `${baseName}.jpg`;
        const cleanPath = `../img/pages/events/${filename}`;

        document.getElementById('evtImagePath').value = cleanPath;
        document.getElementById('evtImgPreview').src = compressed.dataUrl;

        // Save blob for commit
        pendingImageBlobs.push({
            path: `img/pages/events/${filename}`,
            content: compressed.base64,
            isBase64: true
        });

        // Also upload to local server if running
        if (isLocalServerRunning) {
            const formData = new FormData();
            formData.append('file', compressed.blob, filename);
            formData.append('filename', filename);
            formData.append('subpath', 'pages/events');
            await fetch('/api/upload', { method: 'POST', body: formData });
        }

        showToast(`Фото сжато до ${Math.round(compressed.sizeBytes / 1024)} КБ!`);
    } catch (e) {
        showToast('Ошибка обработки фото: ' + e.message, true);
    }
});

// Event form submit
document.getElementById('eventModalForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const targetCat = document.getElementById('evtCategory').value;
    const title = document.getElementById('evtTitle').value.trim();
    const subtitle = document.getElementById('evtSubtitle').value.trim();
    const cardLink = document.getElementById('evtCardLink').value.trim();
    const image = document.getElementById('evtImagePath').value.trim();
    const contentText = document.getElementById('evtContent').value.trim();
    const priceText = document.getElementById('evtPrice').value.trim();
    const learnMoreHtml = document.getElementById('evtLearnMore').value.trim();

    const buttons = [];
    document.querySelectorAll('#evtButtonsContainer > div').forEach(row => {
        const label = row.querySelector('.evt-btn-label').value.trim();
        const url = row.querySelector('.evt-btn-url').value.trim();
        if (label && url) buttons.push({ label, url });
    });

    const eventObj = {
        title,
        subtitle,
        card_link: cardLink,
        image,
        content: contentText.split('\n\n').filter(p => p.trim()),
        price_html: priceText,
        buttons,
        learn_more_html: learnMoreHtml
    };

    if (editingEventContext && editingEventContext.index !== null) {
        const origTab = editingEventContext.tab;
        const origIdx = editingEventContext.index;
        if (origTab === targetCat) {
            allEventsData[origTab][origIdx] = eventObj;
        } else {
            allEventsData[origTab].splice(origIdx, 1);
            allEventsData[targetCat].unshift(eventObj);
        }
    } else {
        allEventsData[targetCat].unshift(eventObj);
    }

    renderEvents();
    hideEntityEditor('events');
    await apiSave('events', allEventsData);

    if (window.MMDTTemplates && window.MMDTTemplates.generateEventsPage) {
        const eventsHtml = window.MMDTTemplates.generateEventsPage(allEventsData);
        await saveGeneratedFile('pages/events.html', eventsHtml);
    }

    showToast('Событие успешно сохранено!');
});

window.editEvent = function(tab, idx) { openEventModal(tab, idx); };

// ==========================================
// 2. CLASSES MANAGEMENT (Multi-Course Support)
// ==========================================

async function loadClasses() {
    const raw = await apiGet('classes');
    classesData = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    renderClassesList();
}

function renderClassesList() {
    const list = document.getElementById('classesList');
    if (!list) return;

    if (!classesData || classesData.length === 0) {
        list.innerHTML = `<div style="padding:48px; text-align:center; color:var(--text-meta); background:#fff; border:1px solid var(--border); border-radius:8px;">
            Курсов и регулярных групп пока нет. Нажмите «+ Добавить курс».
        </div>`;
        return;
    }

    list.innerHTML = classesData.map((item, idx) => {
        const thumbSrc = item.image ? (item.image.startsWith('http') ? item.image : (item.image.startsWith('../') ? item.image : `../${item.image}`)) : '../img/pages/classes/bodywork_course.jpg';
        const datesCount = Object.keys(item.upcoming_dates || {}).length;
        const btnsCount = (item.buttons || []).length;

        return `
            <div class="item-card">
                <img src="${thumbSrc}" class="item-card-thumb" onerror="this.outerHTML='<div class=\\'item-card-nothumb\\'>CLASS</div>'">
                <div class="item-card-details">
                    <h3>${item.title || 'Без названия'}</h3>
                    <div class="item-card-meta">${item.tag || ''} &middot; ${item.schedule || ''} &middot; ${item.venue || ''}</div>
                    <div class="item-card-desc">${item.intro || ''}</div>
                    <div style="font-size:0.75rem; color:var(--text-meta); margin-top:6px;">
                        Даты: ${datesCount} мес. | Кнопки оплаты Stripe: ${btnsCount}
                    </div>
                </div>
                <div class="item-card-actions">
                    <button class="btn btn-sm btn-primary" onclick="editClass(${idx})">Редактировать</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteClass(${idx})">Удалить</button>
                </div>
            </div>
        `;
    }).join('');
}

function openAddClass() {
    document.getElementById('classesForm').reset();
    document.getElementById('classIndex').value = '';
    document.getElementById('modalClassesTitle').textContent = 'Добавить новый курс / программу';
    document.getElementById('classImgPath').value = '';
    document.getElementById('classImgPreview').src = '../img/pages/classes/bodywork_course.jpg';
    document.getElementById('classDatesContainer').innerHTML = '';
    document.getElementById('classButtonsContainer').innerHTML = '';
    showEntityEditor('classes');
}

window.editClass = function(idx) {
    const item = classesData[idx];
    if (!item) return;

    document.getElementById('classesForm').reset();
    document.getElementById('classIndex').value = idx;
    document.getElementById('modalClassesTitle').textContent = `Редактировать курс: ${item.title || ''}`;

    document.getElementById('classTag').value = item.tag || '';
    document.getElementById('classTitle').value = item.title || '';
    document.getElementById('classImgPath').value = item.image || '';
    document.getElementById('classImgPreview').src = item.image || '../img/pages/classes/bodywork_course.jpg';
    document.getElementById('classIntro').value = item.intro || '';
    document.getElementById('classSchedule').value = item.schedule || '';
    document.getElementById('classTime').value = item.time || '';
    document.getElementById('classVenue').value = item.venue || '';
    document.getElementById('classGroupSize').value = item.group_size || '';
    document.getElementById('classPriceInfo').value = item.price_info || '';
    document.getElementById('classPolicy').value = item.policy || '';
    document.getElementById('classContactNote').value = item.contact_note || '';

    const datesBox = document.getElementById('classDatesContainer');
    datesBox.innerHTML = Object.entries(item.upcoming_dates || {}).map(([m, val]) => `
        <div style="display:flex; gap:8px;">
            <input type="text" class="form-control class-date-month" value="${m}" style="width:140px;" placeholder="Месяц">
            <input type="text" class="form-control class-date-val" value="${val}" style="flex:1;" placeholder="Даты (8, 9, 22...)">
            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">&times;</button>
        </div>
    `).join('');

    const btnsBox = document.getElementById('classButtonsContainer');
    btnsBox.innerHTML = (item.buttons || []).map(b => `
        <div style="display:flex; gap:8px;">
            <input type="text" class="form-control class-btn-label" value="${b.label || ''}" style="flex:1;" placeholder="Текст кнопки">
            <input type="text" class="form-control class-btn-url" value="${b.url || ''}" style="flex:2;" placeholder="Ссылка Stripe">
            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">&times;</button>
        </div>
    `).join('');

    showEntityEditor('classes');
};

window.deleteClass = async function(idx) {
    const item = classesData[idx];
    if (!confirm(`Удалить курс «${item.title || 'Без названия'}»?`)) return;

    classesData.splice(idx, 1);
    renderClassesList();
    await apiSave('classes', classesData);

    if (window.MMDTTemplates && window.MMDTTemplates.generateClassesPage) {
        const classesHtml = window.MMDTTemplates.generateClassesPage(classesData);
        await saveGeneratedFile('pages/classes.html', classesHtml);
    }

    showToast('Курс удален, страница classes.html обновлена');
};

const closeClassesModalBtn = document.getElementById('closeClassesModal');
if (closeClassesModalBtn) closeClassesModalBtn.addEventListener('click', () => hideEntityEditor('classes'));

const cancelClassesModalBtn = document.getElementById('cancelClassesModal');
if (cancelClassesModalBtn) cancelClassesModalBtn.addEventListener('click', () => hideEntityEditor('classes'));

const backClassesBtn = document.getElementById('backClassesBtn');
if (backClassesBtn) backClassesBtn.addEventListener('click', () => hideEntityEditor('classes'));

document.getElementById('addClassDateRow')?.addEventListener('click', () => {
    const datesBox = document.getElementById('classDatesContainer');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; gap:8px;';
    div.innerHTML = `
        <input type="text" class="form-control class-date-month" placeholder="Месяц (e.g. May)" style="width:140px;">
        <input type="text" class="form-control class-date-val" placeholder="Даты (e.g. 5, 12, 19, 26)" style="flex:1;">
        <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">&times;</button>
    `;
    datesBox.appendChild(div);
});

document.getElementById('addClassBtnRow')?.addEventListener('click', () => {
    const btnsBox = document.getElementById('classButtonsContainer');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; gap:8px;';
    div.innerHTML = `
        <input type="text" class="form-control class-btn-label" placeholder="Текст кнопки" style="flex:1;">
        <input type="text" class="form-control class-btn-url" placeholder="Ссылка Stripe" style="flex:2;">
        <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">&times;</button>
    `;
    btnsBox.appendChild(div);
});

document.getElementById('classImgFileInput')?.addEventListener('change', async function() {
    if (!this.files || !this.files[0]) return;
    const file = this.files[0];
    try {
        const compressed = await window.MMDTCompressor.compressImage(file, 1920, 0.84);
        const baseName = file.name.replace(/\.[^/.]+$/, "").trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'class';
        const filename = `${baseName}.jpg`;
        const cleanPath = `../img/pages/classes/${filename}`;
        document.getElementById('classImgPath').value = cleanPath;
        document.getElementById('classImgPreview').src = compressed.dataUrl;

        pendingImageBlobs.push({
            path: `img/pages/classes/${filename}`,
            content: compressed.base64,
            isBase64: true
        });

        if (isLocalServerRunning) {
            const formData = new FormData();
            formData.append('file', compressed.blob, filename);
            formData.append('filename', filename);
            formData.append('subpath', 'pages/classes');
            await fetch('/api/upload', { method: 'POST', body: formData });
        }
        showToast(`Фото сохранено (${Math.round(compressed.sizeBytes / 1024)} КБ)!`);
    } catch (e) {
        showToast('Ошибка: ' + e.message, true);
    }
});

document.getElementById('classesForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const idx = document.getElementById('classIndex').value;

    const dates = {};
    document.querySelectorAll('#classDatesContainer > div').forEach(row => {
        const m = row.querySelector('.class-date-month')?.value.trim();
        const val = row.querySelector('.class-date-val')?.value.trim();
        if (m && val) dates[m] = val;
    });

    const btns = [];
    document.querySelectorAll('#classButtonsContainer > div').forEach(row => {
        const label = row.querySelector('.class-btn-label')?.value.trim();
        const url = row.querySelector('.class-btn-url')?.value.trim();
        if (label && url) btns.push({ label, url });
    });

    const classItem = {
        id: (idx !== '' && classesData[idx]?.id) ? classesData[idx].id : `class_${Date.now()}`,
        tag: document.getElementById('classTag').value.trim(),
        title: document.getElementById('classTitle').value.trim(),
        image: document.getElementById('classImgPath').value.trim() || '../img/pages/classes/bodywork_course.jpg',
        intro: document.getElementById('classIntro').value.trim(),
        schedule: document.getElementById('classSchedule').value.trim(),
        time: document.getElementById('classTime').value.trim(),
        venue: document.getElementById('classVenue').value.trim(),
        group_size: document.getElementById('classGroupSize').value.trim(),
        upcoming_dates: dates,
        price_info: document.getElementById('classPriceInfo').value.trim(),
        policy: document.getElementById('classPolicy').value.trim(),
        contact_note: document.getElementById('classContactNote').value.trim(),
        buttons: btns
    };

    if (idx !== '') {
        classesData[parseInt(idx, 10)] = classItem;
    } else {
        classesData.unshift(classItem);
    }

    renderClassesList();
    hideEntityEditor('classes');
    await apiSave('classes', classesData);

    // Direct Swiss HTML regeneration of pages/classes.html
    if (window.MMDTTemplates && window.MMDTTemplates.generateClassesPage) {
        const classesHtml = window.MMDTTemplates.generateClassesPage(classesData);
        await saveGeneratedFile('pages/classes.html', classesHtml);
    }

    showToast(`Курс «${classItem.title}» успешно сохранен и страница Classes обновлена!`);
});

// ==========================================
// 3. NEWS & HOMEPAGE
// ==========================================

async function loadNewsAndSettings() {
    newsData = await apiGet('news') || [];
    settingsData = await apiGet('settings') || {};

    if (settingsData.next_event_badge) {
        document.getElementById('badgeLabel').value = settingsData.next_event_badge.label || '';
        document.getElementById('badgeUrl').value = settingsData.next_event_badge.url || '';
    }
    if (settingsData.news_badge) {
        const nbLabel = document.getElementById('newsBadgeLabel');
        const nbUrl = document.getElementById('newsBadgeUrl');
        if (nbLabel) nbLabel.value = settingsData.news_badge.label || '';
        if (nbUrl) nbUrl.value = settingsData.news_badge.url || '';
    }
    const pc = document.getElementById('settingsPhotoCredit');
    const pcu = document.getElementById('settingsPhotoCreditUrl');
    const ce = document.getElementById('settingsContactEmail');
    if (pc) pc.value = settingsData.photo_credit || '';
    if (pcu) pcu.value = settingsData.photo_credit_url || '';
    if (ce) ce.value = settingsData.contact_email || '';

    renderNews();
}

document.getElementById('saveBadgeBtn').addEventListener('click', async () => {
    settingsData.next_event_badge = {
        label: document.getElementById('badgeLabel').value.trim(),
        url: document.getElementById('badgeUrl').value.trim()
    };
    const nbLabel = document.getElementById('newsBadgeLabel');
    const nbUrl = document.getElementById('newsBadgeUrl');
    if (nbLabel && nbUrl) {
        settingsData.news_badge = {
            label: nbLabel.value.trim(),
            url: nbUrl.value.trim()
        };
    }
    const pc = document.getElementById('settingsPhotoCredit');
    const pcu = document.getElementById('settingsPhotoCreditUrl');
    const ce = document.getElementById('settingsContactEmail');
    if (pc) settingsData.photo_credit = pc.value.trim();
    if (pcu) settingsData.photo_credit_url = pcu.value.trim();
    if (ce) settingsData.contact_email = ce.value.trim();

    await apiSave('settings', settingsData);
    showToast('Настройки и главная страница index.html обновлены!');
});

function renderNews() {
    const list = document.getElementById('newsList');
    if (!list) return;
    if (newsData.length === 0) {
        list.innerHTML = `<div style="padding:32px; text-align:center; color:var(--text-meta); background:#fff; border:1px solid var(--border); border-radius:8px;">Новостей пока нет. Нажмите «+ Добавить новость».</div>`;
        return;
    }
    list.innerHTML = newsData.map((item, i) => `
        <div class="item-card">
            ${item.image ? `<img src="${item.image}" class="item-card-thumb" onerror="this.outerHTML='<div class=\\'item-card-nothumb\\'>NEWS</div>'">` : `<div class="item-card-nothumb">NEWS</div>`}
            <div class="item-card-details">
                <h3>${item.title}</h3>
                ${item.subtitle ? `<div class="item-card-meta">${item.subtitle}</div>` : ''}
                <div class="item-card-desc">${(item.content || []).join(' ')}</div>
            </div>
            <div class="item-card-actions">
                <button class="btn btn-sm" onclick="editNews(${i})">Редактировать</button>
                <button class="btn btn-sm btn-danger" onclick="deleteNews(${i})">Удалить</button>
            </div>
        </div>
    `).join('');
}

function openAddNews() {
    document.getElementById('newsModalForm').reset();
    document.getElementById('newsIndex').value = '';
    document.getElementById('modalNewsTitle').textContent = 'Добавить новость';
    document.getElementById('saveNewsBtn').textContent = 'Сохранить новость';
    document.getElementById('newsSubtitle').value = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('newsImgPreview').src = '../img/common/brand/lg.png';
    document.getElementById('newsImagePath').value = '';
    showEntityEditor('news');
}

window.editNews = function(idx) {
    const item = newsData[idx];
    if (!item) return;
    document.getElementById('newsModalForm').reset();
    document.getElementById('newsIndex').value = idx;
    document.getElementById('modalNewsTitle').textContent = 'Редактировать новость';
    document.getElementById('saveNewsBtn').textContent = 'Сохранить изменения';
    document.getElementById('newsTitle').value = item.title || '';
    document.getElementById('newsSubtitle').value = item.subtitle || '';
    document.getElementById('newsContent').value = (item.content || []).join('\n\n');
    document.getElementById('newsImagePath').value = item.image || '';
    document.getElementById('newsImgPreview').src = getAdminThumbUrl(item.image, '../img/common/brand/lg.png');
    const firstBtn = (item.buttons || [])[0] || {};
    document.getElementById('newsBtnLabel').value = firstBtn.label || '';
    document.getElementById('newsBtnUrl').value = firstBtn.url || '';
    showEntityEditor('news');
};

const addNewsBtn = document.getElementById('addNewsBtn');
if (addNewsBtn) addNewsBtn.addEventListener('click', openAddNews);

const closeNewsModalBtn = document.getElementById('closeNewsModal');
if (closeNewsModalBtn) closeNewsModalBtn.addEventListener('click', () => hideEntityEditor('news'));

const cancelNewsModalBtn = document.getElementById('cancelNewsModal');
if (cancelNewsModalBtn) cancelNewsModalBtn.addEventListener('click', () => hideEntityEditor('news'));

const backNewsBtn = document.getElementById('backNewsBtn');
if (backNewsBtn) backNewsBtn.addEventListener('click', () => hideEntityEditor('news'));

const newsImgFileInput = document.getElementById('newsImgFileInput');
if (newsImgFileInput) {
    newsImgFileInput.addEventListener('change', async function() {
        if (!this.files || !this.files[0]) return;
        const file = this.files[0];
        try {
            const compressed = await window.MMDTCompressor.compressImage(file, 1920, 0.84);
            const baseName = file.name.replace(/\.[^/.]+$/, "").trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'news';
            const filename = `${baseName}.jpg`;
            const cleanPath = `../img/news/${filename}`;

            document.getElementById('newsImagePath').value = cleanPath;
            document.getElementById('newsImgPreview').src = compressed.dataUrl;

            pendingImageBlobs.push({
                path: `img/news/${filename}`,
                content: compressed.base64,
                isBase64: true
            });

            if (isLocalServerRunning) {
                const formData = new FormData();
                formData.append('file', compressed.blob, filename);
                formData.append('filename', filename);
                formData.append('subpath', 'news');
                formData.append('is_cover', 'false');
                await fetch('/api/upload', { method: 'POST', body: formData });
            }
            showToast('Фото к новости загружено и оптимизировано!');
        } catch (e) {
            showToast('Ошибка загрузки: ' + e.message, true);
        }
    });
}

const newsModalForm = document.getElementById('newsModalForm');
if (newsModalForm) {
    newsModalForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const idx = document.getElementById('newsIndex').value;
        const title = document.getElementById('newsTitle').value.trim();
        const subtitle = document.getElementById('newsSubtitle').value.trim();
        const contentRaw = document.getElementById('newsContent').value.trim();
        const image = document.getElementById('newsImagePath').value.trim();
        const btnLabel = document.getElementById('newsBtnLabel').value.trim();
        const btnUrl = document.getElementById('newsBtnUrl').value.trim();

        const content = contentRaw ? contentRaw.split('\n\n').map(p => p.trim()).filter(Boolean) : [];
        const buttons = (btnLabel && btnUrl) ? [{ label: btnLabel, url: btnUrl }] : [];

        const newsObj = { title, subtitle, image, content, buttons };

        if (idx !== '') {
            newsData[parseInt(idx, 10)] = newsObj;
        } else {
            newsData.unshift(newsObj);
        }

        renderNews();
        hideEntityEditor('news');
        await apiSave('news', newsData);

        if (window.MMDTTemplates && window.MMDTTemplates.generateNewsPage) {
            const newsHtml = window.MMDTTemplates.generateNewsPage(newsData);
            await saveGeneratedFile('pages/news.html', newsHtml);
        }

        showToast('Новость успешно сохранена и news.html обновлен!');
    });
}

window.deleteNews = async function(idx) {
    if (!confirm('Удалить эту новость?')) return;
    newsData.splice(idx, 1);
    renderNews();
    await apiSave('news', newsData);

    if (window.MMDTTemplates && window.MMDTTemplates.generateNewsPage) {
        const newsHtml = window.MMDTTemplates.generateNewsPage(newsData);
        await saveGeneratedFile('pages/news.html', newsHtml);
    }

    showToast('Новость удалена');
};

// ==========================================
// 4. PROJECTS CONSTRUCTOR & DIRECTORY
// ==========================================

async function loadProjectsAndFestivals() {
    projectsData = await apiGet('projects') || [];
    festivalsData = await apiGet('festivals') || [];
    renderProjectsList();
    renderFestivalsList();
}

function renderProjectsList() {
    const pList = document.getElementById('projectsList');
    if (!pList) return;
    pList.innerHTML = projectsData.map((p, idx) => {
        const thumbSrc = encodeURI(getAdminThumbUrl(p.image, 'img/projects/covers/TheSilenceoftheMass.jpg'));
        return `
        <div class="item-card" style="grid-template-columns: 80px 1fr auto; align-items: center;">
            <div style="width: 80px; height: 80px; border-radius: 6px; overflow: hidden; background: #f1f5f9; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <img src="${thumbSrc}" class="item-card-thumb" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'item-card-nothumb\\'>PROJ</div>'">
            </div>
            <div class="item-card-details">
                <h3>${escapeHtml(p.title)} ${p.year ? `<strong>(${escapeHtml(p.year)})</strong>` : ''}</h3>
                <div class="item-card-meta">Ссылка: <code>${escapeHtml(p.url)}</code></div>
            </div>
            <div class="item-card-actions">
                <button class="btn btn-sm" onclick="editProject(${idx})">Редактировать</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProject(${idx})">Удалить</button>
                <a href="../pages/${p.url}" target="_blank" class="btn btn-sm">Открыть ↗</a>
            </div>
        </div>`;
    }).join('');
}

// --- Project Subtabs Navigation ---
function initProjectSubtabs() {
    document.querySelectorAll('#projectsEditorView .proj-tab-nav-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const subtab = this.getAttribute('data-subtab') || this.getAttribute('data-proj-subtab');
            document.querySelectorAll('#projectsEditorView .proj-tab-nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('#projectsEditorView .proj-subtab-pane').forEach(p => p.classList.remove('active'));
            const pane = document.getElementById(`pane-proj-${subtab}`);
            if (pane) pane.classList.add('active');
        });
    });
}
initProjectSubtabs();

// --- Project Repeaters: Concept Cards, Team, Partners ---
function addProjConceptCardRow(card = {}) {
    const container = document.getElementById('projConceptCardsContainer');
    if (!container) return;
    const cardEl = document.createElement('div');
    cardEl.className = 'repeater-card';
    cardEl.innerHTML = `
        <div class="repeater-card-header">
            <span class="repeater-card-title">${escapeHtml(card.label || card.title || 'Новый смысловой блок')}</span>
            <button type="button" class="btn btn-sm btn-danger btn-remove-row">Удалить</button>
        </div>
        <div class="form-row">
            <div class="form-group" style="flex:1;">
                <label class="form-label">Метка блока (Label)</label>
                <input type="text" class="form-control concept-label" value="${escapeHtml(card.label || '')}" placeholder="01 / Concept & Inquiry">
            </div>
            <div class="form-group" style="flex:2;">
                <label class="form-label">Заголовок блока (опционально)</label>
                <input type="text" class="form-control concept-title" value="${escapeHtml(card.title || '')}" placeholder="Origins / Background...">
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Текст концепции</label>
            <textarea class="form-control concept-content" rows="4" placeholder="Подробное описание концептуальной линии, хореографического поиска...">${escapeHtml(card.content || '')}</textarea>
        </div>
    `;
    cardEl.querySelector('.btn-remove-row').addEventListener('click', () => cardEl.remove());
    cardEl.querySelector('.concept-label').addEventListener('input', (e) => {
        cardEl.querySelector('.repeater-card-title').textContent = e.target.value.trim() || 'Новый смысловой блок';
    });
    container.appendChild(cardEl);
}

function addProjTeamMemberRow(member = {}) {
    const container = document.getElementById('projTeamMembersContainer');
    if (!container) return;
    const cardEl = document.createElement('div');
    cardEl.className = 'repeater-card';
    cardEl.innerHTML = `
        <div class="repeater-card-header">
            <span class="repeater-card-title">${escapeHtml(member.name || 'Новый участник')}</span>
            <button type="button" class="btn btn-sm btn-danger btn-remove-row">Удалить</button>
        </div>
        <div class="form-row">
            <div class="form-group" style="flex:1;">
                <label class="form-label">Имя и фамилия *</label>
                <input type="text" class="form-control team-name" value="${escapeHtml(member.name || '')}" placeholder="Tamara Maksymenko" required>
            </div>
            <div class="form-group" style="flex:1;">
                <label class="form-label">Роль / Должность *</label>
                <input type="text" class="form-control team-role" value="${escapeHtml(member.role || '')}" placeholder="choreographer/dancer/artistic director">
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Дополнительная информация / био (опционально)</label>
            <input type="text" class="form-control team-bio" value="${escapeHtml(member.bio || '')}" placeholder="Ukraine / Austria">
        </div>
    `;
    cardEl.querySelector('.btn-remove-row').addEventListener('click', () => cardEl.remove());
    cardEl.querySelector('.team-name').addEventListener('input', (e) => {
        cardEl.querySelector('.repeater-card-title').textContent = e.target.value.trim() || 'Новый участник';
    });
    container.appendChild(cardEl);
}

function addProjPartnerRow(partner = {}) {
    const container = document.getElementById('projPartnersContainer');
    if (!container) return;
    const cardEl = document.createElement('div');
    cardEl.className = 'repeater-card';
    const randId = Math.floor(Math.random() * 100000);
    const logoSrc = partner.logo ? (partner.logo.startsWith('http') ? partner.logo : partner.logo.replace(/^(\.\.\/)+/, '')) : 'img/common/brand/mmdt_logo.jpg';
    cardEl.innerHTML = `
        <div class="repeater-card-header">
            <span class="repeater-card-title">${escapeHtml(partner.name || 'Новый партнёр')}</span>
            <button type="button" class="btn btn-sm btn-danger btn-remove-row">Удалить</button>
        </div>
        <div class="form-row">
            <div class="form-group" style="flex:1;">
                <label class="form-label">Название организации / партнёра *</label>
                <input type="text" class="form-control partner-name" value="${escapeHtml(partner.name || '')}" placeholder="Stadt Innsbruck">
            </div>
            <div class="form-group" style="flex:1;">
                <label class="form-label">Ссылка на сайт (URL, опционально)</label>
                <input type="text" class="form-control partner-url" value="${escapeHtml(partner.url || '')}" placeholder="https://...">
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Логотип партнёра</label>
            <div class="image-upload-box">
                <img class="upload-preview-img partner-logo-preview" src="${logoSrc.startsWith('../') ? logoSrc : `../${logoSrc}`}" style="width:50px; height:50px; object-fit:contain; background:#fff;">
                <div style="flex:1;">
                    <input type="file" id="partnerLogoInput_${randId}" accept="image/*" style="display:none;">
                    <button type="button" class="btn btn-sm" onclick="document.getElementById('partnerLogoInput_${randId}').click()">Загрузить логотип</button>
                    <input type="text" class="form-control partner-logo-path" value="${escapeHtml(partner.logo || '')}" placeholder="img/common/partners/logo.png" style="margin-top:6px; font-size:0.8rem;">
                </div>
            </div>
        </div>
    `;
    cardEl.querySelector('.btn-remove-row').addEventListener('click', () => cardEl.remove());
    cardEl.querySelector('.partner-name').addEventListener('input', (e) => {
        cardEl.querySelector('.repeater-card-title').textContent = e.target.value.trim() || 'Новый партнёр';
    });

    const fileInp = cardEl.querySelector(`#partnerLogoInput_${randId}`);
    if (fileInp) {
        fileInp.addEventListener('change', async function() {
            if (!this.files || !this.files[0]) return;
            const file = this.files[0];
            try {
                const compressed = await window.MMDTCompressor.compressImage(file, 800, 0.9);
                const filename = file.name.replace(/\.[^/.]+$/, "") + ".png";
                const cleanPath = `img/common/partners/${filename}`;
                cardEl.querySelector('.partner-logo-path').value = cleanPath;
                cardEl.querySelector('.partner-logo-preview').src = compressed.dataUrl;

                pendingImageBlobs.push({
                    path: cleanPath,
                    content: compressed.base64,
                    isBase64: true
                });

                if (isLocalServerRunning) {
                    const formData = new FormData();
                    formData.append('file', compressed.blob, filename);
                    formData.append('filename', filename);
                    formData.append('subpath', 'common/partners');
                    await fetch('/api/upload', { method: 'POST', body: formData });
                }
                showToast('Логотип загружен!');
            } catch (err) {
                showToast('Ошибка загрузки: ' + err.message, true);
            }
        });
    }

    container.appendChild(cardEl);
}

// --- Project Gallery Drag & Drop and Thumbnail Management ---
let currentProjGalleryPhotos = [];

function renderProjGalleryThumbs() {
    const grid = document.getElementById('projGalleryThumbsGrid');
    const rawInput = document.getElementById('projGalleryPhotos');

    if (!grid) return;

    if (rawInput) {
        rawInput.value = currentProjGalleryPhotos.join('\n');
    }

    grid.innerHTML = '';

    if (currentProjGalleryPhotos.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:32px 16px; color:var(--text-meta); font-size:0.85rem;" id="projGalleryEmptyState">В проекте пока нет фотографий. Нажмите «+ Добавить фотографии» или перетащите их в поле выше.</div>`;
        return;
    }

    currentProjGalleryPhotos.forEach((src, idx) => {
        const thumbBox = document.createElement('div');
        thumbBox.style.cssText = 'position:relative; aspect-ratio:1; border-radius:6px; overflow:hidden; border:1px solid #e2e8f0; background:#f1f5f9;';

        const displaySrc = (src.startsWith('http') || src.startsWith('data:')) ? src : (src.startsWith('../') ? src : `../${src}`);

        thumbBox.innerHTML = `
            <img src="${displaySrc}" style="width:100%; height:100%; object-fit:cover; display:block;" loading="lazy">
            <button type="button" title="Удалить фото" style="position:absolute; top:4px; right:4px; width:22px; height:22px; border-radius:50%; background:rgba(220,38,38,0.85); color:#fff; border:none; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; line-height:1; padding:0;">&times;</button>
        `;

        thumbBox.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            currentProjGalleryPhotos.splice(idx, 1);
            renderProjGalleryThumbs();
        });

        grid.appendChild(thumbBox);
    });
}

async function handleProjGalleryFiles(files) {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileList.length === 0) {
        showToast('Пожалуйста, выберите файлы изображений (JPG, PNG, WebP)', true);
        return;
    }

    const progressBox = document.getElementById('projGalleryProgressBarBox');
    const progressBar = document.getElementById('projGalleryProgressBar');
    const progressText = document.getElementById('projGalleryProgressText');
    const progressPercent = document.getElementById('projGalleryProgressPercent');

    if (progressBox) progressBox.style.display = 'block';

    const slug = document.getElementById('projSlug').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'project';
    const subpath = `projects/${slug}/gallery`;

    let processed = 0;
    const total = fileList.length;

    for (const file of fileList) {
        try {
            if (progressText) progressText.textContent = `Сжатие и загрузка: ${file.name} (${processed + 1}/${total})...`;
            const compressed = await window.MMDTCompressor.compressImage(file, 2200, 0.84);
            const filename = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const relPath = `img/${subpath}/${filename}`;

            pendingImageBlobs.push({
                path: relPath,
                content: compressed.base64,
                isBase64: true
            });

            if (isLocalServerRunning) {
                const formData = new FormData();
                formData.append('file', compressed.blob, filename);
                formData.append('filename', filename);
                formData.append('subpath', subpath);
                await fetch('/api/upload', { method: 'POST', body: formData });
            }

            if (!currentProjGalleryPhotos.includes(relPath)) {
                currentProjGalleryPhotos.push(relPath);
            }
        } catch (err) {
            console.error('Error processing gallery image:', err);
        }

        processed++;
        const pct = Math.round((processed / total) * 100);
        if (progressBar) progressBar.style.width = pct + '%';
        if (progressPercent) progressPercent.textContent = pct + '%';
    }

    renderProjGalleryThumbs();

    setTimeout(() => {
        if (progressBox) progressBox.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
        showToast(`Успешно добавлено ${processed} фотографий в проект!`);
    }, 600);
}

// Gallery Upload Event Listeners
const projGalleryUploadBtn = document.getElementById('projGalleryUploadBtn');
const projGalleryMultiFileInput = document.getElementById('projGalleryMultiFileInput');
const projGalleryClearAllBtn = document.getElementById('projGalleryClearAllBtn');
const projGalleryDropzone = document.getElementById('projGalleryDropzone');
const toggleProjGalleryRawPathsBtn = document.getElementById('toggleProjGalleryRawPathsBtn');
const projGalleryRawBox = document.getElementById('projGalleryRawBox');
const projGalleryPhotosInput = document.getElementById('projGalleryPhotos');

if (projGalleryUploadBtn && projGalleryMultiFileInput) {
    projGalleryUploadBtn.addEventListener('click', () => projGalleryMultiFileInput.click());
    projGalleryMultiFileInput.addEventListener('change', function() {
        handleProjGalleryFiles(this.files);
        this.value = '';
    });
}

if (projGalleryClearAllBtn) {
    projGalleryClearAllBtn.addEventListener('click', () => {
        if (currentProjGalleryPhotos.length === 0) return;
        if (confirm('Очистить все фотографии из проекта?')) {
            currentProjGalleryPhotos = [];
            renderProjGalleryThumbs();
        }
    });
}

if (projGalleryDropzone && projGalleryMultiFileInput) {
    projGalleryDropzone.addEventListener('click', () => projGalleryMultiFileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
        projGalleryDropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            projGalleryDropzone.style.borderColor = '#10b981';
            projGalleryDropzone.style.background = '#f0fdf4';
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        projGalleryDropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            projGalleryDropzone.style.borderColor = '#cbd5e1';
            projGalleryDropzone.style.background = '#f8fafc';
        });
    });

    projGalleryDropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
            handleProjGalleryFiles(dt.files);
        }
    });
}

if (toggleProjGalleryRawPathsBtn && projGalleryRawBox) {
    toggleProjGalleryRawPathsBtn.addEventListener('click', () => {
        const isHidden = projGalleryRawBox.style.display === 'none';
        projGalleryRawBox.style.display = isHidden ? 'block' : 'none';
        toggleProjGalleryRawPathsBtn.textContent = isHidden ? '✕ Скрыть текстовые пути к файлам' : '⚙ Показать пути к файлам (текстовый список)';
    });
}

if (projGalleryPhotosInput) {
    projGalleryPhotosInput.addEventListener('input', function() {
        currentProjGalleryPhotos = this.value.split('\n').map(s => s.trim()).filter(Boolean);
        renderProjGalleryThumbs();
    });
}

// Add row buttons
const addProjConceptCardBtn = document.getElementById('addProjConceptCardBtn');
if (addProjConceptCardBtn) {
    addProjConceptCardBtn.addEventListener('click', () => addProjConceptCardRow());
}

const addProjTeamMemberBtn = document.getElementById('addProjTeamMemberBtn');
if (addProjTeamMemberBtn) {
    addProjTeamMemberBtn.addEventListener('click', () => addProjTeamMemberRow());
}

const addProjPartnerBtn = document.getElementById('addProjPartnerBtn');
if (addProjPartnerBtn) {
    addProjPartnerBtn.addEventListener('click', () => addProjPartnerRow());
}

// Image upload inputs
const projImgFileInput = document.getElementById('projImgFileInput');
if (projImgFileInput) {
    projImgFileInput.addEventListener('change', async function() {
        if (!this.files || !this.files[0]) return;
        const file = this.files[0];
        try {
            const compressed = await window.MMDTCompressor.compressImage(file, 2200, 0.84);
            const baseName = file.name.replace(/\.[^/.]+$/, "").trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'project';
            const filename = `${baseName}.jpg`;
            const cleanPath = `../img/projects/covers/${filename}`;

            document.getElementById('projImagePath').value = cleanPath;
            document.getElementById('projImgPreview').src = compressed.dataUrl;

            pendingImageBlobs.push({
                path: `img/projects/covers/${filename}`,
                content: compressed.base64,
                isBase64: true
            });

            if (isLocalServerRunning) {
                const formData = new FormData();
                formData.append('file', compressed.blob, filename);
                formData.append('filename', filename);
                formData.append('subpath', 'projects/covers');
                formData.append('is_cover', 'true');
                await fetch('/api/upload', { method: 'POST', body: formData });
            }
            showToast('Обложка проекта загружена и оптимизирована!');
        } catch (e) {
            showToast('Ошибка загрузки: ' + e.message, true);
        }
    });
}

const projHeroBgInput = document.getElementById('projHeroBgInput');
if (projHeroBgInput) {
    projHeroBgInput.addEventListener('change', async function() {
        if (!this.files || !this.files[0]) return;
        const file = this.files[0];
        try {
            const compressed = await window.MMDTCompressor.compressImage(file, 2400, 0.85);
            const slug = document.getElementById('projSlug').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'project';
            const filename = `hero_${file.name.replace(/\.[^/.]+$/, "")}.jpg`;
            const cleanPath = `img/projects/${slug}/${filename}`;

            document.getElementById('projHeroBgPath').value = cleanPath;
            document.getElementById('projHeroBgPreview').src = compressed.dataUrl;

            pendingImageBlobs.push({
                path: cleanPath,
                content: compressed.base64,
                isBase64: true
            });

            if (isLocalServerRunning) {
                const formData = new FormData();
                formData.append('file', compressed.blob, filename);
                formData.append('filename', filename);
                formData.append('subpath', `projects/${slug}`);
                formData.append('is_cover', 'true');
                await fetch('/api/upload', { method: 'POST', body: formData });
            }
            showToast('Фоновое фото главного экрана загружено!');
        } catch (e) {
            showToast('Ошибка загрузки: ' + e.message, true);
        }
    });
}

const projTeamImgInput = document.getElementById('projTeamImgInput');
if (projTeamImgInput) {
    projTeamImgInput.addEventListener('change', async function() {
        if (!this.files || !this.files[0]) return;
        const file = this.files[0];
        try {
            const compressed = await window.MMDTCompressor.compressImage(file, 1600, 0.85);
            const slug = document.getElementById('projSlug').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'project';
            const filename = `team_${file.name.replace(/\.[^/.]+$/, "")}.jpg`;
            const cleanPath = `img/projects/${slug}/${filename}`;

            document.getElementById('projTeamImgPath').value = cleanPath;
            document.getElementById('projTeamImgPreview').src = compressed.dataUrl;

            pendingImageBlobs.push({
                path: cleanPath,
                content: compressed.base64,
                isBase64: true
            });

            if (isLocalServerRunning) {
                const formData = new FormData();
                formData.append('file', compressed.blob, filename);
                formData.append('filename', filename);
                formData.append('subpath', `projects/${slug}`);
                await fetch('/api/upload', { method: 'POST', body: formData });
            }
            showToast('Фото команды загружено!');
        } catch (e) {
            showToast('Ошибка загрузки: ' + e.message, true);
        }
    });
}

function openAddProject() {
    document.getElementById('projectModalForm').reset();
    document.getElementById('projIndex').value = '';
    document.getElementById('modalProjectTitle').textContent = 'Создать новый арт-проект';
    document.getElementById('saveProjBtn').textContent = 'Создать проект и страницу';
    document.getElementById('projYear').value = new Date().getFullYear();
    document.getElementById('projImgPreview').src = '../img/projects/covers/TheSilenceoftheMass.jpg';
    document.getElementById('projImagePath').value = '../img/projects/covers/TheSilenceoftheMass.jpg';
    document.getElementById('projHeroBgPreview').src = '../img/projects/covers/TheSilenceoftheMass.jpg';
    document.getElementById('projHeroBgPath').value = '';
    document.getElementById('projTeamImgPreview').src = '../img/projects/covers/TheSilenceoftheMass.jpg';
    document.getElementById('projTeamImgPath').value = '';

    // Clear containers
    document.getElementById('projConceptCardsContainer').innerHTML = '';
    document.getElementById('projTeamMembersContainer').innerHTML = '';
    document.getElementById('projPartnersContainer').innerHTML = '';
    currentProjGalleryPhotos = [];
    renderProjGalleryThumbs();

    // Add default starter concept card
    addProjConceptCardRow({ label: '01 / Concept & Inquiry', title: '', content: '' });

    // Switch to first subtab
    document.querySelectorAll('#projectsEditorView .proj-tab-nav-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    document.querySelectorAll('#projectsEditorView .proj-subtab-pane').forEach((p, i) => p.classList.toggle('active', i === 0));

    showEntityEditor('projects');
}

window.editProject = async function(idx) {
    const p = projectsData[idx];
    if (!p) return;
    document.getElementById('projectModalForm').reset();
    document.getElementById('projIndex').value = idx;
    document.getElementById('modalProjectTitle').textContent = `Редактировать проект: ${p.title}`;
    document.getElementById('saveProjBtn').textContent = 'Сохранить изменения и обновить страницу';

    const slug = (p.url || '').replace(/^projects\//, '').replace(/\.html$/, '');

    // Try loading full structured JSON
    let fullData = null;
    try {
        fullData = await apiGet(`projects/${slug}`);
    } catch {}

    if (!fullData && p.overview && typeof p.overview === 'object') {
        fullData = p;
    }

    // Populate Subtab 1: Main & Hero
    document.getElementById('projTitle').value = (fullData && fullData.title) || p.title || '';
    document.getElementById('projYear').value = (fullData && fullData.year) || p.year || '';
    document.getElementById('projSlug').value = (fullData && fullData.slug) || slug;
    document.getElementById('projTag').value = (fullData && fullData.tag) || p.tag || '';
    document.getElementById('projSubtitle').value = (fullData && fullData.subtitle) || p.subtitle || '';

    const coverImg = (fullData && fullData.image) || p.image || '../img/projects/covers/TheSilenceoftheMass.jpg';
    document.getElementById('projImagePath').value = coverImg;
    document.getElementById('projImgPreview').src = coverImg.startsWith('http') ? coverImg : (coverImg.startsWith('../') ? coverImg : `../${coverImg}`);

    const heroBg = (fullData && fullData.hero_bg) || '';
    document.getElementById('projHeroBgPath').value = heroBg;
    if (heroBg) {
        document.getElementById('projHeroBgPreview').src = heroBg.startsWith('http') ? heroBg : (heroBg.startsWith('../') ? heroBg : `../${heroBg}`);
    } else {
        document.getElementById('projHeroBgPreview').src = document.getElementById('projImgPreview').src;
    }

    // Populate Subtab 2: Overview & Concept
    const ov = (fullData && fullData.overview) || {};
    const qf = ov.quick_facts || [];
    document.getElementById('projFact1Label').value = (qf[0] && qf[0].label) || '';
    document.getElementById('projFact1Value').value = (qf[0] && qf[0].value) || '';
    document.getElementById('projFact1Sub').value = (qf[0] && qf[0].sub) || '';

    document.getElementById('projFact2Label').value = (qf[1] && qf[1].label) || '';
    document.getElementById('projFact2Value').value = (qf[1] && qf[1].value) || '';
    document.getElementById('projFact2Sub').value = (qf[1] && qf[1].sub) || '';

    document.getElementById('projFact3Label').value = (qf[2] && qf[2].label) || '';
    document.getElementById('projFact3Value').value = (qf[2] && qf[2].value) || '';
    document.getElementById('projFact3Sub').value = (qf[2] && qf[2].sub) || '';

    document.getElementById('projFact4Label').value = (qf[3] && qf[3].label) || '';
    document.getElementById('projFact4Value').value = (qf[3] && qf[3].value) || '';
    document.getElementById('projFact4Sub').value = (qf[3] && qf[3].sub) || '';

    document.getElementById('projManifestoTag').value = ov.manifesto_tag || '';
    document.getElementById('projManifestoQuote').value = ov.manifesto_quote || '';

    // Concept Cards Repeater
    const conceptCardsContainer = document.getElementById('projConceptCardsContainer');
    conceptCardsContainer.innerHTML = '';
    const cards = ov.concept_cards || [];
    if (cards.length > 0) {
        cards.forEach(c => addProjConceptCardRow(c));
    } else {
        addProjConceptCardRow({ label: '01 / Concept & Inquiry', title: '', content: '' });
    }
    document.getElementById('projOverview').value = (typeof ov === 'string' ? ov : (ov.general_text || p.overview || ''));

    // Video
    document.getElementById('projVideoTag').value = ov.video_tag || '';
    document.getElementById('projVideoTitle').value = ov.video_title || '';
    document.getElementById('projVideoUrl').value = ov.video_url || p.video_url || '';

    // Tickets
    const tk = ov.tickets || {};
    document.getElementById('projTicketsTag').value = tk.tag || '';
    document.getElementById('projTicketsVenue').value = tk.venue || '';
    document.getElementById('projTicketsWhen').value = tk.when || '';
    document.getElementById('projTicketsWhere').value = tk.where || '';
    document.getElementById('projTicketsPrice').value = tk.price || '';
    document.getElementById('projTicketsBookingText').value = tk.booking_text || '';
    document.getElementById('projTicketsBookingLink').value = tk.booking_link || '';

    // Crowdfunding
    const cf = ov.crowdfunding || {};
    document.getElementById('projCrowdTag').value = cf.tag || '';
    document.getElementById('projCrowdTitle').value = cf.title || '';
    document.getElementById('projCrowdDesc').value = cf.desc || '';
    document.getElementById('projCrowdBtnText').value = cf.link_text || '';
    document.getElementById('projCrowdBtnUrl').value = cf.link_url || '';

    // Populate Subtab 3: Team
    const tm = (fullData && fullData.team) || {};
    document.getElementById('projTeamTag').value = tm.tag || '';
    document.getElementById('projTeamTitle').value = tm.title || '';
    const teamImg = tm.image || '';
    document.getElementById('projTeamImgPath').value = teamImg;
    if (teamImg) {
        document.getElementById('projTeamImgPreview').src = teamImg.startsWith('http') ? teamImg : (teamImg.startsWith('../') ? teamImg : `../${teamImg}`);
    } else {
        document.getElementById('projTeamImgPreview').src = document.getElementById('projImgPreview').src;
    }
    document.getElementById('projTeamStatement').value = tm.statement || '';

    const teamContainer = document.getElementById('projTeamMembersContainer');
    teamContainer.innerHTML = '';
    const credits = tm.credits || [];
    credits.forEach(c => addProjTeamMemberRow(c));

    // Populate Subtab 4: Partners
    const pt = (fullData && fullData.partners) || {};
    document.getElementById('projPartnersTag').value = pt.tag || '';
    document.getElementById('projPartnersTitle').value = pt.title || '';
    const partnersContainer = document.getElementById('projPartnersContainer');
    partnersContainer.innerHTML = '';
    const partnersList = pt.list || [];
    partnersList.forEach(pObj => addProjPartnerRow(pObj));

    // Populate Subtab 5: Gallery
    const gl = (fullData && fullData.gallery) || {};
    document.getElementById('projGalleryTag').value = gl.tag || '';
    document.getElementById('projGalleryTitle').value = gl.title || '';
    document.getElementById('projGalleryCredits').value = gl.credits || '';
    currentProjGalleryPhotos = (gl.photos || []).slice();
    renderProjGalleryThumbs();

    // Switch to first subtab
    document.querySelectorAll('#projectsEditorView .proj-tab-nav-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    document.querySelectorAll('#projectsEditorView .proj-subtab-pane').forEach((pane, i) => pane.classList.toggle('active', i === 0));

    showEntityEditor('projects');
};

const addProjectBtn = document.getElementById('addProjectBtn');
if (addProjectBtn) addProjectBtn.addEventListener('click', openAddProject);

const closeProjectModalBtn = document.getElementById('closeProjectModal');
if (closeProjectModalBtn) closeProjectModalBtn.addEventListener('click', () => hideEntityEditor('projects'));

const cancelProjectModalBtn = document.getElementById('cancelProjectModal');
if (cancelProjectModalBtn) cancelProjectModalBtn.addEventListener('click', () => hideEntityEditor('projects'));

const backProjectsBtn = document.getElementById('backProjectsBtn');
if (backProjectsBtn) backProjectsBtn.addEventListener('click', () => hideEntityEditor('projects'));

const projectModalForm = document.getElementById('projectModalForm');
if (projectModalForm) {
    projectModalForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const idx = document.getElementById('projIndex').value;
        const title = document.getElementById('projTitle').value.trim();
        const year = document.getElementById('projYear').value.trim();
        const slug = document.getElementById('projSlug').value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const tag = document.getElementById('projTag').value.trim();
        const subtitle = document.getElementById('projSubtitle').value.trim();
        const image = document.getElementById('projImagePath').value.trim() || '../img/projects/covers/TheSilenceoftheMass.jpg';
        const heroBg = document.getElementById('projHeroBgPath').value.trim() || image;

        // Quick Facts
        const facts = [];
        for (let i = 1; i <= 4; i++) {
            const l = document.getElementById(`projFact${i}Label`).value.trim();
            const v = document.getElementById(`projFact${i}Value`).value.trim();
            const s = document.getElementById(`projFact${i}Sub`).value.trim();
            if (l || v || s) {
                facts.push({ label: l, value: v, sub: s });
            }
        }

        // Manifesto
        const manifestoTag = document.getElementById('projManifestoTag').value.trim();
        const manifestoQuote = document.getElementById('projManifestoQuote').value.trim();

        // Concept Cards
        const conceptCards = [];
        document.querySelectorAll('#projConceptCardsContainer .repeater-card').forEach(card => {
            const l = card.querySelector('.concept-label')?.value.trim() || '';
            const t = card.querySelector('.concept-title')?.value.trim() || '';
            const c = card.querySelector('.concept-content')?.value.trim() || '';
            if (l || t || c) {
                conceptCards.push({ label: l, title: t, content: c });
            }
        });
        const generalOverview = document.getElementById('projOverview').value.trim();

        // Video
        const videoTag = document.getElementById('projVideoTag').value.trim();
        const videoTitle = document.getElementById('projVideoTitle').value.trim();
        const videoUrl = document.getElementById('projVideoUrl').value.trim();

        // Tickets
        const ticketsTag = document.getElementById('projTicketsTag').value.trim();
        const ticketsVenue = document.getElementById('projTicketsVenue').value.trim();
        const ticketsWhen = document.getElementById('projTicketsWhen').value.trim();
        const ticketsWhere = document.getElementById('projTicketsWhere').value.trim();
        const ticketsPrice = document.getElementById('projTicketsPrice').value.trim();
        const ticketsBookingText = document.getElementById('projTicketsBookingText').value.trim();
        const ticketsBookingLink = document.getElementById('projTicketsBookingLink').value.trim();
        const ticketsData = (ticketsVenue || ticketsWhen || ticketsWhere || ticketsPrice || ticketsBookingText || ticketsBookingLink) ? {
            tag: ticketsTag,
            venue: ticketsVenue,
            when: ticketsWhen,
            where: ticketsWhere,
            price: ticketsPrice,
            booking_text: ticketsBookingText,
            booking_link: ticketsBookingLink
        } : {};

        // Crowdfunding
        const crowdTag = document.getElementById('projCrowdTag').value.trim();
        const crowdTitle = document.getElementById('projCrowdTitle').value.trim();
        const crowdDesc = document.getElementById('projCrowdDesc').value.trim();
        const crowdBtnText = document.getElementById('projCrowdBtnText').value.trim();
        const crowdBtnUrl = document.getElementById('projCrowdBtnUrl').value.trim();
        const crowdfundingData = (crowdTitle || crowdDesc || crowdBtnUrl) ? {
            tag: crowdTag,
            title: crowdTitle,
            desc: crowdDesc,
            link_text: crowdBtnText,
            link_url: crowdBtnUrl
        } : {};

        // Team
        const teamTag = document.getElementById('projTeamTag').value.trim();
        const teamTitle = document.getElementById('projTeamTitle').value.trim();
        const teamImg = document.getElementById('projTeamImgPath').value.trim();
        const teamStatement = document.getElementById('projTeamStatement').value.trim();
        const teamCredits = [];
        document.querySelectorAll('#projTeamMembersContainer .repeater-card').forEach(card => {
            const n = card.querySelector('.team-name')?.value.trim() || '';
            const r = card.querySelector('.team-role')?.value.trim() || '';
            const b = card.querySelector('.team-bio')?.value.trim() || '';
            if (n || r) {
                teamCredits.push({ name: n, role: r, bio: b });
            }
        });

        // Partners
        const partnersTag = document.getElementById('projPartnersTag').value.trim();
        const partnersTitle = document.getElementById('projPartnersTitle').value.trim();
        const partnersList = [];
        document.querySelectorAll('#projPartnersContainer .repeater-card').forEach(card => {
            const n = card.querySelector('.partner-name')?.value.trim() || '';
            const u = card.querySelector('.partner-url')?.value.trim() || '';
            const l = card.querySelector('.partner-logo-path')?.value.trim() || '';
            if (n || l) {
                partnersList.push({ name: n, url: u, logo: l });
            }
        });

        // Gallery
        const galleryTag = document.getElementById('projGalleryTag').value.trim();
        const galleryTitle = document.getElementById('projGalleryTitle').value.trim();
        const galleryCredits = document.getElementById('projGalleryCredits').value.trim();

        // Build full structured object
        const fullProjectData = {
            title,
            year,
            slug,
            tag: tag || `${year} · Performative Project`,
            subtitle,
            image,
            hero_bg: heroBg,
            overview: {
                quick_facts: facts,
                manifesto_tag: manifestoTag,
                manifesto_quote: manifestoQuote,
                concept_cards: conceptCards,
                general_text: generalOverview,
                video_tag: videoTag,
                video_title: videoTitle,
                video_url: videoUrl,
                tickets: ticketsData,
                crowdfunding: crowdfundingData
            },
            team: {
                tag: teamTag,
                title: teamTitle,
                image: teamImg,
                statement: teamStatement,
                credits: teamCredits
            },
            partners: {
                tag: partnersTag,
                title: partnersTitle,
                list: partnersList
            },
            gallery: {
                tag: galleryTag,
                title: galleryTitle,
                credits: galleryCredits,
                photos: currentProjGalleryPhotos
            }
        };

        const pageUrl = `projects/${slug}.html`;
        const pageFilePath = `pages/projects/${slug}.html`;

        // 1. Generate full HTML page with Swiss minimalism & conditional rendering
        const pageHtml = window.MMDTTemplates.generateNewProjectPage(fullProjectData);
        await saveGeneratedFile(pageFilePath, pageHtml);

        // 2. Save individual structured project JSON
        await apiSave(`projects/${slug}`, fullProjectData);

        // 3. Update catalog entry in projectsData
        const catalogItem = {
            title,
            year,
            image,
            url: pageUrl,
            page_file: pageFilePath,
            tag: fullProjectData.tag,
            subtitle
        };

        if (idx !== '') {
            const i = parseInt(idx, 10);
            projectsData[i] = catalogItem;
        } else {
            projectsData.unshift(catalogItem);
        }

        // 4. Save catalog projects.json
        await apiSave('projects', projectsData);

        // 5. Regenerate pages/projects.html
        const projectsCatalogHtml = window.MMDTTemplates.generateProjectsPage(projectsData);
        await saveGeneratedFile('pages/projects.html', projectsCatalogHtml);

        // 6. Update UI
        renderProjectsList();
        hideEntityEditor('projects');
        showToast(`Проект «${title}» и страница ${pageFilePath} успешно сохранены!`);
    });
}

window.deleteProject = async function(idx) {
    if (!confirm('Удалить проект из списка?')) return;
    projectsData.splice(idx, 1);
    renderProjectsList();
    await apiSave('projects', projectsData);
    const projectsCatalogHtml = window.MMDTTemplates.generateProjectsPage(projectsData);
    await saveGeneratedFile('pages/projects.html', projectsCatalogHtml);
    showToast('Проект удален из каталога');
};

// ==========================================
// 5. FESTIVALS CONSTRUCTOR & DIRECTORY
// ==========================================

function renderFestivalsList() {
    const fList = document.getElementById('festivalsList');
    if (!fList) return;
    fList.innerHTML = festivalsData.map((f, idx) => {
        const thumbSrc = encodeURI(getAdminThumbUrl(f.image, 'img/festivals/covers/CI_2026.jpg'));
        return `
        <div class="item-card" style="grid-template-columns: 80px 1fr auto; align-items: center;">
            <div style="width: 80px; height: 80px; border-radius: 6px; overflow: hidden; background: #f1f5f9; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <img src="${thumbSrc}" class="item-card-thumb" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'item-card-nothumb\\'>FEST</div>'">
            </div>
            <div class="item-card-details">
                <h3>${escapeHtml(f.title)} ${f.year ? `<strong>(${escapeHtml(f.year)})</strong>` : ''}</h3>
                <div class="item-card-meta">Страница: <code>${escapeHtml(f.url)}</code></div>
            </div>
            <div class="item-card-actions">
                <button class="btn btn-sm" onclick="editFestival(${idx})">Редактировать</button>
                <button class="btn btn-sm btn-danger" onclick="deleteFestival(${idx})">Удалить</button>
                <a href="../${f.url}" target="_blank" class="btn btn-sm">Открыть ↗</a>
            </div>
        </div>`;
    }).join('');
}

// --- Festival Repeaters & Dynamic Rows ---

function addFestPassRow(pass = {}) {
    const container = document.getElementById('festPassesContainer');
    if (!container) return;
    const card = document.createElement('div');
    card.className = 'repeater-card';
    card.innerHTML = `
        <div class="repeater-card-header">
            <span class="repeater-card-title">${escapeHtml(pass.label || pass.title || 'Новый тариф')}</span>
            <button type="button" class="btn btn-sm btn-danger btn-remove-row">Удалить</button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Бейдж / Период (Label)</label>
                <input type="text" class="form-control pass-label" value="${escapeHtml(pass.label || '')}" placeholder="Full Week Pass · Aug 21–28">
            </div>
            <div class="form-group">
                <label class="form-label">Название тарифа (Title)</label>
                <input type="text" class="form-control pass-title" value="${escapeHtml(pass.title || '')}" placeholder="Regular participation:">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Старая цена</label>
                <input type="text" class="form-control pass-price-old" value="${escapeHtml(pass.price_old || '')}" placeholder="399 €">
            </div>
            <div class="form-group">
                <label class="form-label">Текущая цена *</label>
                <input type="text" class="form-control pass-price-current" value="${escapeHtml(pass.price_current || '')}" placeholder="365 €">
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Примечание к билету</label>
            <input type="text" class="form-control pass-desc" value="${escapeHtml(pass.desc || '')}" placeholder="(without accommodation and meals)">
        </div>
        <div class="form-row">
            <div class="form-group" style="flex:2;">
                <label class="form-label">Ссылка для оплаты (Stripe / форма)</label>
                <input type="text" class="form-control pass-url" value="${escapeHtml(pass.url || '')}" placeholder="https://buy.stripe.com/...">
            </div>
            <div class="form-group" style="flex:1; display:flex; align-items:center; margin-top:24px;">
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:500;">
                    <input type="checkbox" class="pass-soldout" ${pass.is_soldout ? 'checked' : ''} style="width:16px; height:16px;">
                    Распродано (Sold out)
                </label>
            </div>
        </div>
    `;
    card.querySelector('.btn-remove-row').addEventListener('click', () => card.remove());
    card.querySelector('.pass-label').addEventListener('input', (e) => {
        card.querySelector('.repeater-card-title').textContent = e.target.value.trim() || 'Новый тариф';
    });
    container.appendChild(card);
}

function addTeacherClassRow(container, classData = {}) {
    if (!container) return;
    const classCard = document.createElement('div');
    classCard.className = 'teacher-class-card';
    classCard.innerHTML = `
        <div class="teacher-class-card-header">
            <span class="class-card-title">${escapeHtml(classData.title || 'Новый класс / воркшоп')}</span>
            <button type="button" class="btn btn-sm btn-danger btn-remove-class" title="Удалить этот класс">&times; Удалить класс</button>
        </div>
        <div class="form-row">
            <div class="form-group" style="flex:2;">
                <label class="form-label">Название / Тема класса *</label>
                <input type="text" class="form-control class-title" value="${escapeHtml(classData.title || '')}" placeholder="например: Action-Non-Action или Vertical Dance in Nature">
            </div>
            <div class="form-group" style="flex:1;">
                <label class="form-label">Тип / Бейдж</label>
                <input type="text" class="form-control class-label" value="${escapeHtml(classData.label || 'WORKSHOP')}" placeholder="WORKSHOP, LAB, LECTURE...">
            </div>
        </div>
        <div class="form-group">
            <label class="form-label"><strong>Описание класса / воркшопа *</strong></label>
            <textarea class="form-control class-desc" rows="3" placeholder="Подробное описание практики, фокус лаборатории, исследуемые темы и партитура...">${escapeHtml(classData.desc || classData.description || '')}</textarea>
        </div>
        <div class="form-group">
            <label class="form-label">YouTube видео класса (embed URL, опционально)</label>
            <input type="text" class="form-control class-video" value="${escapeHtml(classData.video_url || '')}" placeholder="https://www.youtube.com/embed/...">
        </div>
    `;

    classCard.querySelector('.btn-remove-class').addEventListener('click', () => classCard.remove());
    classCard.querySelector('.class-title').addEventListener('input', (e) => {
        classCard.querySelector('.class-card-title').textContent = e.target.value.trim() || 'Новый класс / воркшоп';
    });

    container.appendChild(classCard);
}

function addFestTeacherRow(teacher = {}) {
    const container = document.getElementById('festTeachersContainer');
    if (!container) return;
    const card = document.createElement('div');
    card.className = 'repeater-card';
    card.innerHTML = `
        <div class="repeater-card-header">
            <span class="repeater-card-title">${escapeHtml(teacher.name || 'Новый преподаватель')}</span>
            <button type="button" class="btn btn-sm btn-danger btn-remove-row">Удалить преподавателя</button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Имя преподавателя *</label>
                <input type="text" class="form-control teacher-name" value="${escapeHtml(teacher.name || '')}" placeholder="Maitane Sarralde" required>
            </div>
            <div class="form-group">
                <label class="form-label">Роль / Статус</label>
                <input type="text" class="form-control teacher-role" value="${escapeHtml(teacher.role || 'Core Teacher')}" placeholder="Core Teacher">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Основное фото мастера (URL или Загрузить)</label>
                <div style="display:flex; gap:8px;">
                    <input type="text" class="form-control teacher-photo" value="${escapeHtml(teacher.photo || '')}" placeholder="img/festivals/2026/teachers/Maitane_Sarralde.jpg">
                    <button type="button" class="btn btn-sm btn-upload-teacher-photo">Загрузить</button>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Второе фото мастера в движении (опционально)</label>
                <div style="display:flex; gap:8px;">
                    <input type="text" class="form-control teacher-photo2" value="${escapeHtml(teacher.photo2 || '')}" placeholder="img/festivals/2026/teachers/Maitane1.jpg">
                    <button type="button" class="btn btn-sm btn-upload-teacher-photo2">Загрузить</button>
                </div>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label"><strong>Биография преподавателя</strong> (образование, опыт, бэкграунд, проекты) *</label>
            <textarea class="form-control teacher-bio" rows="4" placeholder="Подробная биография мастера (каждый абзац с новой строки)...">${escapeHtml(teacher.bio || '')}</textarea>
        </div>
        <div class="form-group">
            <label class="form-label">Общее видео визитки / трейлера преподавателя (embed URL, опционально)</label>
            <input type="text" class="form-control teacher-video" value="${escapeHtml(teacher.video_url || '')}" placeholder="https://www.youtube.com/embed/...">
        </div>

        <!-- Nested Classes and Workshops -->
        <div class="teacher-classes-wrapper">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h5 style="margin:0; font-size:0.95rem; font-weight:600;">Классы и воркшопы преподавателя</h5>
                    <small style="color:var(--text-meta); font-size:0.75rem;">Можно добавить 1, 2, 3 и более классов на одного мастера с отдельными описаниями</small>
                </div>
                <button type="button" class="btn btn-sm btn-primary btn-add-teacher-class">+ Добавить класс</button>
            </div>
            <div class="teacher-classes-container"></div>
        </div>
    `;

    card.querySelector('.btn-remove-row').addEventListener('click', () => card.remove());
    card.querySelector('.teacher-name').addEventListener('input', (e) => {
        card.querySelector('.repeater-card-title').textContent = e.target.value.trim() || 'Новый преподаватель';
    });

    attachImageUpload(card.querySelector('.btn-upload-teacher-photo'), card.querySelector('.teacher-photo'), null, 'festivals/teachers');
    attachImageUpload(card.querySelector('.btn-upload-teacher-photo2'), card.querySelector('.teacher-photo2'), null, 'festivals/teachers');

    const classesContainer = card.querySelector('.teacher-classes-container');
    const addClassBtn = card.querySelector('.btn-add-teacher-class');
    addClassBtn.addEventListener('click', () => addTeacherClassRow(classesContainer));

    // Populate classes
    const existingClasses = (teacher.classes && Array.isArray(teacher.classes) && teacher.classes.length > 0)
        ? teacher.classes
        : ((teacher.topic || teacher.class_desc) ? [{
            title: teacher.topic || '',
            label: teacher.class_label || 'WORKSHOP',
            desc: teacher.class_desc || '',
            video_url: ''
        }] : [{ title: '', label: 'WORKSHOP', desc: '', video_url: '' }]);

    existingClasses.forEach(c => addTeacherClassRow(classesContainer, c));

    container.appendChild(card);
}

function addFestPerfRow(perf = {}) {
    const container = document.getElementById('festPerformancesContainer');
    if (!container) return;
    const card = document.createElement('div');
    card.className = 'repeater-card';
    card.innerHTML = `
        <div class="repeater-card-header">
            <span class="repeater-card-title">${escapeHtml(perf.title || 'Новый перформанс')}</span>
            <button type="button" class="btn btn-sm btn-danger btn-remove-row">Удалить</button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Название перформанса *</label>
                <input type="text" class="form-control perf-title" value="${escapeHtml(perf.title || '')}" placeholder="Hacer Sonar El Aire" required>
            </div>
            <div class="form-group">
                <label class="form-label">Дата и время</label>
                <input type="text" class="form-control perf-date" value="${escapeHtml(perf.date_time || '')}" placeholder="August 23, 2026 · 18:00">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Локация показа</label>
                <input type="text" class="form-control perf-venue" value="${escapeHtml(perf.venue || '')}" placeholder="Innsbruck City Tower (Stadtturm)">
            </div>
            <div class="form-group">
                <label class="form-label">Артисты / Исполнители</label>
                <input type="text" class="form-control perf-artists" value="${escapeHtml(perf.artists || '')}" placeholder="Maitane Sarralde">
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Описание показа</label>
            <textarea class="form-control perf-desc" rows="3" placeholder="Описание перформанса...">${escapeHtml(perf.desc || '')}</textarea>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">YouTube видео (embed URL)</label>
                <input type="text" class="form-control perf-video" value="${escapeHtml(perf.video_url || '')}" placeholder="https://www.youtube.com/embed/...">
            </div>
            <div class="form-group">
                <label class="form-label">Информация о билетах / входе</label>
                <input type="text" class="form-control perf-tickets" value="${escapeHtml(perf.ticket_info || '')}" placeholder="Free public outdoor performance">
            </div>
        </div>
    `;
    card.querySelector('.btn-remove-row').addEventListener('click', () => card.remove());
    card.querySelector('.perf-title').addEventListener('input', (e) => {
        card.querySelector('.repeater-card-title').textContent = e.target.value.trim() || 'Новый перформанс';
    });
    container.appendChild(card);
}

function addFestMusicianRow(musician = {}) {
    const container = document.getElementById('festMusiciansContainer');
    if (!container) return;
    const card = document.createElement('div');
    card.className = 'repeater-card';
    card.innerHTML = `
        <div class="repeater-card-header">
            <span class="repeater-card-title">${escapeHtml(musician.name || 'Новый музыкант')}</span>
            <button type="button" class="btn btn-sm btn-danger btn-remove-row">Удалить</button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Имя музыканта / проекта *</label>
                <input type="text" class="form-control musician-name" value="${escapeHtml(musician.name || '')}" placeholder="Dima Bondarev" required>
            </div>
            <div class="form-group">
                <label class="form-label">Инструмент / Роль</label>
                <input type="text" class="form-control musician-role" value="${escapeHtml(musician.role || '')}" placeholder="Trumpet & Live Electronics">
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Фото музыканта (URL или Загрузить)</label>
            <div style="display:flex; gap:8px;">
                <input type="text" class="form-control musician-photo" value="${escapeHtml(musician.photo || '')}" placeholder="img/festivals/2026/Bondarev.jpg">
                <button type="button" class="btn btn-sm btn-upload-musician-photo">Загрузить</button>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Краткая биография</label>
            <textarea class="form-control musician-bio" rows="2" placeholder="О музыканте...">${escapeHtml(musician.bio || '')}</textarea>
        </div>
    `;
    card.querySelector('.btn-remove-row').addEventListener('click', () => card.remove());
    card.querySelector('.musician-name').addEventListener('input', (e) => {
        card.querySelector('.repeater-card-title').textContent = e.target.value.trim() || 'Новый музыкант';
    });
    attachImageUpload(
        card.querySelector('.btn-upload-musician-photo'),
        card.querySelector('.musician-photo'),
        null,
        'festivals'
    );
    container.appendChild(card);
}

function addFestScheduleRow(item = {}) {
    const container = document.getElementById('festScheduleContainer');
    if (!container) return;
    const card = document.createElement('div');
    card.className = 'repeater-card';
    card.style.padding = '12px 16px';
    card.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center;">
            <div style="flex:1;">
                <input type="text" class="form-control sched-time" value="${escapeHtml(item.time || '')}" placeholder="10:00 – 13:00">
            </div>
            <div style="flex:3;">
                <input type="text" class="form-control sched-title" value="${escapeHtml(item.title || '')}" placeholder="Morning CI Masterclasses with Faculty">
            </div>
            <button type="button" class="btn btn-sm btn-danger btn-remove-row" title="Удалить">&times;</button>
        </div>
    `;
    card.querySelector('.btn-remove-row').addEventListener('click', () => card.remove());
    container.appendChild(card);
}

function addFestTeamRow(member = {}) {
    const container = document.getElementById('festTeamContainer');
    if (!container) return;
    const card = document.createElement('div');
    card.className = 'repeater-card';
    card.innerHTML = `
        <div class="repeater-card-header">
            <span class="repeater-card-title">${escapeHtml(member.name || 'Организатор')}</span>
            <button type="button" class="btn btn-sm btn-danger btn-remove-row">Удалить</button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Имя *</label>
                <input type="text" class="form-control team-name" value="${escapeHtml(member.name || '')}" placeholder="Tamara Maksymenko" required>
            </div>
            <div class="form-group">
                <label class="form-label">Роль в фестивале</label>
                <input type="text" class="form-control team-role" value="${escapeHtml(member.role || '')}" placeholder="Artistic Director & Project Lead">
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Фото (URL или Загрузить)</label>
            <div style="display:flex; gap:8px;">
                <input type="text" class="form-control team-photo" value="${escapeHtml(member.photo || '')}" placeholder="img/team/tamara.jpg">
                <button type="button" class="btn btn-sm btn-upload-team-photo">Загрузить</button>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Краткая информация</label>
            <textarea class="form-control team-bio" rows="2" placeholder="Организатор...">${escapeHtml(member.bio || '')}</textarea>
        </div>
    `;
    card.querySelector('.btn-remove-row').addEventListener('click', () => card.remove());
    card.querySelector('.team-name').addEventListener('input', (e) => {
        card.querySelector('.repeater-card-title').textContent = e.target.value.trim() || 'Организатор';
    });
    attachImageUpload(
        card.querySelector('.btn-upload-team-photo'),
        card.querySelector('.team-photo'),
        null,
        'team'
    );
    container.appendChild(card);
}

function addFestPartnerRow(partner = {}) {
    const container = document.getElementById('festPartnersContainer');
    if (!container) return;
    const card = document.createElement('div');
    card.className = 'repeater-card';
    card.style.padding = '12px 16px';
    card.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr auto; gap:12px; align-items:center;">
            <div>
                <input type="text" class="form-control partner-name" value="${escapeHtml(partner.name || '')}" placeholder="Land Tirol Kultur">
            </div>
            <div style="display:flex; gap:6px;">
                <input type="text" class="form-control partner-logo" value="${escapeHtml(partner.logo || '')}" placeholder="img/partners/land_tirol.png">
                <button type="button" class="btn btn-sm btn-upload-partner-logo" title="Загрузить логотип">📁</button>
            </div>
            <div>
                <input type="text" class="form-control partner-url" value="${escapeHtml(partner.url || '')}" placeholder="https://www.tirol.gv.at">
            </div>
            <button type="button" class="btn btn-sm btn-danger btn-remove-row" title="Удалить">&times;</button>
        </div>
    `;
    card.querySelector('.btn-remove-row').addEventListener('click', () => card.remove());
    attachImageUpload(
        card.querySelector('.btn-upload-partner-logo'),
        card.querySelector('.partner-logo'),
        null,
        'partners'
    );
    container.appendChild(card);
}

// Wire "+ Добавить" repeater buttons
const addFestPassBtn = document.getElementById('addFestPassBtn');
if (addFestPassBtn) addFestPassBtn.addEventListener('click', () => addFestPassRow());

const addFestTeacherBtn = document.getElementById('addFestTeacherBtn');
if (addFestTeacherBtn) addFestTeacherBtn.addEventListener('click', () => addFestTeacherRow());

const addFestPerfBtn = document.getElementById('addFestPerfBtn');
if (addFestPerfBtn) addFestPerfBtn.addEventListener('click', () => addFestPerfRow());

const addFestMusicianBtn = document.getElementById('addFestMusicianBtn');
if (addFestMusicianBtn) addFestMusicianBtn.addEventListener('click', () => addFestMusicianRow());

const addFestScheduleBtn = document.getElementById('addFestScheduleBtn');
if (addFestScheduleBtn) addFestScheduleBtn.addEventListener('click', () => addFestScheduleRow());

const addFestTeamBtn = document.getElementById('addFestTeamBtn');
if (addFestTeamBtn) addFestTeamBtn.addEventListener('click', () => addFestTeamRow());

const addFestPartnerBtn = document.getElementById('addFestPartnerBtn');
if (addFestPartnerBtn) addFestPartnerBtn.addEventListener('click', () => addFestPartnerRow());

// Subtab navigation inside #festivalsEditorView
document.querySelectorAll('#festivalsEditorView .fest-subtabs-nav .fest-tab-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const subtab = btn.dataset.subtab;
        if (!subtab) return;
        document.querySelectorAll('#festivalsEditorView .fest-subtabs-nav .fest-tab-nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('#festivalsEditorView .fest-subtab-pane').forEach(p => p.classList.remove('active'));
        const targetPane = document.getElementById(`pane-fest-${subtab}`);
        if (targetPane) targetPane.classList.add('active');
    });
});

// Populates all 10 subtabs of #festivalModal from a structured object
function populateFestivalForm(f) {
    if (!f) return;
    document.getElementById('festId').value = f.id || '';
    document.getElementById('festTitle').value = f.title || '';
    document.getElementById('festYear').value = f.year || '';
    document.getElementById('festFileName').value = f.url || (f.year ? `CITyrolFest${f.year}.html` : '');
    document.getElementById('festStatus').value = f.status || 'upcoming';
    document.getElementById('festDates').value = f.dates || '';
    document.getElementById('festSubtitle').value = f.subtitle || '';
    document.getElementById('festTopicAuthor').value = f.topic_author || '';

    // Images
    const rawCat = (f.image || '').replace('../', '');
    const catImg = rawCat || 'img/festivals/covers/CI_2026.jpg';
    document.getElementById('festCatalogImagePath').value = `../${catImg}`;
    document.getElementById('festCatalogImgPreview').src = `../${catImg}`;

    const heroBg = f.hero_bg || 'img/festivals/2026/bg.jpg';
    document.getElementById('festHeroBgPath').value = heroBg;
    document.getElementById('festHeroBgPreview').src = heroBg.startsWith('http') ? heroBg : `../${heroBg.replace('../', '')}`;

    // Overview
    const ov = f.overview || {};
    const qf = ov.quick_facts || {};
    document.getElementById('festFactDates').value = qf.dates || '';
    document.getElementById('festFactLocation').value = qf.location || '';
    document.getElementById('festFactTeachers').value = qf.teachers || '';
    document.getElementById('festFactFormat').value = qf.format || '';

    document.getElementById('festManifestoTag').value = ov.manifesto_tag || '';
    document.getElementById('festManifestoTitle').value = ov.manifesto_title || '';

    const cb1 = (ov.concept_blocks && ov.concept_blocks[0]) || {};
    const cb2 = (ov.concept_blocks && ov.concept_blocks[1]) || {};
    document.getElementById('festConcept1Label').value = cb1.label || '';
    document.getElementById('festConcept1Text').value = cb1.text || '';
    document.getElementById('festConcept2Label').value = cb2.label || '';
    document.getElementById('festConcept2Text').value = cb2.text || '';

    document.getElementById('festHighlights').value = (ov.highlights || []).join('\n');
    document.getElementById('festOverviewConclusion').value = ov.conclusion || '';

    // Registration
    const reg = f.registration || {};
    document.getElementById('festRegIsClosed').checked = Boolean(reg.is_closed || f.status === 'archived');
    document.getElementById('festRegWhatsapp').value = reg.whatsapp_contact || '+43 677 630 27506';
    document.getElementById('festRegIntro').value = reg.intro_text || '';

    const helper = reg.helper || {};
    document.getElementById('festHelperTitle').value = helper.title || 'Special Participation: HELPER';
    document.getElementById('festHelperDesc').value = helper.desc || '';
    document.getElementById('festHelperStatus').value = helper.status_note || '';

    const support = reg.support || {};
    document.getElementById('festSupportText').value = support.text || '';

    // Repeaters: Passes
    const passCont = document.getElementById('festPassesContainer');
    passCont.innerHTML = '';
    (reg.passes || []).forEach(p => addFestPassRow(p));

    // Teachers
    const teachCont = document.getElementById('festTeachersContainer');
    teachCont.innerHTML = '';
    (f.teachers || []).forEach(t => addFestTeacherRow(t));

    // Performances
    const perfCont = document.getElementById('festPerformancesContainer');
    perfCont.innerHTML = '';
    (f.performances || []).forEach(pf => addFestPerfRow(pf));

    // Musicians
    const musCont = document.getElementById('festMusiciansContainer');
    musCont.innerHTML = '';
    (f.musicians || []).forEach(m => addFestMusicianRow(m));

    // Program
    const prog = f.program || {};
    document.getElementById('festProgramIntro').value = prog.intro || '';
    document.getElementById('festProgramGoogleSheets').value = prog.google_sheets_url || '';
    const progImg = prog.image || '';
    document.getElementById('festProgramImagePath').value = progImg;
    const progImgPreview = document.getElementById('festProgramImgPreview');
    const progImgRemoveBtn = document.getElementById('festProgramImgRemoveBtn');
    if (progImg && progImgPreview) {
        progImgPreview.src = progImg.startsWith('http') || progImg.startsWith('../') ? progImg : `../${progImg}`;
        progImgPreview.style.display = 'block';
        if (progImgRemoveBtn) progImgRemoveBtn.style.display = 'inline-block';
    } else if (progImgPreview) {
        progImgPreview.style.display = 'none';
        if (progImgRemoveBtn) progImgRemoveBtn.style.display = 'none';
    }
    const schedCont = document.getElementById('festScheduleContainer');
    schedCont.innerHTML = '';
    (prog.schedule || []).forEach(s => addFestScheduleRow(s));

    // Venue & Food
    const vf = f.venue_food || {};
    document.getElementById('festVenueName').value = vf.venue_name || '';
    document.getElementById('festVenueAddress').value = vf.venue_address || '';
    document.getElementById('festVenueDesc').value = vf.venue_desc || '';
    document.getElementById('festVenuePhotos').value = (vf.venue_photos || []).join('\n');
    document.getElementById('festAccommodationInfo').value = vf.accommodation_info || '';
    document.getElementById('festFoodChef').value = vf.food_chef || '';
    document.getElementById('festFoodDesc').value = vf.food_desc || '';

    // Team & Partners
    const tp = f.team_partners || {};
    const teamCont = document.getElementById('festTeamContainer');
    teamCont.innerHTML = '';
    (tp.team || []).forEach(tm => addFestTeamRow(tm));

    const partCont = document.getElementById('festPartnersContainer');
    partCont.innerHTML = '';
    (tp.partners || []).forEach(pt => addFestPartnerRow(pt));

    // Archive
    const arch = f.archive || {};
    document.getElementById('festArchiveVideos').value = (arch.videos || []).join('\n');
    document.getElementById('festArchiveAudioLink').value = arch.audio_link || '';
    document.getElementById('festArchivePhotographer').value = arch.photographer || 'Photo by Serhii Semichev';
    document.getElementById('festArchivePhotos').value = (arch.photos || []).join('\n');
    currentFestivalArchivePhotos = [...(arch.photos || [])];
    renderArchiveGalleryGrid(false);
}

// Button: Load Sample 2026 data
const loadSampleFest2026Btn = document.getElementById('loadSampleFest2026Btn');
if (loadSampleFest2026Btn) {
    loadSampleFest2026Btn.addEventListener('click', async () => {
        try {
            let sample = await apiGet('festivals/CITyrolFest2026');
            if (!sample) {
                const res = await fetch('../data/festivals/CITyrolFest2026.json');
                if (res.ok) sample = await res.json();
            }
            if (sample) {
                const curYear = document.getElementById('festYear').value.trim();
                const curFileName = document.getElementById('festFileName').value.trim();
                populateFestivalForm(sample);
                if (curYear) document.getElementById('festYear').value = curYear;
                if (curFileName) document.getElementById('festFileName').value = curFileName;
                showToast('Данные образца 2026 года успешно загружены в форму!');
            } else {
                showToast('Не удалось загрузить файл образца 2026', true);
            }
        } catch (e) {
            showToast('Ошибка загрузки образца: ' + e.message, true);
        }
    });
}

function openAddFestival() {
    document.getElementById('festivalModalForm').reset();
    document.getElementById('festIndex').value = '';
    document.getElementById('festId').value = '';
    document.getElementById('modalFestivalTitle').textContent = 'Создать новый выпуск фестиваля';
    document.getElementById('saveFestBtn').textContent = 'Создать фестиваль и страницу';

    const nextYear = new Date().getFullYear() + 1;
    populateFestivalForm({
        id: `fest-${nextYear}`,
        title: 'SOLO & CI TIROL Fest',
        year: String(nextYear),
        url: `CITyrolFest${nextYear}.html`,
        dates: `August 20 – 27, ${nextYear} · Innsbruck, Austria`,
        subtitle: '',
        topic_author: '',
        status: 'upcoming',
        image: '../img/festivals/covers/CI_2026.jpg',
        hero_bg: 'img/festivals/2026/bg.jpg',
        overview: {
            quick_facts: {
                dates: `August 20th to 27th, ${nextYear}`,
                location: 'Künstlerhaus Büchsenhausen, Weiherburggasse 13, Innsbruck',
                teachers: '',
                format: 'Classes, Labs, Jams & Rock CI · Performances & Talks'
            },
            manifesto_tag: `Festival ${nextYear} · August 20th to 27th, ${nextYear}`,
            manifesto_title: `What does it mean to be grounded — as artists, as humans, as communities?`,
            concept_blocks: [
                {
                    label: '01 / Physical & Philosophical Practice',
                    text: 'Contact Improvisation as both a physical and philosophical practice — balancing between stability and flight, weight and suspension, presence and risk.'
                },
                {
                    label: '02 / Spaces for Dialogue',
                    text: 'Beyond physical practice, the festival opens spaces for dialogue, conversations around identity, body politics, and somatic awareness.'
                }
            ],
            highlights: [
                'Daily CI classes, labs, and research sessions, jams with live music',
                'Teachers’ performances and improvisation events',
                'Dance screenings and lectures',
                'Open discussions',
                'Shared meals and informal gatherings in the heart of the Tirol mountains.'
            ],
            conclusion: 'Motion Mode of Dialogue continues to be a space where art, movement, and social reflection meet — a place for connection, questioning, and discovery.'
        },
        registration: {
            is_closed: false,
            closed_notice: '',
            whatsapp_contact: '+43 677 630 27506',
            intro_text: 'A full week of classes, performances, jams, and lectures offered at an affordable price.',
            passes: [
                {
                    label: `Full Week Pass · Aug 20–27`,
                    title: 'Regular participation:',
                    desc: '(without accommodation and meals)',
                    price_old: '399 €',
                    price_current: '365 €',
                    url: 'https://buy.stripe.com/...',
                    is_soldout: false
                },
                {
                    label: 'Half Pass',
                    title: 'Half of the festival regular participation:',
                    desc: '(without accommodation and meals)',
                    price_old: '349 €',
                    price_current: '315 €',
                    url: 'https://buy.stripe.com/...',
                    is_soldout: false
                }
            ],
            helper: {
                title: 'Special Participation: HELPER',
                desc: 'Join our community in a unique way! This special participation lets you reduce costs by contributing your hands.',
                status_note: '10 helper spots available'
            },
            support: {
                title: 'Support the Festival 🤍',
                text: 'Being an independent community festival, every gesture of support and solidarity enables scholarships and reduced ticket passes for dancers in need.'
            }
        },
        teachers: [],
        performances: [],
        musicians: [],
        program: {
            google_sheets_url: '',
            image: '',
            intro: 'The festival week follows an organic flow balancing rigorous physical morning labs, communal midday nourishment, contemplative afternoon dialogues, and evening jams accompanied by live musicians.',
            schedule: [
                { time: '08:30 – 09:30', title: 'Somatic Awakening & Meditation' },
                { time: '10:00 – 13:00', title: 'Morning CI Masterclasses with Faculty' },
                { time: '13:00 – 15:00', title: 'Warm Vegetarian Lunch & Rest' },
                { time: '15:00 – 17:30', title: 'Afternoon Research Labs & Rock CI' },
                { time: '18:00 – 19:30', title: 'Screenings, Talks & Discussions' },
                { time: '20:00 – 23:00', title: 'Open Jam with Live Music' }
            ]
        },
        venue_food: {
            venue_name: 'Künstlerhaus Büchsenhausen',
            venue_address: 'Weiherburggasse 13, 6020 Innsbruck, Austria',
            venue_desc: 'Located on the slope of the Nordkette mountains just above the old town of Innsbruck, Künstlerhaus Büchsenhausen offers light-flooded studios, wooden sprung floors, and historic Alpine architecture.',
            venue_photos: ['img/festivals/2026/buchsenhausen.jpg'],
            accommodation_info: 'Innsbruck offers a wide range of hostels, apartments, and camp sites. We also coordinate a community hosting network.',
            food_chef: 'Communal Meals by Maya Schwartz',
            food_desc: 'Maya Schwartz prepares fresh, nourishing, 100% vegetarian and vegan meals using organic produce sourced directly from Tirolean farmers.'
        },
        team_partners: {
            team: [
                {
                    name: 'Tamara Maksymenko',
                    role: 'Artistic Director & Project Lead',
                    photo: 'img/team/tamara.jpg',
                    bio: 'Founder of Motion Mode of Dialogue in Tirol, choreographer, and somatic educator.'
                }
            ],
            partners: []
        },
        archive: {
            videos: [],
            audio_link: '',
            photographer: 'Photo by Serhii Semichev',
            photos: []
        }
    });

    // Reset subtabs to first tab
    document.querySelectorAll('#festivalsEditorView .fest-subtabs-nav .fest-tab-nav-btn').forEach((b, idx) => b.classList.toggle('active', idx === 0));
    document.querySelectorAll('#festivalsEditorView .fest-subtab-pane').forEach((p, idx) => p.classList.toggle('active', idx === 0));

    showEntityEditor('festivals');
}

window.editFestival = async function(idx) {
    const f = festivalsData[idx];
    if (!f) return;
    document.getElementById('festivalModalForm').reset();
    document.getElementById('festIndex').value = idx;
    document.getElementById('modalFestivalTitle').textContent = `Редактировать фестиваль: ${f.title} ${f.year || ''}`;
    document.getElementById('saveFestBtn').textContent = 'Сохранить изменения и обновить страницу';

    const slug = (f.url || '').replace(/\.html$/, '');

    // Try loading full structured JSON
    let fullData = null;
    try {
        fullData = await apiGet(`festivals/${slug}`);
    } catch {}

    if (!fullData && f.overview && typeof f.overview === 'object') {
        fullData = f;
    }

    if (!fullData) {
        // Fallback for older editions
        fullData = {
            id: `fest-${f.year || slug}`,
            title: f.title || '',
            year: f.year || '',
            url: f.url || '',
            image: f.image || '../img/festivals/covers/CI_2026.jpg',
            dates: f.dates || `${f.year || ''} · Innsbruck, Austria`,
            subtitle: f.subtitle || '',
            topic_author: '',
            hero_bg: f.hero_bg || 'img/festivals/2026/bg.jpg',
            status: f.status || 'archived',
            overview: {
                quick_facts: {
                    dates: f.dates || '',
                    location: 'Innsbruck, Austria',
                    teachers: '',
                    format: 'Classes, Labs, Jams & Rock CI'
                },
                manifesto_tag: `Festival ${f.year || ''}`,
                manifesto_title: f.overview || f.title || '',
                concept_blocks: [],
                highlights: [],
                conclusion: ''
            },
            registration: {
                is_closed: true,
                whatsapp_contact: '+43 677 630 27506',
                intro_text: '',
                passes: f.reg_link ? [{ label: 'Pass', title: 'Registration', price_current: '', url: f.reg_link, is_soldout: true }] : [],
                helper: { title: 'Special Participation: HELPER', desc: '', status_note: '' },
                support: { title: 'Support the Festival 🤍', text: '' }
            },
            teachers: [],
            performances: [],
            musicians: [],
            program: { intro: '', schedule: [] },
            venue_food: { venue_name: '', venue_address: '', venue_desc: '', venue_photos: [], accommodation_info: '', food_chef: '', food_desc: '' },
            team_partners: { team: [], partners: [] },
            archive: { videos: [], audio_link: '', photographer: '', photos: [] }
        };
    }

    populateFestivalForm(fullData);

    // Reset subtabs to first tab
    document.querySelectorAll('#festivalsEditorView .fest-subtabs-nav .fest-tab-nav-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
    document.querySelectorAll('#festivalsEditorView .fest-subtab-pane').forEach((p, i) => p.classList.toggle('active', i === 0));

    showEntityEditor('festivals');
};

const addFestivalBtn = document.getElementById('addFestivalBtn');
if (addFestivalBtn) addFestivalBtn.addEventListener('click', openAddFestival);

const closeFestivalModalBtn = document.getElementById('closeFestivalModal');
if (closeFestivalModalBtn) closeFestivalModalBtn.addEventListener('click', () => hideEntityEditor('festivals'));

const cancelFestivalModalBtn = document.getElementById('cancelFestivalModal');
if (cancelFestivalModalBtn) cancelFestivalModalBtn.addEventListener('click', () => hideEntityEditor('festivals'));

const backFestivalsBtn = document.getElementById('backFestivalsBtn');
if (backFestivalsBtn) backFestivalsBtn.addEventListener('click', () => hideEntityEditor('festivals'));

// Image uploads in Tab 1
const festCatalogImgInput = document.getElementById('festCatalogImgInput');
if (festCatalogImgInput) {
    festCatalogImgInput.addEventListener('change', async function() {
        if (!this.files || !this.files[0]) return;
        const file = this.files[0];
        try {
            const compressed = await window.MMDTCompressor.compressImage(file, 1200, 0.85);
            const baseName = file.name.replace(/\.[^/.]+$/, "").trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'cover';
            const filename = `${baseName}.jpg`;
            const cleanPath = `img/festivals/covers/${filename}`;

            document.getElementById('festCatalogImagePath').value = `../${cleanPath}`;
            document.getElementById('festCatalogImgPreview').src = compressed.dataUrl;

            pendingImageBlobs.push({
                path: cleanPath,
                content: compressed.base64,
                isBase64: true
            });

            if (isLocalServerRunning) {
                const formData = new FormData();
                formData.append('file', compressed.blob, filename);
                formData.append('filename', filename);
                formData.append('subpath', 'festivals/covers');
                formData.append('is_cover', 'true');
                await fetch('/api/upload', { method: 'POST', body: formData });
            }
            showToast('Афиша каталога оптимизирована и загружена!');
        } catch (e) {
            showToast('Ошибка загрузки афиши: ' + e.message, true);
        }
    });
}

const festHeroBgInput = document.getElementById('festHeroBgInput');
if (festHeroBgInput) {
    festHeroBgInput.addEventListener('change', async function() {
        if (!this.files || !this.files[0]) return;
        const file = this.files[0];
        try {
            const compressed = await window.MMDTCompressor.compressImage(file, 2200, 0.82);
            const baseName = file.name.replace(/\.[^/.]+$/, "").trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'hero';
            const filename = `${baseName}.jpg`;
            const yearVal = document.getElementById('festYear').value.trim() || 'common';
            const subfolder = `festivals/${yearVal}`;
            const cleanPath = `img/${subfolder}/${filename}`;

            document.getElementById('festHeroBgPath').value = cleanPath;
            document.getElementById('festHeroBgPreview').src = compressed.dataUrl;

            pendingImageBlobs.push({
                path: cleanPath,
                content: compressed.base64,
                isBase64: true
            });

            if (isLocalServerRunning) {
                const formData = new FormData();
                formData.append('file', compressed.blob, filename);
                formData.append('filename', filename);
                formData.append('subpath', subfolder);
                formData.append('is_cover', 'false');
                await fetch('/api/upload', { method: 'POST', body: formData });
            }
            showToast('Фоновое изображение Hero оптимизировано и загружено!');
        } catch (e) {
            showToast('Ошибка загрузки фона: ' + e.message, true);
        }
    });
}

// Program Poster Image Upload & Remove Listeners
const festProgUploadBtn = document.getElementById('festProgramImgUploadBtn');
const festProgFileInput = document.getElementById('festProgramImgFileInput');
const festProgRemoveBtn = document.getElementById('festProgramImgRemoveBtn');
const festProgPreview = document.getElementById('festProgramImgPreview');
const festProgPathInput = document.getElementById('festProgramImagePath');

if (festProgUploadBtn && festProgFileInput) {
    festProgUploadBtn.addEventListener('click', () => festProgFileInput.click());
    festProgFileInput.addEventListener('change', async function() {
        if (!this.files || !this.files[0]) return;
        const file = this.files[0];
        try {
            const compressed = await window.MMDTCompressor.compressImage(file, 2200, 0.85);
            const baseName = file.name.replace(/\.[^/.]+$/, "").trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'program';
            const filename = `${baseName}.jpg`;
            const yearVal = document.getElementById('festYear').value.trim() || 'common';
            const subfolder = `festivals/${yearVal}`;
            const cleanPath = `img/${subfolder}/${filename}`;

            festProgPathInput.value = cleanPath;
            festProgPreview.src = compressed.dataUrl;
            festProgPreview.style.display = 'block';
            if (festProgRemoveBtn) festProgRemoveBtn.style.display = 'inline-block';

            pendingImageBlobs.push({
                path: cleanPath,
                content: compressed.base64,
                isBase64: true
            });

            if (isLocalServerRunning) {
                const formData = new FormData();
                formData.append('file', compressed.blob, filename);
                formData.append('filename', filename);
                formData.append('subpath', subfolder);
                formData.append('is_cover', 'false');
                await fetch('/api/upload', { method: 'POST', body: formData });
            }
            showToast('Постер программы оптимизирован и загружен!');
        } catch (e) {
            showToast('Ошибка загрузки постера: ' + e.message, true);
        }
    });
}

if (festProgRemoveBtn) {
    festProgRemoveBtn.addEventListener('click', () => {
        festProgPathInput.value = '';
        festProgPreview.src = '';
        festProgPreview.style.display = 'none';
        festProgRemoveBtn.style.display = 'none';
        showToast('Постер программы удален');
    });
}

if (festProgPathInput) {
    festProgPathInput.addEventListener('input', () => {
        const val = festProgPathInput.value.trim();
        if (val) {
            festProgPreview.src = val.startsWith('http') || val.startsWith('../') ? val : `../${val}`;
            festProgPreview.style.display = 'block';
            if (festProgRemoveBtn) festProgRemoveBtn.style.display = 'inline-block';
        } else {
            festProgPreview.style.display = 'none';
            if (festProgRemoveBtn) festProgRemoveBtn.style.display = 'none';
        }
    });
}

// ==========================================
// VISUAL ARCHIVE GALLERY & MULTI-UPLOAD
// ==========================================

let currentFestivalArchivePhotos = [];

function renderArchiveGalleryGrid(updateTextarea = true) {
    const grid = document.getElementById('festArchiveThumbsGrid');
    const countEl = document.getElementById('festArchivePhotoCount');
    const clearBtn = document.getElementById('festArchiveClearAllBtn');
    const rawTextarea = document.getElementById('festArchivePhotos');

    if (countEl) countEl.textContent = currentFestivalArchivePhotos.length;
    if (clearBtn) clearBtn.style.display = currentFestivalArchivePhotos.length > 0 ? 'inline-block' : 'none';

    if (updateTextarea && rawTextarea) {
        rawTextarea.value = currentFestivalArchivePhotos.join('\n');
    }

    if (!grid) return;

    if (currentFestivalArchivePhotos.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:32px 16px; color:var(--text-meta); font-size:0.85rem;" id="festArchiveEmptyState">
                В архиве пока нет фотографий. Нажмите «+ Добавить фотографии» или перетащите их в поле выше.
            </div>`;
        return;
    }

    grid.innerHTML = currentFestivalArchivePhotos.map((p, idx) => {
        const thumbUrl = encodeURI(getAdminThumbUrl(p));
        const filename = p.split('/').pop();
        return `
            <div style="position:relative; aspect-ratio:1/1; border-radius:6px; overflow:hidden; border:1px solid var(--border); background:#f8fafc; group" title="${escapeHtml(filename)}">
                <img src="${thumbUrl}" alt="Archive photo" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.src='../img/festivals/covers/CI_2026.jpg'">
                <button type="button" class="btn-remove-arch-photo" data-idx="${idx}" style="position:absolute; top:4px; right:4px; width:22px; height:22px; border-radius:50%; background:rgba(239,68,68,0.9); color:#fff; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; font-weight:bold; line-height:1; padding:0; box-shadow:0 1px 3px rgba(0,0,0,0.3); transition:all 0.15s ease;" title="Удалить из архива">&times;</button>
            </div>
        `;
    }).join('');

    grid.querySelectorAll('.btn-remove-arch-photo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.idx, 10);
            if (!isNaN(idx) && idx >= 0 && idx < currentFestivalArchivePhotos.length) {
                currentFestivalArchivePhotos.splice(idx, 1);
                renderArchiveGalleryGrid(true);
            }
        });
    });
}

async function handleArchiveFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) {
        showToast('Пожалуйста, выберите файлы изображений (JPG, PNG, WebP)', true);
        return;
    }

    const progressBox = document.getElementById('festArchiveProgressBarBox');
    const progressText = document.getElementById('festArchiveProgressText');
    const progressPercent = document.getElementById('festArchiveProgressPercent');
    const progressBar = document.getElementById('festArchiveProgressBar');

    if (progressBox) progressBox.style.display = 'block';

    const yearVal = document.getElementById('festYear').value.trim() || 'common';
    const subfolder = `festivals/${yearVal}/archive`;

    let processed = 0;
    const total = files.length;

    for (const file of files) {
        try {
            if (progressText) progressText.textContent = `Сжатие и загрузка (${processed + 1} из ${total}): ${file.name}`;
            const percent = Math.round((processed / total) * 100);
            if (progressPercent) progressPercent.textContent = `${percent}%`;
            if (progressBar) progressBar.style.width = `${percent}%`;

            const compressed = await window.MMDTCompressor.compressImage(file, 1920, 0.84);
            const cleanFileName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, '_') + '.jpg';
            const cleanPath = `img/${subfolder}/${cleanFileName}`;

            pendingImageBlobs.push({
                path: cleanPath,
                content: compressed.base64,
                isBase64: true
            });

            if (isLocalServerRunning) {
                const formData = new FormData();
                formData.append('file', compressed.blob, cleanFileName);
                formData.append('filename', cleanFileName);
                formData.append('subpath', subfolder);
                formData.append('is_cover', 'false');
                await fetch('/api/upload', { method: 'POST', body: formData });
            }

            if (!currentFestivalArchivePhotos.includes(cleanPath)) {
                currentFestivalArchivePhotos.push(cleanPath);
            }
        } catch (err) {
            console.error('Error processing archive file:', file.name, err);
        }
        processed++;
    }

    if (progressBar) progressBar.style.width = '100%';
    if (progressPercent) progressPercent.textContent = '100%';
    if (progressText) progressText.textContent = `Готово! Обработано ${processed} фото.`;

    renderArchiveGalleryGrid(true);

    setTimeout(() => {
        if (progressBox) progressBox.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
    }, 2500);

    showToast(`Успешно добавлено ${processed} фото в архив фестиваля!`);
}

// Archive listeners setup
const festArchUploadBtn = document.getElementById('festArchiveUploadBtn');
const festArchFileInput = document.getElementById('festArchiveMultiFileInput');
const festArchDropzone = document.getElementById('festArchiveDropzone');
const festArchClearBtn = document.getElementById('festArchiveClearAllBtn');
const toggleRawPathsBtn = document.getElementById('toggleArchiveRawPathsBtn');
const festArchRawBox = document.getElementById('festArchiveRawBox');
const festArchRawInput = document.getElementById('festArchivePhotos');

if (festArchUploadBtn && festArchFileInput) {
    festArchUploadBtn.addEventListener('click', () => festArchFileInput.click());
    festArchFileInput.addEventListener('change', function() {
        handleArchiveFiles(this.files);
        this.value = '';
    });
}

if (festArchDropzone && festArchFileInput) {
    festArchDropzone.addEventListener('click', () => festArchFileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
        festArchDropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            festArchDropzone.style.borderColor = '#10b981';
            festArchDropzone.style.background = '#f0fdf4';
        });
    });

    ['dragleave', 'dragend', 'drop'].forEach(eventName => {
        festArchDropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            festArchDropzone.style.borderColor = '#cbd5e1';
            festArchDropzone.style.background = '#f8fafc';
        });
    });

    festArchDropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
            handleArchiveFiles(dt.files);
        }
    });
}

if (festArchClearBtn) {
    festArchClearBtn.addEventListener('click', () => {
        if (confirm(`Удалить все фотографии (${currentFestivalArchivePhotos.length} шт.) из архива?`)) {
            currentFestivalArchivePhotos = [];
            renderArchiveGalleryGrid(true);
            showToast('Фотогалерея архива очищена');
        }
    });
}

if (toggleRawPathsBtn && festArchRawBox) {
    toggleRawPathsBtn.addEventListener('click', () => {
        const isHidden = festArchRawBox.style.display === 'none';
        festArchRawBox.style.display = isHidden ? 'block' : 'none';
        toggleRawPathsBtn.textContent = isHidden ? '▲ Скрыть текстовый список путей' : '⚙ Показать пути к файлам (текстовый список)';
    });
}

if (festArchRawInput) {
    festArchRawInput.addEventListener('input', function() {
        currentFestivalArchivePhotos = this.value.split('\n').map(s => s.trim()).filter(Boolean);
        renderArchiveGalleryGrid(false);
    });
}

// Form Submission: Generate 9-tab HTML & Save JSON
const festivalModalForm = document.getElementById('festivalModalForm');
if (festivalModalForm) {
    festivalModalForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const idx = document.getElementById('festIndex').value;
        const id = document.getElementById('festId').value || `fest-${document.getElementById('festYear').value.trim()}`;
        const title = document.getElementById('festTitle').value.trim();
        const year = document.getElementById('festYear').value.trim();
        const fileName = document.getElementById('festFileName').value.trim();
        const status = document.getElementById('festStatus').value;
        const dates = document.getElementById('festDates').value.trim();
        const subtitle = document.getElementById('festSubtitle').value.trim();
        const topicAuthor = document.getElementById('festTopicAuthor').value.trim();
        const catalogImage = document.getElementById('festCatalogImagePath').value.trim() || '../img/festivals/covers/CI_2026.jpg';
        const heroBg = document.getElementById('festHeroBgPath').value.trim() || 'img/festivals/2026/bg.jpg';

        // Overview
        const factDates = document.getElementById('festFactDates').value.trim();
        const factLocation = document.getElementById('festFactLocation').value.trim();
        const factTeachers = document.getElementById('festFactTeachers').value.trim();
        const factFormat = document.getElementById('festFactFormat').value.trim();

        const manifestoTag = document.getElementById('festManifestoTag').value.trim();
        const manifestoTitle = document.getElementById('festManifestoTitle').value.trim();

        const conceptBlocks = [];
        const c1Label = document.getElementById('festConcept1Label').value.trim();
        const c1Text = document.getElementById('festConcept1Text').value.trim();
        if (c1Label || c1Text) conceptBlocks.push({ label: c1Label, text: c1Text });
        const c2Label = document.getElementById('festConcept2Label').value.trim();
        const c2Text = document.getElementById('festConcept2Text').value.trim();
        if (c2Label || c2Text) conceptBlocks.push({ label: c2Label, text: c2Text });

        const highlights = document.getElementById('festHighlights').value.split('\n').map(s => s.trim()).filter(Boolean);
        const conclusion = document.getElementById('festOverviewConclusion').value.trim();

        // Registration
        const isClosed = document.getElementById('festRegIsClosed').checked;
        const whatsappContact = document.getElementById('festRegWhatsapp').value.trim();
        const regIntro = document.getElementById('festRegIntro').value.trim();

        const passes = [];
        document.querySelectorAll('#festPassesContainer .repeater-card').forEach(card => {
            passes.push({
                label: card.querySelector('.pass-label')?.value.trim() || '',
                title: card.querySelector('.pass-title')?.value.trim() || '',
                desc: card.querySelector('.pass-desc')?.value.trim() || '',
                price_old: card.querySelector('.pass-price-old')?.value.trim() || '',
                price_current: card.querySelector('.pass-price-current')?.value.trim() || '',
                url: card.querySelector('.pass-url')?.value.trim() || '',
                is_soldout: card.querySelector('.pass-soldout')?.checked || false
            });
        });

        const helperTitle = document.getElementById('festHelperTitle').value.trim();
        const helperDesc = document.getElementById('festHelperDesc').value.trim();
        const helperStatus = document.getElementById('festHelperStatus').value.trim();

        const supportText = document.getElementById('festSupportText').value.trim();

        // Teachers
        const teachers = [];
        document.querySelectorAll('#festTeachersContainer > .repeater-card').forEach(card => {
            const name = card.querySelector('.teacher-name')?.value.trim() || '';
            if (name) {
                const classes = [];
                card.querySelectorAll('.teacher-class-card').forEach(cCard => {
                    const cTitle = cCard.querySelector('.class-title')?.value.trim() || '';
                    const cDesc = cCard.querySelector('.class-desc')?.value.trim() || '';
                    const cLabel = cCard.querySelector('.class-label')?.value.trim() || 'WORKSHOP';
                    const cVideo = cCard.querySelector('.class-video')?.value.trim() || '';
                    if (cTitle || cDesc) {
                        classes.push({
                            title: cTitle,
                            label: cLabel,
                            desc: cDesc,
                            video_url: cVideo
                        });
                    }
                });

                teachers.push({
                    name,
                    role: card.querySelector('.teacher-role')?.value.trim() || '',
                    photo: card.querySelector('.teacher-photo')?.value.trim() || '',
                    photo2: card.querySelector('.teacher-photo2')?.value.trim() || '',
                    bio: card.querySelector('.teacher-bio')?.value.trim() || '',
                    video_url: card.querySelector('.teacher-video')?.value.trim() || '',
                    classes,
                    topic: (classes[0] && classes[0].title) || ''
                });
            }
        });

        // Performances
        const performances = [];
        document.querySelectorAll('#festPerformancesContainer .repeater-card').forEach(card => {
            const perfTitle = card.querySelector('.perf-title')?.value.trim() || '';
            if (perfTitle) {
                performances.push({
                    title: perfTitle,
                    date_time: card.querySelector('.perf-date')?.value.trim() || '',
                    venue: card.querySelector('.perf-venue')?.value.trim() || '',
                    artists: card.querySelector('.perf-artists')?.value.trim() || '',
                    desc: card.querySelector('.perf-desc')?.value.trim() || '',
                    video_url: card.querySelector('.perf-video')?.value.trim() || '',
                    ticket_info: card.querySelector('.perf-tickets')?.value.trim() || ''
                });
            }
        });

        // Musicians
        const musicians = [];
        document.querySelectorAll('#festMusiciansContainer .repeater-card').forEach(card => {
            const mName = card.querySelector('.musician-name')?.value.trim() || '';
            if (mName) {
                musicians.push({
                    name: mName,
                    role: card.querySelector('.musician-role')?.value.trim() || '',
                    photo: card.querySelector('.musician-photo')?.value.trim() || '',
                    bio: card.querySelector('.musician-bio')?.value.trim() || ''
                });
            }
        });

        // Program
        const progIntro = document.getElementById('festProgramIntro').value.trim();
        const progGoogleSheets = document.getElementById('festProgramGoogleSheets').value.trim();
        const progImage = document.getElementById('festProgramImagePath').value.trim();
        const schedule = [];
        document.querySelectorAll('#festScheduleContainer .repeater-card').forEach(card => {
            const time = card.querySelector('.sched-time')?.value.trim() || '';
            const schedTitle = card.querySelector('.sched-title')?.value.trim() || '';
            if (time || schedTitle) {
                schedule.push({ time, title: schedTitle });
            }
        });

        // Venue & Food
        const venueName = document.getElementById('festVenueName').value.trim();
        const venueAddress = document.getElementById('festVenueAddress').value.trim();
        const venueDesc = document.getElementById('festVenueDesc').value.trim();
        const venuePhotos = document.getElementById('festVenuePhotos').value.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
        const accommodationInfo = document.getElementById('festAccommodationInfo').value.trim();

        const foodChef = document.getElementById('festFoodChef').value.trim();
        const foodDesc = document.getElementById('festFoodDesc').value.trim();

        // Team & Partners
        const team = [];
        document.querySelectorAll('#festTeamContainer .repeater-card').forEach(card => {
            const tmName = card.querySelector('.team-name')?.value.trim() || '';
            if (tmName) {
                team.push({
                    name: tmName,
                    role: card.querySelector('.team-role')?.value.trim() || '',
                    photo: card.querySelector('.team-photo')?.value.trim() || '',
                    bio: card.querySelector('.team-bio')?.value.trim() || ''
                });
            }
        });

        const partners = [];
        document.querySelectorAll('#festPartnersContainer .repeater-card').forEach(card => {
            const pName = card.querySelector('.partner-name')?.value.trim() || '';
            if (pName) {
                partners.push({
                    name: pName,
                    logo: card.querySelector('.partner-logo')?.value.trim() || '',
                    url: card.querySelector('.partner-url')?.value.trim() || ''
                });
            }
        });

        // Archive
        const archVideos = document.getElementById('festArchiveVideos').value.split('\n').map(s => s.trim()).filter(Boolean);
        const archAudioLink = document.getElementById('festArchiveAudioLink').value.trim();
        const archPhotos = (currentFestivalArchivePhotos && currentFestivalArchivePhotos.length > 0)
            ? currentFestivalArchivePhotos
            : document.getElementById('festArchivePhotos').value.split('\n').map(s => s.trim()).filter(Boolean);

        // Unified Festival Data Object
        const festData = {
            id,
            title,
            year,
            url: fileName,
            image: catalogImage,
            dates,
            subtitle,
            topic_author: topicAuthor,
            hero_bg: heroBg,
            status,
            overview: {
                quick_facts: {
                    dates: factDates,
                    location: factLocation,
                    teachers: factTeachers,
                    format: factFormat
                },
                manifesto_tag: manifestoTag,
                manifesto_title: manifestoTitle,
                concept_blocks: conceptBlocks,
                highlights,
                conclusion
            },
            registration: {
                is_closed: isClosed,
                closed_notice: isClosed ? 'Registration is now officially closed. Thank you for your interest in our festival!' : '',
                whatsapp_contact: whatsappContact,
                intro_text: regIntro,
                passes,
                helper: {
                    title: helperTitle,
                    desc: helperDesc,
                    status_note: helperStatus
                },
                support: {
                    title: 'Support the Festival 🤍',
                    text: supportText
                }
            },
            teachers,
            performances,
            musicians,
            program: {
                intro: progIntro,
                google_sheets_url: progGoogleSheets,
                image: progImage,
                schedule
            },
            venue_food: {
                venue_name: venueName,
                venue_address: venueAddress,
                venue_desc: venueDesc,
                venue_photos: venuePhotos,
                accommodation_info: accommodationInfo,
                food_chef: foodChef,
                food_desc: foodDesc,
                food_photos: []
            },
            team_partners: {
                team,
                partners
            },
            archive: {
                videos: archVideos,
                audio_link: archAudioLink,
                photographer: archPhotographer,
                photos: archPhotos
            }
        };

        // 1. Generate full HTML page
        const festHtml = window.MMDTTemplates.generateFestivalPage(festData);
        await saveGeneratedFile(fileName, festHtml);

        // 2. Save individual structured festival JSON
        const slug = fileName.replace(/\.html$/, '');
        await apiSave(`festivals/${slug}`, festData);

        // Queue individual festival JSON for Git commit
        pendingImageBlobs = pendingImageBlobs.filter(b => b.path !== `data/festivals/${slug}.json`);
        pendingImageBlobs.push({
            path: `data/festivals/${slug}.json`,
            content: JSON.stringify(festData, null, 2),
            isBase64: false
        });

        // 3. Update catalog festivalsData
        const catalogItem = {
            title,
            year,
            image: catalogImage,
            url: fileName,
            dates,
            subtitle,
            overview: manifestoTitle,
            reg_link: (passes[0] && passes[0].url) ? passes[0].url : ''
        };

        if (idx !== '') {
            festivalsData[parseInt(idx, 10)] = catalogItem;
        } else {
            festivalsData.unshift(catalogItem);
        }

        // Save catalog JSON
        await apiSave('festivals', festivalsData);

        // Queue catalog JSON for Git commit
        pendingImageBlobs = pendingImageBlobs.filter(b => b.path !== 'data/festivals.json');
        pendingImageBlobs.push({
            path: 'data/festivals.json',
            content: JSON.stringify(festivalsData, null, 2),
            isBase64: false
        });

        // 4. Regenerate and save pages/festival.html
        const festCatalogHtml = window.MMDTTemplates.generateFestivalsPage(festivalsData);
        await saveGeneratedFile('pages/festival.html', festCatalogHtml);

        // 5. Update UI
        renderFestivalsList();
        hideEntityEditor('festivals');
        showToast(`Фестиваль «${title} ${year}» и страница ${fileName} успешно сохранены!`);
    });
}

window.deleteFestival = async function(idx) {
    const f = festivalsData[idx];
    if (!f) return;
    if (!confirm(`Удалить фестиваль «${f.title} ${f.year || ''}» из списка?`)) return;
    festivalsData.splice(idx, 1);
    renderFestivalsList();
    await apiSave('festivals', festivalsData);
    const festCatalogHtml = window.MMDTTemplates.generateFestivalsPage(festivalsData);
    await saveGeneratedFile('pages/festival.html', festCatalogHtml);
    showToast('Фестиваль удален из списка');
};

// ==========================================
// 6. GITHUB TOKEN MODAL (FOR TAMARA & ALEX)
// ==========================================

const authStatusBtn = document.getElementById('authStatusBtn');
const tokenModal = document.getElementById('githubTokenModal');
const tokenInput = document.getElementById('githubPatInput');
const tokenResult = document.getElementById('tokenTestResult');

if (authStatusBtn) {
    authStatusBtn.addEventListener('click', () => {
        tokenInput.value = window.MMDTGithub.getToken();
        tokenResult.style.display = 'none';
        tokenModal.classList.add('active');
    });
}

const closeTokenModalBtn = document.getElementById('closeTokenModal');
if (closeTokenModalBtn) closeTokenModalBtn.addEventListener('click', () => tokenModal.classList.remove('active'));

const testTokenBtn = document.getElementById('testTokenBtn');
if (testTokenBtn) {
    testTokenBtn.addEventListener('click', async () => {
        const val = tokenInput.value.trim();
        if (!val) {
            tokenResult.style.display = 'block';
            tokenResult.style.background = '#fef2f2';
            tokenResult.style.color = '#991b1b';
            tokenResult.textContent = 'Введите токен перед проверкой';
            return;
        }
        window.MMDTGithub.setToken(val);
        tokenResult.style.display = 'block';
        tokenResult.style.background = '#f0f9ff';
        tokenResult.style.color = '#0369a1';
        tokenResult.textContent = 'Проверка подключения к GitHub...';

        const res = await window.MMDTGithub.verifyToken();
        if (res.ok) {
            tokenResult.style.background = '#ecfdf5';
            tokenResult.style.color = '#065f46';
            tokenResult.textContent = `✓ Успешно! Подключено к репозиторию ${res.repo}. Права на запись: ${res.canPush ? 'Есть' : 'Нет'}`;
        } else {
            tokenResult.style.background = '#fef2f2';
            tokenResult.style.color = '#991b1b';
            tokenResult.textContent = `❌ Ошибка проверки: ${res.error}`;
        }
    });
}

const saveTokenBtn = document.getElementById('saveTokenBtn');
if (saveTokenBtn) {
    saveTokenBtn.addEventListener('click', () => {
        const val = tokenInput.value.trim();
        window.MMDTGithub.setToken(val);
        tokenModal.classList.remove('active');
        updateAuthBadge();
        showToast('Токен сохранен в вашем браузере!');
    });
}

const clearTokenBtn = document.getElementById('clearTokenBtn');
if (clearTokenBtn) {
    clearTokenBtn.addEventListener('click', () => {
        window.MMDTGithub.setToken('');
        tokenInput.value = '';
        tokenResult.style.display = 'none';
        updateAuthBadge();
        showToast('Токен сброшен');
    });
}

// ==========================================
// 7. UNIVERSAL PUBLISH & COMMIT
// ==========================================

const gitPushBtn = document.getElementById('gitPushBtn');
if (gitPushBtn) {
    gitPushBtn.addEventListener('click', async () => {
        const commitMsg = document.getElementById('commitMsgInput').value.trim() || 'Update site content from MMDT Admin';
        const logBox = document.getElementById('gitLogBox');

        gitPushBtn.disabled = true;
        const origText = gitPushBtn.innerHTML;
        gitPushBtn.innerHTML = 'Публикация на сайт...';

        logBox.style.display = 'block';
        logBox.textContent = '⏳ Пересборка страниц и отправка на GitHub...\n';

        // 1. If Local Python server is running, use local git automation
        if (isLocalServerRunning) {
            try {
                const res = await fetch('/api/git/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: commitMsg })
                });
                const data = await res.json();
                gitPushBtn.disabled = false;
                gitPushBtn.innerHTML = origText;

                if (data && data.success) {
                    logBox.textContent += `\n✓ УСПЕШНО!\n${data.git_result?.commit_output || ''}\n${data.git_result?.message || ''}`;
                    showToast('Сайт успешно обновлен и опубликован на GitHub Pages!');
                } else {
                    logBox.textContent += `\n❌ ОШИБКА: ${data?.git_result?.error || 'Не удалось выполнить пуш'}`;
                    showToast('Ошибка публикации', true);
                }
                return;
            } catch (e) {
                console.error('Local push error:', e);
            }
        }

        // 2. Pure Web / In-Browser Mode for Tamara (via GitHub REST API)
        if (!window.MMDTGithub.hasToken()) {
            gitPushBtn.disabled = false;
            gitPushBtn.innerHTML = origText;
            tokenModal.classList.add('active');
            showToast('Укажите токен GitHub для публикации', true);
            return;
        }

        try {
            logBox.textContent += 'Генерация HTML-страниц в браузере...\n';

            // Generate all pages on client
            const eventsHtml = window.MMDTTemplates.generateEventsPage(allEventsData);
            const classesHtml = window.MMDTTemplates.generateClassesPage(classesData);
            const projectsHtml = window.MMDTTemplates.generateProjectsPage(projectsData);
            const festivalsHtml = window.MMDTTemplates.generateFestivalsPage(festivalsData);
            const newsHtml = window.MMDTTemplates.generateNewsPage(newsData);

            const filesToCommit = [
                { path: 'data/events.json', content: JSON.stringify(allEventsData, null, 2) },
                { path: 'data/classes.json', content: JSON.stringify(classesData, null, 2) },
                { path: 'data/news.json', content: JSON.stringify(newsData, null, 2) },
                { path: 'data/settings.json', content: JSON.stringify(settingsData, null, 2) },
                { path: 'data/projects.json', content: JSON.stringify(projectsData, null, 2) },
                { path: 'data/festivals.json', content: JSON.stringify(festivalsData, null, 2) },
                { path: 'pages/events.html', content: eventsHtml },
                { path: 'pages/classes.html', content: classesHtml },
                { path: 'pages/projects.html', content: projectsHtml },
                { path: 'pages/festival.html', content: festivalsHtml },
                { path: 'pages/news.html', content: newsHtml },
                ...pendingImageBlobs
            ];

            logBox.textContent += `Отправка ${filesToCommit.length} файлов в репозиторий mmdtat/mmdtat.github.io через GitHub API...\n`;

            const ghRes = await window.MMDTGithub.commitMultipleFiles(filesToCommit, commitMsg);
            gitPushBtn.disabled = false;
            gitPushBtn.innerHTML = origText;

            logBox.textContent += `\n✓ УСПЕШНО!\nКоммит: ${ghRes.commitSha.substring(0, 8)}\nФайлов обновлено: ${ghRes.filesCount}\nСайт mmdt.at обновится через ~30-60 секунд!`;
            pendingImageBlobs = [];
            showToast('Успешно опубликовано на GitHub!');
        } catch (err) {
            gitPushBtn.disabled = false;
            gitPushBtn.innerHTML = origText;
            logBox.textContent += `\n❌ ОШИБКА: ${err.message}`;
            showToast(`Ошибка публикации: ${err.message}`, true);
        }
    });
}

// Rebuild HTML button
const rebuildBtn = document.getElementById('rebuildAllBtn');
if (rebuildBtn) {
    rebuildBtn.addEventListener('click', async () => {
        if (isLocalServerRunning) {
            const res = await fetch('/api/build', { method: 'POST' });
            if (res.ok) showToast('Все страницы пересобраны!');
        } else {
            showToast('Страницы готовы к публикации');
        }
    });
}

// Top actions switch helper
function updateTopActions() {
    const topActions = document.getElementById('topActions');
    if (!topActions) return;
    if (currentSection === 'events') {
        topActions.innerHTML = `<button class="btn btn-primary" id="addEventBtn">+ Добавить событие</button>`;
        document.getElementById('addEventBtn').addEventListener('click', () => openEventModal(currentEventSubtab));
    } else if (currentSection === 'news') {
        topActions.innerHTML = `<button class="btn btn-primary" id="topAddNewsBtn">+ Добавить новость</button>`;
        document.getElementById('topAddNewsBtn').addEventListener('click', openAddNews);
    } else if (currentSection === 'projects') {
        topActions.innerHTML = `<button class="btn btn-primary" id="topAddProjBtn">+ Новый проект</button>`;
        document.getElementById('topAddProjBtn').addEventListener('click', openAddProject);
    } else if (currentSection === 'festivals') {
        topActions.innerHTML = `<button class="btn btn-primary" id="topAddFestBtn">+ Новый фестиваль</button>`;
        document.getElementById('topAddFestBtn').addEventListener('click', openAddFestival);
    } else {
        topActions.innerHTML = '';
    }
}

// Initialization on load
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Restore active section from URL hash or localStorage (defaults to 'news' matching header order)
    const initialSec = getSavedSection();
    switchSection(initialSec, false);

    // 2. Listen to browser Back / Forward navigation
    window.addEventListener('hashchange', () => {
        const hash = (window.location.hash || '').replace(/^#/, '').trim();
        const validSections = ['news', 'projects', 'festivals', 'classes', 'events', 'publish'];
        if (validSections.includes(hash) && hash !== currentSection) {
            switchSection(hash, false);
        }
    });

    await detectEnvironment();
    initProjectSubtabs();
    await loadEvents();
    await loadClasses();
    await loadNewsAndSettings();
    await loadProjectsAndFestivals();
});
