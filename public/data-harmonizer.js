function initDataHarmonizer() {
    const viewDiv = document.getElementById('harmonizerApp');
    if (!viewDiv) return;

    const mainFileInput = document.getElementById('harmonizerMainFile');
    const dictFileInput = document.getElementById('harmonizerDictFile');
    const mainFileNameDisplay = document.getElementById('harmonizerMainFileName');
    const dictFileNameDisplay = document.getElementById('harmonizerDictFileName');
    const nextStepBtn = document.getElementById('harmonizerInspectBtn');
    const nextStepContainer = document.getElementById('harmonizerNextStepContainer');
    const uploadStep = document.getElementById('harmonizerUploadStep');
    const loadingDiv = document.getElementById('harmonizerLoading');
    const controlPanel = document.getElementById('harmonizerControlPanel');
    const resDiv = document.getElementById('harmonizerRes');
    const processBtn = document.getElementById('harmonizerProcessBtn');

    let mainFile = null;
    let dictFile = null;
    let inspectionData = null;
    let updateMappings = []; // Array of { id, mainCol, dictCol }

    if (typeof setupDragDrop === 'function') {
        setupDragDrop('harmonizerUploadAreaMain', 'harmonizerMainFile');
        setupDragDrop('harmonizerUploadAreaDict', 'harmonizerDictFile');
    }

    const checkUploads = () => {
        if (mainFile && dictFile) {
            nextStepContainer.style.display = 'block';
        } else {
            nextStepContainer.style.display = 'none';
        }
    };

    mainFileInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;
        mainFile = e.target.files[0];
        mainFileNameDisplay.textContent = `File terpilih: ${mainFile.name}`;
        resDiv.innerHTML = '';
        checkUploads();
    });

    dictFileInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;
        dictFile = e.target.files[0];
        dictFileNameDisplay.textContent = `File terpilih: ${dictFile.name}`;
        resDiv.innerHTML = '';
        checkUploads();
    });

    nextStepBtn.addEventListener('click', async () => {
        loadingDiv.style.display = 'block';
        loadingDiv.innerHTML = '<div class="loading-modal-card"><div class="spinner"></div><p>Menginspeksi berkas...</p></div>';
        controlPanel.style.display = 'none';
        resDiv.innerHTML = '';

        const formData = new FormData();
        formData.append('mainFile', mainFile);
        formData.append('dictFile', dictFile);

        try {
            const response = await fetch(window.API_BASE_URL + '/harmonizer-inspect', { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.ok) throw new Error(result.error);

            inspectionData = result;
            buildControlPanel();
            uploadStep.style.display = 'none';
        } catch (err) {
            resDiv.innerHTML = `<div class="report error"><strong>Gagal membaca berkas:</strong> ${err.message}</div>`;
        } finally {
            loadingDiv.style.display = 'none';
        }
    });

    const mainSheetSelect = document.getElementById('harmonizerMainSheetSelect');
    const dictSheetSelect = document.getElementById('harmonizerDictSheetSelect');
    const matchBasisSelect = document.getElementById('harmonizerMatchBasis');
    const keyColumnsWrapper = document.getElementById('harmonizerKeyColumnsWrapper');
    const sortColumnSelect = document.getElementById('harmonizerSortColumn');
    const addMappingBtn = document.getElementById('harmonizerAddMappingBtn');
    const mappingContainer = document.getElementById('harmonizerMappingContainer');

    function buildControlPanel() {
        mainSheetSelect.innerHTML = inspectionData.mainSheets.map(s => `<option value="${s}">${s}</option>`).join('');
        dictSheetSelect.innerHTML = inspectionData.dictSheets.map(s => `<option value="${s}">${s}</option>`).join('');

        mainSheetSelect.onchange = () => {
            renderKeyColumns();
            renderMappings();
            renderSortColumns();
        };
        dictSheetSelect.onchange = () => {
            renderKeyColumns();
            renderMappings();
        };
        matchBasisSelect.onchange = () => {
            renderKeyColumns();
        };

        window.convertSelectToPopup('harmonizerMainSheetSelect', 'Pilih Sheet Berkas Utama');
        window.convertSelectToPopup('harmonizerDictSheetSelect', 'Pilih Sheet Berkas Kamus');
        window.convertSelectToPopup('harmonizerMatchBasis', 'Pilih Dasar Pencocokan');

        renderKeyColumns();
        updateMappings = [];
        renderMappings();
        renderSortColumns();

        controlPanel.style.display = 'block';
    }

    function renderKeyColumns() {
        const mainSheet = mainSheetSelect.value;
        const dictSheet = dictSheetSelect.value;
        const mainHeaders = inspectionData.mainHeadersBySheet[mainSheet] || [];
        const dictHeaders = inspectionData.dictHeadersBySheet[dictSheet] || [];
        const basis = matchBasisSelect.value;

        if (basis === 'both') {
            keyColumnsWrapper.innerHTML = `
                <div class="form-row">
                    <label for="harmonizerMainKey1">Kolom Kode (Berkas Utama)</label>
                    <select id="harmonizerMainKey1">${mainHeaders.map(h => `<option value="${h}">${h}</option>`).join('')}</select>
                </div>
                <div class="form-row">
                    <label for="harmonizerDictKey1">Kolom Kode (Berkas Kamus)</label>
                    <select id="harmonizerDictKey1">${dictHeaders.map(h => `<option value="${h}">${h}</option>`).join('')}</select>
                </div>
                <div class="form-row">
                    <label for="harmonizerMainKey2">Kolom Nama (Berkas Utama)</label>
                    <select id="harmonizerMainKey2">${mainHeaders.map(h => `<option value="${h}">${h}</option>`).join('')}</select>
                </div>
                <div class="form-row">
                    <label for="harmonizerDictKey2">Kolom Nama (Berkas Kamus)</label>
                    <select id="harmonizerDictKey2">${dictHeaders.map(h => `<option value="${h}">${h}</option>`).join('')}</select>
                </div>
            `;
            window.convertSelectToPopup('harmonizerMainKey1', 'Pilih Kolom Kode Utama');
            window.convertSelectToPopup('harmonizerDictKey1', 'Pilih Kolom Kode Kamus');
            window.convertSelectToPopup('harmonizerMainKey2', 'Pilih Kolom Nama Utama');
            window.convertSelectToPopup('harmonizerDictKey2', 'Pilih Kolom Nama Kamus');
        } else {
            const keyLabel = basis === 'code' ? 'Kode' : 'Nama';
            keyColumnsWrapper.innerHTML = `
                <div class="form-row">
                    <label for="harmonizerMainKey">Kolom ${keyLabel} (Berkas Utama)</label>
                    <select id="harmonizerMainKey">${mainHeaders.map(h => `<option value="${h}">${h}</option>`).join('')}</select>
                </div>
                <div class="form-row">
                    <label for="harmonizerDictKey">Kolom ${keyLabel} (Berkas Kamus)</label>
                    <select id="harmonizerDictKey">${dictHeaders.map(h => `<option value="${h}">${h}</option>`).join('')}</select>
                </div>
            `;
            window.convertSelectToPopup('harmonizerMainKey', `Pilih Kolom ${keyLabel} Utama`);
            window.convertSelectToPopup('harmonizerDictKey', `Pilih Kolom ${keyLabel} Kamus`);
        }
    }

    function renderMappings() {
        const mainSheet = mainSheetSelect.value;
        const dictSheet = dictSheetSelect.value;
        const mainHeaders = inspectionData.mainHeadersBySheet[mainSheet] || [];
        const dictHeaders = inspectionData.dictHeadersBySheet[dictSheet] || [];

        if (updateMappings.length === 0) {
            mappingContainer.innerHTML = '<p style="text-align:center; padding: 15px; color: var(--text-secondary); font-size: 0.85rem; margin:0;">Belum ada aturan pembaruan kolom yang ditambahkan.</p>';
            return;
        }

        mappingContainer.innerHTML = `
            <div class="mapping-header">
                <div class="col-output">Kolom Target (Berkas Utama)</div>
                <div class="col-source">Ambil Nilai Baru Dari (Berkas Kamus)</div>
                <div class="col-action">Aksi</div>
            </div>
            ${updateMappings.map(mapping => `
                <div class="mapping-row-item" data-id="${mapping.id}">
                    <select class="main-col-select" data-id="${mapping.id}">
                        ${mainHeaders.map(h => `<option value="${h}" ${h === mapping.mainCol ? 'selected' : ''}>${h}</option>`).join('')}
                    </select>
                    <select class="dict-col-select" data-id="${mapping.id}">
                        ${dictHeaders.map(h => `<option value="${h}" ${h === mapping.dictCol ? 'selected' : ''}>${h}</option>`).join('')}
                    </select>
                    <button type="button" class="btn-delete-mapping" data-id="${mapping.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            `).join('')}
        `;

        updateMappings.forEach(mapping => {
            window.convertSelectToPopup(`select.main-col-select[data-id="${mapping.id}"]`, 'Pilih Kolom Target');
            window.convertSelectToPopup(`select.dict-col-select[data-id="${mapping.id}"]`, 'Pilih Kolom Kamus Sumber');
        });

        mappingContainer.querySelectorAll('.btn-delete-mapping').forEach(btn => {
            btn.onclick = () => {
                const id = parseFloat(btn.dataset.id);
                updateMappings = updateMappings.filter(m => m.id !== id);
                renderMappings();
            };
        });

        mappingContainer.querySelectorAll('.main-col-select').forEach(sel => {
            sel.onchange = (e) => {
                const id = parseFloat(sel.dataset.id);
                const mapping = updateMappings.find(m => m.id === id);
                if (mapping) mapping.mainCol = e.target.value;
            };
        });
        mappingContainer.querySelectorAll('.dict-col-select').forEach(sel => {
            sel.onchange = (e) => {
                const id = parseFloat(sel.dataset.id);
                const mapping = updateMappings.find(m => m.id === id);
                if (mapping) mapping.dictCol = e.target.value;
            };
        });
    }

    function renderSortColumns() {
        const mainSheet = mainSheetSelect.value;
        const mainHeaders = inspectionData.mainHeadersBySheet[mainSheet] || [];
        sortColumnSelect.innerHTML = `<option value="">-- Tanpa Pengurutan --</option>` + mainHeaders.map(h => `<option value="${h}">${h}</option>`).join('');
        window.convertSelectToPopup('harmonizerSortColumn', 'Pilih Kolom Pengurutan');
        window.convertSelectToPopup('harmonizerSortOrder', 'Pilih Arah Urutan');
    }

    addMappingBtn.onclick = () => {
        const mainSheet = mainSheetSelect.value;
        const dictSheet = dictSheetSelect.value;
        const mainHeaders = inspectionData.mainHeadersBySheet[mainSheet] || [];
        const dictHeaders = inspectionData.dictHeadersBySheet[dictSheet] || [];

        updateMappings.push({
            id: Date.now() + Math.random(),
            mainCol: mainHeaders[0] || '',
            dictCol: dictHeaders[0] || ''
        });
        renderMappings();
    };

    processBtn.onclick = async () => {
        toggleButtonLoading(processBtn, true);
        loadingDiv.style.display = 'block';
        loadingDiv.innerHTML = '<div class="loading-modal-card"><div class="spinner"></div><p>Menyelaraskan berkas...</p></div>';
        controlPanel.style.display = 'none';

        const basis = matchBasisSelect.value;
        const keys = {};
        if (basis === 'both') {
            keys.mainKey1 = document.getElementById('harmonizerMainKey1').value;
            keys.dictKey1 = document.getElementById('harmonizerDictKey1').value;
            keys.mainKey2 = document.getElementById('harmonizerMainKey2').value;
            keys.dictKey2 = document.getElementById('harmonizerDictKey2').value;
        } else {
            keys.mainKey = document.getElementById('harmonizerMainKey').value;
            keys.dictKey = document.getElementById('harmonizerDictKey').value;
        }

        const config = {
            mainSheet: mainSheetSelect.value,
            dictSheet: dictSheetSelect.value,
            matchBasis: basis,
            keys: keys,
            priceColumns: document.getElementById('harmonizerPriceColumns').value.split(',').map(s => s.trim()).filter(Boolean),
            highlightChanges: document.getElementById('harmonizerHighlightChanges').checked,
            deleteMatched: document.getElementById('harmonizerDeleteMatched').checked,
            mappings: updateMappings.map(m => ({ mainCol: m.mainCol, dictCol: m.dictCol })),
            sortColumn: sortColumnSelect.value,
            sortOrder: document.getElementById('harmonizerSortOrder').value
        };

        const formData = new FormData();
        formData.append('mainFile', mainFile);
        formData.append('dictFile', dictFile);
        formData.append('config', JSON.stringify(config));

        try {
            const response = await fetch(window.API_BASE_URL + '/harmonizer-process', { method: 'POST', body: formData });
            const result = await response.json();
            if (!result.ok) throw new Error(result.error);

            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const excelHref = isLocal ? (window.API_BASE_URL + result.excel) : `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.excelData}`;

            resDiv.innerHTML = `
                <div class="report-dashboard">
                    <div class="report-icon success"><i class="fas fa-check-circle"></i></div>
                    <h3>Penyelarasan Berhasil!</h3>
                    <p>Berkas hasil penyelarasan telah selesai diproses.</p>
                    <ul style="text-align: left; max-width: 400px; margin: 15px auto; font-size: 0.85rem; color: var(--text-secondary);">
                        <li>Baris diproses: <strong>${result.diagnostics.rowsProcessed}</strong></li>
                        <li>Baris diperbarui: <strong>${result.diagnostics.rowsUpdated}</strong></li>
                        <li>Baris dihapus: <strong>${result.diagnostics.rowsDeleted}</strong></li>
                    </ul>
                    <div class="download-actions">
                      <a href="${excelHref}" download="${result.excelFilename}" target="_blank" class="btn btn-primary"><i class="fas fa-file-excel"></i> Unduh Berkas Hasil</a>
                    </div>
                    <hr>
                    <button id="harmonizerResetBtn" class="btn btn-secondary"><i class="fas fa-redo"></i> Selaraskan Berkas Baru</button>
                </div>
            `;

            document.getElementById('harmonizerResetBtn').onclick = () => {
                resDiv.innerHTML = '';
                uploadStep.style.display = 'block';
                controlPanel.style.display = 'none';
                mainFile = null;
                dictFile = null;
                mainFileNameDisplay.textContent = 'Belum ada file terpilih';
                dictFileNameDisplay.textContent = 'Belum ada file terpilih';
                mainFileInput.value = null;
                dictFileInput.value = null;
                checkUploads();
            };

        } catch (err) {
            resDiv.innerHTML = `<div class="report error"><strong>Gagal memproses penyelarasan:</strong> ${err.message}</div>`;
            controlPanel.style.display = 'block';
        } finally {
            loadingDiv.style.display = 'none';
            toggleButtonLoading(processBtn, false);
        }
    };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDataHarmonizer);
} else {
    initDataHarmonizer();
}
