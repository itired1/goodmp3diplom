let friendsList = [];

async function loadFriends() {
    const container = document.getElementById('friendsList');
    if (!container) return;
    
    container.innerHTML = '<div class="queue-placeholder"><i class="fas fa-spinner fa-spin"></i><p>Загрузка...</p></div>';
    
    try {
        friendsList = await apiCall('friends') || [];
        updateFriendsCount();
        displayFriendsList();
    } catch (error) {
        console.error('Load friends error:', error);
        container.innerHTML = '<div class="queue-placeholder"><i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i><p>Ошибка загрузки</p></div>';
    }
}

function updateFriendsCount() {
    const accepted = friendsList.filter(function(f) { return f.status === 'accepted'; });
    const countEl = document.getElementById('friendsCount');
    if (countEl) countEl.textContent = '(' + accepted.length + ')';
}

function displayFriendsList() {
    const container = document.getElementById('friendsList');
    if (!container) return;
    
    const accepted = friendsList.filter(function(f) { return f.status === 'accepted'; });
    const pending = friendsList.filter(function(f) { return f.status === 'pending' && f.direction === 'incoming'; });
    
    let html = '';
    
    if (pending.length > 0) {
        html += '<div style="margin-bottom: 16px;"><h4 style="color: var(--text-secondary); margin-bottom: 8px;">Запросы в друзья</h4>';
        pending.forEach(function(f) {
            html += '<div style="background: var(--bg-elevated); border-radius: 8px; padding: 12px; margin-bottom: 8px;">' +
                '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">' +
                '<div style="display: flex; align-items: center; gap: 8px;">' +
                '<div style="width: 36px; height: 36px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center;"><i class="fas fa-user" style="color: var(--bg);"></i></div>' +
                '<div><div style="font-weight: 600;">' + escapeHtml(f.display_name || f.username) + '</div><div style="font-size: 12px; color: var(--text-muted);">@' + escapeHtml(f.username) + '</div></div>' +
                '</div>' +
                '<span style="color: var(--accent); font-size: 12px;">' + (f.taste_match || 0) + '%</span>' +
                '</div>' +
                '<button class="btn-primary" style="width: 100%; padding: 8px;" onclick="acceptFriend(' + f.id + ')">' +
                '<i class="fas fa-check"></i> Принять' +
                '</button></div>';
        });
        html += '</div>';
    }
    
    if (accepted.length > 0) {
        html += '<h4 style="color: var(--text-secondary); margin-bottom: 8px;">Друзья</h4>';
        accepted.forEach(function(f) {
            html += '<div style="background: var(--bg-elevated); border-radius: 8px; padding: 12px; margin-bottom: 8px; cursor: pointer;" onclick="viewFriendProfile(' + f.id + ')">' +
                '<div style="display: flex; align-items: center; gap: 12px;">' +
                '<div style="width: 36px; height: 36px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center;"><i class="fas fa-user" style="color: var(--bg);"></i></div>' +
                '<div style="flex: 1;"><div style="font-weight: 500;">' + escapeHtml(f.display_name || f.username) + '</div><div style="font-size: 12px; color: var(--text-muted);">@' + escapeHtml(f.username) + '</div></div>' +
                '<span style="color: var(--accent); font-size: 12px;">' + (f.taste_match || 0) + '%</span>' +
                '</div></div>';
        });
    }
    
    if (!html) {
        html = '<div class="queue-placeholder"><i class="fas fa-user-friends" style="font-size: 2rem;"></i><p>Нет друзей</p><p style="font-size: 0.85rem; color: var(--text-muted);">Нажмите "Найти друзей" для поиска</p></div>';
    }
    
    container.innerHTML = html;
}

window.viewFriendProfile = async function(userId) {
    try {
        const data = await apiCall('user/' + userId);
        
        const displayNameEl = document.getElementById('modalDisplayName');
        const usernameEl = document.getElementById('modalUsername');
        const bioEl = document.getElementById('modalBio');
        const avatarEl = document.getElementById('modalAvatar');
        const addFriendBtn = document.getElementById('modalAddFriendBtn');
        
        if (displayNameEl) displayNameEl.textContent = data.display_name || data.username;
        if (usernameEl) usernameEl.textContent = '@' + data.username;
        if (bioEl) bioEl.textContent = data.bio || 'Пользователь пока ничего не рассказал о себе';
        if (avatarEl) avatarEl.src = data.avatar_url || '';
        
        if (addFriendBtn) {
            if (data.is_friend) {
                addFriendBtn.innerHTML = '<i class="fas fa-check"></i> Уже в друзьях';
                addFriendBtn.disabled = true;
            } else {
                addFriendBtn.innerHTML = '<i class="fas fa-user-plus"></i> Добавить в друзья';
                addFriendBtn.disabled = false;
                addFriendBtn.onclick = function() { addFriend(userId); };
            }
        }
        
        openModal('userProfileModal');
    } catch (error) {
        console.error('View friend profile error:', error);
        showNotification('Ошибка загрузки профиля', 'error');
    }
};

window.addFriend = async function(userId) {
    try {
        const result = await apiCall('friends/add/' + userId, { method: 'POST' });
        if (result && result.success) {
            showNotification('Запрос отправлен', 'success');
            closeModal('userProfileModal');
            loadFriends();
        } else {
            showNotification(result?.message || 'Ошибка', 'error');
        }
    } catch (error) {
        console.error('Add friend error:', error);
        showNotification('Ошибка отправки запроса', 'error');
    }
};

window.acceptFriend = async function(friendId) {
    try {
        const result = await apiCall('friends/accept/' + friendId, { method: 'POST' });
        if (result && result.success) {
            showNotification('Друг добавлен', 'success');
            loadFriends();
        } else {
            showNotification(result?.message || 'Ошибка', 'error');
        }
    } catch (error) {
        console.error('Accept friend error:', error);
        showNotification('Ошибка', 'error');
    }
};

window.findMusicFriends = function() {
    openModal('friendSearchModal');
    setTimeout(function() {
        var input = document.getElementById('friendSearchInput');
        if (input) input.focus();
    }, 100);
};

document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('friendSearchInput');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchFriends();
            }
        });
    }
});

window.searchFriends = async function() {
    const input = document.getElementById('friendSearchInput');
    const query = input ? input.value.trim() : '';
    
    if (!query || query.length < 2) {
        showNotification('Введите минимум 2 символа', 'warning');
        return;
    }
    
    const container = document.getElementById('friendSearchResults');
    if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin" style="font-size: 24px;"></i><p style="margin-top: 12px;">Поиск...</p></div>';
    }
    
    try {
        const results = await apiCall('friends/search?q=' + encodeURIComponent(query));
        
        if (container) {
            if (!results || !results.length) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">Пользователи не найдены</p>';
                return;
            }
            
            let html = '';
            results.forEach(function(user) {
                const avatar = user.avatar_url 
                    ? '<img src="' + user.avatar_url + '" alt="" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">'
                    : '<div style="width: 40px; height: 40px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center;"><i class="fas fa-user" style="color: var(--bg);"></i></div>';
                
                html += '<div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-elevated); border-radius: 8px; margin-bottom: 8px;">' +
                    avatar +
                    '<div style="flex: 1;">' +
                    '<div style="font-weight: 500;">' + escapeHtml(user.display_name || user.username) + '</div>' +
                    '<div style="font-size: 12px; color: var(--text-muted);">@' + escapeHtml(user.username) + '</div>' +
                    '<div style="font-size: 11px; color: var(--text-muted);">ID: ' + user.id + '</div>' +
                    '</div>' +
                    (user.is_friend 
                        ? '<span style="color: #2ed573; font-size: 12px;"><i class="fas fa-check"></i> Друг</span>'
                        : '<button class="btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="addFriend(' + user.id + ')"><i class="fas fa-user-plus"></i> Добавить</button>'
                    ) +
                    '</div>';
            });
            
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Search friends error:', error);
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: #ff6b6b; padding: 20px;">Ошибка поиска</p>';
        }
    }
};

if (document.getElementById('friendsList')) {
    loadFriends();
}
