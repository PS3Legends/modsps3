document.addEventListener('DOMContentLoaded', function () {
    const itemsPerPage = 6;
    
    let currentPage = 1;
    let searchQuery = '';
    let currentFilter = 'all';
    let modsData = [];

    const modsList = document.getElementById('mods-list');
    const searchInput = document.getElementById('search');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const pageNumbersContainer = document.getElementById('page-numbers');
    const noModsMessage = document.getElementById('no-mods-message');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const loadingMessage = document.getElementById('loading-message');

    fetchModsData();
    setupEventListeners();

    function setupEventListeners() {
        searchInput.addEventListener('input', debounce(searchMods, 300));
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
        return function (...args) {
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
            updateFilterCounts();
            renderMods();
            updatePagination();
        } catch (error) {
            showError('Failed to load mods. Please try again later.');
            console.error('Fetch error:', error);
        } finally {
            loadingMessage.style.display = 'none';
        }
    }

    function updateFilterCounts() {
        filterButtons.forEach(btn => {
            if (btn.dataset.game !== 'all') {
                const count = modsData.filter(mod => mod.game === btn.dataset.game).length;
                btn.textContent = `${btn.textContent.split(' (')[0]} (${count})`;
            }
        });
    }

    function searchMods() {
        searchQuery = searchInput.value.trim().toLowerCase();
        currentPage = 1;
        renderMods();
        updatePagination();
    }

    function renderMods() {
        const filteredMods = filterMods();
        modsList.innerHTML = '';

        if (filteredMods.length === 0) {
            noModsMessage.textContent = searchQuery ? 
                `No mods found for "${searchQuery}"` : 
                'No mods match the current filters.';
            noModsMessage.style.display = 'block';
            return;
        }

        noModsMessage.style.display = 'none';
        paginateMods(filteredMods).forEach(mod => {
            modsList.appendChild(createModElement(mod));
        });
    }

    function filterMods() {
        let filtered = modsData;
        if (currentFilter !== 'all') {
            filtered = filtered.filter(mod => mod.game === currentFilter);
        }
        if (searchQuery) {
            filtered = filtered.filter(mod => 
                mod.title.toLowerCase().includes(searchQuery)
            );
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

        const modElement = document.createElement('div');
        modElement.classList.add('mod-item');
        modElement.innerHTML = `
            <div class="mod-header">
                <div class="mod-info">
                    <h3 class="game-name">${mod.game || 'Unknown Game'}</h3>
                    <h2 class="mod-title">${escapeHtml(mod.title || 'Untitled Mod')}</h2>
                    <div class="open-preview">
                        ${mod.openImageLeft ? `<img src="${mod.openImageLeft}" class="open-img left">` : ''}
                        <img src="icons-buttons/plus.png" class="open-img center">
                        ${mod.openImageRight ? `<img src="${mod.openImageRight}" class="open-img right">` : ''}
                    </div>
                </div>
            </div>
            <div class="mod-images">
                ${mod.modImage1 ? `<img src="${mod.modImage1}" alt="Mod preview">` : ''}
                ${mod.modImage2 ? `<img src="${mod.modImage2}" alt="Mod preview">` : ''}
            </div>
            ${hasVersions ? `
            <div class="version-select">
                <label>Select Version:</label>
                <select>
                    ${versionKeys.map(v => `<option value="${versions[v]}">${v} ${mod.fileSize ? `(${mod.fileSize})` : ''}</option>`).join('')}
                </select>
            </div>` : '<p class="no-versions">Coming soon</p>'}
            <div class="mod-footer">
                <small>Author: ${mod.author || 'Unknown'}</small>
            </div>
            <a href="${hasVersions ? versions[versionKeys[0]] : '#'}" 
               class="download-btn ${!hasVersions ? 'disabled-link' : ''}">
                ${hasVersions ? "Download Now" : "Coming soon"}
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

    function escapeHtml(text) {
        return text ? text.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;") : '';
    }

    function updatePagination() {
        const filteredMods = filterMods();
        const totalPages = Math.ceil(filteredMods.length / itemsPerPage);
        
        pageNumbersContainer.innerHTML = '';
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;

        if (totalPages <= 1) return;

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