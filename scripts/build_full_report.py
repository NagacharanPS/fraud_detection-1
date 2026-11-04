import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"c:\Users\nagac\Desktop\fraud-detection"
IMAGES_DIR = os.path.join(BASE_DIR, "extracted_images")
OUTPUT_DOCX = os.path.join(BASE_DIR, "UPI_PayGuard_Project_Report_Formatted.docx")

doc = Document()

# Academic Colors
COLOR_PRIMARY = RGBColor(0x1B, 0x36, 0x5D)   # Deep VTU Navy
COLOR_SECONDARY = RGBColor(0x2B, 0x4C, 0x7E) # Steel Blue
COLOR_TEXT = RGBColor(0x1A, 0x1A, 0x1A)      # Academic Black
COLOR_MUTED = RGBColor(0x55, 0x55, 0x55)     # Charcoal Muted

# ==========================================
# SECTION 1: COVER PAGE ONLY (Unnumbered, Bordered)
# ==========================================
section_cover = doc.sections[0]
section_cover.page_width = Inches(8.27)  # A4
section_cover.page_height = Inches(11.69)
section_cover.top_margin = Inches(1.0)
section_cover.bottom_margin = Inches(1.0)
section_cover.left_margin = Inches(1.25)
section_cover.right_margin = Inches(1.0)
section_cover.header_distance = Inches(0.5)
section_cover.footer_distance = Inches(0.5)

# Add double page border matching the VTU/SVCE template cover page
sectPr_cov = section_cover._sectPr
pgBorders_cov = parse_xml(
    f'<w:pgBorders {nsdecls("w")} w:offsetFrom="page">'
    f'<w:top w:val="double" w:sz="12" w:space="24" w:color="1B365D"/>'
    f'<w:left w:val="double" w:sz="12" w:space="24" w:color="1B365D"/>'
    f'<w:bottom w:val="double" w:sz="12" w:space="24" w:color="1B365D"/>'
    f'<w:right w:val="double" w:sz="12" w:space="24" w:color="1B365D"/>'
    f'</w:pgBorders>'
)
sectPr_cov.append(pgBorders_cov)

# No header and no footer on cover page
section_cover.header.paragraphs[0].text = ""
section_cover.footer.paragraphs[0].text = ""

def style_run(run, font_name="Times New Roman", size_pt=12, bold=False, italic=False, color=None):
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.italic = italic
    if color:
        run.font.color.rgb = color

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:val="clear" w:color="auto" w:fill="{color_hex}"/>')
    tcPr.append(shd)

def set_cell_borders(cell, top=None, bottom=None, left=None, right=None):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    borders = {'top': top, 'bottom': bottom, 'left': left, 'right': right}
    for b_name, b_val in borders.items():
        edge = OxmlElement(f'w:{b_name}')
        if b_val:
            for k, v in b_val.items():
                edge.set(qn(f'w:{k}'), str(v))
        else:
            edge.set(qn('w:val'), 'none')
        tcBorders.append(edge)
    tcPr.append(tcBorders)

def add_para(doc, text="", font_name="Times New Roman", size_pt=12, bold=False, italic=False,
             align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=6, line_spacing=1.5,
             color=COLOR_TEXT):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    if text:
        r = p.add_run(text)
        style_run(r, font_name, size_pt, bold, italic, color)
    return p

def add_bullet(doc, text, prefix="", space_after=4):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.left_indent = Inches(0.3)
    p.paragraph_format.first_line_indent = Inches(-0.3)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.5
    
    r_bullet = p.add_run("•  ")
    style_run(r_bullet, "Times New Roman", 12, bold=True, color=COLOR_PRIMARY)
    if prefix:
        r_pre = p.add_run(prefix)
        style_run(r_pre, "Times New Roman", 12, bold=True, color=COLOR_TEXT)
    r_txt = p.add_run(text)
    style_run(r_txt, "Times New Roman", 12, bold=False, color=COLOR_TEXT)
    return p

def add_prelim_header(doc, title_str):
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(14)
    p_title.paragraph_format.space_after = Pt(14)
    r_title = p_title.add_run(title_str.upper())
    style_run(r_title, "Times New Roman", 16, bold=True, color=COLOR_PRIMARY)

def add_chapter_header(doc, chapter_num_str, title_str):
    doc.add_page_break()
    p_num = doc.add_paragraph()
    p_num.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_num.paragraph_format.space_before = Pt(14)
    p_num.paragraph_format.space_after = Pt(4)
    r_num = p_num.add_run(chapter_num_str)
    style_run(r_num, "Times New Roman", 14, bold=True, italic=True, color=COLOR_PRIMARY)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(18)
    r_title = p_title.add_run(title_str.upper())
    style_run(r_title, "Times New Roman", 16, bold=True, color=COLOR_PRIMARY)

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.15
    r = p.add_run(text)
    style_run(r, "Times New Roman", 13, bold=True, color=COLOR_PRIMARY)
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    r = p.add_run(text)
    style_run(r, "Times New Roman", 12, bold=True, color=COLOR_SECONDARY)
    return p

def add_heading_3(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    r = p.add_run(text)
    style_run(r, "Times New Roman", 11.5, bold=True, italic=True, color=COLOR_TEXT)
    return p

def add_figure(doc, img_rel_path, caption_str, width_in=5.4):
    img_path = os.path.join(IMAGES_DIR, img_rel_path)
    if os.path.exists(img_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(4)
        run = p_img.add_run()
        run.add_picture(img_path, width=Inches(width_in))
    
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(12)
    r_cap = p_cap.add_run(caption_str)
    style_run(r_cap, "Times New Roman", 10.5, bold=False, italic=True, color=COLOR_TEXT)

def add_table_caption(doc, caption_str):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(caption_str)
    style_run(r, "Times New Roman", 10.5, bold=True, color=COLOR_PRIMARY)
    return p

def format_styled_table(doc, col_widths, headers, rows_data):
    table = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Format Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = Inches(col_widths[i])
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=120, right=120)
        set_cell_shading(hdr_cells[i], "1F3864")
        set_cell_borders(hdr_cells[i],
            top={"sz": 6, "val": "single", "color": "1F3864"},
            bottom={"sz": 10, "val": "single", "color": "1F3864"},
            left={"sz": 4, "val": "single", "color": "B0C4DE"},
            right={"sz": 4, "val": "single", "color": "B0C4DE"}
        )
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(title)
        style_run(r, "Times New Roman", 10, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF))

    # Format Body Rows
    for r_idx, row_values in enumerate(rows_data):
        row_cells = table.rows[r_idx + 1].cells
        bg_color = "F8FAFC" if (r_idx % 2 == 1) else "FFFFFF"
        for c_idx, val in enumerate(row_values):
            row_cells[c_idx].width = Inches(col_widths[c_idx])
            set_cell_margins(row_cells[c_idx], top=70, bottom=70, left=100, right=100)
            set_cell_shading(row_cells[c_idx], bg_color)
            set_cell_borders(row_cells[c_idx],
                top={"sz": 4, "val": "single", "color": "D1D5DB"},
                bottom={"sz": 4, "val": "single", "color": "D1D5DB"},
                left={"sz": 4, "val": "single", "color": "D1D5DB"},
                right={"sz": 4, "val": "single", "color": "D1D5DB"}
            )
            p = row_cells[c_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if (c_idx != 0 and len(str(val)) > 15) else WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.line_spacing = 1.15
            r = p.add_run(str(val))
            style_run(r, "Times New Roman", 9.5, bold=(c_idx==0 and len(headers)>3), color=COLOR_TEXT)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(6)

def format_grid_prelim_table(doc, col_widths, headers, rows_data):
    """Format clean grid tables exactly matching the template PDF (TOC, Figures, Tables, Abbreviations)"""
    table = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = Inches(col_widths[i])
        set_cell_margins(hdr_cells[i], top=80, bottom=80, left=100, right=100)
        set_cell_borders(hdr_cells[i],
            top={"sz": 6, "val": "single", "color": "000000"},
            bottom={"sz": 6, "val": "single", "color": "000000"},
            left={"sz": 4, "val": "single", "color": "000000"},
            right={"sz": 4, "val": "single", "color": "000000"}
        )
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(title)
        style_run(r, "Times New Roman", 10.5, bold=True, color=COLOR_TEXT)

    # Body Rows
    for r_idx, row_values in enumerate(rows_data):
        row_cells = table.rows[r_idx + 1].cells
        for c_idx, val in enumerate(row_values):
            row_cells[c_idx].width = Inches(col_widths[c_idx])
            set_cell_margins(row_cells[c_idx], top=50, bottom=50, left=90, right=90)
            set_cell_borders(row_cells[c_idx],
                top={"sz": 4, "val": "single", "color": "000000"},
                bottom={"sz": 4, "val": "single", "color": "000000"},
                left={"sz": 4, "val": "single", "color": "000000"},
                right={"sz": 4, "val": "single", "color": "000000"}
            )
            p = row_cells[c_idx].paragraphs[0]
            if c_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER if len(val) <= 4 else WD_ALIGN_PARAGRAPH.LEFT
            elif c_idx == 1:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.line_spacing = 1.15
            r = p.add_run(str(val))
            is_main = (c_idx == 1 and ("CHAPTER" in val or "REFERENCES" in val or "CERTIFICATE" in val or "DECLARATION" in val or "ACKNOWLEDGEMENT" in val or "ABSTRACT" in val or "MAPPING" in val or "APPENDIX" in val)) or (c_idx == 0 and val.isdigit())
            style_run(r, "Times New Roman", 10, bold=is_main, color=COLOR_TEXT)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(6)

# ==========================================
# 1. TITLE / COVER PAGE (Matching Template)
# ==========================================
add_para(doc, "Visvesvaraya Technological University", size_pt=14, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=4, space_after=2, color=COLOR_PRIMARY)
add_para(doc, "“Jnana Sangama” Belagavi-590018", size_pt=10.5, bold=False, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8, color=COLOR_MUTED)

# VTU Logo
vtu_logo_path = os.path.join(IMAGES_DIR, "page_1_xref_90.jpeg")
if os.path.exists(vtu_logo_path):
    p_vtu = doc.add_paragraph()
    p_vtu.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_vtu.paragraph_format.space_before = Pt(2)
    p_vtu.paragraph_format.space_after = Pt(8)
    r = p_vtu.add_run()
    r.add_picture(vtu_logo_path, width=Inches(1.2))

add_para(doc, "Project report\non", size_pt=12, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=6, color=COLOR_TEXT)
add_para(doc, "“A Graph-Based System for Detecting Suspicious Transactions\nin Financial Networks”", size_pt=14, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10, color=COLOR_PRIMARY)

add_para(doc, "Submitted in partial fulfillment for the award of degree of", size_pt=11, bold=False, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2, color=COLOR_TEXT)
add_para(doc, "Bachelor of Engineering", size_pt=12.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10, color=COLOR_TEXT)

add_para(doc, "Submitted by", size_pt=11, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4, color=COLOR_PRIMARY)

# Students Table in 2-column format
stud_table = doc.add_table(rows=4, cols=2)
stud_table.alignment = WD_TABLE_ALIGNMENT.CENTER
stud_data = [
    ("NAGACHARAN P S", "(1VE22CS094)"),
    ("SAIKIRAN M", "(1VE23CS094)"),
    ("NAREN N", "(1VE23CS111)"),
    ("YASHPAL SINGH", "(1VE22CS185)")
]
for idx, (s_name, s_usn) in enumerate(stud_data):
    r_cells = stud_table.rows[idx].cells
    r_cells[0].width = Inches(2.5)
    r_cells[1].width = Inches(2.2)
    set_cell_borders(r_cells[0])
    set_cell_borders(r_cells[1])
    set_cell_margins(r_cells[0], top=15, bottom=15, left=30, right=30)
    set_cell_margins(r_cells[1], top=15, bottom=15, left=30, right=30)
    
    p0 = r_cells[0].paragraphs[0]
    p0.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p0.paragraph_format.space_before = Pt(0)
    p0.paragraph_format.space_after = Pt(0)
    r0 = p0.add_run(s_name)
    style_run(r0, "Times New Roman", 10.5, bold=True)
    
    p1 = r_cells[1].paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p1.paragraph_format.space_before = Pt(0)
    p1.paragraph_format.space_after = Pt(0)
    r1 = p1.add_run(s_usn)
    style_run(r1, "Times New Roman", 10.5, bold=True)

add_para(doc, "Under the guidance of\nMr. RAJESH S\nAssociate Professor\nDept. of CSE, SVCE", size_pt=10.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=8, space_after=8, color=COLOR_TEXT)

# SVCE Banner
svce_logo_path = os.path.join(IMAGES_DIR, "page_1_xref_91.jpeg")
if os.path.exists(svce_logo_path):
    p_svce = doc.add_paragraph()
    p_svce.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_svce.paragraph_format.space_before = Pt(2)
    p_svce.paragraph_format.space_after = Pt(4)
    r = p_svce.add_run()
    r.add_picture(svce_logo_path, width=Inches(3.3))

add_para(doc, "Department of Computer Science and Engineering\nSri Venkateshwara College of Engineering, Bengaluru - 562157\n2026 - 2027", size_pt=10, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0, color=COLOR_PRIMARY)

# ==========================================
# SECTION 2: PRELIMINARY PAGES (Numbered I, II, III... Bordered)
# ==========================================
section_prelim = doc.add_section(WD_SECTION.NEW_PAGE)
section_prelim.page_width = Inches(8.27)
section_prelim.page_height = Inches(11.69)
section_prelim.top_margin = Inches(1.0)
section_prelim.bottom_margin = Inches(1.0)
section_prelim.left_margin = Inches(1.25)
section_prelim.right_margin = Inches(1.0)
section_prelim.header_distance = Inches(0.5)
section_prelim.footer_distance = Inches(0.5)

sectPr_pre = section_prelim._sectPr
pgBorders_pre = parse_xml(
    f'<w:pgBorders {nsdecls("w")} w:offsetFrom="page">'
    f'<w:top w:val="double" w:sz="12" w:space="24" w:color="1B365D"/>'
    f'<w:left w:val="double" w:sz="12" w:space="24" w:color="1B365D"/>'
    f'<w:bottom w:val="double" w:sz="12" w:space="24" w:color="1B365D"/>'
    f'<w:right w:val="double" w:sz="12" w:space="24" w:color="1B365D"/>'
    f'</w:pgBorders>'
)
sectPr_pre.append(pgBorders_pre)

# Roman numerals starting at 1 (I, II, III, IV...)
pgNumType_pre = OxmlElement('w:pgNumType')
pgNumType_pre.set(qn('w:fmt'), 'upperRoman')
pgNumType_pre.set(qn('w:start'), '1')
sectPr_pre.append(pgNumType_pre)

section_prelim.header.is_linked_to_previous = False
section_prelim.header.paragraphs[0].text = ""

footer_pre = section_prelim.footer
footer_pre.is_linked_to_previous = False
f_p_pre = footer_pre.paragraphs[0]
f_p_pre.alignment = WD_ALIGN_PARAGRAPH.CENTER
r_num_pre = f_p_pre.add_run()
r_num_pre.font.name = "Times New Roman"
r_num_pre.font.size = Pt(11)
fldSimple_pre = parse_xml(f'<w:fldSimple {nsdecls("w")} w:instr="PAGE"/>')
r_num_pre._r.append(fldSimple_pre)

# ==========================================
# 2. CERTIFICATE PAGE (Page I)
# ==========================================
if os.path.exists(svce_logo_path):
    p_cert_logo = doc.add_paragraph()
    p_cert_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cert_logo.paragraph_format.space_before = Pt(0)
    p_cert_logo.paragraph_format.space_after = Pt(6)
    r = p_cert_logo.add_run()
    r.add_picture(svce_logo_path, width=Inches(3.3))

add_prelim_header(doc, "CERTIFICATE")

cert_text = (
    "This is to certify that the Project entitled “A Graph-Based System for Detecting Suspicious Transactions "
    "in Financial Networks” was carried out by Mr. Nagacharan P S (1VE22CS094), Mr. Saikiran M (1VE23CS094), "
    "Mr. Naren N (1VE23CS111), and Mr. Yashpal Singh (1VE22CS185) who are bonafide students of VII Semester in "
    "Computer Science and Engineering, Sri Venkateshwara College of Engineering. This is in partial fulfillment for "
    "the award of Bachelor of Engineering in the Visvesvaraya Technological University, Belagavi, during the year "
    "2026-2027. It is certified that all corrections/suggestions indicated for project internal assessment have been "
    "incorporated in the report. The project report has been approved as it satisfies the academic requirements in "
    "the respect of project work prescribed for the said degree."
)
add_para(doc, cert_text, size_pt=11.5, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=4, space_after=24, line_spacing=1.4)

sig_table = doc.add_table(rows=1, cols=3)
sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
sig_data = [
    ("Mr. Rajesh S\nAsso. Prof. Dept. of CSE\nSVCE, Bengaluru", Inches(2.0)),
    ("Dr. Mukesh Kumar Singh\nProf. & Head of Dept. of CSE\nSVCE, Bengaluru", Inches(2.1)),
    ("Dr. B. M. Satish\nPrincipal, SVCE\nBengaluru", Inches(1.8))
]
for i, (txt, width) in enumerate(sig_data):
    c = sig_table.rows[0].cells[i]
    c.width = width
    set_cell_borders(c)
    set_cell_margins(c, top=15, bottom=15, left=20, right=20)
    p = c.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.line_spacing = 1.15
    r = p.add_run(txt)
    style_run(r, "Times New Roman", 10, bold=True, color=COLOR_TEXT)

add_para(doc, "External Examiners:-\n1.\n2.", size_pt=10.5, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=20, space_after=0)

# ==========================================
# 3. DECLARATION PAGE (Page II)
# ==========================================
doc.add_page_break()
if os.path.exists(svce_logo_path):
    p_decl_logo = doc.add_paragraph()
    p_decl_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_decl_logo.paragraph_format.space_before = Pt(0)
    p_decl_logo.paragraph_format.space_after = Pt(6)
    r = p_decl_logo.add_run()
    r.add_picture(svce_logo_path, width=Inches(3.3))

add_prelim_header(doc, "DECLARATION")

decl_p1 = (
    "We hereby declare that the Project work entitled “A Graph-Based System for Detecting Suspicious "
    "Transactions in Financial Networks” submitted in the partial fulfillment of the requirements for the "
    "award of the degree of the Bachelor Of Engineering, in Computer Science and Engineering of the "
    "Visvesvaraya Technological University, Belagavi is an authentic record of our own work carried out "
    "during 2026-2027. The report embodied in this project report has not been submitted to any other "
    "university or institute for the award of any degree or diploma."
)
add_para(doc, decl_p1, size_pt=11.5, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=8, space_after=24, line_spacing=1.4)

add_para(doc, "Date: 26th October 2026\t\t\t\t\t\t\tPlace: Bengaluru", size_pt=11, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=20)

decl_table = doc.add_table(rows=4, cols=2)
decl_table.alignment = WD_TABLE_ALIGNMENT.CENTER
for idx, (s_name, s_usn) in enumerate(stud_data):
    r_cells = decl_table.rows[idx].cells
    r_cells[0].width = Inches(2.6)
    r_cells[1].width = Inches(2.1)
    set_cell_borders(r_cells[0])
    set_cell_borders(r_cells[1])
    set_cell_margins(r_cells[0], top=15, bottom=15, left=30, right=30)
    set_cell_margins(r_cells[1], top=15, bottom=15, left=30, right=30)
    p0 = r_cells[0].paragraphs[0]
    p0.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r0 = p0.add_run(s_name)
    style_run(r0, "Times New Roman", 10.5, bold=True)
    p1 = r_cells[1].paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r1 = p1.add_run(s_usn)
    style_run(r1, "Times New Roman", 10.5, bold=True)

# ==========================================
# 4. ACKNOWLEDGEMENT (Page III)
# ==========================================
doc.add_page_break()
add_prelim_header(doc, "ACKNOWLEDGEMENT")

ack_texts = [
    "Our most sincere and grateful thanks to Sri Venkateshwara College of Engineering for providing us with the opportunity to pursue the B.E. degree in Computer Science and Engineering and thus helping us shape our careers. First and foremost, we would like to express our gratitude to Dr. B. M. Satish, Principal, Sri Venkateshwara College of Engineering, Bengaluru, for his support in bringing this project to completion.",
    "We would like to extend our sincere thanks to Dr. Mukesh Kumar Singh, Professor and Head, Department of Computer Science and Engineering, Sri Venkateshwara College of Engineering, Bengaluru, for his valuable suggestions and support, which helped us complete this project successfully.",
    "We would like to express our sincere gratitude to our project guide, Mr. Rajesh S, Associate Professor, Department of Computer Science and Engineering, Sri Venkateshwara College of Engineering, Bengaluru, for his valuable guidance, continuous encouragement, and support throughout the project. His suggestions and guidance have been instrumental in bringing this project to completion.",
    "Finally, we extend our sincere thanks to all the faculty members of the Department of Computer Science and Engineering for their cooperation and support throughout the development of this project."
]
for p_txt in ack_texts:
    add_para(doc, p_txt, size_pt=11.5, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=10, line_spacing=1.4)

add_para(doc, "Yours Sincerely,", size_pt=11, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=12, space_after=8)

for s_name, s_usn in stud_data:
    p_n = add_para(doc, f"{s_name:<20} {s_usn}", size_pt=10.5, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=2)

# ==========================================
# 5. ABSTRACT (Page IV)
# ==========================================
doc.add_page_break()
add_prelim_header(doc, "ABSTRACT")

abs_p1 = (
    "The exponential growth of digital retail payment systems, particularly the Unified Payments Interface (UPI) "
    "facilitating over 14 billion instant bank-to-bank settlements monthly, has transformed consumer commerce. "
    "However, UPI’s real-time settlement architecture introduces severe systemic vulnerabilities: funds settle with "
    "instant finality between underlying savings accounts without the multi-hour dispute windows or chargeback mechanisms "
    "found in traditional card networks. Cyber-criminals exploit this irreversible clearing through sophisticated "
    "vectors including social engineering phishing, SIM-swapping, remote screen-sharing takeovers, off-hours velocity drains, "
    "and high-velocity money laundering routed through complex multi-hop mule account rings. Conventional banking security "
    "frameworks rely heavily on static threshold rules or post-facto batch audits, resulting in high false alarm friction "
    "and an inability to intercept fraudulent transfers before monetary finality occurs."
)
add_para(doc, abs_p1, size_pt=11, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=2, space_after=8, line_spacing=1.4)

abs_p2 = (
    "This project presents “A Graph-Based System for Detecting Suspicious Transactions in Financial Networks”, "
    "an enterprise-grade, pre-transaction fraud detection, prevention, and biometric verification platform engineered to "
    "evaluate contextual risk in sub-50 ms prior to payment settlement. The platform models the entire transactional ecosystem "
    "as a directed multigraph, where accounts are represented as nodes and transactions as directed, weighted edges. The "
    "framework synthesizes five core technical capabilities: (1) Graph-Theoretic Counterparty Audits evaluating in-degree/out-degree "
    "centrality, high fan-in clusters, and circular layering loops to intercept money mule networks; (2) Continuous Behavioral "
    "Profiling quantifying deviation from personalized spending baselines across amount ratios, rolling velocity bursts, and 24-hour "
    "diurnal activity distributions; (3) Multi-Tier Adaptive Step-Up Security dynamically graduating authentication across calibrated "
    "risk tiers—Auto-Approve (0–30%), Cryptographic SMS OTP (31–60%), Deep Facial Biometric Attestation (61–85%), and Instant Security "
    "Freeze (86–100%); (4) Deep Facial Biometrics utilizing OpenCV YuNet neural detection and SFace feature extraction to project live "
    "facial landmarks into normalized 128-dimensional unit vectors matched via Cosine Similarity; and (5) Grounded Explainable AI "
    "(XAI) rendering auditable ledger proofs directly from the relational database to justify every risk decision."
)
add_para(doc, abs_p2, size_pt=11, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=8, line_spacing=1.4)

abs_p3 = (
    "Extensive empirical benchmarking across candidate algorithms—Hist Gradient Boosting, Extra Trees, Random Forest, XGBoost, and "
    "Logistic Regression—demonstrates that gradient-boosted decision trees under cost-sensitive scale position weighting achieve "
    "outstanding predictive performance on imbalanced UPI transaction streams, recording 97.4% to 100% Precision, 98.6% to 100% Recall, "
    "0.993 to 1.0 F1-Score, and a 1.0 ROC-AUC score with zero false alarms on the test partition. The end-to-end evaluation latency "
    "averages 35.0 ms, guaranteeing sub-second transaction authorization. Furthermore, the system directly aligns with United Nations "
    "Sustainable Development Goals (SDG 8, 9, 16) and national cybersecurity directives."
)
add_para(doc, abs_p3, size_pt=11, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=10, line_spacing=1.4)

p_kw = add_para(doc, "", align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=4, space_after=8)
r_kw_title = p_kw.add_run("Keywords: ")
style_run(r_kw_title, "Times New Roman", 10.5, bold=True, color=COLOR_PRIMARY)
r_kw_body = p_kw.add_run(
    "Financial Networks, Graph Centrality, Mule Account Detection, Node-Edge Representation, Gradient Boosted Trees, "
    "Hist Gradient Boosting, XGBoost, Deep Facial Biometrics, OpenCV SFace, Cosine Similarity, Multi-Tier Step-Up Security, "
    "Grounded Explainable AI (XAI), UPI Fraud Prevention, UN SDGs."
)
style_run(r_kw_body, "Times New Roman", 10, italic=True, color=COLOR_TEXT)

# ==========================================
# 6. TABLE OF CONTENT (Matching Template Grid)
# ==========================================
doc.add_page_break()
add_prelim_header(doc, "TABLE OF CONTENT")

toc_headers = ["Sl. No.", "Chapter", "Page No"]
toc_widths = [0.8, 4.3, 1.1]
toc_rows = [
    ["", "CERTIFICATE", "I"],
    ["", "DECLARATION", "II"],
    ["", "ACKNOWLEDGEMENT", "III"],
    ["", "ABSTRACT", "IV"],
    ["1", "INTRODUCTION", "1-4"],
    ["", "1.1 MOTIVATION", "1"],
    ["", "1.2 PROBLEM STATEMENT", "2"],
    ["", "1.3 SCOPE OF THE PROJECT", "3"],
    ["", "1.4 RELATION TO PREVIOUS WORK AND PRESENT DEVELOPMENTS", "4"],
    ["", "1.5 REPORT ORGANIZATION", "4"],
    ["2", "LITERATURE SURVEY", "5-11"],
    ["", "2.1 LITERATURE REVIEW", "5"],
    ["", "2.2 GAP IDENTIFICATION", "9"],
    ["", "2.3 MAIN OBJECTIVES OF THE PROJECT", "9"],
    ["", "2.4 SCOPE AND BOUNDARIES OF THE WORK", "10"],
    ["3", "PROJECT METHODOLOGY AND SRS", "12-16"],
    ["", "3.1 PROJECT OBJECTIVES & DETAILED PHASED WORKFLOW", "12"],
    ["", "3.2 SYSTEM REQUIREMENTS SPECIFICATIONS (SRS)", "13"],
    ["", "3.3 HIGH-LEVEL SYSTEM ARCHITECTURE AND DESIGN METHODOLOGY", "15"],
    ["", "3.4 CHAPTER SUMMARY", "16"],
    ["4", "THEORY AND CONCEPTS", "17-22"],
    ["", "4.1 REAL-TIME FINANCIAL RISK ASSESSMENT & GRADIENT BOOSTED DECISION TREES", "17"],
    ["", "4.2 GRAPH ANALYTICS AND NETWORK CENTRALITY IN FINANCIAL NETWORKS", "17"],
    ["", "4.3 DEEP FACIAL BIOMETRIC ATTESTATION", "19"],
    ["", "4.4 MULTI-TIER ADAPTIVE STEP-UP SECURITY & CRYPTOGRAPHIC OTP VERIFICATION", "19"],
    ["", "4.5 TEMPORAL HABITUAL PROFILING & ACCOUNT SPENDING BASELINES", "20"],
    ["", "4.6 GROUNDED EVIDENCE & EXPLAINABLE AI (XAI) IN REGULATED BANKING", "21"],
    ["", "4.7 RELATIONAL DATABASE ARCHITECTURE & INTEGRITY (SQLite / MySQL)", "22"],
    ["5", "SYSTEM DESIGN AND IMPLEMENTATION", "23-31"],
    ["", "5.1 SYSTEM FLOW AND STATE MACHINE ARCHITECTURE", "23"],
    ["", "5.2 DETAILED MODULAR DESIGN & COMPONENT INTERACTION", "23"],
    ["", "5.3 RELATIONAL DATABASE SCHEMA & DATA MODELING", "25"],
    ["", "5.4 IMPLEMENTATION DETAILS & USER INTERFACE WALKTHROUGH", "25"],
    ["6", "RESULTS AND DISCUSSIONS", "32-39"],
    ["", "6.1 EXPERIMENTAL RESULTS & INTERFACE WALKTHROUGH", "32"],
    ["", "6.2 DATASET ANALYSIS & TRANSACTION VOLUME TELEMETRY", "32"],
    ["", "6.3 MACHINE LEARNING MODEL CONVERGENCE & EMPIRICAL EVALUATION", "34"],
    ["", "6.4 LATENCY, NETWORK BANDWIDTH & CONCURRENCY ANALYSIS", "37"],
    ["", "6.5 COMPARATIVE ANALYSIS WITH CONVENTIONAL PLATFORMS", "38"],
    ["", "6.6 KEY INSIGHTS & PRACTICAL FINANCIAL/INDUSTRY IMPACT", "39"],
    ["7", "VALIDATION AND SYSTEM TESTING", "40-42"],
    ["", "7.1 VALIDATION WITH ALTERNATIVE ARCHITECTURES & BASELINES", "40"],
    ["", "7.2 SYSTEM TESTING METHODOLOGY & QUALITY ASSURANCE", "40"],
    ["", "7.3 COMPREHENSIVE TEST CASES & EXECUTION RESULTS", "41"],
    ["8", "CONCLUSION AND FUTURE WORK", "43-45"],
    ["", "8.1 CONCLUSION AND SUMMARY OF CONTRIBUTIONS", "43"],
    ["", "8.2 SCOPE FOR FUTURE WORK", "43"],
    ["", "REFERENCES", "46"],
    ["", "MAPPING WITH PROGRAM OUTCOMES (POs) AND PSOs", "47"],
    ["", "MAPPING WITH SUSTAINABLE DEVELOPMENT GOALS (SDGs)", "49"],
    ["", "APPENDIX A: Software ReadMe, Deployment & User Manual", "50"],
    ["", "APPENDIX B: Sample Transaction Risk Evaluation & Verification Logs", "51"],
    ["", "APPENDIX C: Complete Database Schema DDL & SQL Policies", "52"]
]
format_grid_prelim_table(doc, toc_widths, toc_headers, toc_rows)

# ==========================================
# 7. LIST OF FIGURES (Matching Template Grid)
# ==========================================
doc.add_page_break()
add_prelim_header(doc, "LIST OF FIGURES")

fig_headers = ["Figure", "Title", "Page no"]
fig_widths = [1.3, 4.1, 0.8]
fig_rows = [
    ["Figure 3.1", "Proposed System - Unified Three-Tier System Architecture", "15"],
    ["Figure 3.2", "End-to-End Phased Machine Learning and System Engineering Methodology", "16"],
    ["Figure 4.1", "Relational Graph Analytics: Node-Edge Network Topologies in Financial Streams", "18"],
    ["Figure 5.1", "Transaction Lifecycle & Adaptive Risk State Machine", "23"],
    ["Figure 5.2", "User Interface of the Real-Time Payment Simulation & Risk Assessment Dashboard", "26"],
    ["Figure 5.3", "User Interface of the Transaction History & Auditable Financial Ledger Explorer", "27"],
    ["Figure 5.4", "User Interface of the Account Profile & Continuous Behavioral Spending Baselines", "28"],
    ["Figure 5.5", "User Interface of the Pre-Settlement Fraud Alert & Grounded Historical Proof Drawer", "29"],
    ["Figure 5.6", "Interactive Cytoscape Transaction Network Graph Visualizer", "30"],
    ["Figure 5.7", "Multi-Tier Step-Up Security Modal with Live Facial Biometric Attestation", "31"],
    ["Figure 6.1", "Hourly Transaction Volume Distribution (24-Hour Diurnal Telemetry)", "32"],
    ["Figure 6.2", "Empirical Dataset Class Distribution and Imbalance Landscape", "33"],
    ["Figure 6.3", "Gradient Boosted Ensemble Learning and Generalization Curves", "33"],
    ["Figure 6.4", "Empirical Confusion Matrices on 1,300 Holdout Test Partition", "34"],
    ["Figure 6.5", "Receiver Operating Characteristic (ROC) Multi-Model Benchmark", "35"],
    ["Figure 6.6", "Top Evaluated Features Ranked by Gradient Boosting Split Gain", "35"],
    ["Figure 6.7", "Sub-50ms Real-Time Transaction Risk Evaluation Latency Breakdown", "37"]
]
format_grid_prelim_table(doc, fig_widths, fig_headers, fig_rows)

# ==========================================
# 8. LIST OF TABLES (Matching Template Grid)
# ==========================================
doc.add_page_break()
add_prelim_header(doc, "LIST OF TABLES")

tbl_headers = ["Table", "Table Name", "Page no"]
tbl_widths = [1.3, 4.1, 0.8]
tbl_rows = [
    ["Table 3.1", "Minimum and Recommended Hardware Specifications", "13"],
    ["Table 3.2", "Comprehensive Software Technology Stack and Frameworks", "14"],
    ["Table 4.1", "Engineered Feature Representation and Mathematical Formulations", "20"],
    ["Table 5.1", "Multi-Tier Risk Calibration & Dynamic Step-Up Enforcement Matrix", "24"],
    ["Table 5.2", "Relational Database Entity Schema Definitions (fraud_detection.db)", "25"],
    ["Table 6.1", "Comprehensive Machine Learning Model Performance Benchmark on Fraud Detection Test Suite", "36"],
    ["Table 6.2", "Real-Time Subsystem Latency and Resource Utilization Metrics", "37"],
    ["Table 6.3", "Comparative Feature Matrix: Proposed Graph-Based System vs Conventional Platforms", "38"],
    ["Table 7.1", "Architectural Trade-Off Matrix: Static Rules vs Pure Deep Learning vs Proposed System", "40"],
    ["Table 7.2", "Comprehensive System Functional and Security Test Suite (TC-01 to TC-15)", "41"],
    ["Table 7.3", "Test Execution Status and Quality Assurance Summary", "42"],
    ["Table 9.1", "Mapping of Project Work to Program Outcomes (POs and PSOs)", "47"],
    ["Table 10.1", "Mapping with UN Sustainable Development Goals (SDGs) & National Missions", "49"]
]
format_grid_prelim_table(doc, tbl_widths, tbl_headers, tbl_rows)

# ==========================================
# 9. LIST OF ABBREVIATIONS (Matching Template Grid)
# ==========================================
doc.add_page_break()
add_prelim_header(doc, "LIST OF ABBREVIATION")

abbr_headers = ["Abbreviation", "Full Form"]
abbr_widths = [1.8, 4.4]
abbr_rows = [
    ["AI", "Artificial Intelligence"],
    ["AML", "Anti-Money Laundering"],
    ["API", "Application Programming Interface"],
    ["AR", "Augmented Reality"],
    ["AUC", "Area Under the ROC Curve"],
    ["CDC", "Change Data Capture"],
    ["CPU", "Central Processing Unit"],
    ["CRUD", "Create, Read, Update, Delete"],
    ["CSS", "Cascading Style Sheets"],
    ["CSV", "Comma-Separated Values"],
    ["DDL", "Data Definition Language"],
    ["DOM", "Document Object Model"],
    ["DTLS", "Datagram Transport Layer Security"],
    ["FNR", "False Negative Rate"],
    ["FPR", "False Positive Rate"],
    ["GNN", "Graph Neural Network"],
    ["HMR", "Hot Module Replacement"],
    ["HTML", "Hypertext Markup Language"],
    ["HTTP", "Hypertext Transfer Protocol"],
    ["HTTPS", "Hypertext Transfer Protocol Secure"],
    ["IDE", "Integrated Development Environment"],
    ["IEEE", "Institute of Electrical and Electronics Engineers"],
    ["JSON", "JavaScript Object Notation"],
    ["JWT", "JSON Web Token"],
    ["KYC", "Know Your Customer"],
    ["LLM", "Large Language Model"],
    ["ML", "Machine Learning"],
    ["NAT", "Network Address Translation"],
    ["NBA", "National Board of Accreditation"],
    ["NPCI", "National Payments Corporation of India"],
    ["ONNX", "Open Neural Network Exchange"],
    ["OTP", "One-Time Password"],
    ["P2P", "Peer-to-Peer"],
    ["PBKDF2", "Password-Based Key Derivation Function 2"],
    ["PO", "Program Outcome"],
    ["PR-AUC", "Precision-Recall Area Under Curve"],
    ["PSO", "Program Specific Outcome"],
    ["RAM", "Random Access Memory"],
    ["RBAC", "Role-Based Access Control"],
    ["RBI", "Reserve Bank of India"],
    ["REST", "Representational State Transfer"],
    ["ROC", "Receiver Operating Characteristic"],
    ["SDG", "Sustainable Development Goal (United Nations)"],
    ["SHA", "Secure Hash Algorithm"],
    ["SIMD", "Single Instruction, Multiple Data"],
    ["SOA", "Service-Oriented Architecture"],
    ["SQL", "Structured Query Language"],
    ["SRS", "System Requirements Specification"],
    ["SSD", "Solid State Drive"],
    ["SSL", "Secure Sockets Layer"],
    ["STEM", "Science, Technology, Engineering and Mathematics"],
    ["TLS", "Transport Layer Security"],
    ["UI", "User Interface"],
    ["UPI", "Unified Payments Interface"],
    ["URI", "Uniform Resource Identifier"],
    ["URL", "Uniform Resource Locator"],
    ["USN", "University Seat Number"],
    ["UX", "User Experience"],
    ["Vite", "Fast Frontend Build Tool and Development Server"],
    ["VTU", "Visvesvaraya Technological University"],
    ["WAL", "Write-Ahead Logging"],
    ["XAI", "Explainable Artificial Intelligence"],
    ["XGBoost", "Extreme Gradient Boosting"]
]
format_grid_prelim_table(doc, abbr_widths, abbr_headers, abbr_rows)

# ==========================================
# SECTION 3: MAIN BODY (Numbered 1, 2, 3... Running Headers & Footers)
# ==========================================
section_body = doc.add_section(WD_SECTION.NEW_PAGE)
section_body.page_width = Inches(8.27)
section_body.page_height = Inches(11.69)
section_body.top_margin = Inches(1.0)
section_body.bottom_margin = Inches(1.0)
section_body.left_margin = Inches(1.25)
section_body.right_margin = Inches(1.0)
section_body.header_distance = Inches(0.5)
section_body.footer_distance = Inches(0.5)

sectPr_body = section_body._sectPr
pgNumType_body = OxmlElement('w:pgNumType')
pgNumType_body.set(qn('w:fmt'), 'decimal')
pgNumType_body.set(qn('w:start'), '1')
sectPr_body.append(pgNumType_body)

# Running Header (Matching Template)
header2 = section_body.header
header2.is_linked_to_previous = False
hp = header2.paragraphs[0]
hp.paragraph_format.tab_stops.add_tab_stop(Inches(6.02), WD_TAB_ALIGNMENT.RIGHT)
r_hl = hp.add_run("A Graph-Based System for Detecting Suspicious Transactions in Financial Networks")
style_run(r_hl, "Times New Roman", 8.5, bold=True, color=COLOR_PRIMARY)
r_hr = hp.add_run("\t2026-2027")
style_run(r_hr, "Times New Roman", 8.5, bold=True, color=COLOR_PRIMARY)

# Bottom colored bar below header
pBdr_h = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="18" w:space="4" w:color="1B365D"/></w:pBdr>')
hp._p.get_or_add_pPr().append(pBdr_h)

# Running Footer (Matching Template)
footer2 = section_body.footer
footer2.is_linked_to_previous = False
fp = footer2.paragraphs[0]
fp.paragraph_format.tab_stops.add_tab_stop(Inches(6.02), WD_TAB_ALIGNMENT.RIGHT)

# Top colored bar above footer
pBdr_f = parse_xml(f'<w:pBdr {nsdecls("w")}><w:top w:val="single" w:sz="18" w:space="4" w:color="1B365D"/></w:pBdr>')
fp._p.get_or_add_pPr().append(pBdr_f)

r_fl = fp.add_run("DEPARTMENT OF CSE, SRI VENKATESHWARA COLLEGE OF ENGINEERING,\nAN AUTONOMOUS INSTITUTE, BENGALURU")
style_run(r_fl, "Times New Roman", 8, bold=True, color=COLOR_PRIMARY)
r_fr = fp.add_run("\tPage ")
style_run(r_fr, "Times New Roman", 9, bold=True, color=COLOR_TEXT)
fldSimple2 = parse_xml(f'<w:fldSimple {nsdecls("w")} w:instr="PAGE"/>')
r_fr._r.append(fldSimple2)

print("Front matter generated successfully with 3-section layout matching VTU/SVCE template!")
