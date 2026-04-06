let notificationsList = [];
let unreadCount = 0;

async function loadNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    container.innerHTML = `
        <div class="queue-placeholder">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Загрузка...</p>
        </div>
    `;
    
    try {
        notificationsList = await apiCall('notifications') || [];
        displayNotifications();
        updateNotificationBadge();
    } catch (error) {
        console.error('Load notifications error:', error);
        container.innerHTML = `
            <div class="queue-placeholder">
                <i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i>
                <p>Ошибка загрузки</p>
            </div>
        `;
    }
}

function displayNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (!notificationsList.length) {
        container.innerHTML = '<div class="queue-placeholder"><i class="fas fa-bell-slash"></i><p>Нет уведомлений</p><p class="text-muted" style="font-size: 0.85rem;">Здесь появятся запросы в друзья и подарки</p></div>';
        return;
    }
    
    let html = '';
    notificationsList.forEach(function(notif) {
        const iconMap = {
            'friend_request': 'fa-user-plus',
            'friend_accepted': 'fa-user-check',
            'new_track': 'fa-music',
            'playlist_shared': 'fa-list-music',
            'achievement': 'fa-trophy',
            'gift_received': 'fa-gift',
            'system': 'fa-info-circle'
        };
        
        const colorMap = {
            'friend_request': 'var(--accent)',
            'friend_accepted': '#4ecdc4',
            'new_track': '#ffd700',
            'playlist_shared': 'var(--accent)',
            'achievement': '#fd7e14',
            'gift_received': '#a855f7',
            'system': 'var(--text-secondary)'
        };
        
        const icon = iconMap[notif.type] || 'fa-bell';
        const color = colorMap[notif.type] || 'var(--text-secondary)';
        const timeAgo = formatTimeAgo(notif.created_at);
        const isUnread = !notif.read;
        
        if (notif.type === 'gift_received' && notif.gift_data) {
            html += '<div class="gift-notification" style="margin-bottom: 12px; cursor: pointer;" onclick="handleNotificationClick(\'' + notif.id + '\', \'' + notif.type + '\', null)">' +
                '<i class="fas fa-gift" style="font-size: 32px;"></i>' +
                '<div style="flex: 1;">' +
                '<div style="font-weight: 600; margin-bottom: 4px;"><i class="fas fa-gift"></i> Вы получили подарок!</div>' +
                '<div style="font-size: 13px; opacity: 0.9;">' + escapeHtml(notif.gift_data.item_name || notif.message) + ' от ' + escapeHtml(notif.gift_data.from_username || 'друга') + '</div>' +
                '</div>' +
                (isUnread ? '<span class="notification-badge"></span>' : '') +
                '</div>';
        } else {
            html += '<div class="user-row ' + (isUnread ? 'unread' : '') + '" onclick="handleNotificationClick(\'' + notif.id + '\', \'' + notif.type + '\', ' + (notif.action_id || 'null') + ')">' +
                '<div class="user-row-info">' +
                '<div class="user-avatar" style="background: linear-gradient(135deg, ' + color + ', ' + color + ');">' +
                '<i class="fas ' + icon + '" style="color: #fff;"></i>' +
                '</div>' +
                '<div>' +
                '<div style="font-weight: 500;">' + escapeHtml(notif.title) + '</div>' +
                '<div style="font-size: 0.8rem; color: var(--text-secondary);">' + escapeHtml(notif.message) + '</div>' +
                '<div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">' + timeAgo + '</div>' +
                '</div>' +
                '</div>' +
                (isUnread ? '<span class="notification-badge" style="position: relative; top: 0; right: 0;"></span>' : '') +
                '</div>';
        }
    });
    
    container.innerHTML = html;
}

function updateNotificationBadge() {
    unreadCount = notificationsList.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

window.handleNotificationClick = async function(notifId, type, actionId) {
    try {
        await apiCall(`notifications/${notifId}/read`, { method: 'POST' });
        
        if (type === 'friend_request' && actionId) {
            viewFriendProfile(actionId);
        } else if (type === 'playlist_shared' && actionId) {
            openPlaylist(actionId);
        }
        
        loadNotifications();
    } catch (error) {
        console.error('Handle notification error:', error);
    }
};

async function markAllAsRead() {
    try {
        await apiCall('notifications/read-all', { method: 'POST' });
        loadNotifications();
        showNotification('Все уведомления прочитаны', 'success');
    } catch (error) {
        console.error('Mark all read error:', error);
    }
}

function addNotification(notification) {
    notificationsList.unshift(notification);
    displayNotifications();
    updateNotificationBadge();
    
    showNotification(notification.title, 'info');
}

setInterval(loadNotifications, 30000);

if (document.getElementById('notificationsList')) {
    loadNotifications();
}
