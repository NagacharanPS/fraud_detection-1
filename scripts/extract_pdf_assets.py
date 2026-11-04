import fitz
import os

pdf_path = r'C:\Users\nagac\.gemini\antigravity-ide\brain\504a7af9-1f18-47f7-978c-8211b363c3cb\.user_uploaded\media_1793009258404.pdf'
out_dir = r'c:\Users\nagac\Desktop\fraud-detection\extracted_images'
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)
extracted = set()
for page_num in range(len(doc)):
    page = doc[page_num]
    for img in page.get_images(full=True):
        xref = img[0]
        if xref in extracted:
            continue
        extracted.add(xref)
        base_img = doc.extract_image(xref)
        img_bytes = base_img['image']
        img_ext = base_img['ext']
        img_name = f'page_{page_num+1}_xref_{xref}.{img_ext}'
        full_path = os.path.join(out_dir, img_name)
        with open(full_path, 'wb') as f:
            f.write(img_bytes)
        print(f"Saved: {img_name} ({base_img['width']}x{base_img['height']})")

print("Done extracting images.")
