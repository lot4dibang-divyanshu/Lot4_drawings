const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Serve static frontend files from public folder
app.use(express.static(path.join(__dirname, 'public')));
// Serve your engineering drawings folder statically so PDFs can load
app.use('/drawings', express.static(path.join(__dirname, 'drawings')));

// API endpoint that scans your subfolders and returns the drawing JSON
app.get('/api/drawings', (req, res) => {
    const drawingsDir = path.join(__dirname, 'drawings');
    let data = {};

    if (fs.existsSync(drawingsDir)) {
        const folders = fs.readdirSync(drawingsDir, { withFileTypes: true });

        folders.forEach(folder => {
            if (folder.isDirectory()) {
                const folderName = folder.name;
                const folderPath = path.join(drawingsDir, folderName);
                const files = fs.readdirSync(folderPath);

                data[folderName] = [];

                files.forEach(file => {
                    if (file.toLowerCase().endsWith('.pdf')) {
                        data[folderName].push({
                            drawingNo: file.replace('.pdf', ''),
                            description: `Drawing file: ${file}`,
                            revisions: [
                                { rev: "1", filePath: `/drawings/${folderName}/${file}` }
                            ]
                        });
                    }
                });
            }
        });
    }

    res.json(data);
});

// Fallback to index.html for frontend routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export app for Vercel serverless environment
module.exports = app;

// Local development fallback
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}