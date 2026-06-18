#!/usr/bin/env python3
import os
from weasyprint import HTML, CSS

# Change to docs directory
os.chdir(r'c:\Users\yep\Desktop\reacte\boonF\docs')

try:
    # Convert HTML to PDF
    html_file = 'rapport_final.html'
    pdf_file = 'RAPPORT_PROJET_BOON_FINAL.pdf'
    
    print(f"Converting {html_file} to PDF...")
    
    # Load HTML and convert to PDF
    HTML(html_file).write_pdf(pdf_file)
    
    # Check file size
    if os.path.exists(pdf_file):
        file_size = os.path.getsize(pdf_file)
        print(f"✓ PDF created successfully!")
        print(f"  File: {pdf_file}")
        print(f"  Size: {file_size:,} bytes ({file_size / 1024 / 1024:.2f} MB)")
    else:
        print("✗ Error: PDF file was not created")
        
except Exception as e:
    print(f"✗ Error during conversion: {str(e)}")
    import traceback
    traceback.print_exc()
