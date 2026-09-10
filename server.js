const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use('/drawings', express.static(path.join(__dirname, 'drawings')));

// 1. Load Metadata (Checks for metadata.json or metadata_2.json)
let metadataPath = path.join(__dirname, 'metadata.json');
if (!fs.existsSync(metadataPath)) {
    metadataPath = path.join(__dirname, 'metadata_2.json');
}

let metadata = [];
if (fs.existsSync(metadataPath)) {
    try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    } catch (e) {
        console.error("Error reading metadata file:", e);
    }
}

// 2. Smart Description Finder: Ignores spaces and case mismatches
function getDescription(baseDrawingNo) {
    if (!metadata || metadata.length === 0) return "Metadata file missing or empty";
    
    // Strip all spaces and uppercase the filename base
    const normalizedBase = baseDrawingNo.replace(/\s+/g, '').toUpperCase();
    
    const found = metadata.find(m => {
        if (!m["DRAWING No."]) return false;
        // Strip all spaces and uppercase the metadata drawing number
        const normalizedMeta = m["DRAWING No."].replace(/\s+/g, '').toUpperCase();
        return normalizedMeta === normalizedBase;
    });
    
    return found ? found["DETAILS OF DRAWING"] : "Description not available";
}

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
                
                const folderDrawings = {};

                files.forEach(file => {
                    if (file.toLowerCase().endsWith('.pdf')) {
                        // 3. Smart Regex: Matches EITHER a dash (-) or underscore (_) before the revision digits
                        const match = file.match(/^(.*)[-_](\d{1,3})\.pdf$/i);
                        
                        let baseDrawingNo, rev;
                        if (match) {
                            baseDrawingNo = match[1].trim(); 
                            rev = match[2];           
                        } else {
                            baseDrawingNo = file.replace(/\.pdf$/i, '').trim();
                            rev = "00";
                        }

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

                // Sort revisions nicely inside the card
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