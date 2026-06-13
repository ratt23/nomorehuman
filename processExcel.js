const Excel = require('exceljs');
const path = require('path');

function parsePrice(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const strVal = String(val).trim();
  if (!strVal) return null;
  const cleanStr = strVal.replace(/[^\d,-]/g, '').replace(',', '.');
  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? null : parsed;
}

async function processAndDiagnoseSheet(inputPath, mappings, classMap, selectedSheet, filterConfig) {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(inputPath);
  
  const sheet = workbook.getWorksheet(selectedSheet);
  if (!sheet) throw new Error(`Sheet "${selectedSheet}" tidak ditemukan.`);

  const headerRow = sheet.getRow(1);
  const headers = {};
  headerRow.eachCell((cell, col) => { if (cell.text) headers[cell.text.trim()] = col; });

  const colCode = headers[mappings.kode];
  const colName = headers[mappings.nama];
  const colClass = headers[mappings.kelas];
  const colPrice = headers[mappings.harga];
  if (!colCode || !colName || !colClass || !colPrice) throw new Error("Pemetaan kolom tidak valid.");
  
  const useFilter = filterConfig && filterConfig.column && filterConfig.values.length > 0;
  const colFilter = useFilter ? headers[filterConfig.column] : -1;
  const includedValues = useFilter ? filterConfig.values.map(v => v.toUpperCase()) : [];

  const grouped = {};
  const rejectedRowsSample = [];
  const REJECTED_SAMPLE_SIZE = 10;
  let totalRowsRead = 0;
  let totalRowsFiltered = 0;

  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    totalRowsRead++;

    if (useFilter && colFilter !== -1) {
      const cellValue = (row.getCell(colFilter).text || '').trim();
      if (!includedValues.includes(cellValue.toUpperCase())) {
        if (rejectedRowsSample.length < REJECTED_SAMPLE_SIZE) {
            rejectedRowsSample.push({ 
                kode: (row.getCell(colCode).text || '').trim(), 
                nama: (row.getCell(colName).text || '').trim(),
                alasan: `Nilai '${cellValue}' tidak cocok filter` 
            });
        }
        totalRowsFiltered++;
        return;
      }
    }

    const code = (row.getCell(colCode).text || '').trim();
    const name = (row.getCell(colName).text || '').trim();
    if (!code || !name) return;

    const kelasFromFile = (row.getCell(colClass).text || '').trim().toUpperCase();
    const price = parsePrice(row.getCell(colPrice).value);
    const key = code + '|' + name;
    if (!grouped[key]) grouped[key] = { code, name };
    const targetCol = classMap[kelasFromFile];
    if (targetCol && targetCol !== 'ignore') grouped[key][targetCol] = price;
  });

  const allAcceptedRows = Object.values(grouped);
  const acceptedRowsSample = allAcceptedRows.slice(0, 10);

  const summary = {
      totalRowsRead,
      totalRowsFiltered,
      totalRowsProcessed: totalRowsRead - totalRowsFiltered,
      uniqueItemCount: allAcceptedRows.length,
  };

  return { summary, rejectedRowsSample, acceptedRowsSample, allAcceptedRows };
}

async function createFinalExcel(rows) {
    const outWb = new Excel.Workbook();
    const outSheet = outWb.addWorksheet('Buku Tarif LAB');
    outSheet.columns = [
        { header: 'Kode', key: 'code', width: 15 }, { header: 'Nama Pemeriksaan', key: 'name', width: 45 },
        { header: 'OPD', key: 'OPD', width: 15, style: { numFmt: '#,##0' } }, { header: 'ED', key: 'ED', width: 15, style: { numFmt: '#,##0' } },
        { header: 'KELAS 3', key: 'KELAS 3', width: 15, style: { numFmt: '#,##0' } }, { header: 'KELAS 2', key: 'KELAS 2', width: 15, style: { numFmt: '#,##0' } },
        { header: 'KELAS 1', key: 'KELAS 1', width: 15, style: { numFmt: '#,##0' } }, { header: 'VIP', key: 'VIP', width: 15, style: { numFmt: '#,##0' } },
        { header: 'VVIP', key: 'VVIP', width: 15, style: { numFmt: '#,##0' } },
    ];
    outSheet.getRow(1).font = { bold: true };
    outSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
    outSheet.addRows(rows);

    const outputDir = path.join(__dirname, 'output');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outFileName = `Buku_Tarif_LAB_${timestamp}.xlsx`;
    const outPath = path.join(outputDir, outFileName);
    await outWb.xlsx.writeFile(outPath);
    return outPath;
}

module.exports = { processAndDiagnoseSheet, createFinalExcel };