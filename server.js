const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use('/drawings', express.static(path.join(__dirname, 'drawings')));

// Helper: Normalize drawing numbers (converts underscores to dashes, removes spaces)
function normalizeDrawingNo(dNo) {
    return dNo.replace(/_/g, '-').replace(/\s+/g, '').toUpperCase();
}

app.get('/api/drawings', (req, res) => {
    const drawingsDir = path.join(__dirname, 'drawings');
    let data = {};
    
    // Load metadata from the new "data" subfolder
    let metadata = [];
    const metadataPath = path.join(__dirname, 'data', 'metadata.json');
    
    if (fs.existsSync(metadataPath)) {
        try {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        } catch(e) {
            console.error("JSON Parse Error:", e);
        }
    }

    function getDescription(baseDrawingNo) {
        if (!metadata || metadata.length === 0) return "Metadata file missing or empty in data/ folder";
        
        const normalizedBase = normalizeDrawingNo(baseDrawingNo);
        const found = metadata.find(m => {
            if (!m["DRAWING No."]) return false;
            return normalizeDrawingNo(m["DRAWING No."]) === normalizedBase;
        });
        
        return found ? found["DETAILS OF DRAWING"] : "Description not available";
    }

    if (fs.existsSync(drawingsDir)) {
        const folders = fs.readdirSync(drawingsDir, { withFileTypes: true });

        folders.forEach(folder => {
            if (folder.isDirectory()) {
                const folderName = folder.name;
                const folderPath = path.join(drawingsDir, folderName);
                const files = fs.readdirSync(folderPath);
                
                const folderDrawings = {};

                files.forEach(file => {
                    if (file.toLowerCase().endsWith('.pdf')) {
                        // Regex now captures the revision digits AND any text that comes after it
                        const match = file.match(/^(.*)[-_]+(\d{2,3}.*)\.pdf$/i);
                        
                        let baseDrawingNo, rev;
                        if (match) {
                            baseDrawingNo = match[1].trim(); 
                            rev = match[2]; // Captures values like "03_superceded"
                        } else {
                            baseDrawingNo = file.replace(/\.pdf$/i, '').trim();
                            rev = "00";
                        }

                        // Normalize to group underscore files with dash files
                        baseDrawingNo = normalizeDrawingNo(baseDrawingNo);

                        if (!folderDrawings[baseDrawingNo]) {
                            folderDrawings[baseDrawingNo] = {
                                drawingNo: baseDrawingNo,
                                description: getDescription(baseDrawingNo),
                                revisions: []
                            };
                        }

                        folderDrawings[baseDrawingNo].revisions.push({
                            rev: rev,
                            filePath: `/drawings/${folderName}/${file}`
                        });
                    }
                });

                // Sort revisions numerically (parseInt safely extracts just the number from "03_superceded")
                Object.values(folderDrawings).forEach(drawing => {
                    drawing.revisions.sort((a, b) => parseInt(a.rev) - parseInt(b.rev));
                });

                data[folderName] = Object.values(folderDrawings);
            }
        });
    }
    res.json(data);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});