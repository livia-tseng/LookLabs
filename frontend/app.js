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
    } else {
        showAuth();
    }
    
    // Setup file input handlers
    setupFileHandlers();
});

// ==================== AUTHENTICATION ====================

function showAuth() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display = 'none';
}

function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    
    // Setup navbar when app is shown (after DOM is ready)
    setTimeout(() => {
        setupNavbar();
    }, 50);
    
    // Load initial data
    loadCloset();
    loadWeather();
    loadSeasonColors();
    loadUserProfileInCloset();
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
        loadUserProfileInCloset();
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
        loadUserProfileInCloset();
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
        
        // Update weather widget
        const locationText = document.getElementById('weather-location-text');
        const dateText = document.getElementById('weather-date-text');
        const tempText = document.getElementById('weather-temp-text');
        const iconDisplay = document.getElementById('weather-icon-display');
        
        if (locationText) {
            locationText.textContent = weather.location || 'Los Angeles';
        }
        
        if (dateText) {
            const now = new Date();
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const dayName = days[now.getDay()];
            const monthName = months[now.getMonth()];
            const day = now.getDate();
            dateText.textContent = `${dayName} ${monthName} ${day}`;
        }
        
        if (tempText) {
            tempText.textContent = `${weather.temperature}°F`;
        }
        
        if (iconDisplay) {
            iconDisplay.textContent = weather.icon || '☀️';
        }
    } catch (error) {
        console.error('Error loading weather:', error);
    }
}

function showSeasonColorsModal() {
    // Create a simple modal to show season colors
    const colors = getSeasonColors();
    const colorsHtml = colors.map(color => 
        `<div style="width: 50px; height: 50px; border-radius: 50%; background: ${color}; border: 2px solid #D0D0D0; display: inline-block; margin: 5px;"></div>`
    ).join('');
    
    alert(`Current Season Colors:\n${colors.map(c => c).join(', ')}`);
}

async function loadSeasonColors() {
    try {
        const response = await apiCall('/season-colors');
        const data = await response.json();
        
        // Store colors for later use
        window.seasonColors = data.colors;
        
        // Display season colors
        const container = document.getElementById('season-colors');
        if (container) {
            container.innerHTML = '';
            data.colors.forEach(color => {
                const circle = document.createElement('div');
                circle.className = 'season-color-circle';
                circle.style.backgroundColor = color;
                container.appendChild(circle);
            });
        }
    } catch (error) {
        console.error('Error loading season colors:', error);
    }
}

function showSeasonColors() {
    // Scroll to season colors section
    const section = document.getElementById('season-colors-display');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ==================== CLOSET ====================

async function loadCloset() {
    const filterSelect = document.getElementById('closet-filter');
    const filter = filterSelect?.value || '';
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
            grid.innerHTML = items.map(item => {
                // Build hover details text
                const details = [];
                if (item.pattern && item.pattern !== 'solid' && item.pattern !== 'unknown') {
                    details.push(item.pattern);
                }
                if (item.material && item.material !== 'unknown') {
                    details.push(item.material);
                }
                if (item.fit && item.fit !== 'regular' && item.fit !== 'unknown') {
                    details.push(item.fit);
                }
                if (item.formality && item.formality !== 'casual' && item.formality !== 'unknown') {
                    details.push(item.formality);
                }
                if (item.season && Array.isArray(item.season) && item.season.length > 0) {
                    details.push(item.season.join(', '));
                }
                if (item.features && Array.isArray(item.features) && item.features.length > 0) {
                    details.push(item.features.join(', '));
                }
                
                const hoverDetails = details.length > 0 ? details.join(' • ') : '';
                
                return `
                <div class="closet-item-card" data-item-id="${item.id}">
                    <button class="delete-item-btn" onclick="deleteItem('${item.id}', event)" title="Delete item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                    <img src="${API_BASE}${item.image_url}" alt="${item.type}">
                    <div class="closet-item-info">
                        <div class="closet-item-type">${item.type}</div>
                        <div class="closet-item-details">${item.slot} • ${item.color_primary}</div>
                        ${hoverDetails ? `<div class="closet-item-hover-details">${hoverDetails}</div>` : ''}
                    </div>
                </div>
            `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading closet:', error);
    }
}

async function deleteItem(itemId, event) {
    event.stopPropagation(); // Prevent card click events
    
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    try {
        const response = await apiCall(`/items/${itemId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            // Reload the closet to reflect the deletion
            await loadCloset();
        } else {
            const error = await response.json();
            alert(`Failed to delete item: ${error.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item. Please try again.');
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
    const navbar = document.querySelector('.navbar');
    if (!navbar) {
        console.warn('Navbar not found, retrying...');
        setTimeout(setupNavbar, 100);
        return;
    }
    
    // Use event delegation on the navbar itself
    navbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-item');
        if (!btn) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const tab = btn.dataset.tab;
        if (!tab) {
            console.warn('No data-tab attribute on button');
            return;
        }
        
        console.log('Navbar clicked:', tab);
        
        // Update navbar
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const tabElement = document.getElementById(`${tab}-tab`);
        if (tabElement) {
            tabElement.classList.add('active');
            console.log('Switched to tab:', tab);
        } else {
            console.error('Tab element not found:', `${tab}-tab`);
        }
        
        // Load data for specific tabs
        if (tab === 'closet') {
            loadCloset();
            loadUserProfileInCloset();
        } else if (tab === 'outfits') {
            loadOutfits();
        } else if (tab === 'profile') {
            loadProfile();
        }
    });
    
    console.log('Navbar setup complete with', document.querySelectorAll('.nav-item').length, 'items');
}

function loadUserProfileInCloset() {
    if (!currentUser) return;
    
    document.getElementById('user-name-display').textContent = currentUser.name;
    document.getElementById('user-username-display').textContent = `@${currentUser.username}`;
    
    if (currentUser.profile_photo_url) {
        document.getElementById('user-profile-photo').src = `${API_BASE}${currentUser.profile_photo_url}`;
    }
}

function setCategoryFilter(filter) {
    // Update active category button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    // Update hidden filter select and reload
    const filterSelect = document.getElementById('closet-filter');
    if (filterSelect) {
        filterSelect.value = filter;
    }
    loadCloset();
}

function showSeasonColors() {
    // Show season colors in a modal or expand the section
    alert('Season colors are displayed below. Scroll down to see them!');
}

function toggleRandomFilter() {
    // Toggle between Random and other options
    // For now, just keep it as Random
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
        
        if (!response.ok) {
            // Try to get error message from response
            let errorMessage = 'Failed to generate outfit';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    errorMessage = error.detail || error.message || `Failed to generate outfit: ${response.status}`;
                } else {
                    errorMessage = `Failed to generate outfit: ${response.status} ${response.statusText}`;
                }
            } catch (e) {
                errorMessage = `Failed to generate outfit: ${response.status} ${response.statusText}`;
            }
            alert(errorMessage);
            return;
        }
        
        const result = await response.json();
        
        if (!result.outfit || Object.keys(result.outfit).length === 0) {
            alert('No items match your filters. Try different filters or add more items to your closet.');
            return;
        }
        
        currentOutfit = result.outfit;
        closeDiscoverPage();
        showOutfitView();
    } catch (error) {
        console.error('Error generating outfit:', error);
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
    const displayContainer = document.getElementById('outfit-items-display');
    const itemsHtml = [];
    
    const slotOrder = ['outerwear', 'top', 'bottom', 'shoes', 'accessory'];
    
    slotOrder.forEach(slot => {
        if (outfit[slot]) {
            const item = outfit[slot];
            itemsHtml.push(`
                <div class="outfit-item-display">
                    <img src="${API_BASE}${item.image_url}" alt="${item.type}">
                    <div class="outfit-item-info">
                        <h4>${item.type}</h4>
                        <p>${item.slot} • ${item.color_primary}</p>
                    </div>
                </div>
            `);
        }
    });
    
    // Handle dress
    if (outfit.dress) {
        const item = outfit.dress;
        itemsHtml.push(`
            <div class="outfit-item-display">
                <img src="${API_BASE}${item.image_url}" alt="${item.type}">
                <div class="outfit-item-info">
                    <h4>${item.type}</h4>
                    <p>${item.slot} • ${item.color_primary}</p>
                </div>
            </div>
        `);
    }
    
    displayContainer.innerHTML = itemsHtml.join('');
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
        
        if (!response.ok) {
            // Try to get error message from response
            let errorMessage = 'Failed to regenerate outfit';
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    errorMessage = error.detail || error.message || `Failed to regenerate outfit: ${response.status}`;
                } else {
                    errorMessage = `Failed to regenerate outfit: ${response.status} ${response.statusText}`;
                }
            } catch (e) {
                errorMessage = `Failed to regenerate outfit: ${response.status} ${response.statusText}`;
            }
            alert(errorMessage);
            return;
        }
        
        const result = await response.json();
        
        if (!result.outfit || Object.keys(result.outfit).length === 0) {
            alert('No items match your filters.');
            return;
        }
        
        currentOutfit = result.outfit;
        displayOutfit(currentOutfit);
    } catch (error) {
        console.error('Error regenerating outfit:', error);
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
                <div class="outfit-card" data-outfit-id="${outfit.id}">
                    <div class="outfit-card-header">
                        <div class="outfit-name-container">
                            <span class="outfit-card-name" id="outfit-name-${outfit.id}">${outfit.name || 'Untitled Outfit'}</span>
                            <button class="rename-btn" onclick="startRenameOutfit('${outfit.id}')" title="Rename outfit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        </div>
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

function startRenameOutfit(outfitId) {
    const nameElement = document.getElementById(`outfit-name-${outfitId}`);
    if (!nameElement) return;
    
    const currentName = nameElement.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'outfit-name-input';
    input.style.width = '100%';
    input.style.padding = '4px 8px';
    input.style.border = '2px solid var(--olive-green)';
    input.style.borderRadius = '6px';
    input.style.fontSize = '1rem';
    input.style.fontWeight = '600';
    
    const container = nameElement.parentElement;
    container.replaceChild(input, nameElement);
    input.focus();
    input.select();
    
    const finishRename = async () => {
        const newName = input.value.trim() || 'Untitled Outfit';
        try {
            const response = await apiCall(`/outfits/${outfitId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newName })
            });
            
            if (!response.ok) {
                throw new Error('Failed to rename outfit');
            }
            
            // Reload outfits to show updated name
            await loadOutfits();
        } catch (error) {
            alert(`Failed to rename outfit: ${error.message}`);
            // Restore original name on error
            container.replaceChild(nameElement, input);
        }
    };
    
    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        } else if (e.key === 'Escape') {
            container.replaceChild(nameElement, input);
        }
    });
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
