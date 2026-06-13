import os
import shutil
import json
import re
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from openpyxl import load_workbook

# Import modules
from process_excel import process_and_diagnose_sheet, create_final_excel, parse_price
from generate_pdf import generate_pdf_from_data
import report_constructor_engine
import vlookup_processor
import validate_excel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="no more human!! Backend")

# Enable CORS for hybrid deploy (allows Netlify frontend to communicate with Render backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "output"

for d in [UPLOAD_DIR, OUTPUT_DIR, "public"]:
    os.makedirs(d, exist_ok=True)

def validate_excel_mime(file: UploadFile):
    allowed_extensions = ['.xlsx', '.xls']
    _, ext = os.path.splitext(file.filename)
    if ext.lower() not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Format file tidak valid. Aplikasi hanya menerima file Excel (.xlsx, .xls), bukan {file.filename}."
        )

# Helper function for temporary file handling
def save_temp_file(file: UploadFile) -> str:
    temp_path = os.path.join(UPLOAD_DIR, f"{int(datetime.now().timestamp())}_{file.filename}")
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return temp_path

def delete_file(path: str):
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception:
            pass

@app.post("/inspect-file")
async def inspect_file(file: UploadFile = File(...)):
    validate_excel_mime(file)
    temp_path = save_temp_file(file)
    try:
        wb = load_workbook(temp_path, read_only=True)
        inspection_data = {}
        MAX_ROWS_TO_INSPECT = 5000
        
        for sheet in wb.worksheets:
            # Check row count
            if sheet.max_row is not None and sheet.max_row <= 1:
                continue
            
            # Load normal workbook for each sheet (to read values safely)
            # Actually, read_only workbook works too
            headers_with_col = []
            unique_values_per_column = {}
            
            # Get headers from first row
            header_row = [cell.value for cell in next(sheet.iter_rows(max_row=1))]
            for col_num, val in enumerate(header_row, 1):
                if val is not None:
                    header_text = str(val).strip()
                    if header_text:
                        headers_with_col.append({'text': header_text, 'col': col_num})
                        unique_values_per_column[header_text] = set()
            
            rows_inspected = 0
            for row in sheet.iter_rows(min_row=2):
                if rows_inspected >= MAX_ROWS_TO_INSPECT:
                    break
                
                # Collect values
                for h_info in headers_with_col:
                    col_idx = h_info['col']
                    cell_val = row[col_idx - 1].value
                    if cell_val is not None:
                        val_str = str(cell_val).strip()
                        if val_str:
                            unique_values_per_column[h_info['text']].add(val_str)
                rows_inspected += 1
                
            # Convert sets to sorted lists
            formatted_unique = {}
            for header, val_set in unique_values_per_column.items():
                formatted_unique[header] = sorted(list(val_set))
                
            inspection_data[sheet.title] = {
                'headers': [h['text'] for h in headers_with_col],
                'uniqueValuesPerColumn': formatted_unique
            }
        
        wb.close()
        return {'ok': True, 'sheets': inspection_data}
    except Exception as e:
        return JSONResponse(status_code=400, content={'ok': False, 'error': str(e)})
    finally:
        delete_file(temp_path)

@app.post("/process-file")
async def process_file(
    file: UploadFile = File(...),
    mappings: str = Form(...),
    classMap: str = Form(...),
    sheet: str = Form(...),
    filterConfig: str = Form(...)
):
    validate_excel_mime(file)
    temp_path = save_temp_file(file)
    try:
        mappings_data = json.loads(mappings)
        class_map_data = json.loads(classMap)
        filter_config_data = json.loads(filterConfig)
        
        res = process_and_diagnose_sheet(
            temp_path, mappings_data, class_map_data, sheet, filter_config_data
        )
        
        all_accepted_rows = res['allAcceptedRows']
        if len(all_accepted_rows) == 0:
            raise Exception("Tidak ada data yang diproses setelah filter diterapkan.")
            
        final_xlsx_path = create_final_excel(all_accepted_rows, OUTPUT_DIR)
        pdf_path = final_xlsx_path.replace('.xlsx', '.pdf')
        
        generate_pdf_from_data(all_accepted_rows, pdf_path)
        
        return {
            'ok': True,
            'message': 'File berhasil diproses!',
            'excel': f"/output/{os.path.basename(final_xlsx_path)}",
            'pdf': f"/output/{os.path.basename(pdf_path)}",
            'diagnostics': {
                'summary': res['summary'],
                'rejectedRowsSample': res['rejectedRowsSample'],
                'acceptedRowsSample': res['acceptedRowsSample']
            }
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={'ok': False, 'error': str(e)})
    finally:
        delete_file(temp_path)

def compare_files(original_path, processed_path, mappings, class_map, selected_sheet):
    original_wb = load_workbook(original_path, data_only=True)
    processed_wb = load_workbook(processed_path, data_only=True)
    
    if selected_sheet not in original_wb.sheetnames:
        raise Exception(f'Sheet "{selected_sheet}" tidak ditemukan di file original')
        
    original_sheet = original_wb[selected_sheet]
    processed_sheet = processed_wb.worksheets[0]
    
    results = {
        'summary': { 'itemsCompared': 0, 'priceMatches': 0, 'priceMismatches': 0 },
        'priceComparison': []
    }
    
    original_headers = {}
    original_header_row = [cell.value for cell in next(original_sheet.iter_rows(max_row=1))]
    for col_idx, val in enumerate(original_header_row, 1):
        if val is not None:
            original_headers[str(val).strip()] = col_idx
            
    col_code = original_headers.get(mappings.get('kode'))
    col_name = original_headers.get(mappings.get('nama'))
    col_class = original_headers.get(mappings.get('kelas'))
    col_price = original_headers.get(mappings.get('harga'))
    
    if not all([col_code, col_name, col_class, col_price]):
        raise Exception('Mapping kolom tidak valid untuk file original')
        
    processed_headers = {}
    processed_header_row = [cell.value for cell in next(processed_sheet.iter_rows(max_row=1))]
    for col_idx, val in enumerate(processed_header_row, 1):
        if val is not None:
            processed_headers[str(val).strip()] = col_idx
            
    class_columns = ['OPD', 'ED', 'KELAS 3', 'KELAS 2', 'KELAS 1', 'VIP', 'VVIP']
    class_to_column_map = {}
    for class_name in class_columns:
        class_to_column_map[class_name] = processed_headers.get(class_name)
        
    original_data_map = {}
    
    for row_num in range(2, original_sheet.max_row + 1):
        code_val = original_sheet.cell(row=row_num, column=col_code).value
        name_val = original_sheet.cell(row=row_num, column=col_name).value
        code = str(code_val).strip() if code_val is not None else ''
        name = str(name_val).strip() if name_val is not None else ''
        if not code or not name:
            continue
            
        kelas_val = original_sheet.cell(row=row_num, column=col_class).value
        kelas = str(kelas_val).strip().upper() if kelas_val is not None else ''
        price = parse_price(original_sheet.cell(row=row_num, column=col_price).value)
        
        key = f"{code}|{name}".upper()
        if key not in original_data_map:
            original_data_map[key] = { 'code': code, 'name': name, 'prices': {} }
            
        target_class = class_map.get(kelas, kelas)
        if target_class and target_class != 'ignore':
            original_data_map[key]['prices'][target_class] = price
            
    code_proc_col = processed_headers.get('Kode')
    name_proc_col = processed_headers.get('Nama Pemeriksaan')
    
    if not code_proc_col or not name_proc_col:
        raise Exception('Kolom "Kode" atau "Nama Pemeriksaan" tidak ditemukan di file processed')
        
    for row_num in range(2, processed_sheet.max_row + 1):
        proc_code_val = processed_sheet.cell(row=row_num, column=code_proc_col).value
        proc_name_val = processed_sheet.cell(row=row_num, column=name_proc_col).value
        processed_code = str(proc_code_val).strip() if proc_code_val is not None else ''
        processed_name = str(proc_name_val).strip() if proc_name_val is not None else ''
        
        if not processed_code or not processed_name:
            continue
            
        key = f"{processed_code}|{processed_name}".upper()
        original_item = original_data_map.get(key)
        
        if not original_item:
            results['priceComparison'].append({
                'code': processed_code,
                'name': processed_name,
                'status': 'NOT_FOUND',
                'message': 'Item tidak ditemukan di file original'
            })
            continue
            
        results['summary']['itemsCompared'] += 1
        comparison = {
            'code': processed_code,
            'name': processed_name,
            'status': 'MATCH',
            'details': []
        }
        
        all_match = True
        for class_name in class_columns:
            proc_col_idx = class_to_column_map.get(class_name)
            if not proc_col_idx:
                continue
                
            processed_price = parse_price(processed_sheet.cell(row=row_num, column=proc_col_idx).value)
            original_price = original_item['prices'].get(class_name)
            
            is_match = processed_price == original_price
            comparison['details'].append({
                'class': class_name,
                'originalPrice': original_price,
                'processedPrice': processed_price,
                'match': is_match
            })
            
            if not is_match:
                all_match = False
                
        if all_match:
            comparison['status'] = 'MATCH'
            results['summary']['priceMatches'] += 1
        else:
            comparison['status'] = 'MISMATCH'
            results['summary']['priceMismatches'] += 1
            
        results['priceComparison'].append(comparison)
        
    items_compared = results['summary']['itemsCompared']
    results['summary']['matchPercentage'] = (results['summary']['priceMatches'] / items_compared * 100) if items_compared > 0 else 0
    
    original_wb.close()
    processed_wb.close()
    return results

@app.post("/double-check-tarif")
async def double_check_tarif(
    originalFile: UploadFile = File(...),
    processedFile: UploadFile = File(...),
    mappings: str = Form(...),
    classMap: str = Form(...),
    selectedSheet: str = Form(...)
):
    orig_path = save_temp_file(originalFile)
    proc_path = save_temp_file(processedFile)
    try:
        mappings_data = json.loads(mappings)
        class_map_data = json.loads(classMap)
        
        comparison = compare_files(
            orig_path, proc_path, mappings_data, class_map_data, selectedSheet
        )
        return {'ok': True, 'message': 'Double check harga selesai!', 'comparison': comparison}
    except Exception as e:
        return JSONResponse(status_code=500, content={'ok': False, 'error': str(e)})
    finally:
        delete_file(orig_path)
        delete_file(proc_path)

@app.post("/inspect-source-file")
async def inspect_source_file_endpoint(
    file: UploadFile = File(...),
    config: str = Form(None)
):
    validate_excel_mime(file)
    temp_path = save_temp_file(file)
    try:
        config_data = json.loads(config) if config else None
        res = report_constructor_engine.inspect_source_file(temp_path, config_data)
        return {'ok': True, **res}
    except Exception as e:
        return JSONResponse(status_code=400, content={'ok': False, 'error': str(e)})
    finally:
        delete_file(temp_path)

@app.post("/inspect-template")
async def inspect_template_endpoint(templateFile: UploadFile = File(...)):
    validate_excel_mime(templateFile)
    temp_path = save_temp_file(templateFile)
    try:
        headers = report_constructor_engine.inspect_template_file(temp_path)
        return {'ok': True, 'headers': headers}
    except Exception as e:
        return JSONResponse(status_code=400, content={'ok': False, 'error': str(e)})
    finally:
        delete_file(temp_path)

@app.post("/build-report")
async def build_report_endpoint(
    file: UploadFile = File(...),
    config: str = Form(...)
):
    validate_excel_mime(file)
    temp_path = save_temp_file(file)
    try:
        config_data = json.loads(config)
        result_path, diagnostics = report_constructor_engine.build_report(temp_path, config_data)
        return {
            'ok': True,
            'message': 'Laporan berhasil dibuat!',
            'excel': f"/output/{os.path.basename(result_path)}",
            'diagnostics': diagnostics
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={'ok': False, 'error': str(e)})
    finally:
        delete_file(temp_path)

# --- VLOOKUP ENDPOINTS (NOW INTEGRATED!) ---

@app.post("/vlookup-inspect")
async def vlookup_inspect_endpoint(
    mainFile: UploadFile = File(...),
    templateFile: UploadFile = File(...)
):
    validate_excel_mime(mainFile)
    validate_excel_mime(templateFile)
    main_path = save_temp_file(mainFile)
    temp_path = save_temp_file(templateFile)
    try:
        # Load workbooks to read headers
        m_wb = load_workbook(main_path, read_only=True)
        t_wb = load_workbook(temp_path, read_only=True)
        
        main_headers = [str(cell.value).strip() for cell in next(m_wb.worksheets[0].iter_rows(max_row=1)) if cell.value is not None]
        template_headers = [str(cell.value).strip() for cell in next(t_wb.worksheets[0].iter_rows(max_row=1)) if cell.value is not None]
        
        m_wb.close()
        t_wb.close()
        
        return {
            'ok': True,
            'mainHeaders': main_headers,
            'templateHeaders': template_headers
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={'ok': False, 'error': str(e)})
    finally:
        delete_file(main_path)
        delete_file(temp_path)

@app.post("/vlookup-process")
async def vlookup_process_endpoint(
    mainFile: UploadFile = File(...),
    templateFile: UploadFile = File(...),
    mappings: str = Form(...)
):
    validate_excel_mime(mainFile)
    validate_excel_mime(templateFile)
    main_path = save_temp_file(mainFile)
    temp_path = save_temp_file(templateFile)
    try:
        mappings_data = json.loads(mappings)
        result_path, diagnostics = vlookup_processor.perform_vlookup(
            main_path, temp_path, mappings_data
        )
        return {
            'ok': True,
            'excel': f"/output/{os.path.basename(result_path)}",
            'diagnostics': diagnostics
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={'ok': False, 'error': str(e)})
    finally:
        delete_file(main_path)
        delete_file(temp_path)

# Static Files mount at the very end
app.mount("/output", StaticFiles(directory="output"), name="output")
app.mount("/", StaticFiles(directory="public", html=True), name="public")
