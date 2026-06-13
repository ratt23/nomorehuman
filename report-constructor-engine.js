const Excel = require('exceljs');
const path = require('path');

function getCombinedHeaders(sheet, headerRowCount) {
    if (headerRowCount <= 0) return [];
    if (headerRowCount === 1) {
        const headers = [];
        sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
            headers.push(cell.text.trim() || `Kolom_${colNumber}`);
        });
        return headers;
    }
    const headerMatrix = [];
    for (let i = 1; i <= headerRowCount; i++) {
        const rowValues = [];
        const row = sheet.getRow(i);
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            rowValues[colNumber - 1] = cell.text.trim();
        });
        headerMatrix.push(rowValues);
    }
    const finalHeaders = [];
    const numCols = headerMatrix[headerMatrix.length - 1].length;
    for (let c = 0; c < numCols; c++) {
        let context = '';
        const headerParts = [];
        for (let r = 0; r < headerRowCount; r++) {
            const cellValue = headerMatrix[r][c];
            if (cellValue) {
                context = cellValue;
            }
            if (r === headerRowCount - 1 || (headerMatrix[r+1] && headerMatrix[r+1][c])) {
                 if (context && !headerParts.includes(context)) {
                    headerParts.push(context);
                }
            }
        }
        const finalHeader = headerParts.join(' - ');
        finalHeaders.push(finalHeader || `Kolom_${c + 1}`);
    }
    return finalHeaders;
}

async function inspectSourceFile(filePath, config = { headerRowCount: 'auto' }) {
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(filePath);
    const result = { sheets: [], headersBySheet: {}, detectedHeaderRows: {} };
    for (const sheet of workbook.worksheets) {
        if (sheet.rowCount < 1) continue;
        result.sheets.push(sheet.name);
        let headerRowCount = 1;
        if (config.headerRowCount === 'auto') {
            const row1 = sheet.getRow(1);
            const row2 = sheet.getRow(2);
            let row1HasMerge = false;
            let row2HasMerge = false;
            for (let i = 1; i <= row1.cellCount; i++) { if (row1.getCell(i).isMerged) { row1HasMerge = true; break; } }
            for (let i = 1; i <= row2.cellCount; i++) { if (row2.getCell(i).isMerged) { row2HasMerge = true; break; } }
            if (row1HasMerge && row2HasMerge) {
                headerRowCount = 3;
            } else if (row1HasMerge) {
                headerRowCount = 2;
            }
        } else {
            headerRowCount = parseInt(config.headerRowCount, 10);
        }
        result.detectedHeaderRows[sheet.name] = headerRowCount;
        result.headersBySheet[sheet.name] = getCombinedHeaders(sheet, headerRowCount);
    }
    if (result.sheets.length === 0) {
        throw new Error("File Excel tidak berisi sheet yang valid atau kosong.");
    }
    return result;
}

// FUNGSI BARU UNTUK MEMBACA HEADER DARI TEMPLATE
async function inspectTemplateFile(filePath) {
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
        throw new Error("File template tidak valid atau tidak berisi sheet.");
    }

    const headers = [];
    // Hanya baca baris pertama, abaikan sel kosong
    sheet.getRow(1).eachCell({ includeEmpty: false }, (cell) => {
        const headerText = cell.text.trim();
        if (headerText) {
            headers.push(headerText);
        }
    });

    if (headers.length === 0) {
        throw new Error("Template tidak berisi header di baris pertama.");
    }

    return headers;
}


async function buildReport(filePath, config) {
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sourceSheet = workbook.getWorksheet(config.selectedSheet);
    if (!sourceSheet) throw new Error(`Sheet "${config.selectedSheet}" tidak ditemukan.`);

    const sourceHeaders = getCombinedHeaders(sourceSheet, config.headerRowCount);

    const outWb = new Excel.Workbook();
    const outSheet = outWb.addWorksheet('Rekap Laporan');

    const outputHeadersConfig = config.mappings.map(m => ({
        header: m.outputHeader,
        key: m.outputHeader, // Kunci harus unik
        width: 25
    }));
    outSheet.columns = outputHeadersConfig;
    outSheet.getRow(1).font = { bold: true };

    const uniqueKeySet = new Set();
    const diagnostics = {
        totalRowsRead: 0,
        rowsAdded: 0,
        rowsSkipped_DuplicateKey: 0,
    };

    sourceSheet.eachRow((row, rowNumber) => {
        if (rowNumber <= config.headerRowCount) return; // Lewati baris header

        diagnostics.totalRowsRead++;

        if (config.uniqueKeyColumn) {
            const keyCellIndex = sourceHeaders.indexOf(config.uniqueKeyColumn) + 1;
            const keyValue = row.getCell(keyCellIndex).text;
            if (keyValue && uniqueKeySet.has(keyValue)) {
                diagnostics.rowsSkipped_DuplicateKey++;
                return; // Lewati baris ini jika kunci sudah ada
            }
            if (keyValue) uniqueKeySet.add(keyValue);
        }

        const newRow = {};
        let rowHasData = false;
        config.mappings.forEach(mapping => {
            const sourceCellIndex = sourceHeaders.indexOf(mapping.sourceHeader) + 1;
            if (sourceCellIndex > 0) {
                const cell = row.getCell(sourceCellIndex);
                let value = null;
                if (cell.type === Excel.ValueType.Number || cell.type === Excel.ValueType.Date) {
                    value = cell.value;
                } else {
                    value = cell.text;
                }
                newRow[mapping.outputHeader] = value;
                if(value !== null && value !== '') rowHasData = true;
            }
        });
        
        if(rowHasData) {
            outSheet.addRow(newRow);
        }
    });
    
    diagnostics.rowsAdded = outSheet.rowCount - 1;

    const outputDir = path.join(__dirname, 'output');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outFileName = `Laporan_Kustom_${timestamp}.xlsx`;
    const outPath = path.join(outputDir, outFileName);
    
    await outWb.xlsx.writeFile(outPath);

    return {
        resultPath: outPath,
        diagnostics
    };
}

module.exports = {
    inspectSourceFile,
    buildReport,
    inspectTemplateFile // Ekspor fungsi baru
};