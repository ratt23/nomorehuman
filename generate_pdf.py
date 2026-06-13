import re
from playwright.sync_api import sync_playwright

def format_rp(num):
    if num is None or num == '':
        return ''
    try:
        val = float(num)
        return "{:,.0f}".format(val).replace(",", ".")
    except ValueError:
        return str(num)

def generate_pdf_from_data(rows, out_pdf_path):
    table_rows = []
    for r in rows:
        row_str = f"""
        <tr>
            <td>{r.get('code') or ''}</td>
            <td>{r.get('name') or ''}</td>
            <td class="num">{format_rp(r.get('OPD'))}</td>
            <td class="num">{format_rp(r.get('ED'))}</td>
            <td class="num">{format_rp(r.get('KELAS 3'))}</td>
            <td class="num">{format_rp(r.get('KELAS 2'))}</td>
            <td class="num">{format_rp(r.get('KELAS 1'))}</td>
            <td class="num">{format_rp(r.get('VIP'))}</td>
            <td class="num">{format_rp(r.get('VVIP'))}</td>
        </tr>
        """
        table_rows.append(row_str)
        
    html_content = f"""
    <html><head><meta charset="utf-8"><style>
    body {{ font-family: 'Arial', sans-serif; margin: 20px; font-size: 8pt; }}
    table {{ border-collapse: collapse; width: 100%; page-break-inside: auto; }}
    tr {{ page-break-inside: avoid; page-break-after: auto; }}
    th, td {{ border: 1px solid #777; padding: 4px 6px; text-align: left; }}
    th {{ background: #f0f0f0; font-weight: bold; }}
    h2 {{ text-align: center; margin-bottom: 20px; font-size: 14pt; }}
    thead {{ display: table-header-group; }}
    td.num {{ text-align: right; }}
    </style></head><body>
    <h2>BUKU TARIF LABORATORIUM</h2>
    <table><thead><tr>
    <th>Kode</th><th width="30%">Nama Pemeriksaan</th>
    <th>OPD</th><th>ED</th><th>KELAS 3</th><th>KELAS 2</th><th>KELAS 1</th><th>VIP</th><th>VVIP</th>
    </tr></thead><tbody>
    {"".join(table_rows)}
    </tbody></table></body></html>
    """
    
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
        except Exception as e:
            # If Playwright chromium is missing, attempt to run browser search or raise helpful guide
            raise Exception("Browser Chromium untuk Playwright belum terpasang. Selesaikan dengan menjalankan: playwright install chromium")
            
        page = browser.new_page()
        page.set_content(html_content)
        
        page.pdf(
            path=out_pdf_path,
            format='A4',
            landscape=True,
            print_background=True,
            margin={ 'top': '1cm', 'right': '1cm', 'bottom': '1.5cm', 'left': '1cm' },
            display_header_footer=True,
            header_template='<div></div>',
            footer_template='<div style="font-size: 8pt; width: 100%; text-align: center; padding: 0 1cm;">Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></div>'
        )
        browser.close()
    return out_pdf_path
