const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use('/drawings', express.static(path.join(__dirname, 'drawings')));

const metadataPath = path.join(__dirname, 'metadata.json');
let metadata = [];
if (fs.existsSync(metadataPath)) {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
}

function getDescription(baseDrawingNo) {
    const found = metadata.find(m => m["DRAWING No."] === baseDrawingNo);
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
                        // Matches a dash or underscore, followed by 1 to 3 digits before .pdf
                        const match = file.match(/^(.*)[-_](\d{1,3})\.pdf$/i);
                        
                        let baseDrawingNo, rev;
                        if (match) {
                            baseDrawingNo = match[1]; 
                            rev = match[2];           
                        } else {
                            baseDrawingNo = file.replace(/\.pdf$/i, '');
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