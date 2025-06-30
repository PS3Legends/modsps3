document.addEventListener('DOMContentLoaded', function () {
    const itemsPerPage = 10;
    let currentPage = 1;
    let searchQuery = '';
    let modsData = [];
    let isLoading = false;

    const modsList = document.getElementById('mods-list');
    const searchInput = document.getElementById('search');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const pageNumbersContainer = document.getElementById('page-numbers');
    const noModsMessage = document.getElementById('no-mods-message');
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = 'Loading...';
    loadingIndicator.style.display = 'none';
    document.body.appendChild(loadingIndicator);

    // إضافة debounce للبحث
    const debouncedSearch = debounce(searchMods, 300);
    searchInput.addEventListener('input', debouncedSearch);
    prevBtn.addEventListener('click', goToPrevPage);
    nextBtn.addEventListener('click', goToNextPage);

    fetchModsData();

    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    async function fetchModsData() {
        try {
            isLoading = true;
            loadingIndicator.style.display = 'block';
            
            const response = await fetch('getMods.php');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            if (!Array.isArray(data)) throw new Error('Expected an array of mods');

            modsData = data;
            if (modsData.length === 0) {
                showNoModsMessage('No mods available. Please check back later.');
            } else {
                renderMods();
                updatePagination();
            }
        } catch (error) {
            console.error('Error loading mods data:', error);
            showNoModsMessage('Failed to load mods. Please try again later.');
        } finally {
            isLoading = false;
            loadingIndicator.style.display = 'none';
        }
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
        if (!searchQuery) return modsData;
        
        return modsData.filter(mod => {
            if (!mod.title) return false;
            const titleMatch = mod.title.toLowerCase().includes(searchQuery);
            const nameMatch = mod.nameMod && mod.nameMod.toLowerCase().includes(searchQuery);
            const descMatch = mod.description && mod.description.toLowerCase().includes(searchQuery);
            return titleMatch || nameMatch || descMatch;
        });
    }

    function paginateMods(mods) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return mods.slice(startIndex, startIndex + itemsPerPage);
    }

    function createModElement(mod) {
        const versions = mod.versions || {};
        const versionKeys = Object.keys(versions);
        const firstVersionKey = versionKeys[0] || '';
        const downloadLink = versions[firstVersionKey] || "#";
        const hasImages = mod.modImage1 || mod.modImage2;

        const modElement = document.createElement('div');
        modElement.classList.add('mod-item');

        modElement.innerHTML = `
            <div class="mod-info">
                <h2>${mod.title || 'Untitled Mod'}</h2>
                ${mod.nameMod ? `<p class="mod-name">${mod.nameMod}</p>` : ''}
                ${mod.description ? `<p class="mod-description">${mod.description}</p>` : ''}
                
                ${hasImages ? `
                <div class="open-section">
                    <p>Preview:</p>
                    <div class="images-container">
                        ${mod.modImage1 ? `<img src="${mod.modImage1}" alt="${mod.title || 'Mod'} preview 1" class="open-image">` : ''}
                        ${mod.modImage1 && mod.modImage2 ? `<img src="icons-buttons/plus.png" alt="Plus icon" class="open-image">` : ''}
                        ${mod.modImage2 ? `<img src="${mod.modImage2}" alt="${mod.title || 'Mod'} preview 2" class="open-image">` : ''}
                    </div>
                </div>` : ''}
                
                ${versionKeys.length > 0 ? `
                <div class="version-select">
                    <label for="version-select-${mod.id || Math.random().toString(36).substr(2, 9)}">Select Version:</label>
                    <select id="version-select-${mod.id || Math.random().toString(36).substr(2, 9)}">
                        ${versionKeys.map(version => 
                            `<option value="${versions[version] || '#'}">${version}</option>`
                        ).join('')}
                    </select>
                </div>` : ''}
                
                <a href="${downloadLink}" class="download-btn ${downloadLink === "#" ? 'disabled-link' : ''}">
                    ${downloadLink !== "#" ? "Download Now" : "Link unavailable"}
                </a>
            </div>
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
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.classList.add('page-btn');
            if (i === currentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                renderMods();
                updatePagination();
            });
            pageNumbersContainer.appendChild(pageBtn);
        }

        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
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