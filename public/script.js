// --- DYNAMIC API BASE URL RESOLVER ---
const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
window.API_BASE_URL = isLocalHost ? '' : 'https://no-more-human-api.onrender.com';

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
});