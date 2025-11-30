const API_BASE = window.location.origin;
let currentUser = null;
let currentToken = null;
let currentOutfit = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentToken = token;
        currentUser = JSON.parse(user);
        showApp();
        loadWeather();
        loadSeasonColors();
    } else {
        showAuth();
    }
    
    // Setup file input handlers
    setupFileHandlers();
    
    // Setup navbar
    setupNavbar();
});

// ==================== AUTHENTICATION ====================

function showAuth() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display = 'none';
}

function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    loadCloset();
    loadProfile();
}

function showSignup() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
}

function showLogin() {
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

async function handleSignup(event) {
    event.preventDefault();
    
    const emailPhone = document.getElementById('signup-email-phone').value;
    const name = document.getElementById('signup-name').value;
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    const photoFile = document.getElementById('signup-photo').files[0];
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('username', username);
    formData.append('password', password);
    
    // Determine if email or phone
    if (emailPhone.includes('@')) {
        formData.append('email', emailPhone);
    } else {
        formData.append('phone', emailPhone);
    }
    
    if (photoFile) {
        formData.append('profile_photo', photoFile);
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            // Try to parse as JSON, but handle HTML error pages
            let errorMessage = 'Signup failed';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    errorMessage = error.detail || error.message || 'Signup failed';
                } else {
                    // HTML error page - get status text
                    errorMessage = `Signup failed: ${response.status} ${response.statusText}`;
                }
            } catch (e) {
                errorMessage = `Signup failed: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        currentToken = data.access_token;
        currentUser = data.user;
        
        localStorage.setItem('token', currentToken);
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        showApp();
        loadWeather();
        loadSeasonColors();
    } catch (error) {
        alert(`Signup failed: ${error.message}`);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            // Try to parse as JSON, but handle HTML error pages
            let errorMessage = 'Login failed';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    errorMessage = error.detail || error.message || 'Login failed';
                } else {
                    errorMessage = `Login failed: ${response.status} ${response.statusText}`;
                }
            } catch (e) {
                errorMessage = `Login failed: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        currentToken = data.access_token;
        currentUser = data.user;
        
        localStorage.setItem('token', currentToken);
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        showApp();
        loadWeather();
        loadSeasonColors();
    } catch (error) {
        alert(`Login failed: ${error.message}`);
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentToken = null;
    currentUser = null;
    showAuth();
}

// ==================== API HELPERS ====================

async function apiCall(endpoint, options = {}) {
    const headers = {
        ...options.headers,
    };
    
    if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
    }
    
    // Don't set Content-Type for FormData - browser will set it with boundary
    const isFormData = options.body instanceof FormData;
    if (isFormData) {
        delete headers['Content-Type'];
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        // Token expired or invalid
        handleLogout();
        throw new Error('Session expired');
    }
    
    return response;
}

// ==================== WEATHER & SEASON ====================

async function loadWeather() {
    try {
        const response = await apiCall('/weather');
        const weather = await response.json();
        
        document.getElementById('weather-icon').textContent = weather.icon || '☀️';
        document.getElementById('weather-temp').textContent = `${weather.temperature}°F`;
        document.getElementById('weather-location').textContent = weather.location || 'Los Angeles';
    } catch (error) {
        console.error('Error loading weather:', error);
    }
}

async function loadSeasonColors() {
    try {
        const response = await apiCall('/season-colors');
        const data = await response.json();
        
        const container = document.getElementById('season-colors');
        container.innerHTML = '';
        
        data.colors.forEach(color => {
            const circle = document.createElement('div');
            circle.className = 'season-color-circle';
            circle.style.backgroundColor = color;
            container.appendChild(circle);
        });
    } catch (error) {
        console.error('Error loading season colors:', error);
    }
}

// ==================== CLOSET ====================

async function loadCloset() {
    const filter = document.getElementById('closet-filter')?.value || '';
    const endpoint = filter ? `/items?slot=${filter}` : '/items';
    
    try {
        const response = await apiCall(endpoint);
        const items = await response.json();
        
        const grid = document.getElementById('closet-grid');
        const empty = document.getElementById('closet-empty');
        
        if (items.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
        } else {
            empty.style.display = 'none';
            grid.innerHTML = items.map(item => `
                <div class="closet-item-card">
                    <img src="${API_BASE}${item.image_url}" alt="${item.type}">
                    <div class="closet-item-info">
                        <h4>${item.type}</h4>
                        <p>${item.slot} • ${item.color_primary}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading closet:', error);
    }
}

// ==================== CAMERA MODAL ====================

function openCameraModal() {
    document.getElementById('camera-modal').style.display = 'flex';
}

function closeCameraModal() {
    document.getElementById('camera-modal').style.display = 'none';
    document.getElementById('upload-progress').style.display = 'none';
}

function setupFileHandlers() {
    document.getElementById('single-item-input')?.addEventListener('change', (e) => {
        handleFileUpload(e, 'single');
    });
    
    document.getElementById('outfit-input')?.addEventListener('change', (e) => {
        handleFileUpload(e, 'outfit');
    });
}

async function handleFileUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    const progress = document.getElementById('upload-progress');
    progress.style.display = 'block';
    
    try {
        const endpoint = type === 'single' ? '/items' : '/items/outfit';
        const response = await apiCall(endpoint, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            // Try to get error message from response
            let errorMessage = 'Upload failed';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    errorMessage = error.detail || error.message || `Upload failed: ${response.status}`;
                } else {
                    errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
                }
            } catch (e) {
                errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        progress.style.display = 'none';
        closeCameraModal();
        loadCloset();
        
        alert(type === 'single' ? 'Item added successfully!' : `${result.total} items added successfully!`);
    } catch (error) {
        progress.style.display = 'none';
        console.error('Upload error:', error);
        alert(`Upload failed: ${error.message}`);
    }
}

// ==================== NAVBAR ====================

function setupNavbar() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Update navbar
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tab}-tab`).classList.add('active');
            
            // Load data for specific tabs
            if (tab === 'closet') {
                loadCloset();
            } else if (tab === 'outfits') {
                loadOutfits();
            } else if (tab === 'profile') {
                loadProfile();
            }
        });
    });
}

// ==================== DISCOVER PAGE ====================

function showDiscoverPage() {
    document.getElementById('discover-modal').style.display = 'flex';
}

function closeDiscoverPage() {
    document.getElementById('discover-modal').style.display = 'none';
}

async function generateOutfit() {
    const formality = document.getElementById('discover-formality').value;
    const season = document.getElementById('discover-season').value;
    const color = document.getElementById('discover-color').value;
    
    const params = new URLSearchParams();
    if (formality) params.append('formality', formality);
    if (season) params.append('season', season);
    if (color) params.append('color', color);
    
    try {
        const response = await apiCall(`/outfits/generate?${params.toString()}`);
        const result = await response.json();
        
        if (!result.outfit || Object.keys(result.outfit).length === 0) {
            alert('No items match your filters. Try different filters or add more items to your closet.');
            return;
        }
        
        currentOutfit = result.outfit;
        closeDiscoverPage();
        showOutfitView();
    } catch (error) {
        alert(`Failed to generate outfit: ${error.message}`);
    }
}

// ==================== OUTFIT VIEW ====================

function showOutfitView() {
    document.getElementById('outfit-view-page').style.display = 'block';
    displayOutfit(currentOutfit);
}

function closeOutfitView() {
    document.getElementById('outfit-view-page').style.display = 'none';
}

function displayOutfit(outfit) {
    // Clear previous outfit
    document.querySelectorAll('.outfit-item').forEach(item => {
        item.innerHTML = '';
    });
    
    const itemsList = document.getElementById('outfit-items-list');
    const itemsHtml = [];
    
    const slotOrder = ['accessory', 'outerwear', 'top', 'bottom', 'shoes'];
    
    slotOrder.forEach(slot => {
        if (outfit[slot]) {
            const item = outfit[slot];
            const itemElement = document.querySelector(`.outfit-item[data-slot="${slot}"]`);
            
            if (itemElement) {
                itemElement.innerHTML = `<img src="${API_BASE}${item.image_url}" alt="${item.type}">`;
            }
            
            itemsHtml.push(`
                <div class="outfit-item-card">
                    <img src="${API_BASE}${item.image_url}" alt="${item.type}">
                    <h4>${item.type}</h4>
                    <p>${item.slot} • ${item.color_primary}</p>
                </div>
            `);
        }
    });
    
    // Handle dress
    if (outfit.dress) {
        const item = outfit.dress;
        const topElement = document.querySelector('.outfit-item[data-slot="top"]');
        const bottomElement = document.querySelector('.outfit-item[data-slot="bottom"]');
        
        if (topElement && bottomElement) {
            topElement.innerHTML = `<img src="${API_BASE}${item.image_url}" alt="${item.type}">`;
            bottomElement.innerHTML = `<img src="${API_BASE}${item.image_url}" alt="${item.type}">`;
        }
        
        itemsHtml.push(`
            <div class="outfit-item-card">
                <img src="${API_BASE}${item.image_url}" alt="${item.type}">
                <h4>${item.type}</h4>
                <p>${item.slot} • ${item.color_primary}</p>
            </div>
        `);
    }
    
    itemsList.innerHTML = itemsHtml.join('');
}

async function regenerateOutfit() {
    const formality = document.getElementById('discover-formality')?.value || '';
    const season = document.getElementById('discover-season')?.value || '';
    const color = document.getElementById('discover-color')?.value || '';
    
    const params = new URLSearchParams();
    if (formality) params.append('formality', formality);
    if (season) params.append('season', season);
    if (color) params.append('color', color);
    
    try {
        const response = await apiCall(`/outfits/generate?${params.toString()}`);
        const result = await response.json();
        
        if (!result.outfit || Object.keys(result.outfit).length === 0) {
            alert('No items match your filters.');
            return;
        }
        
        currentOutfit = result.outfit;
        displayOutfit(currentOutfit);
    } catch (error) {
        alert(`Failed to regenerate outfit: ${error.message}`);
    }
}

async function saveOutfit() {
    if (!currentOutfit) return;
    
    const itemIds = Object.values(currentOutfit).map(item => item.id);
    const filters = {
        formality: document.getElementById('discover-formality')?.value || null,
        season: document.getElementById('discover-season')?.value || null,
        color: document.getElementById('discover-color')?.value || null
    };
    
    try {
        const response = await apiCall('/outfits/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: itemIds,
                filters: filters
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save outfit');
        }
        
        alert('Outfit saved successfully!');
        closeOutfitView();
    } catch (error) {
        alert(`Failed to save outfit: ${error.message}`);
    }
}

// ==================== OUTFITS TAB ====================

async function loadOutfits() {
    try {
        const response = await apiCall('/outfits');
        const outfits = await response.json();
        
        const list = document.getElementById('outfits-list');
        const empty = document.getElementById('outfits-empty');
        
        if (outfits.length === 0) {
            list.innerHTML = '';
            empty.style.display = 'block';
        } else {
            empty.style.display = 'none';
            list.innerHTML = outfits.map(outfit => `
                <div class="outfit-card">
                    <div class="outfit-card-header">
                        <div class="outfit-card-name">${outfit.name || 'Untitled Outfit'}</div>
                        <button class="btn-secondary" onclick="deleteOutfit('${outfit.id}')">Delete</button>
                    </div>
                    <div class="outfit-items-preview">
                        ${outfit.items.map(item => `
                            <img src="${API_BASE}${item.image_url}" alt="${item.type}" class="outfit-item-preview">
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading outfits:', error);
    }
}

async function deleteOutfit(outfitId) {
    if (!confirm('Are you sure you want to delete this outfit?')) return;
    
    try {
        const response = await apiCall(`/outfits/${outfitId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete outfit');
        }
        
        loadOutfits();
    } catch (error) {
        alert(`Failed to delete outfit: ${error.message}`);
    }
}

// ==================== PROFILE ====================

function loadProfile() {
    if (!currentUser) return;
    
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-username').textContent = `@${currentUser.username}`;
    
    const contact = currentUser.email || currentUser.phone || 'No contact info';
    document.getElementById('profile-email-phone').textContent = contact;
    
    if (currentUser.profile_photo_url) {
        document.getElementById('profile-photo').src = `${API_BASE}${currentUser.profile_photo_url}`;
    } else {
        document.getElementById('profile-photo').src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><circle cx="60" cy="60" r="60" fill="%23E0E0E0"/><text x="60" y="80" font-size="40" text-anchor="middle" fill="%23999">👤</text></svg>';
    }
}
