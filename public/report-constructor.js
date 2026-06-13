document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('reportConstructorApp')) return;

    const uploadStepDiv = document.getElementById('rcUploadStep');
    const fileInput = document.getElementById('rcFileInput');
    const templateFileInput = document.getElementById('rcTemplateInput');
    const fileNameDisplay = document.getElementById('rcFileName');
    const loadingDiv = document.getElementById('rcLoading');
    const controlPanelDiv = document.getElementById('rcControlPanel');
    const resDiv = document.getElementById('rcRes');
    
    let sourceFile = null;
    let inspectionData = null;
    let currentMappings = [];

    if (typeof setupDragDrop === 'function') {
        setupDragDrop('rcUploadArea', 'rcFileInput');
    }

    fileInput.addEventListener('change', async (e) => {
        if (e.target.files.length === 0) return;
        sourceFile = e.target.files[0];
        fileNameDisplay.textContent = `File terpilih: ${sourceFile.name}`;
        resDiv.innerHTML = '';
        controlPanelDiv.style.display = 'none';
        await inspectInitialFile();
    });

    async function inspectInitialFile() {
        if (!sourceFile) return;

        loadingDiv.style.display = 'block';
        loadingDiv.innerHTML = '<div class="spinner"></div><p>Menginspeksi file sumber...</p>';

        const formData = new FormData();
        formData.append('file', sourceFile);

        try {
            const response = await fetch(window.API_BASE_URL + '/inspect-source-file', { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok || !result.ok) {
                const errMsg = result.error || (result.detail ? (typeof result.detail === 'string' ? result.detail : JSON.stringify(result.detail)) : 'Terjadi kesalahan pada server');
                throw new Error(errMsg);
            }
            
            inspectionData = result;
            buildConstructorPanel();
            
        } catch (err) {
            resDiv.innerHTML = `<div class="report error"><strong>Gagal:</strong> ${err.message}</div>`;
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    function buildConstructorPanel() {
        const firstSheet = inspectionData.sheets[0];
        const sourceHeaders = inspectionData.headersBySheet[firstSheet];
        const detectedRows = inspectionData.detectedHeaderRows[firstSheet];

        const topPanel = document.getElementById('rcTopPanel');
        const workspace = document.getElementById('rcWorkspace');

        topPanel.innerHTML = `
            <div class="setting-item">
                <label for="rcSheetSelect"><i class="fas fa-file-alt"></i> Sheet:</label>
                <select id="rcSheetSelect">
                    ${inspectionData.sheets.map(s => `<option value="${s}" ${s === firstSheet ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
            <div class="setting-item">
                <label for="rcHeaderRowCount"><i class="fas fa-heading"></i> Baris Header:</label>
                <select id="rcHeaderRowCount">
                    <option value="auto">Otomatis (${detectedRows} baris)</option>
                    <option value="1">1 Baris</option>
                    <option value="2">2 Baris</option>
                    <option value="3">3 Baris</option>
                </select>
            </div>
            <div class="setting-item">
                <label for="rcUniqueKeyColumn"><i class="fas fa-key"></i> Kunci Unik:</label>
                <select id="rcUniqueKeyColumn">
                    <option value="">-- Tidak Ada --</option>
                    ${sourceHeaders.map(h => `<option value="${h}">${h}</option>`).join('')}
                </select>
            </div>
        `;

        workspace.innerHTML = `
            <div class="mapping-toolbar">
                <button id="rcClearMappingsBtn" class="btn-link btn-danger"><i class="fas fa-trash"></i> Hapus Semua</button>
                <button id="rcImportStructureBtn" class="btn-link"><i class="fas fa-upload"></i> Impor Struktur</button>
            </div>
            <div id="rcMappingContainer" class="mapping-container"></div>
            <button id="rcAddColumnBtn" class="btn btn-secondary" style="width:100%; margin-top:15px;"><i class="fas fa-plus"></i> Tambah Kolom Baru</button>
        `;

        const headerRowCountSelect = document.getElementById('rcHeaderRowCount');
        const detectedValue = String(detectedRows);
        headerRowCountSelect.value = Array.from(headerRowCountSelect.options).some(opt => opt.value === detectedValue) ? detectedValue : 'auto';

        currentMappings = sourceHeaders.slice(0, 5).map(h => ({
            id: Date.now() + Math.random(),
            outputHeader: h,
            sourceHeader: h
        }));
        renderMappingUI();

        window.convertSelectToPopup('rcSheetSelect', 'Pilih Sheet');
        window.convertSelectToPopup('rcUniqueKeyColumn', 'Pilih Kunci Unik');

        document.getElementById('rcSheetSelect').addEventListener('change', updateConstructorPanel);
        document.getElementById('rcHeaderRowCount').addEventListener('change', reInspectWithNewSettings);
        document.getElementById('rcAddColumnBtn').addEventListener('click', addMappingRow);
        document.getElementById('rcClearMappingsBtn').addEventListener('click', clearAllMappings);
        document.getElementById('rcImportStructureBtn').addEventListener('click', () => templateFileInput.click());
        templateFileInput.addEventListener('change', handleTemplateUpload);
        document.getElementById('rcMappingContainer').addEventListener('click', handleMappingTableClick);
        document.getElementById('rcMappingContainer').addEventListener('input', handleMappingTableInput);
        document.getElementById('rcProcessBtn').addEventListener('click', processReport);
        
        controlPanelDiv.style.display = 'block';
        uploadStepDiv.style.display = 'none';
    }

    function clearAllMappings() {
        if (confirm('Apakah Anda yakin ingin menghapus semua kolom pemetaan?')) {
            currentMappings = [];
            renderMappingUI();
        }
    }

    async function reInspectWithNewSettings() {
        if (!sourceFile) return;
        loadingDiv.style.display = 'block';
        loadingDiv.innerHTML = '<div class="spinner"></div><p>Memuat ulang header...</p>';
        const formData = new FormData();
        formData.append('file', sourceFile);
        const config = {
            headerRowCount: document.getElementById('rcHeaderRowCount').value
        };
        formData.append('config', JSON.stringify(config));
        try {
            const response = await fetch(window.API_BASE_URL + '/inspect-source-file', { method: 'POST', body: formData });
            const result = await response.json();
            if (!response.ok || !result.ok) {
                const errMsg = result.error || (result.detail ? (typeof result.detail === 'string' ? result.detail : JSON.stringify(result.detail)) : 'Terjadi kesalahan pada server');
                throw new Error(errMsg);
            }
            inspectionData = result;
            updateConstructorPanel();
        } catch (err) {
            resDiv.innerHTML = `<div class="report error"><strong>Gagal memuat header:</strong> ${err.message}</div>`;
        } finally {
            loadingDiv.style.display = 'none';
        }
    }
    
    function updateConstructorPanel() {
        const selectedSheet = document.getElementById('rcSheetSelect').value;
        const newHeaders = inspectionData.headersBySheet[selectedSheet] || [];
        const uniqueKeySelect = document.getElementById('rcUniqueKeyColumn');
        uniqueKeySelect.innerHTML = `<option value="">-- Tidak Ada --</option>${newHeaders.map(h => `<option value="${h}">${h}</option>`).join('')}`;
        window.convertSelectToPopup('rcUniqueKeyColumn', 'Pilih Kunci Unik');
        currentMappings = newHeaders.slice(0, 5).map(h => ({
            id: Date.now() + Math.random(),
            outputHeader: h,
            sourceHeader: h
        }));
        renderMappingUI();
    }

    function renderMappingUI() {
        const container = document.getElementById('rcMappingContainer');
        const selectedSheet = document.getElementById('rcSheetSelect')?.value || inspectionData.sheets[0];
        const sourceHeaders = inspectionData.headersBySheet[selectedSheet] || [];

        if (currentMappings.length === 0) {
            container.innerHTML = '<p class="empty-state">Tidak ada kolom. Klik "Tambah Kolom Baru" untuk memulai.</p>';
            return;
        }

        container.innerHTML = `
            <div class="mapping-header">
                <div class="col-output">Nama Kolom di Laporan Anda</div>
                <div class="col-source">Ambil Data Dari Kolom Sumber</div>
                <div class="col-action">Aksi</div>
            </div>
            ${currentMappings.map(mapping => `
                <div class="mapping-row-item" data-id="${mapping.id}">
                    <input type="text" class="mapping-output-header" value="${mapping.outputHeader}" placeholder="Nama Kolom Output">
                    <div class="searchable-dropdown" data-value="${mapping.sourceHeader}">
                        <input type="text" class="search-input" placeholder="Ketik untuk mencari..." value="${mapping.sourceHeader}">
                        <div class="dropdown-options">
                            ${sourceHeaders.map(h => `<div class="option" data-value="${h}">${h}</div>`).join('')}
                        </div>
                    </div>
                    <button class="btn-delete-mapping"><i class="fas fa-trash-alt"></i></button>
                </div>
            `).join('')}
        `;
    }

    async function handleTemplateUpload(e) {
        if (e.target.files.length === 0) return;
        const templateFile = e.target.files[0];
        loadingDiv.style.display = 'block';
        loadingDiv.innerHTML = '<div class="spinner"></div><p>Membaca struktur template...</p>';
        const formData = new FormData();
        formData.append('templateFile', templateFile);
        try {
            const response = await fetch(window.API_BASE_URL + '/inspect-template', { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.ok) throw new Error(result.error);
            currentMappings = result.headers.map(header => ({
                id: Date.now() + Math.random(),
                outputHeader: header,
                sourceHeader: ''
            }));
            const selectedSheet = document.getElementById('rcSheetSelect').value;
            const sourceHeaders = inspectionData.headersBySheet[selectedSheet];
            currentMappings.forEach(mapping => {
                const bestMatch = sourceHeaders.find(sh => sh.toLowerCase().includes(mapping.outputHeader.toLowerCase()));
                if (bestMatch) {
                    mapping.sourceHeader = bestMatch;
                }
            });
            renderMappingUI();
        } catch (err) {
            alert(`Gagal membaca template: ${err.message}`);
        } finally {
            loadingDiv.style.display = 'none';
            e.target.value = null;
        }
    }

    function addMappingRow() {
        currentMappings.push({
            id: Date.now() + Math.random(),
            outputHeader: '',
            sourceHeader: ''
        });
        renderMappingUI();
    }
    
    function handleMappingTableClick(e) {
        const deleteButton = e.target.closest('.btn-delete-mapping');
        if (deleteButton) {
            const rowElement = deleteButton.closest('.mapping-row-item');
            const id = parseFloat(rowElement.dataset.id);
            currentMappings = currentMappings.filter(m => m.id !== id);
            renderMappingUI();
            return;
        }

        const option = e.target.closest('.option');
        if (option) {
            const dropdown = option.closest('.searchable-dropdown');
            const searchInput = dropdown.querySelector('.search-input');
            const value = option.dataset.value;
            
            searchInput.value = value;
            dropdown.dataset.value = value;
            dropdown.classList.remove('open');
            
            const rowElement = dropdown.closest('.mapping-row-item');
            const id = parseFloat(rowElement.dataset.id);
            const mapping = currentMappings.find(m => m.id === id);
            if (mapping) {
                mapping.sourceHeader = value;
            }
            return;
        }

        const searchInput = e.target.closest('.search-input');
        if (searchInput) {
            document.querySelectorAll('.searchable-dropdown').forEach(d => d.classList.remove('open'));
            searchInput.closest('.searchable-dropdown').classList.add('open');
        } else {
            document.querySelectorAll('.searchable-dropdown').forEach(d => d.classList.remove('open'));
        }
    }

    function handleMappingTableInput(e) {
        const rowElement = e.target.closest('.mapping-row-item');
        if (!rowElement) return;
        
        const id = parseFloat(rowElement.dataset.id);
        const mapping = currentMappings.find(m => m.id === id);
        if (!mapping) return;

        if (e.target.classList.contains('mapping-output-header')) {
            mapping.outputHeader = e.target.value;
        }
        
        if (e.target.classList.contains('search-input')) {
            const dropdown = e.target.closest('.searchable-dropdown');
            const filter = e.target.value.toLowerCase();
            const options = dropdown.querySelectorAll('.option');
            options.forEach(option => {
                const text = option.textContent.toLowerCase();
                if (text.includes(filter)) {
                    option.style.display = '';
                } else {
                    option.style.display = 'none';
                }
            });
        }
    }

    async function processReport() {
        const processBtn = document.getElementById('rcProcessBtn');
        toggleButtonLoading(processBtn, true);
        loadingDiv.style.display = 'block';
        loadingDiv.innerHTML = '<div class="spinner"></div><p>Membangun laporan kustom...</p>';
        controlPanelDiv.style.display = 'none';

        const selectedSheet = document.getElementById('rcSheetSelect').value;
        const headerRowCountValue = document.getElementById('rcHeaderRowCount').value;

        const config = {
            selectedSheet: selectedSheet,
            headerRowCount: headerRowCountValue === 'auto' 
                ? inspectionData.detectedHeaderRows[selectedSheet] 
                : parseInt(headerRowCountValue),
            uniqueKeyColumn: document.getElementById('rcUniqueKeyColumn').value,
            mappings: currentMappings.filter(m => m.outputHeader && m.sourceHeader)
        };

        const formData = new FormData();
        formData.append('file', sourceFile);
        formData.append('config', JSON.stringify(config));

        try {
            const response = await fetch(window.API_BASE_URL + '/build-report', { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.ok) throw new Error(result.error);
            
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const excelHref = isLocal ? (window.API_BASE_URL + result.excel) : `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.excelData}`;

            resDiv.innerHTML = `
                <div class="report-dashboard">
                    <div class="report-icon success"><i class="fas fa-check-circle"></i></div>
                    <h3>Laporan Berhasil Dibuat!</h3>
                    <p>File Anda telah berhasil dibuat dengan ${result.diagnostics.rowsAdded} baris data.</p>
                    <div class="download-actions">
                      <a href="${excelHref}" download="${result.excelFilename}" target="_blank" class="btn btn-primary"><i class="fas fa-file-excel"></i> Unduh Laporan Excel</a>
                    </div>
                    <hr>
                    <button id="rcProcessNewBtn" class="btn btn-secondary"><i class="fas fa-redo"></i> Buat Laporan Baru</button>
                </div>`;
            
            document.getElementById('rcProcessNewBtn').addEventListener('click', () => {
                resDiv.innerHTML = '';
                controlPanelDiv.innerHTML = '';
                controlPanelDiv.style.display = 'none';
                uploadStepDiv.style.display = 'block';
                fileNameDisplay.textContent = 'Belum ada file dipilih';
                fileInput.value = '';
                sourceFile = null;
            });

        } catch (err) {
            resDiv.innerHTML = `<div class="report error"><strong>Gagal membangun laporan:</strong> ${err.message}</div>`;
        } finally {
            loadingDiv.style.display = 'none';
            toggleButtonLoading(processBtn, false);
        }
    }
});