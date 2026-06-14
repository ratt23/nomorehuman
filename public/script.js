// --- DYNAMIC API BASE URL RESOLVER ---
const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
window.API_BASE_URL = isLocalHost ? '' : 'https://nomorehuman.onrender.com';

// Generic search-and-select modal for columns
window.showColumnSelectModal = function(title, options, currentValue, onSelect) {
    let modal = document.getElementById('columnSelectModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'columnSelectModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="columnSelectModalTitle">Pilih Kolom</h3>
                    <button class="close-modal-btn" id="closeColumnSelectModalBtn">&times;</button>
                </div>
                <div class="modal-search">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" id="columnSelectModalSearch" placeholder="Cari kolom...">
                </div>
                <div class="modal-options-list" id="columnSelectModalList"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        const style = document.createElement('style');
        style.innerHTML = `
            .modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(4, 6, 10, 0.7);
                backdrop-filter: blur(8px);
                align-items: center;
                justify-content: center;
            }
            .modal.show {
                display: flex;
            }
            .modal-content {
                background: var(--panel-bg);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 102, 255, 0.1);
                animation: modalFadeIn 0.3s ease;
            }
            @keyframes modalFadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .modal-header {
                padding: 15px 20px;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-header h3 {
                margin: 0;
                font-size: 1.15rem;
                font-weight: 600;
                color: var(--text-color);
            }
            .close-modal-btn {
                background: none;
                border: none;
                color: var(--text-secondary);
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                line-height: 1;
                transition: color 0.2s;
            }
            .close-modal-btn:hover {
                color: var(--danger-color);
            }
            .modal-search {
                padding: 15px 20px 10px;
                position: relative;
            }
            .modal-search .search-icon {
                position: absolute;
                left: 32px;
                top: 24px;
                color: var(--text-secondary);
                font-size: 0.85rem;
            }
            .modal-search input {
                width: 100%;
                padding: 8px 12px 8px 30px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                color: var(--text-color);
                font-size: 0.9rem;
            }
            .modal-search input:focus {
                border-color: var(--primary-color);
                outline: none;
                background: rgba(0, 102, 255, 0.05);
            }
            .modal-options-list {
                padding: 10px 20px 20px;
                overflow-y: auto;
                max-height: 400px;
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .modal-option-item {
                padding: 10px 12px;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.2s, color 0.2s;
                font-size: 0.9rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                color: var(--text-color);
            }
            .modal-option-item:hover {
                background: rgba(255, 255, 255, 0.05);
                color: var(--primary-color);
            }
            .modal-option-item.selected {
                background: rgba(0, 102, 255, 0.15);
                color: var(--primary-color);
                font-weight: 600;
            }
            .modal-option-item.selected::after {
                content: "\\f00c";
                font-family: "Font Awesome 6 Free";
                font-weight: 900;
                font-size: 0.8rem;
            }
            .btn-select-popup {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                color: var(--text-color);
                padding: 8px 12px;
                font-size: 0.9rem;
                cursor: pointer;
                text-align: left;
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
                transition: border-color 0.2s, background-color 0.2s;
            }
            .btn-select-popup:hover {
                border-color: var(--primary-color);
                background: rgba(0, 102, 255, 0.05);
            }
        `;
        document.head.appendChild(style);
        
        const closeBtn = document.getElementById('closeColumnSelectModalBtn');
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }

    document.getElementById('columnSelectModalTitle').textContent = title;
    const searchInput = document.getElementById('columnSelectModalSearch');
    searchInput.value = '';
    
    const listContainer = document.getElementById('columnSelectModalList');
    
    function renderList(filterText = '') {
        const query = filterText.toLowerCase();
        const filteredOptions = options.filter(opt => opt.text.toLowerCase().includes(query));
        
        if (filteredOptions.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 0.9rem; margin-top: 20px;">Tidak ada hasil</p>';
            return;
        }
        
        listContainer.innerHTML = filteredOptions.map(opt => `
            <div class="modal-option-item ${opt.value === currentValue ? 'selected' : ''}" data-value="${opt.value}">
                <span>${opt.text}</span>
            </div>
        `).join('');
        
        const items = listContainer.querySelectorAll('.modal-option-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const val = item.dataset.value;
                onSelect(val);
                modal.classList.remove('show');
            });
        });
    }
    
    renderList();
    
    searchInput.oninput = (e) => {
        renderList(e.target.value);
    };
    
    modal.classList.add('show');
    searchInput.focus();
};

// Converts standard select element to searchable popup select button
window.convertSelectToPopup = function(selectId, title) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Hide native select
    select.style.display = 'none';
    
    // Check if button already exists
    let btn = document.getElementById(`btn-replace-${selectId}`);
    if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.id = `btn-replace-${selectId}`;
        btn.className = 'btn-select-popup';
        select.parentNode.insertBefore(btn, select.nextSibling);
    }
    
    const updateButtonLabel = () => {
        const selectedOption = select.options[select.selectedIndex];
        btn.innerHTML = `${selectedOption ? selectedOption.text : 'Pilih...'} <i class="fas fa-chevron-down" style="font-size: 0.8em; margin-left: 8px; opacity: 0.7;"></i>`;
    };
    
    updateButtonLabel();
    
    btn.onclick = () => {
        const options = Array.from(select.options).map(opt => ({
            value: opt.value,
            text: opt.text
        }));
        
        window.showColumnSelectModal(title, options, select.value, (selectedValue) => {
            select.value = selectedValue;
            select.dispatchEvent(new Event('change'));
            updateButtonLabel();
        });
    };
    
    select.addEventListener('change', updateButtonLabel);
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Variabel Global yang Dapat Diakses Semua Script ---
    window.lastProcessedFiles = { original: null, processed: null };

    // --- Bagian Navigasi & Utilitas ---
    const views = document.querySelectorAll('.view');
    const backToMenuBtn = document.getElementById('backToMenuBtn');

    window.showView = function(viewId) {
        views.forEach(v => {
            v.style.display = 'none';
            v.classList.remove('active');
        });
        const el = document.getElementById(viewId);
        if (el) {
            el.style.display = 'block';
            setTimeout(() => el.classList.add('active'), 10);
        }
        if (backToMenuBtn) {
            backToMenuBtn.style.display = viewId === 'mainMenu' ? 'none' : 'inline-block';
        }
    }

    window.toggleButtonLoading = function(btn, isLoading) {
        if (btn) {
            btn.classList.toggle('loading', isLoading);
            btn.disabled = isLoading;
        }
    }

    window.setupDragDrop = function(areaId, inputId) {
        const area = document.getElementById(areaId);
        const input = document.getElementById(inputId);
        if (!area || !input) return;
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        area.addEventListener('dragover', () => area.classList.add('dragover'));
        area.addEventListener('dragleave', () => area.classList.remove('dragover'));
        area.addEventListener('drop', e => {
            area.classList.remove('dragover');
            input.files = e.dataTransfer.files;
            input.dispatchEvent(new Event('change'));
        });
    }

    document.querySelectorAll('.menu-choice').forEach(btn => {
        btn.addEventListener('click', () => showView(btn.dataset.target));
    });

    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', () => {
            showView('mainMenu');
        });
    }

    // --- LOGIKA MODAL (POP-UP) ---
    const modal = document.getElementById('appModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    
    window.openModal = function(title, contentHTML) {
        if (modal && modalTitle && modalBody) {
            modalTitle.textContent = title;
            modalBody.innerHTML = contentHTML;
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        }
    }

    window.closeModal = function() {
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                if (modalBody) modalBody.innerHTML = '';
            }, 200);
        }
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    window.formatCellValue = function(value) {
        if (value === null || value === undefined || value === '') return '';
        if (typeof value === 'number') {
            return new Intl.NumberFormat('id-ID').format(value);
        }
        return value;
    }

    // --- MULTI-LANGUAGE TRANSLATION SYSTEM (ID/EN) ---
    let currentLang = localStorage.getItem('nomorehuman_lang') || 'ID';

    function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('nomorehuman_lang', lang);
        
        const langBtn = document.getElementById('langBtn');
        if (langBtn) {
            const span = langBtn.querySelector('span');
            if (span) span.textContent = lang;
        }

        document.querySelectorAll('[data-translate-id]').forEach(el => {
            const idText = el.getAttribute('data-translate-id');
            const enText = el.getAttribute('data-translate-en');
            const targetText = (lang === 'ID') ? idText : enText;
            
            if (el.tagName === 'INPUT') {
                el.placeholder = targetText;
            } else {
                el.textContent = targetText;
            }
        });
    }

    const langBtnElement = document.getElementById('langBtn');
    if (langBtnElement) {
        langBtnElement.addEventListener('click', () => {
            const nextLang = (currentLang === 'ID') ? 'EN' : 'ID';
            setLanguage(nextLang);
        });
    }

    // Apply language initially
    setLanguage(currentLang);

    // --- RUN TERMINAL BOOT ANIMATION ---
    function runBootAnimation() {
        const overlay = document.getElementById('bootOverlay');
        const terminal = document.getElementById('bootTerminal');
        if (!overlay || !terminal) return;

        const lines = [
            { text: "> Initializing automation core...", delay: 150, color: "" },
            { text: "> Loading workflow modules...", delay: 450, color: "" },
            { text: "> Human dependency: DISABLED", delay: 800, color: "#EF4444" },
            { text: "> System status: ONLINE", delay: 1100, color: "#00D084" }
        ];

        lines.forEach(line => {
            setTimeout(() => {
                const p = document.createElement('div');
                p.className = 'boot-line';
                p.innerText = line.text;
                if (line.color) {
                    p.style.color = line.color;
                    p.style.textShadow = `0 0 5px ${line.color}80`;
                }
                terminal.appendChild(p);
                // Force reflow
                p.offsetHeight;
                p.classList.add('show');
            }, line.delay);
        });

        setTimeout(() => {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }, 1600);
    }

    // --- TITIK MASUK UTAMA ---
    // Panggil fungsi inisialisasi dari file lain
    if (typeof initTarifGenerator === 'function') {
        initTarifGenerator();
    }
    if (typeof initVlookupKustom === 'function') {
        initVlookupKustom();
    }

    // Tampilkan menu utama saat aplikasi pertama kali dimuat
    showView('mainMenu');
    runBootAnimation();

    // --- SERVER WAKE-UP & POLLING LOGIC ---
    const connectionStatusWidget = document.getElementById('connectionStatusWidget');
    const btnWakeUpServer = document.getElementById('btnWakeUpServer');
    let isWakeUpPolling = false;

    function updateWidgetStatus(status, text = '') {
        if (!connectionStatusWidget) return;
        connectionStatusWidget.className = `status-badge status-${status}`;
        
        const textSpan = connectionStatusWidget.querySelector('.status-text');
        if (textSpan) {
            textSpan.textContent = text || (status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Menghubungkan...');
        }
        
        if (btnWakeUpServer) {
            btnWakeUpServer.style.display = status === 'offline' ? 'inline-block' : 'none';
        }
    }

    async function checkServerConnection(isWakeUp = false) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            
            const response = await fetch(window.API_BASE_URL + '/ping', { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                updateWidgetStatus('online');
                isWakeUpPolling = false;
                if (isWakeUp && btnWakeUpServer) {
                    btnWakeUpServer.disabled = false;
                    btnWakeUpServer.innerHTML = '<i class="fas fa-plug"></i> Bangunkan';
                }
                return true;
            }
        } catch (err) {
            // failed
        }
        
        if (!isWakeUpPolling) {
            updateWidgetStatus('offline');
        }
        return false;
    }

    async function pollWakeUpServer() {
        if (isWakeUpPolling) return;
        isWakeUpPolling = true;
        
        if (btnWakeUpServer) {
            btnWakeUpServer.disabled = true;
            btnWakeUpServer.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Membangunkan...';
        }
        updateWidgetStatus('loading', 'Membangunkan...');

        for (let i = 0; i < 15; i++) {
            const isOnline = await checkServerConnection(true);
            if (isOnline) break;
            await new Promise(resolve => setTimeout(resolve, 4000));
        }

        if (isWakeUpPolling) {
            isWakeUpPolling = false;
            updateWidgetStatus('offline');
            if (btnWakeUpServer) {
                btnWakeUpServer.disabled = false;
                btnWakeUpServer.innerHTML = '<i class="fas fa-redo"></i> Gagal, Ulangi';
            }
        }
    }

    if (btnWakeUpServer) {
        btnWakeUpServer.addEventListener('click', (e) => {
            e.stopPropagation();
            pollWakeUpServer();
        });
    }

    checkServerConnection();
    setInterval(() => {
        if (!isWakeUpPolling) {
            checkServerConnection();
        }
    }, 30000);
});