let currentPlaylists = [];
let selectedPlaylist = null;

async function loadPlaylists() {
    const container = document.getElementById('playlistsGrid');
    if (!container) return;
    
    container.innerHTML = '<div class="glass-card" style="padding: 40px; text-align: center;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 12px;">Загрузка...</p></div>';
    
    try {
        currentPlaylists = await apiCall('playlists') || [];
        displayPlaylists();
    } catch (error) {
        console.error('Load playlists error:', error);
        container.innerHTML = '<div class="glass-card" style="text-align: center; padding: 40px;"><i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #ff6b6b;"></i><p style="margin-top: 12px;">Ошибка загрузки плейлистов</p></div>';
    }
}

function displayPlaylists() {
    const container = document.getElementById('playlistsGrid');
    if (!container) return;
    
    if (!currentPlaylists.length) {
        container.innerHTML = '<div class="glass-card" style="text-align: center; padding: 40px; grid-column: 1/-1;"><i class="fas fa-list-music" style="font-size: 3rem; color: var(--accent);"></i><p>У вас пока нет плейлистов</p><p style="color: var(--text-muted); margin-top: 8px;">Настройте токены в профиле</p></div>';
        return;
    }
    
    let html = '';
    currentPlaylists.forEach(playlist => {
        const coverHtml = playlist.cover_uri 
            ? '<img src="' + playlist.cover_uri + '" alt="">'
            : '<i class="fas fa-music" style="font-size: 2rem; color: #fff;"></i>';
        
        const serviceIcon = playlist.service === 'yandex' ? 'fab fa-yandex' : 
                           playlist.service === 'vk' ? 'fab fa-vk' : 
                           playlist.service === 'soundcloud' ? 'fab fa-soundcloud' : 'fas fa-list';
        
        html += '<div class="glass-card playlist-card" onclick="openPlaylist(\'' + playlist.id + '\')">' +
            '<div class="playlist-cover">' + coverHtml + '</div>' +
            '<h4>' + escapeHtml(playlist.title) + '</h4>' +
            '<div class="playlist-meta">' +
            '<span><i class="fas fa-music"></i> ' + (playlist.track_count || 0) + '</span>' +
            '<span><i class="' + serviceIcon + '"></i></span>' +
            '</div></div>';
    });
    
    container.innerHTML = html;
}

window.openPlaylist = function(playlistId) {
    selectedPlaylist = currentPlaylists.find(function(p) { return p.id === playlistId; });
    if (selectedPlaylist) {
        loadPlaylistTracks(playlistId);
        switchTab('playlistDetail');
    }
};

async function loadPlaylistTracks(playlistId) {
    const container = document.getElementById('playlistTracks');
    if (!container) return;
    
    const header = document.querySelector('#playlistDetail .glass-card h3, #playlistDetail .glass-card .playlist-header');
    
    container.innerHTML = '<div class="queue-placeholder"><i class="fas fa-spinner fa-spin"></i><p>Загрузка...</p></div>';
    
    try {
        const tracks = await apiCall('playlists/' + playlistId + '/tracks') || [];
        displayPlaylistTracks(tracks, selectedPlaylist);
    } catch (error) {
        container.innerHTML = '<div class="queue-placeholder"><i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i><p>Ошибка загрузки</p></div>';
    }
}

function displayPlaylistTracks(tracks, playlist) {
    const container = document.getElementById('playlistTracks');
    if (!container) return;
    
    const coverHtml = playlist && playlist.cover_uri 
        ? '<img src="' + playlist.cover_uri + '" alt="" style="width: 120px; height: 120px; border-radius: 12px; object-fit: cover;">'
        : '<div style="width: 120px; height: 120px; border-radius: 12px; background: linear-gradient(135deg, var(--accent), var(--accent-hover)); display: flex; align-items: center; justify-content: center;"><i class="fas fa-music fa-3x" style="color: #fff;"></i></div>';
    
    const serviceIcon = playlist && playlist.service === 'yandex' ? 'fab fa-yandex' : 
                       playlist && playlist.service === 'vk' ? 'fab fa-vk' : 
                       playlist && playlist.service === 'soundcloud' ? 'fab fa-soundcloud' : 'fas fa-list';
    
    let html = '<div class="playlist-detail-header" style="display: flex; gap: 24px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--border);">' +
        coverHtml +
        '<div style="flex: 1;">' +
        '<p style="color: var(--text-muted); font-size: 12px; text-transform: uppercase; margin-bottom: 8px;"><i class="' + serviceIcon + '"></i> Плейлист</p>' +
        '<h2 style="margin-bottom: 8px;">' + escapeHtml(playlist ? playlist.title : 'Плейлист') + '</h2>' +
        '<p style="color: var(--text-muted);">' + tracks.length + ' треков</p>' +
        '<button class="btn-primary" onclick="playPlaylist(\'' + (playlist ? playlist.id : '') + '\')" style="margin-top: 16px;">' +
        '<i class="fas fa-play"></i> Воспроизвести' +
        '</button>' +
        '</div></div>';
    
    if (!tracks.length) {
        html += '<div class="queue-placeholder"><i class="fas fa-music"></i><p>Плейлист пуст</p></div>';
    } else {
        html += '<div style="display: flex; flex-direction: column; gap: 4px;">';
        tracks.forEach(function(track, index) {
            const artists = track.artists ? (Array.isArray(track.artists) ? track.artists.join(', ') : track.artists) : '';
            const cover = track.cover_uri ? '<img src="' + track.cover_uri + '" alt="">' : '<i class="fas fa-music"></i>';
            const duration = track.duration ? formatDuration(track.duration) : (track.duration_ms ? formatDuration(track.duration_ms) : '');
            
            html += '<div class="track-item" data-track-id="' + track.id + '" onclick="playTrack(\'' + track.id + '\')">' +
                '<span style="color: var(--text-muted); width: 24px; text-align: center;">' + (index + 1) + '</span>' +
                '<div class="track-item-cover">' + cover + '</div>' +
                '<div class="track-item-info">' +
                '<div class="track-item-title">' + escapeHtml(track.title || 'Неизвестно') + '</div>' +
                '<div class="track-item-artist">' + escapeHtml(artists) + '</div>' +
                '</div>' +
                '<button class="like-btn" onclick="event.stopPropagation(); toggleFavorite(\'' + track.id + '\', ' + JSON.stringify(track).replace(/'/g, "\\'") + ')" style="background: none; border: none; color: var(--accent); font-size: 16px; cursor: pointer; padding: 8px; opacity: 0; transition: opacity 0.2s;">' +
                '<i class="far fa-heart"></i>' +
                '</button>' +
                '<button class="add-to-queue-btn" onclick="event.stopPropagation(); addTrackToQueue(' + JSON.stringify(track).replace(/'/g, "\\'") + ')" style="background: none; border: none; color: var(--text-muted); font-size: 16px; cursor: pointer; padding: 8px; opacity: 0; transition: opacity 0.2s;">' +
                '<i class="fas fa-plus"></i>' +
                '</button>' +
                '<span class="track-duration" style="color: var(--text-muted); font-size: 12px; min-width: 40px;">' + duration + '</span>' +
                '</div>';
        });
        html += '</div>';
    }
    
    container.innerHTML = html;
    
    document.querySelectorAll('.track-item').forEach(function(item) {
        item.addEventListener('mouseenter', function() {
            var btns = this.querySelectorAll('.like-btn, .add-to-queue-btn');
            btns.forEach(function(btn) { btn.style.opacity = '1'; });
        });
        item.addEventListener('mouseleave', function() {
            var btns = this.querySelectorAll('.like-btn, .add-to-queue-btn');
            btns.forEach(function(btn) { btn.style.opacity = '0'; });
        });
    });
}

window.playPlaylist = function(playlistId) {
    if (!playlistId) return;
    
    apiCall('playlists/' + playlistId + '/tracks').then(function(tracks) {
        if (tracks && tracks.length) {
            window.queue = [].concat(tracks);
            window.currentPlaylist = [].concat(tracks);
            window.currentTrackIndex = 0;
            playTrack(tracks[0].id);
            showNotification('Воспроизводится плейлист: ' + (selectedPlaylist ? selectedPlaylist.title : ''), 'success');
        }
    }).catch(function(error) {
        console.error('Play playlist error:', error);
    });
};

window.addTrackToQueue = function(track) {
    if (typeof track === 'string') {
        track = { id: track };
    }
    window.queue = window.queue || [];
    window.queue.push(track);
    updateQueueUI();
    showNotification('Добавлено в очередь', 'success');
};

document.getElementById('createPlaylistForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('playlistName')?.value;
    const description = document.getElementById('playlistDescription')?.value;
    const isPublic = document.getElementById('playlistPublic')?.checked;
    
    if (!name) {
        showNotification('Введите название', 'warning');
        return;
    }
    
    try {
        const result = await apiCall('playlists/create', {
            method: 'POST',
            body: JSON.stringify({ name: name, description: description, is_public: isPublic })
        });
        
        if (result && result.success) {
            showNotification('Плейлист создан!', 'success');
            closeModal('createPlaylistModal');
            this.reset();
            loadPlaylists();
        } else {
            showNotification(result?.message || 'Ошибка создания', 'error');
        }
    } catch (error) {
        console.error('Create playlist error:', error);
        showNotification('Ошибка создания плейлиста', 'error');
    }
});

window.addToQueue = window.addTrackToQueue;

window.toggleLike = function(trackId) {
    toggleFavorite(trackId, null);
};

if (document.getElementById('playlistsGrid')) {
    loadPlaylists();
}
