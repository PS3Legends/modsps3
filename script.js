document.addEventListener('DOMContentLoaded', function () {
    const itemsPerPage = 6;
    let currentPage = 1;
    let searchQuery = '';
    let currentFilter = 'all';
    let modsData = [];
    let controller;

    const modsList = document.getElementById('mods-list');
    const searchInput = document.getElementById('search');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const pageNumbersContainer = document.getElementById('page-numbers');
    const noModsMessage = document.getElementById('no-mods-message');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const loadingMessage = document.getElementById('loading-message');
    const securityWarning = document.getElementById('security-warning');
    const filtersContainer = document.getElementById('filters');

    document.getElementById('close-warning').addEventListener('click', () => {
        securityWarning.style.display = 'none';
    });

    init();

    function init() {
        setupEventListeners();
        fetchModsData();
    }

    function setupEventListeners() {
        const debouncedSearch = debounce(searchMods, 300);
        searchInput.addEventListener('input', debouncedSearch);
        prevBtn.addEventListener('click', goToPrevPage);
        nextBtn.addEventListener('click', goToNextPage);
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.game;
                currentPage = 1;
                renderMods();
                updatePagination();
            });
        });
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    async function fetchModsData() {
        try {
            if (controller) controller.abort();
            controller = new AbortController();
            
            loadingMessage.style.display = 'flex';
            modsList.style.display = 'none';
            noModsMessage.style.display = 'none';
            
            const response = await fetch('mods.json', { 
                signal: controller.signal
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            
            modsData = data.map(mod => {
                if (!mod.id) mod.id = generateId(mod.title);
                if (!mod.title) mod.title = 'Untitled Mod';
                if (mod.lastUpdated) mod.lastUpdated = formatDate(mod.lastUpdated);
                return mod;
            });

            updateFilterCounts();
            
            if (modsData.length === 0) {
                showNoModsMessage('No mods available.');
            } else {
                renderMods();
                updatePagination();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showError('Failed to load mods. Please try again later.');
                console.error('Fetch error:', error);
            }
        } finally {
            loadingMessage.style.display = 'none';
            modsList.style.display = 'flex';
        }
    }

    function updateFilterCounts() {
        filterButtons.forEach(btn => {
            if (btn.dataset.game === 'all') {
                btn.textContent = 'All';
            } else {
                const count = modsData.filter(mod => mod.game === btn.dataset.game).length;
                btn.textContent = `${btn.textContent.split(' (')[0]} (${count})`;
            }
        });
    }

    function generateId(title) {
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substr(2, 9);
    }

    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    }

    function showError(message) {
        modsList.innerHTML = '';
        const errorElement = document.createElement('div');
        errorElement.className = 'error';
        errorElement.innerHTML = `<p>${message}</p>`;
        const retryBtn = document.createElement('button');
        retryBtn.className = 'download-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', fetchModsData);
        errorElement.appendChild(retryBtn);
        modsList.appendChild(errorElement);
    }

    function showNoModsMessage(message) {
        noModsMessage.textContent = message;
        noModsMessage.style.display = 'block';
        modsList.innerHTML = '';
    }

    function searchMods() {
        const query = searchInput.value.trim();
        if (query.length > 0 && query.length < 2) {
            showNoModsMessage('Please enter at least 2 characters to search.');
            return;
        }
        searchQuery = query.toLowerCase();
        currentPage = 1;
        renderMods();
        updatePagination();
    }

    function renderMods() {
        modsList.innerHTML = '';
        const filteredMods = filterMods();

        if (filteredMods.length === 0) {
            showNoModsMessage(searchQuery ? `No mods found for "${searchQuery}".` : 'No mods match the current filters.');
            return;
        } else {
            noModsMessage.style.display = 'none';
        }

        const paginatedMods = paginateMods(filteredMods);
        paginatedMods.forEach(mod => {
            const modElement = createModElement(mod);
            modsList.appendChild(modElement);
        });
    }

    function filterMods() {
        let filtered = [...modsData];
        if (currentFilter !== 'all') {
            filtered = filtered.filter(mod => mod.game && mod.game.toLowerCase() === currentFilter.toLowerCase());
        }
        if (searchQuery) {
            filtered = filtered.filter(mod => mod.title && mod.title.toLowerCase().includes(searchQuery));
        }
        return filtered;
    }

    function paginateMods(mods) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return mods.slice(startIndex, startIndex + itemsPerPage);
    }

    function createModElement(mod) {
        const versions = mod.versions || {};
        const versionKeys = Object.keys(versions);
        const hasVersions = versionKeys.length > 0;
        const imgFallback = 'icons-buttons/fallback.png';
        const hasImages = mod.modImage1 || mod.modImage2;
        const rating = mod.rating || 0;

        const modElement = document.createElement('div');
        modElement.classList.add('mod-item');
        modElement.dataset.id = mod.id;

        const stars = Array(5).fill(0).map((_, i) => i < Math.floor(rating) ? '★' : '☆').join('');

        modElement.innerHTML = `
            <div class="mod-header">
                <div class="mod-info">
                    <h2>${escapeHtml(mod.title || 'Untitled Mod')}</h2>
                    ${mod.nameMod ? `<p class="mod-name">${escapeHtml(mod.nameMod)}</p>` : ''}
                </div>
                <div class="rating">${stars}</div>
            </div>
            
            ${hasImages ? `
            <div class="mod-images">
                ${mod.modImage1 ? `<img src="${escapeHtml(mod.modImage1)}" alt="${escapeHtml(mod.title || 'Mod')} preview" onerror="this.src='${imgFallback}'">` : ''}
                ${mod.modImage2 ? `<img src="${escapeHtml(mod.modImage2)}" alt="${escapeHtml(mod.title || 'Mod')} preview" onerror="this.src='${imgFallback}'">` : ''}
            </div>` : ''}
            
            ${hasVersions ? `
            <div class="version-select">
                <label for="version-${mod.id}">Select Version:</label>
                <select id="version-${mod.id}">
                    ${versionKeys.map(version => `<option value="${escapeHtml(validateUrl(versions[version]) || '#')}">${escapeHtml(version)} ${mod.fileSize ? `(${escapeHtml(mod.fileSize)})` : ''}</option>`).join('')}
                </select>
            </div>` : '<p class="no-versions">Coming soon</p>'}
            
            <div class="mod-footer">
                ${mod.author ? `<small><span>Author:</span> ${escapeHtml(mod.author)}</small>` : '<small>Author: Unknown</small>'}
                ${mod.lastUpdated ? `<small><span>Updated:</span> ${escapeHtml(mod.lastUpdated)}</small>` : ''}
            </div>
            
            <a href="${hasVersions ? escapeHtml(validateUrl(versions[versionKeys[0]]) || '#') : '#'}" 
               class="download-btn ${!hasVersions ? 'disabled-link' : ''}">
                ${hasVersions ? "Download Now" : "Coming soon"}
            </a>
        `;

        const select = modElement.querySelector('select');
        if (select) {
            select.addEventListener('change', function() {
                const downloadBtn = modElement.querySelector('.download-btn');
                const url = validateUrl(this.value);
                downloadBtn.href = url || '#';
                downloadBtn.classList.toggle('disabled-link', !url);
                downloadBtn.textContent = url ? "Download Now" : "Coming soon";
            });
        }

        return modElement;
    }

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function validateUrl(url) {
        if (!url || url === '#') return null;
        try {
            new URL(url);
            return url;
        } catch (e) {
            return null;
        }
    }

    function updatePagination() {
        const filteredMods = filterMods();
        const totalPages = Math.ceil(filteredMods.length / itemsPerPage);

        pageNumbersContainer.innerHTML = '';
        if (totalPages <= 1) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }
        
        const pagesToShow = new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages]);
        
        let prevPage = 0;
        Array.from(pagesToShow)
            .sort((a, b) => a - b)
            .filter(page => page > 0 && page <= totalPages)
            .forEach(page => {
                if (page - prevPage > 1) {
                    const ellipsis = document.createElement('span');
                    ellipsis.textContent = '...';
                    ellipsis.style.padding = '0 5px';
                    pageNumbersContainer.appendChild(ellipsis);
                }
                
                const pageBtn = document.createElement('button');
                pageBtn.textContent = page;
                pageBtn.classList.add('page-btn');
                if (page === currentPage) pageBtn.classList.add('active');
                pageBtn.addEventListener('click', () => {
                    currentPage = page;
                    renderMods();
                    updatePagination();
                });
                pageNumbersContainer.appendChild(pageBtn);
                prevPage = page;
            });

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
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
});