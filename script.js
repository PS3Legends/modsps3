document.addEventListener('DOMContentLoaded', function() {
    const itemsPerPage = 10;
    let currentPage = 1;
    let searchQuery = '';
    let modsData = [];

    // عناصر DOM
    const modsList = document.getElementById('mods-list');
    const searchInput = document.getElementById('search');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const pageNumbersContainer = document.getElementById('page-numbers');

    fetchModsData();

async function fetchModsData() {
    try {
        const response = await fetch('getMods.php');
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('Expected an array of mods');
        }
        
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        return []; // إرجاع مصفوفة فارغة عند الخطأ
    }
}
    // أحداث
    searchInput.addEventListener('input', searchMods);
    prevBtn.addEventListener('click', goToPrevPage);
    nextBtn.addEventListener('click', goToNextPage);

    // وظائف
    async function fetchModsData() {
        try {
            const response = await fetch('getMods.php');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                throw new Error('Expected an array of mods');
            }
            
            modsData = data;
            renderMods();
            updatePagination();
        } catch (error) {
            console.error('Error loading mods data:', error);
            modsList.innerHTML = `<p class="error-message">Failed to load mods. Please try again later.</p>`;
        }
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
            modsList.innerHTML = `<p class="no-mods-found">No mods found matching your search.</p>`;
            return;
        }

        const paginatedMods = paginateMods(filteredMods);
        
        paginatedMods.forEach(mod => {
            const modElement = createModElement(mod);
            modsList.appendChild(modElement);
        });
    }

    function filterMods() {
        return modsData.filter(mod => {
            if (!mod.title) return false;
            
            // البحث في العنوان واسم المود إذا كان موجودًا
            const matchesSearch = mod.title.toLowerCase().includes(searchQuery) || 
                                (mod.nameMod && mod.nameMod.toLowerCase().includes(searchQuery));
            
            return matchesSearch;
        });
    }

    function paginateMods(mods) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return mods.slice(startIndex, startIndex + itemsPerPage);
    }

    function createModElement(mod) {
        const versions = mod.versions || {};
        const firstVersionKey = Object.keys(versions)[0];
        const downloadLink = versions[firstVersionKey] || "#";
        
        const modElement = document.createElement('div');
        modElement.classList.add('mod-item');
        
        modElement.innerHTML = `
            <div class="mod-info">
                <h2>${mod.title || 'Untitled Mod'}</h2>
                ${mod.nameMod ? `<p>${mod.nameMod}</p>` : ''}
                <div class="open-section">
                    <p>Open:</p>
                    <div class="images-container">
                        ${mod.modImage1 ? `<img src="${mod.modImage1}" alt="Mod preview 1" class="open-image">` : ''}
                        <img src="icons-buttons/plus.png" alt="Plus icon" class="open-image">
                        ${mod.modImage2 ? `<img src="${mod.modImage2}" alt="Mod preview 2" class="open-image">` : ''}
                    </div>
                </div>
                <div class="version-select">
                    <label>Select Version:</label>
                    <select>
                        ${Object.keys(versions).map(version => 
                            `<option value="${versions[version] || '#'}">${version}</option>`
                        ).join('')}
                    </select>
                </div>
                <a href="${downloadLink}" class="download-btn" ${downloadLink === "#" ? 'disabled' : ''}>
                    ${downloadLink !== "#" ? "Download Now" : "Link unavailable"}
                </a>
            </div>
        `;
        
        // إضافة حدث تغيير للإصدار
        const select = modElement.querySelector('select');
        select.addEventListener('change', function() {
            const downloadBtn = modElement.querySelector('.download-btn');
            downloadBtn.href = this.value;
            downloadBtn.textContent = this.value !== "#" ? "Download Now" : "Link unavailable";
            downloadBtn.disabled = this.value === "#";
        });
        
        return modElement;
    }

    function updatePagination() {
        const filteredMods = filterMods();
        const totalPages = Math.ceil(filteredMods.length / itemsPerPage);
        
        // تحديث أزرار الصفحات
        pageNumbersContainer.innerHTML = '';
        
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
        
        // تحديث أزرار التقدم والرجوع
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