document.addEventListener('DOMContentLoaded', function () {
    const itemsPerPage = 6;
    let currentPage = 1;
    let searchQuery = '';
    let currentFilter = 'all';
    let modsData = [];
    let isLoading = false;
    let controller;

    const modsList = document.getElementById('mods-list');
    const searchInput = document.getElementById('search');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const pageNumbersContainer = document.getElementById('page-numbers');
    const noModsMessage = document.getElementById('no-mods-message');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const loadingMessage = document.getElementById('loading-message');
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    document.body.appendChild(loadingIndicator);

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    function updateOnlineStatus() {
        const statusElement = document.createElement('div');
        statusElement.className = `online-status ${navigator.onLine ? 'online' : 'offline'}`;
        statusElement.textContent = navigator.onLine ? 'Online' : 'Offline';
        
        const existingStatus = document.querySelector('.online-status');
        if (existingStatus) {
            existingStatus.replaceWith(statusElement);
        } else {
            document.body.prepend(statusElement);
        }
    }

    function updateDateTime() {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', options);
        document.getElementById('current-time').textContent = now.toLocaleTimeString('en-US');
    }

    updateDateTime();
    setInterval(updateDateTime, 1000);

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

    fetchModsData();

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function renderRating(rating) {
        if (!rating) return '';
        const fullStars = '★'.repeat(Math.floor(rating));
        const emptyStars = '☆'.repeat(5 - Math.floor(rating));
        return `<span class="rating" title="${rating}/5">${fullStars}${emptyStars}</span>`;
    }

    async function fetchModsData() {
        try {
            if (controller) controller.abort();
            controller = new AbortController();
            
            isLoading = true;
            loadingIndicator.style.display = 'block';
            loadingMessage.style.display = 'block';
            modsList.style.display = 'none';
            
            const response = await fetch('mods.json', { 
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'max-age=3600'
                }
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('Expected an array of mods');

            modsData = data.map(mod => ({
                ...mod,
                id: mod.id || Math.random().toString(36).substr(2, 9),
                rating: mod.rating || Math.floor(Math.random() * 3) + 3,
                downloadCount: mod.downloadCount || Math.floor(Math.random() * 10000),
                lastUpdated: mod.lastUpdated || new Date().toISOString().split('T')[0]
            })).filter(mod => {
                if (!mod.title || !mod.versions) {
                    console.warn('Invalid mod data:', mod);
                    return false;
                }
                return true;
            });

            localStorage.setItem('modsData', JSON.stringify(modsData));
            localStorage.setItem('modsLastFetch', Date.now());

            if (modsData.length === 0) {
                showNoModsMessage('No mods available. Please check back later.');
            } else {
                renderMods();
                updatePagination();
            }
        } catch (error) {
            const cachedData = localStorage.getItem('modsData');
            if (cachedData) {
                modsData = JSON.parse(cachedData);
                renderMods();
                updatePagination();
            }
            
            if (error.name !== 'AbortError') {
                showError('Failed to load mods. Showing cached data if available.');
            }
        } finally {
            isLoading = false;
            loadingIndicator.style.display = 'none';
            loadingMessage.style.display = 'none';
            modsList.style.display = 'flex';
        }
    }

    function showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.innerHTML = `<span>${message}</span>`;
        
        const retryBtn = document.createElement('button');
        retryBtn.className = 'retry-btn';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', fetchModsData);
        
        errorElement.appendChild(retryBtn);
        modsList.innerHTML = '';
        modsList.appendChild(errorElement);
    }

    function showNoModsMessage(message) {
        noModsMessage.textContent = message;
        noModsMessage.style.display = 'block';
        modsList.innerHTML = '';
    }

    function searchMods() {
        searchQuery = searchInput.value.trim().toLowerCase();
        currentPage = 1;
        renderMods();
        updatePagination();
    }

    function renderMods() {
        modsList.innerHTML = '';
        const filteredMods = filterMods();

        if (filteredMods.length === 0) {
            document.getElementById('search-query').textContent = searchQuery;
            showNoModsMessage(`No mods found for "${searchQuery}". Try a different search or check back later.`);
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
        let filtered = modsData;

        if (currentFilter !== 'all') {
            filtered = filtered.filter(mod => 
                mod.game && mod.game.toLowerCase() === currentFilter.toLowerCase()
            );
        }
        
        if (searchQuery) {
            filtered = filtered.filter(mod => {
                const searchFields = [
                    mod.title,
                    mod.nameMod,
                    mod.description,
                    mod.author
                ].filter(Boolean);
                
                return searchFields.some(field => 
                    field.toLowerCase().includes(searchQuery)
                );
            });
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
        const imgFallback = 'icons-buttons/plus.png';
        const hasImages = mod.modImage1 || mod.modImage2;

        const modElement = document.createElement('div');
        modElement.classList.add('mod-item', 'fade-in');
        modElement.dataset.id = mod.id;

        modElement.innerHTML = `
            <div class="mod-header">
                <h2>${mod.title || 'Untitled Mod'}</h2>
                ${renderRating(mod.rating)}
            </div>
            ${mod.nameMod ? `<p class="mod-name">${mod.nameMod}</p>` : ''}
            
            ${hasImages ? `
            <div class="mod-images">
                ${mod.modImage1 ? `<img src="${mod.modImage1}" loading="lazy" alt="${mod.title || 'Mod'} preview" onerror="this.src='${imgFallback}'">` : ''}
                ${mod.modImage2 ? `<img src="${mod.modImage2}" loading="lazy" alt="${mod.title || 'Mod'} preview" onerror="this.src='${imgFallback}'">` : ''}
            </div>` : ''}
            
            ${hasVersions ? `
            <div class="version-select">
                <label>Select Version:</label>
                <select>
                    ${versionKeys.map(version => 
                        `<option value="${versions[version] || '#'}">
                            ${version} ${mod.fileSize ? `(${mod.fileSize})` : ''}
                        </option>`
                    ).join('')}
                </select>
            </div>` : '<p class="no-versions">No versions available</p>'}
            
            <div class="mod-footer">
                ${mod.lastUpdated ? `<small>Updated: ${mod.lastUpdated}</small>` : ''}
            </div>
            
            <a href="${hasVersions ? versions[versionKeys[0]] : '#'}" 
               class="download-btn ${!hasVersions ? 'disabled-link' : ''}">
                ${hasVersions ? "Download Now" : "Link unavailable"}
            </a>
        `;

        const select = modElement.querySelector('select');
        if (select) {
            select.addEventListener('change', function() {
                const downloadBtn = modElement.querySelector('.download-btn');
                downloadBtn.href = this.value;
                downloadBtn.classList.toggle('disabled-link', this.value === "#");
                downloadBtn.textContent = this.value !== "#" ? "Download Now" : "Link unavailable";
            });
        }

        return modElement;
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
                    pageNumbersContainer.appendChild(ellipsis);
                }
                
                const pageBtn = document.createElement('button');
                pageBtn.textContent = page;
                pageBtn.classList.add('page-btn');
                if (page === currentPage) {
                    pageBtn.classList.add('active');
                }
                pageBtn.addEventListener('click', () => {
                    currentPage = page;
                    renderMods();
                    updatePagination();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function goToNextPage() {
        const filteredMods = filterMods();
        const totalPages = Math.ceil(filteredMods.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderMods();
            updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});