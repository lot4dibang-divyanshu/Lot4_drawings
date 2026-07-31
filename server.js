console.log("Starting the engine...");
const express = require('express');
const fs = require('fs');
const path = require('path');
const basicAuth = require('express-basic-auth'); // Import the new security tool
const app = express();

// --- SECURITY CHECKPOINT ---
//Anyone visiting the site MUST pass this test before seeing anything else.

// ----------------------------

// Serve the frontend files
app.use(express.static('public'));

// Serve the drawing PDFs and FORCE the browser to open them in a tab
app.use('/drawings', express.static('drawings', {
    setHeaders: (res, filePath) => {
        if (filePath.toLowerCase().endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
        }
    }
}));

// Load the Excel data (converted to JSON)
let metadata = [];
try {
    metadata = require('./data/metadata.json');
} catch (error) {
    console.log("Note: metadata.json is empty or missing. Add it later.");
}

app.get('/api/drawings', (req, res) => {
    const drawingsDir = path.join(__dirname, 'drawings');
    
    // Safety check: Ensure drawings folder exists
    if (!fs.existsSync(drawingsDir)) {
        return res.json({});
    }

    const folders = fs.readdirSync(drawingsDir).filter(f => fs.statSync(path.join(drawingsDir, f)).isDirectory());
    let responseData = {};

    // Sort folders alphabetically
    folders.sort().forEach(folder => {
        responseData[folder] = [];
        const folderPath = path.join(drawingsDir, folder);
        
        // Find all PDFs in the folder
        const files = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.pdf'));

        const groupedDrawings = {};

        files.forEach(file => {
            // THE SMART FILTER: Extracts blocks of text and ignores messy separators
            const match = file.match(/NHDB[\s\-_]+([A-Z0-9]+)[\s\-_]+41[\s\-_]+DD[\s\-_]+(\d+)[\s\-_]+(\d+)\.pdf$/i);
            
            if (match) {
                const codeBlock = match[1].toUpperCase(); 
                const drawingNum = match[2];              
                const rev = match[3];                     
                
                // Rebuild the base number perfectly to match your Excel format
                const baseNo = `NHDB-${codeBlock}-41-DD-${drawingNum}`;
                
                // Group revisions under this unified base number
                if (!groupedDrawings[baseNo]) {
                    groupedDrawings[baseNo] = [];
                }
                groupedDrawings[baseNo].push({ 
                    rev: rev, 
                    filePath: `/drawings/${folder}/${file}` 
                });
            }
        });

        // Match with metadata and format for the frontend website
        for (const [baseNo, revisions] of Object.entries(groupedDrawings)) {
            // Sort revisions numerically (so 00 comes before 01)
            revisions.sort((a, b) => a.rev.localeCompare(b.rev));
            
            // Look up the description in your metadata file
            const meta = metadata.find(m => m["DRAWING No."] === baseNo) || {};
            
            responseData[folder].push({
                drawingNo: baseNo,
                description: meta["DETAILS OF DRAWING"] || 'Missing description',
                revisions: revisions
            });
        }
    });

    res.json(responseData);
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => console.log(`Server is running! Open your browser to http://localhost:${PORT}`));