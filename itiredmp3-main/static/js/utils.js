const apiCall = async function(endpoint, options = {}) {
    try {
        const response = await fetch('/api/' + endpoint, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            credentials: 'include',
            ...options
        });
        
        if (response.status === 401 && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
            return null;
        }
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

const showNotification = function(message, type = 'info', icon = null) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const iconClass = icon || icons[type] || icons.info;
    notification.innerHTML = `<i class="fas ${iconClass}"></i><span>${escapeHtml(String(message))}</span>`;
    
    container.appendChild(notification);
    
    setTimeout(() => notification.remove(), 4000);
};

const formatDuration = function(ms) {
    if (!ms) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const formatDate = function(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ru-RU');
};

const formatTimeAgo = function(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин`;
    if (hours < 24) return `${hours} ч`;
    if (days < 7) return `${days} д`;
    return date.toLocaleDateString('ru-RU');
};

const openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

const closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
};

const logout = function() {
    fetch('/logout').then(() => window.location.href = '/login');
};

const escapeHtml = function(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

const toggleTheme = function() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    showNotification(newTheme === 'dark' ? 'Тёмная тема' : 'Светлая тема', 'info');
};

const applySavedTheme = function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
};

window.apiCall = apiCall;
window.showNotification = showNotification;
window.formatDuration = formatDuration;
window.formatDate = formatDate;
window.formatTimeAgo = formatTimeAgo;
window.openModal = openModal;
window.closeModal = closeModal;
window.logout = logout;
window.escapeHtml = escapeHtml;
window.toggleTheme = toggleTheme;
window.applySavedTheme = applySavedTheme;
