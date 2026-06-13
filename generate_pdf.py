from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

def format_rp(num):
    if num is None or num == '':
        return ''
    try:
        val = float(num)
        return "{:,.0f}".format(val).replace(",", ".")
    except ValueError:
        return str(num)

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        # Landscape A4 width is A4[1]
        width = A4[1]
        self.drawCentredString(width / 2.0, 20, f"Halaman {self._pageNumber} dari {page_count}")
        self.restoreState()

def generate_pdf_from_data(rows, out_pdf_path):
    # Setup document
    doc = SimpleDocTemplate(
        out_pdf_path,
        pagesize=landscape(A4),
        leftMargin=30,
        rightMargin=30,
        topMargin=30,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading2'],
        alignment=1, # Center
        spaceAfter=20,
        fontName='Helvetica-Bold',
        fontSize=14
    )
    
    cell_style = ParagraphStyle(
        'CellStyle',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        fontName='Helvetica'
    )
    
    cell_style_bold = ParagraphStyle(
        'CellStyleBold',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        fontName='Helvetica-Bold'
    )
    
    cell_style_right = ParagraphStyle(
        'CellStyleRight',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        alignment=2, # Right
        fontName='Helvetica'
    )

    story = []
    
    # Title
    story.append(Paragraph("BUKU TARIF LABORATORIUM", title_style))
    
    # Table headers
    headers = ["Kode", "Nama Pemeriksaan", "OPD", "ED", "KELAS 3", "KELAS 2", "KELAS 1", "VIP", "VVIP"]
    table_data = [[Paragraph(h, cell_style_bold) for h in headers]]
    
    # Table rows
    for r in rows:
        table_data.append([
            Paragraph(str(r.get('code') or ''), cell_style),
            Paragraph(str(r.get('name') or ''), cell_style),
            Paragraph(format_rp(r.get('OPD')), cell_style_right),
            Paragraph(format_rp(r.get('ED')), cell_style_right),
            Paragraph(format_rp(r.get('KELAS 3')), cell_style_right),
            Paragraph(format_rp(r.get('KELAS 2')), cell_style_right),
            Paragraph(format_rp(r.get('KELAS 1')), cell_style_right),
            Paragraph(format_rp(r.get('VIP')), cell_style_right),
            Paragraph(format_rp(r.get('VVIP')), cell_style_right)
        ])
    
    # Column widths (landscape A4 width is 841.89 points, margins are 30+30 = 60, printable width is 781.89)
    col_widths = [60, 220, 71, 71, 71, 71, 71, 71, 71] # Total = 777
    
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    # Styling Table
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F0F0F0')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#777777')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    story.append(t)
    doc.build(story, canvasmaker=NumberedCanvas)
    return out_pdf_path
