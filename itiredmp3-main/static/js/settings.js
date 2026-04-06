// Устаревший файл, но оставлен для совместимости
async function loadSettings() {
    try {
        const settings = await apiCall('settings');
        if (settings) {
            if (document.getElementById('themeSelect')) document.getElementById('themeSelect').value = settings.theme || 'dark';
            if (document.getElementById('languageSelect')) document.getElementById('languageSelect').value = settings.language || 'ru';
            if (document.getElementById('autoPlayToggle')) document.getElementById('autoPlayToggle').checked = settings.auto_play !== false;
            if (document.getElementById('musicService')) document.getElementById('musicService').value = settings.music_service || 'yandex';
        }
    } catch(e) {}
}
async function saveSettings() {
    const data = {
        theme: document.getElementById('themeSelect')?.value,
        language: document.getElementById('languageSelect')?.value,
        auto_play: document.getElementById('autoPlayToggle')?.checked,
        music_service: document.getElementById('musicService')?.value
    };
    try {
        await apiCall('settings', { method: 'POST', body: JSON.stringify(data) });
        showNotification('Настройки сохранены', 'success');
        if (data.theme) document.body.setAttribute('data-theme', data.theme);
    } catch(e) { showNotification('Ошибка', 'error'); }
}