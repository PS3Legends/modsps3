document.addEventListener('DOMContentLoaded', function() {
    const itemsPerPage = 6;
    let currentPage = 1;
    let searchQuery = '';
    let modsData = [];

    const modsList = document.getElementById('mods-list');
    const searchInput = document.getElementById('search');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const pageNumbersContainer = document.getElementById('page-numbers');
    const noModsMessage = document.getElementById('no-mods-message');
    const loadingMessage = document.getElementById('loading-message');
    const darkModeToggle = document.getElementById('darkModeToggle');

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
    });

    fetchModsData();
    searchInput.addEventListener('input', debounce(searchMods, 300));
    if (prevBtn) prevBtn.addEventListener('click', goToPrevPage);
    if (nextBtn) nextBtn.addEventListener('click', goToNextPage);

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    async function fetchModsData() {
        try {
            loadingMessage.style.display = 'flex';
            noModsMessage.style.display = 'none';
            const response = await fetch('mods.json');
            if (!response.ok) throw new Error('Failed to load mods');
            modsData = await response.json();
            renderMods();
            updatePagination();
        } catch (error) {
            showError('Failed to load mods. Please try again later.');
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    function searchMods() {
        searchQuery = searchInput.value.trim().toLowerCase();
        currentPage = 1;
        renderMods();
        updatePagination();
    }

    function filterMods() {
        if (!searchQuery) return modsData;
        return modsData.filter(mod => mod.game && mod.game.toLowerCase().includes(searchQuery));
    }

    function renderMods() {
        const filteredMods = filterMods();
        modsList.innerHTML = '';

        if (filteredMods.length === 0) {
            noModsMessage.textContent = 'No mods found.';
            noModsMessage.style.display = 'block';
            return;
        }

        noModsMessage.style.display = 'none';
        paginateMods(filteredMods).forEach(mod => {
            modsList.appendChild(createModElement(mod));
        });
    }

    function paginateMods(mods) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return mods.slice(startIndex, startIndex + itemsPerPage);
    }

    function createModElement(mod) {
        const versions = mod.versions || {};
        const versionKeys = Object.keys(versions);
        const hasVersions = versionKeys.length > 0 && versionKeys.some(v => versions[v]);
        const hasAnyPreview = mod.modImage1 || mod.modImage2;

        const modElement = document.createElement('div');
        modElement.classList.add('mod-item');

        modElement.innerHTML = `
            <div class="mod-header">
                <div class="mod-info">
                    <h3 class="game-name">${escapeHtml(mod.game || 'Unknown Game')}</h3>
                    <h2 class="mod-title">${escapeHtml(mod.title || 'Untitled Mod')}</h2>
                    ${hasAnyPreview ? `
                        <div class="open-preview-wrapper">
                            <span class="open-label">Open:</span>
                            <div class="open-preview">
                                ${mod.modImage1 ? `<img src="${mod.modImage1}" loading="lazy" class="open-img left">` : ''}
                                <img src="icons-buttons/plus.png" class="open-img center">
                                ${mod.modImage2 ? `<img src="${mod.modImage2}" loading="lazy" class="open-img right">` : ''}
                            </div>
                        </div>` : ''}
                </div>
            </div>
            ${hasVersions ? `
            <div class="version-select">
                <select>
                    ${versionKeys.map(v => versions[v] ? `<option value="${versions[v]}">${v} ${mod.fileSize ? `(${mod.fileSize})` : ''}</option>` : '').join('')}
                </select>
            </div>` : '<p class="no-versions">Coming Soon</p>'}
            <div class="mod-footer">
                <small>Author: ${escapeHtml(mod.author || 'Unknown')}</small>
            </div>
            <a href="${hasVersions && versions[versionKeys[0]] ? versions[versionKeys[0]] : '#'}" 
                class="download-btn ${!hasVersions || !versions[versionKeys[0]] ? 'disabled-link' : ''}" 
                ${!hasVersions || !versions[versionKeys[0]] ? 'tabindex="-1" aria-disabled="true"' : ''}>
                ${hasVersions && versions[versionKeys[0]] ? "Download Now" : "Coming Soon"}
            </a>
        `;

        const select = modElement.querySelector('select');
        if (select) {
            select.addEventListener('change', (e) => {
                const downloadBtn = modElement.querySelector('.download-btn');
                downloadBtn.href = e.target.value;
            });
        }

        return modElement;
    }

    function updatePagination() {
        const filteredMods = filterMods();
        const totalPages = Math.ceil(filteredMods.length / itemsPerPage);

        if (pageNumbersContainer) {
            pageNumbersContainer.innerHTML = '';
        }
        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;

        if (totalPages <= 1 || !pageNumbersContainer) return;

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.classList.toggle('active', i === currentPage);
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                renderMods();
                updatePagination();
            });
            pageNumbersContainer.appendChild(pageBtn);
        }
    }

    function goToPrevPage() {
        if (currentPage > 1) {
            currentPage--;
            renderMods();
            updatePagination();
        }
    }

    function goToNextPage() {
        const filteredMods = filterMods();
        const totalPages = Math.ceil(filteredMods.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderMods();
            updatePagination();
        }
    }

    function showError(message) {
        modsList.innerHTML = `<div class="error">${message}</div>`;
    }
});