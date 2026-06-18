const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const htmlFile = path.join(__dirname, 'rapport_final.html');
    const pdfFile = path.join(__dirname, 'RAPPORT_PROJET_BOON_FINAL.pdf');

    console.log(`Converting ${htmlFile} to PDF...`);

    // Load the HTML file
    await page.goto(`file://${htmlFile}`, { waitUntil: 'networkidle' });

    // Generate PDF
    await page.pdf({
        path: pdfFile,
        format: 'A4',
        margin: {
            top: '20mm',
            bottom: '20mm',
            left: '15mm',
            right: '15mm'
        },
        displayHeaderFooter: false,
        printBackground: true,
        waitForNavigation: 'networkidle'
    });

    await browser.close();

    // Check if PDF was created
    if (fs.existsSync(pdfFile)) {
        const stats = fs.statSync(pdfFile);
        console.log('✓ PDF created successfully!');
        console.log(`  File: ${pdfFile}`);
        console.log(`  Size: ${stats.size.toLocaleString()} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
        console.log('✗ Error: PDF file was not created');
        process.exit(1);
    }
})();
