async function loadProfileData() {
    try {
        const profile = await apiCall('profile');
        if (profile) updateProfileForm(profile);
    } catch (error) {
        console.error('Load profile error:', error);
        showNotification('Ошибка загрузки профиля', 'error');
    }
}

function updateProfileForm(profile) {
    if (!profile.local) return;
    const local = profile.local;
    
    const displayName = document.getElementById('display_name');
    const bio = document.getElementById('bio');
    const yandexToken = document.getElementById('yandex_token');
    const vkToken = document.getElementById('vk_token');
    const profileDisplayName = document.getElementById('profileDisplayName');
    const profileUsername = document.getElementById('profileUsername');
    const joinDate = document.getElementById('joinDate');
    const profileAvatar = document.getElementById('profileAvatar');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const headerAvatar = document.getElementById('headerUserAvatar');
    const yandexCheck = document.getElementById('yandexCheck');
    const vkCheck = document.getElementById('vkCheck');
    
    if (displayName) displayName.value = local.display_name || '';
    if (bio) bio.value = local.bio || '';
    if (yandexToken) yandexToken.value = local.yandex_token_set ? '***' : '';
    if (vkToken) vkToken.value = local.vk_token_set ? '***' : '';
    
    if (yandexCheck) yandexCheck.style.display = local.yandex_token_set ? 'inline' : 'none';
    if (vkCheck) vkCheck.style.display = local.vk_token_set ? 'inline' : 'none';
    
    if (local.current_source) {
        document.querySelectorAll('#profile .source-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.dataset.source === local.current_source);
        });
    }
    
    if (profileDisplayName) profileDisplayName.textContent = local.display_name || local.username;
    if (profileUsername) profileUsername.textContent = '@' + local.username;
    if (joinDate && local.created_at) {
        joinDate.textContent = 'На платформе с ' + formatDate(local.created_at);
    }
    
    if (local.avatar_url) {
        updateAllAvatars(local.avatar_url);
    }
}

function updateAllAvatars(url) {
    const avatarHtml = '<img src="' + url + '" alt="" style="width: 100%; height: 100%; object-fit: cover;">';
    
    ['profileAvatar', 'sidebarAvatar', 'headerUserAvatar'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = avatarHtml;
    });
}

document.querySelectorAll('#profile .source-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('#profile .source-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
    });
});

const avatarInput = document.getElementById('avatarInput');
if (avatarInput) {
    avatarInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        var formData = new FormData();
        formData.append('avatar', file);
        
        try {
            var response = await fetch('/api/upload/avatar', {
                method: 'POST',
                body: formData
            });
            var result = await response.json();
            
            if (result.success) {
                showNotification('Аватарка загружена!', 'success');
                updateAllAvatars(result.avatar_url);
                loadProfileData();
            } else {
                showNotification(result.message || 'Ошибка загрузки', 'error');
            }
        } catch (error) {
            console.error('Avatar upload error:', error);
            showNotification('Ошибка загрузки аватарки', 'error');
        }
    });
}

window.triggerAvatarUpload = function() {
    var input = document.getElementById('avatarInput');
    if (input) input.click();
};

const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var activeSource = document.querySelector('#profile .source-btn.active');
        var data = {
            display_name: document.getElementById('display_name')?.value || '',
            bio: document.getElementById('bio')?.value || '',
            yandex_token: document.getElementById('yandex_token')?.value || '',
            vk_token: document.getElementById('vk_token')?.value || '',
            current_source: activeSource?.dataset.source || 'yandex'
        };
        
        if (data.yandex_token === '***') delete data.yandex_token;
        if (data.vk_token === '***') delete data.vk_token;
        
        try {
            var result = await fetch('/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(function(r) { return r.json(); });
            
            if (result.success) {
                showNotification('Профиль сохранён', 'success');
                loadProfileData();
            } else {
                showNotification(result.message || 'Ошибка сохранения', 'error');
            }
        } catch (error) {
            console.error('Save profile error:', error);
            showNotification('Ошибка сохранения', 'error');
        }
    });
}

if (document.getElementById('profileDisplayName')) {
    loadProfileData();
}
