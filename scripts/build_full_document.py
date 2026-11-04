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

# --- Page Setup & Styles ---
section_prelim = doc.sections[0]
section_prelim.page_width = Inches(8.27)  # A4
section_prelim.page_height = Inches(11.69)
section_prelim.top_margin = Inches(1.0)
section_prelim.bottom_margin = Inches(1.0)
section_prelim.left_margin = Inches(1.25)
section_prelim.right_margin = Inches(1.0)
section_prelim.header_distance = Inches(0.5)
section_prelim.footer_distance = Inches(0.5)
section_prelim.different_first_page_header_footer = True

# Lowercase Roman numerals for section 1
sectPr1 = section_prelim._sectPr
pgNumType1 = OxmlElement('w:pgNumType')
pgNumType1.set(qn('w:fmt'), 'lowerRoman')
pgNumType1.set(qn('w:start'), '1')
sectPr1.append(pgNumType1)

# Add dynamic page number to Section 1 footer
footer1 = section_prelim.footer
f_p1 = footer1.paragraphs[0]
f_p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
r_num1 = f_p1.add_run()
r_num1.font.name = "Times New Roman"
r_num1.font.size = Pt(11)
fldSimple1 = parse_xml(f'<w:fldSimple {nsdecls("w")} w:instr="PAGE"/>')
r_num1._r.append(fldSimple1)

# First page footer is empty (Cover page unnumbered)
first_footer1 = section_prelim.first_page_footer
p_ff = first_footer1.paragraphs[0]
p_ff.text = ""

# Colors
COLOR_PRIMARY = RGBColor(0x1B, 0x36, 0x5D)   # Deep VTU Navy
COLOR_SECONDARY = RGBColor(0x2B, 0x4C, 0x7E) # Steel Blue
COLOR_TEXT = RGBColor(0x1A, 0x1A, 0x1A)      # Academic Black
COLOR_MUTED = RGBColor(0x55, 0x55, 0x55)     # Charcoal Muted

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
    p_title.paragraph_format.space_before = Pt(16)
    p_title.paragraph_format.space_after = Pt(16)
    r_title = p_title.add_run(title_str.upper())
    style_run(r_title, "Times New Roman", 16, bold=True, color=COLOR_PRIMARY)

def add_chapter_header(doc, chapter_num_str, title_str):
    p_num = doc.add_paragraph()
    p_num.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_num.paragraph_format.space_before = Pt(14)
    p_num.paragraph_format.space_after = Pt(4)
    r_num = p_num.add_run(chapter_num_str)
    style_run(r_num, "Times New Roman", 14, bold=True, color=COLOR_PRIMARY)

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
    style_run(r, "Times New Roman", 12, bold=True, italic=True, color=COLOR_TEXT)
    return p

def add_code_snapshot_placeholder(doc, description):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    cell.width = Inches(6.02)
    set_cell_shading(cell, "F2F5F9")
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    set_cell_borders(cell,
        top={"sz": 8, "val": "single", "color": "4A6FA5"},
        bottom={"sz": 8, "val": "single", "color": "4A6FA5"},
        left={"sz": 24, "val": "single", "color": "1F3864"},
        right={"sz": 8, "val": "single", "color": "4A6FA5"}
    )
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(f"[INSERT CODE SNAPSHOT HERE: {description}]")
    style_run(r, "Times New Roman", 11, bold=True, color=RGBColor(0x1F, 0x38, 0x64))
    
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(6)

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
    style_run(r_cap, "Times New Roman", 11, bold=False, italic=True, color=COLOR_TEXT)

def add_table_caption(doc, caption_str):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(caption_str)
    style_run(r, "Times New Roman", 11, bold=True, color=COLOR_PRIMARY)
    return p

def format_styled_table(doc, col_widths, headers, rows_data):
    table = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    # Format Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = Inches(col_widths[i])
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=140, right=140)
        set_cell_shading(hdr_cells[i], "1F3864")
        set_cell_borders(hdr_cells[i],
            top={"sz": 6, "val": "single", "color": "1F3864"},
            bottom={"sz": 12, "val": "single", "color": "1F3864"},
            left={"sz": 4, "val": "single", "color": "D3D3D3"},
            right={"sz": 4, "val": "single", "color": "D3D3D3"}
        )
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(title)
        style_run(r, "Times New Roman", 10.5, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF))

    # Format Body Rows
    for r_idx, row_values in enumerate(rows_data):
        row_cells = table.rows[r_idx + 1].cells
        bg_color = "F9FAFC" if (r_idx % 2 == 1) else "FFFFFF"
        for c_idx, val in enumerate(row_values):
            row_cells[c_idx].width = Inches(col_widths[c_idx])
            set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=120, right=120)
            set_cell_shading(row_cells[c_idx], bg_color)
            set_cell_borders(row_cells[c_idx],
                top={"sz": 4, "val": "single", "color": "E0E0E0"},
                bottom={"sz": 4, "val": "single", "color": "E0E0E0"},
                left={"sz": 4, "val": "single", "color": "E0E0E0"},
                right={"sz": 4, "val": "single", "color": "E0E0E0"}
            )
            p = row_cells[c_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if c_idx != 0 and len(val) > 10 else WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.line_spacing = 1.15
            r = p.add_run(str(val))
            style_run(r, "Times New Roman", 10, bold=(c_idx==0 and len(headers)>3), color=COLOR_TEXT)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(0)
    p_sp.paragraph_format.space_after = Pt(6)

def add_toc_line(doc, title, page_str, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.tab_stops.add_tab_stop(Inches(6.02), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
    p.paragraph_format.space_before = Pt(level == 1 and 4 or 1)
    p.paragraph_format.space_after = Pt(level == 1 and 2 or 1)
    p.paragraph_format.line_spacing = 1.15
    
    if level == 1:
        p.paragraph_format.left_indent = Inches(0)
        r1 = p.add_run(title)
        style_run(r1, "Times New Roman", 11, bold=True, color=COLOR_PRIMARY)
        r2 = p.add_run(f"\t{page_str}")
        style_run(r2, "Times New Roman", 11, bold=True, color=COLOR_PRIMARY)
    elif level == 2:
        p.paragraph_format.left_indent = Inches(0.25)
        r1 = p.add_run(title)
        style_run(r1, "Times New Roman", 10.5, bold=False, color=COLOR_TEXT)
        r2 = p.add_run(f"\t{page_str}")
        style_run(r2, "Times New Roman", 10.5, bold=False, color=COLOR_TEXT)
    else:
        p.paragraph_format.left_indent = Inches(0.45)
        r1 = p.add_run(title)
        style_run(r1, "Times New Roman", 10, bold=False, italic=True, color=COLOR_MUTED)
        r2 = p.add_run(f"\t{page_str}")
        style_run(r2, "Times New Roman", 10, bold=False, italic=True, color=COLOR_MUTED)

print("Report generator initialization complete.")
