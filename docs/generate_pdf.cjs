const fs = require('fs');
const path = require('path');

// Try to use html2pdf or puppeteer
async function generatePDF() {
    try {
        // First, try puppeteer
        let puppeteer;
        try {
            puppeteer = require('puppeteer');
            console.log('Using Puppeteer for PDF generation...');

            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            const htmlFile = path.join(__dirname, 'rapport_final.html');

            await page.goto(`file://${htmlFile}`, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });

            const pdfFile = path.join(__dirname, 'RAPPORT_PROJET_BOON_FINAL.pdf');
            await page.pdf({
                path: pdfFile,
                format: 'A4',
                margin: {
                    top: '20mm',
                    bottom: '20mm',
                    left: '15mm',
                    right: '15mm'
                },
                printBackground: true,
                displayHeaderFooter: false
            });

            await browser.close();

            if (fs.existsSync(pdfFile)) {
                const stats = fs.statSync(pdfFile);
                console.log('✓ PDF created successfully with Puppeteer!');
                console.log(`  File: ${pdfFile}`);
                console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            }
        } catch (e) {
            if (e.code === 'MODULE_NOT_FOUND') {
                console.log('Puppeteer not found. Please install: npm install puppeteer');
            }
            throw e;
        }
    } catch (error) {
        console.error('Error generating PDF:', error.message);
        process.exit(1);
    }
}

generatePDF();
