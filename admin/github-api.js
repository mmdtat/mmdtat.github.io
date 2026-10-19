// ============================================================
// MMDT GitHub API Client & Storage Adapter
// Enables in-browser site updates directly to GitHub repository
// ============================================================

window.MMDTGithub = {
    OWNER: 'mmdtat',
    REPO: 'mmdtat.github.io',
    BRANCH: 'master',

    getToken: function() {
        return localStorage.getItem('mmdt_github_pat') || '';
    },

    setToken: function(token) {
        if (token) {
            localStorage.setItem('mmdt_github_pat', token.trim());
        } else {
            localStorage.removeItem('mmdt_github_pat');
        }
    },

    hasToken: function() {
        return Boolean(this.getToken());
    },

    // Verify token validity
    verifyToken: async function() {
        const token = this.getToken();
        if (!token) return { ok: false, error: 'Токен не указан' };

        try {
            const res = await fetch(`https://api.github.com/repos/${this.OWNER}/${this.REPO}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (res.status === 401) return { ok: false, error: 'Неверный токен (401 Unauthorized)' };
            if (res.status === 404) return { ok: false, error: 'Репозиторий не найден или нет прав на запись (404)' };
            if (!res.ok) return { ok: false, error: `Ошибка GitHub: HTTP ${res.status}` };

            const data = await res.json();
            const canPush = data.permissions ? data.permissions.push : true;
            return {
                ok: true,
                repo: data.full_name,
                canPush: canPush,
                default_branch: data.default_branch
            };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    },

    // Helper: Unicode-safe Base64 encode
    toBase64: function(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
    },

    // Helper: Unicode-safe Base64 decode
    fromBase64: function(str) {
        return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    },

    // Read a file from GitHub repository
    readFile: async function(filePath) {
        const token = this.getToken();
        const headers = { 'Accept': 'application/vnd.github.v3+json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const res = await fetch(`https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/${filePath}?ref=${this.BRANCH}&_t=${Date.now()}`, { headers });
            if (!res.ok) return null;
            const data = await res.json();
            if (data.content) {
                const cleanBase64 = data.content.replace(/\s/g, '');
                const text = this.fromBase64(cleanBase64);
                return { text, sha: data.sha };
            }
            return null;
        } catch (e) {
            console.error('readFile error:', e);
            return null;
        }
    },

    /**
     * Commits multiple files atomically to GitHub in a single commit!
     * @param {Array<{path: string, content: string, isBase64?: boolean}>} files
     * @param {string} commitMessage
     */
    commitMultipleFiles: async function(files, commitMessage = 'Update site content from MMDT Web Admin') {
        const token = this.getToken();
        if (!token) throw new Error('Требуется токен GitHub для публикации');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        // 1. Get latest commit SHA on branch
        const refRes = await fetch(`https://api.github.com/repos/${this.OWNER}/${this.REPO}/git/ref/heads/${this.BRANCH}`, { headers });
        if (!refRes.ok) throw new Error(`Не удалось получить ветку: ${refRes.statusText}`);
        const refData = await refRes.json();
        const latestCommitSha = refData.object.sha;

        // 2. Get tree SHA of the latest commit
        const commitRes = await fetch(`https://api.github.com/repos/${this.OWNER}/${this.REPO}/git/commits/${latestCommitSha}`, { headers });
        if (!commitRes.ok) throw new Error(`Не удалось получить коммит: ${commitRes.statusText}`);
        const commitData = await commitRes.json();
        const baseTreeSha = commitData.tree.sha;

        // 3. Create blobs for binary files (or content items for text files)
        const treeItems = [];

        for (const file of files) {
            if (file.isBase64) {
                // Create blob for binary image
                const blobRes = await fetch(`https://api.github.com/repos/${this.OWNER}/${this.REPO}/git/blobs`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        content: file.content,
                        encoding: 'base64'
                    })
                });
                if (!blobRes.ok) throw new Error(`Ошибка загрузки изображения ${file.path}: ${blobRes.statusText}`);
                const blobData = await blobRes.json();

                treeItems.push({
                    path: file.path,
                    mode: '100644',
                    type: 'blob',
                    sha: blobData.sha
                });
            } else {
                // Text file
                treeItems.push({
                    path: file.path,
                    mode: '100644',
                    type: 'blob',
                    content: file.content
                });
            }
        }

        // 4. Create new tree
        const treeRes = await fetch(`https://api.github.com/repos/${this.OWNER}/${this.REPO}/git/trees`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                base_tree: baseTreeSha,
                tree: treeItems
            })
        });
        if (!treeRes.ok) throw new Error(`Ошибка создания дерева Git: ${treeRes.statusText}`);
        const newTreeData = await treeRes.json();

        // 5. Create new commit
        const newCommitRes = await fetch(`https://api.github.com/repos/${this.OWNER}/${this.REPO}/git/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: commitMessage,
                tree: newTreeData.sha,
                parents: [latestCommitSha]
            })
        });
        if (!newCommitRes.ok) throw new Error(`Ошибка создания коммита: ${newCommitRes.statusText}`);
        const newCommitData = await newCommitRes.json();

        // 6. Update reference (push)
        const updateRefRes = await fetch(`https://api.github.com/repos/${this.OWNER}/${this.REPO}/git/refs/heads/${this.BRANCH}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                sha: newCommitData.sha,
                force: false
            })
        });
        if (!updateRefRes.ok) throw new Error(`Ошибка обновления ветки: ${updateRefRes.statusText}`);

        return {
            ok: true,
            commitSha: newCommitData.sha,
            filesCount: files.length,
            message: commitMessage
        };
    }
};

// Auto-detect token from URL parameter (e.g. https://mmdt.at/admin/#token=ghp_... or ?token=ghp_...)
(function() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashStr = window.location.hash.replace(/^#/, '');
        const hashParams = new URLSearchParams(hashStr);
        const urlToken = (urlParams.get('token') || hashParams.get('token') || '').trim();
        if (urlToken && (urlToken.startsWith('ghp_') || urlToken.startsWith('github_pat_') || urlToken.startsWith('gho_'))) {
            window.MMDTGithub.setToken(urlToken);
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    } catch (e) {}
})();
