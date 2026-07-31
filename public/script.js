document.addEventListener("DOMContentLoaded", async () => {
    // --- AVAILABLE OFFLINE BUTTON LOGIC ---
    const offlineBtn = document.getElementById('offline-btn');
    if (offlineBtn) {
        offlineBtn.addEventListener('click', () => {
            if (!navigator.serviceWorker.controller) {
                alert("Offline engine is not active yet. Refresh the page and try again.");
                return;
            }

            // Gather every single PDF file path from all folders
            let allFilePaths = [];
            Object.values(data).forEach(folderDrawings => {
                folderDrawings.forEach(drawing => {
                    drawing.revisions.forEach(rev => {
                        allFilePaths.push(rev.filePath);
                    });
                });
            });

            if (allFilePaths.length === 0) {
                alert("No drawings found to download.");
                return;
            }

            offlineBtn.disabled = true;
            offlineBtn.textContent = `Downloading (0/${allFilePaths.length})...`;

            // Send the list to the Service Worker
            navigator.serviceWorker.controller.postMessage({
                action: 'CACHE_ALL_DRAWINGS',
                files: allFilePaths
            });
        });

        // Listen for progress updates from the Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'PROGRESS') {
                offlineBtn.textContent = `Downloading (${event.data.current}/${event.data.total})...`;
            } else if (event.data.type === 'COMPLETE') {
                offlineBtn.textContent = 'All Offline Ready!';
                alert("Success! All 500+ drawings have been downloaded and saved for offline use.");
            }
        });
    }
    // --- LOGIN SCREEN LOGIC ---
    const loginBtn = document.getElementById('login-btn');
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const loginError = document.getElementById('login-error');

    loginBtn.addEventListener('click', () => {
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        // Temporary frontend check (We will wire this to the secure backend later)
        if (user === 'divyanshu' && pass === '2880') {
            loginScreen.style.opacity = '0';
            setTimeout(() => {
                loginScreen.style.display = 'none';
                appContainer.style.display = 'block';
                document.body.style.overflow = 'auto'; // Restore scrolling
            }, 500); // Wait for the fade out to finish
        } else {
            loginError.style.display = 'block';
        }
    });

    // --- DASHBOARD LOGIC ---
    const response = await fetch('/api/drawings');
    const data = await response.json();
    
    const folderList = document.getElementById('folder-list');
    const drawingsGrid = document.getElementById('drawings-grid');
    const currentFolderTitle = document.getElementById('current-folder-title');
    const searchBar = document.getElementById('search-bar');
    let allDrawings = []; 

    Object.keys(data).forEach(folderName => {
        const li = document.createElement('li');
        li.textContent = folderName;
        li.onclick = () => loadFolder(folderName, li);
        folderList.appendChild(li);

        data[folderName].forEach(drawing => {
            allDrawings.push({ ...drawing, folder: folderName });
        });
    });

    function renderDrawings(drawings, title) {
        currentFolderTitle.textContent = title;
        drawingsGrid.innerHTML = '';

        if (drawings.length === 0) {
            drawingsGrid.innerHTML = '<p>No drawings found.</p>';
            return;
        }

        drawings.forEach((drawing, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            
            // This creates the cascading animation effect
            card.style.animationDelay = `${index * 0.05}s`; 

            let revisionsHTML = drawing.revisions.map(r => 
                `<a href="${r.filePath}" target="_blank" class="rev-btn">Rev ${r.rev}</a>`
            ).join('');

            card.innerHTML = `
                <h3>${drawing.drawingNo}</h3>
                <p><strong>Folder:</strong> ${drawing.folder || currentFolderTitle.textContent}<br>
                <strong>Desc:</strong> ${drawing.description}</p>
                <div class="revisions">
                    ${revisionsHTML}
                </div>
            `;
            drawingsGrid.appendChild(card);
        });
    }

    function loadFolder(folderName, clickedElement) {
        document.querySelectorAll('#folder-list li').forEach(el => el.classList.remove('active'));
        if (clickedElement) clickedElement.classList.add('active');
        
        searchBar.value = ''; 
        renderDrawings(data[folderName], folderName);
    }

    searchBar.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('#folder-list li').forEach(el => el.classList.remove('active'));

        if (term === '') {
            drawingsGrid.innerHTML = '<p>Select a folder from the sidebar.</p>';
            currentFolderTitle.textContent = 'Select a folder';
            return;
        }

        const filtered = allDrawings.filter(d => 
            d.drawingNo.toLowerCase().includes(term) ||
            d.description.toLowerCase().includes(term) ||
            d.folder.toLowerCase().includes(term)
        );

        renderDrawings(filtered, `Search Results for "${term}"`);
    });
});