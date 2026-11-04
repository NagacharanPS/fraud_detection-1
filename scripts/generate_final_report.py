import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

sys.stdout.reconfigure(encoding='utf-8')

# Import front matter builder and chapters appender
import build_full_report
import append_chapters

print("Starting generation of UPI_PayGuard_Project_Report_Formatted.docx...")

doc = build_full_report.doc

helpers = {
    'add_para': build_full_report.add_para,
    'add_bullet': build_full_report.add_bullet,
    'add_chapter_header': build_full_report.add_chapter_header,
    'add_heading_1': build_full_report.add_heading_1,
    'add_heading_2': build_full_report.add_heading_2,
    'add_heading_3': build_full_report.add_heading_3,
    'add_figure': build_full_report.add_figure,
    'add_table_caption': build_full_report.add_table_caption,
    'format_styled_table': build_full_report.format_styled_table,
    'add_prelim_header': build_full_report.add_prelim_header,
    'COLOR_PRIMARY': build_full_report.COLOR_PRIMARY,
    'COLOR_SECONDARY': build_full_report.COLOR_SECONDARY,
    'COLOR_TEXT': build_full_report.COLOR_TEXT,
    'COLOR_MUTED': build_full_report.COLOR_MUTED
}

append_chapters.append_all_chapters(doc, helpers)

output_path1 = r"c:\Users\nagac\Desktop\fraud-detection\A_Graph_Based_System_for_Detecting_Suspicious_Transactions_in_Financial_Networks.docx"
output_path2 = r"c:\Users\nagac\Desktop\A_Graph_Based_System_for_Detecting_Suspicious_Transactions_in_Financial_Networks.docx"
output_path_compat = r"c:\Users\nagac\Desktop\fraud-detection\UPI_PayGuard_Project_Report_Formatted.docx"
output_path_desktop_compat = r"c:\Users\nagac\Desktop\UPI_PayGuard_Project_Report_Formatted.docx"

doc.save(output_path1)
doc.save(output_path2)
doc.save(output_path_compat)
doc.save(output_path_desktop_compat)

print(f"Report successfully generated and saved to:")
print(f" 1. {output_path1}")
print(f" 2. {output_path2}")
print(f" 3. {output_path_compat}")
print(f" 4. {output_path_desktop_compat}")
