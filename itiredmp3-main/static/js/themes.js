// Управление темами
async function loadThemes() {
    try {
        const data = await apiCall('themes');
        const container = document.getElementById('themesContainer');
        if (!container) return;
        let html = '<div class="themes-grid">';
        if (data.customThemes && data.customThemes.length) {
            data.customThemes.forEach(theme => {
                html += `
                    <div class="theme-card">
                        <div class="theme-preview" style="background: ${theme.colors.bgPrimary || '#1a1a1a'}">
                            ${theme.background_url ? `<img src="${theme.background_url}" alt="${theme.name}">` : '<div class="theme-colors"><span style="background: var(--accent)"></span><span style="background: var(--success)"></span></div>'}
                        </div>
                        <div class="theme-info">
                            <h4>${escapeHtml(theme.name)}</h4>
                            <div class="theme-actions">
                                <button onclick="applyCustomTheme(${theme.id})">Применить</button>
                                <button onclick="deleteCustomTheme(${theme.id})">Удалить</button>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else html += '<p class="empty-state">Нет созданных тем</p>';
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        showNotification('Ошибка загрузки тем', 'error');
    }
}

window.applyCustomTheme = async function(themeId) {
    try {
        const themes = await apiCall('themes');
        const theme = themes.customThemes.find(t => t.id === themeId);
        if (theme) {
            for (const [key, value] of Object.entries(theme.colors)) {
                document.documentElement.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
            }
            if (theme.background_url) document.body.style.backgroundImage = `url(${theme.background_url})`;
            showNotification(`Тема "${theme.name}" применена`, 'success');
            closeModal('themesModal');
        }
    } catch (error) { showNotification('Ошибка', 'error'); }
};

window.deleteCustomTheme = async function(themeId) {
    if (!confirm('Удалить тему?')) return;
    try {
        await apiCall(`themes/${themeId}`, { method: 'DELETE' });
        showNotification('Тема удалена', 'success');
        loadThemes();
    } catch (error) { showNotification('Ошибка', 'error'); }
};

window.showThemeCreator = function() {
    closeModal('themesModal');
    openModal('themeCreatorModal');
};

document.getElementById('themeCreatorForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const themeData = {
        name: document.getElementById('themeName').value,
        colors: {
            bgPrimary: document.getElementById('bgPrimary').value,
            bgSecondary: document.getElementById('bgSecondary').value,
            textPrimary: document.getElementById('textPrimary').value,
            accent: document.getElementById('accent').value,
        },
        background_url: document.getElementById('themeBackground').value || null
    };
    if (!themeData.name.trim()) return showNotification('Введите название', 'error');
    try {
        await apiCall('themes', {
            method: 'POST',
            body: JSON.stringify({ action: 'save_custom', theme: themeData })
        });
        showNotification('Тема сохранена', 'success');
        closeModal('themeCreatorModal');
        loadThemes();
    } catch (error) { showNotification('Ошибка сохранения', 'error'); }
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}