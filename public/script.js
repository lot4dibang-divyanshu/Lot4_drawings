document.addEventListener("DOMContentLoaded", async () => {
    
    // --- LOGIN & REMEMBER ME LOGIC ---
    const loginBtn = document.getElementById('login-btn');
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const loginError = document.getElementById('login-error');
    const rememberMe = document.getElementById('remember-me');

    // Check if user previously checked "Remember Me"
    if (localStorage.getItem('isLoggedIn') === 'true') {
        loginScreen.style.display = 'none';
        appContainer.style.display = 'block';
        document.body.style.overflow = 'auto';
    }

    loginBtn.addEventListener('click', () => {
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        if (user === 'divyanshu' && pass === '2880') {
            if (rememberMe.checked) {
                localStorage.setItem('isLoggedIn', 'true');
            }
            loginScreen.style.opacity = '0';
            setTimeout(() => {
                loginScreen.style.display = 'none';
                appContainer.style.display = 'block';
                document.body.style.overflow = 'auto';
            }, 500);
        } else {
            loginError.style.display = 'block';
        }
    });

    // --- DASHBOARD DATA & TUNNEL GRID LOGIC ---
    const response = await fetch('/api/drawings');
    const data = await response.json();
    
    const tunnelsGrid = document.getElementById('tunnels-grid');
    const drawingsGrid = document.getElementById('drawings-grid');
    const viewTitle = document.getElementById('view-title');
    const viewSubtitle = document.getElementById('view-subtitle');
    const homeBtn = document.getElementById('home-btn');
    const searchBar = document.getElementById('search-bar');
    
    let allDrawings = []; 

    // Build flat array for searching
    Object.keys(data).forEach(folderName => {
        data[folderName].forEach(drawing => {
            allDrawings.push({ ...drawing, folder: folderName });
        });
    });

    // Render Tunnel Cards on Initial Load
    function renderTunnels() {
        tunnelsGrid.innerHTML = '';
        tunnelsGrid.style.display = 'grid';
        drawingsGrid.style.display = 'none';
        homeBtn.style.display = 'none';
        
        viewTitle.textContent = "Project Tunnels & Adits";
        viewSubtitle.textContent = "Select a tunnel below to view its drawings, or use global search above.";
        viewSubtitle.style.display = 'block';

        const folders = Object.keys(data);
        if (folders.length === 0) {
            tunnelsGrid.innerHTML = '<p>No tunnel folders found.</p>';
            return;
        }

        folders.forEach((folderName, index) => {
            const count = data[folderName].length;
            const card = document.createElement('div');
            card.className = 'tunnel-card';
            card.style.animation = `slideUp 0.4s ease forwards ${index * 0.04}s`;
            card.innerHTML = `
                <div>
                    <h3>📁 ${folderName}</h3>
                    <p>${count} Drawing Assemblies</p>
                </div>
                <div style="margin-top: 15px; font-size: 0.85rem; color: var(--clr-blue); font-weight: 600;">Tap to view drawings →</div>
            `;
            card.onclick = () => loadTunnelDrawings(folderName);
            tunnelsGrid.appendChild(card);
        });
    }

    // Drill down into a selected tunnel
    function loadTunnelDrawings(folderName) {
        tunnelsGrid.style.display = 'none';
        drawingsGrid.style.display = 'grid';
        homeBtn.style.display = 'inline-block';
        searchBar.value = '';

        viewTitle.textContent = `Tunnel: ${folderName}`;
        viewSubtitle.style.display = 'none';

        drawingsGrid.innerHTML = '';
        const drawings = data[folderName] || [];

        if (drawings.length === 0) {
            drawingsGrid.innerHTML = '<p>No drawings found in this folder.</p>';
            return;
        }

        drawings.forEach((drawing, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animationDelay = `${index * 0.03}s`; 

            let revisionsHTML = drawing.revisions.map(r => 
                `<a href="${r.filePath}" target="_blank" class="rev-btn">Rev ${r.rev}</a>`
            ).join('');

            card.innerHTML = `
                <h3>${drawing.drawingNo}</h3>
                <p><strong>Desc:</strong> ${drawing.description}</p>
                <div class="revisions">
                    ${revisionsHTML}
                </div>
            `;
            drawingsGrid.appendChild(card);
        });
    }

    // Home button listener
    homeBtn.addEventListener('click', () => {
        searchBar.value = '';
        renderTunnels();
    });

    // Global Search listener
    searchBar.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();

        if (term === '') {
            renderTunnels();
            return;
        }

        tunnelsGrid.style.display = 'none';
        drawingsGrid.style.display = 'grid';
        homeBtn.style.display = 'inline-block';
        
        viewTitle.textContent = `Search Results for "${term}"`;
        viewSubtitle.style.display = 'none';
        drawingsGrid.innerHTML = '';

        const filtered = allDrawings.filter(d => 
            d.drawingNo.toLowerCase().includes(term) ||
            d.description.toLowerCase().includes(term) ||
            d.folder.toLowerCase().includes(term)
        );

        if (filtered.length === 0) {
            drawingsGrid.innerHTML = '<p>No matching drawings found.</p>';
            return;
        }

        filtered.forEach((drawing, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animationDelay = `${index * 0.03}s`; 

            let revisionsHTML = drawing.revisions.map(r => 
                `<a href="${r.filePath}" target="_blank" class="rev-btn">Rev ${r.rev}</a>`
            ).join('');

            card.innerHTML = `
                <h3>${drawing.drawingNo}</h3>
                <p><strong>Tunnel:</strong> ${drawing.folder}<br>
                <strong>Desc:</strong> ${drawing.description}</p>
                <div class="revisions">
                    ${revisionsHTML}
                </div>
            `;
            drawingsGrid.appendChild(card);
        });
    });

    // Initialize the homepage view
    renderTunnels();

    // --- AVAILABLE OFFLINE BUTTON LOGIC ---
    const offlineBtn = document.getElementById('offline-btn');
    if (offlineBtn) {
        offlineBtn.addEventListener('click', () => {
            if (!navigator.serviceWorker.controller) {
                alert("Offline engine is not active yet. Refresh the page and try again.");
                return;
            }

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

            navigator.serviceWorker.controller.postMessage({
                action: 'CACHE_ALL_DRAWINGS',
                files: allFilePaths
            });
        });

        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'PROGRESS') {
                offlineBtn.textContent = `Downloading (${event.data.current}/${event.data.total})...`;
            } else if (event.data.type === 'COMPLETE') {
                offlineBtn.textContent = 'All Offline Ready!';
                alert("Success! All drawings have been downloaded for offline use.");
            }
        });
    }
});