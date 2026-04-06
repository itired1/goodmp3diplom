let audioPlayer = null;
let currentTrack = null;
let currentPlaylist = [];
let queue = [];
let currentTrackIndex = 0;
let isShuffle = false;
let isRepeat = false;
let bypassCensorship = true;

function initAudioPlayer() {
    audioPlayer = document.getElementById('audioPlayer');
    if (!audioPlayer) {
        audioPlayer = document.createElement('audio');
        audioPlayer.id = 'audioPlayer';
        audioPlayer.hidden = true;
        document.body.appendChild(audioPlayer);
    }
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', handleTrackEnd);
    audioPlayer.addEventListener('pause', updatePlayButton);
    audioPlayer.addEventListener('play', updatePlayButton);
    audioPlayer.addEventListener('loadedmetadata', function() {
        const totalEl = document.getElementById('totalTime');
        if (totalEl) totalEl.textContent = formatDuration(audioPlayer.duration * 1000);
    });
    audioPlayer.addEventListener('error', function(e) {
        console.error('Audio error:', e);
        showNotification('Ошибка воспроизведения', 'error');
    });
}

function updateProgress() {
    const fill = document.getElementById('progressFill');
    const current = document.getElementById('currentTime');
    if (fill && current && audioPlayer && audioPlayer.duration) {
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        fill.style.width = percent + '%';
        current.textContent = formatDuration(audioPlayer.currentTime * 1000);
    }
}

function updatePlayButton() {
    const icon = document.getElementById('playPauseBtn')?.querySelector('i');
    if (icon) {
        icon.className = audioPlayer.paused ? 'fas fa-play' : 'fas fa-pause';
    }
}

function handleTrackEnd() {
    if (isRepeat) {
        audioPlayer.currentTime = 0;
        audioPlayer.play().catch(console.error);
    } else {
        nextTrack();
    }
}

window.togglePlay = function() {
    if (!audioPlayer.src || audioPlayer.src === window.location.href) {
        if (queue.length > 0) {
            playQueueItem(0);
        } else {
            showNotification('Выберите трек', 'info');
        }
        return;
    }
    if (audioPlayer.paused) {
        audioPlayer.play().catch(function(err) {
            console.error('Play error:', err);
            showNotification('Не удалось воспроизвести', 'error');
        });
    } else {
        audioPlayer.pause();
    }
};

window.seekTrack = function(event) {
    const bar = event.currentTarget;
    const rect = bar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    if (audioPlayer && audioPlayer.duration) {
        audioPlayer.currentTime = audioPlayer.duration * percent;
    }
};

window.changeVolume = function(value) {
    if (audioPlayer) {
        audioPlayer.volume = value / 100;
    }
};

window.nextTrack = function() {
    if (queue.length === 0) return;
    
    if (isShuffle) {
        currentTrackIndex = Math.floor(Math.random() * queue.length);
    } else {
        if (currentTrackIndex < queue.length - 1) {
            currentTrackIndex++;
        } else {
            currentTrackIndex = 0;
        }
    }
    playQueueItem(currentTrackIndex);
};

window.previousTrack = function() {
    if (queue.length === 0) return;
    if (audioPlayer.currentTime > 3) {
        audioPlayer.currentTime = 0;
    } else {
        if (currentTrackIndex > 0) {
            currentTrackIndex--;
        } else {
            currentTrackIndex = queue.length - 1;
        }
        playQueueItem(currentTrackIndex);
    }
};

window.toggleShuffle = function() {
    isShuffle = !isShuffle;
    showNotification(isShuffle ? 'Перемешивание включено' : 'Выключено', 'info');
};

window.toggleRepeat = function() {
    isRepeat = !isRepeat;
    showNotification(isRepeat ? 'Повтор включён' : 'Выключен', 'info');
};

window.addToQueue = function(track) {
    if (typeof track === 'string') {
        track = { id: track };
    }
    queue.push(track);
    updateQueueUI();
    showNotification('Добавлено в очередь', 'success');
    
    if (currentPlaylist.length === 0) {
        currentPlaylist = [track];
        currentTrackIndex = 0;
    }
};

window.removeFromQueue = function(index) {
    if (index < currentTrackIndex) {
        currentTrackIndex--;
    } else if (index === currentTrackIndex && audioPlayer.src) {
        audioPlayer.pause();
        audioPlayer.src = '';
    }
    queue.splice(index, 1);
    updateQueueUI();
};

function updateQueueUI() {
    const container = document.getElementById('queueContainer');
    if (!container) return;
    
    if (!queue || queue.length === 0) {
        container.innerHTML = '<div class="queue-placeholder"><i class="fas fa-list"></i><p>Очередь пуста</p></div>';
        return;
    }
    
    let html = '';
    queue.forEach(function(track, index) {
        const artists = track.artists ? (Array.isArray(track.artists) ? track.artists.join(', ') : track.artists) : '';
        const cover = track.cover_uri || track.coverUrl || '';
        const isActive = index === currentTrackIndex && audioPlayer.src;
        
        html += '<div class="queue-item ' + (isActive ? 'active' : '') + '" onclick="playQueueItem(' + index + ')">' +
            '<div class="queue-item-cover">' + 
            (cover ? '<img src="' + cover + '" alt="">' : '<i class="fas fa-music"></i>') +
            '</div>' +
            '<div class="queue-item-info">' +
            '<div class="queue-item-title">' + escapeHtml(track.title || 'Неизвестно') + '</div>' +
            '<div class="queue-item-artist">' + escapeHtml(artists) + '</div>' +
            '</div>' +
            '<button class="queue-item-remove" onclick="event.stopPropagation(); removeFromQueue(' + index + ')">' +
            '<i class="fas fa-times"></i>' +
            '</button>' +
            '</div>';
    });
    container.innerHTML = html;
}

window.playQueueItem = async function(index) {
    if (index < 0 || index >= queue.length) return;
    
    currentTrackIndex = index;
    const track = queue[index];
    
    try {
        const trackData = await apiCall('play_track/' + track.id);
        
        if (trackData && trackData.url) {
            audioPlayer.pause();
            audioPlayer.src = trackData.url;
            await audioPlayer.play();
            
            currentTrack = { ...track, ...trackData };
            updatePlayerUI(currentTrack);
            updatePlayButton();
            updateQueueUI();
            showMiniNotification(currentTrack);
            
            checkAndUpdateLikeButton(track.id);
        } else if (trackData && trackData.error) {
            showNotification(trackData.error, 'error');
        } else if (trackData && trackData.bypassed) {
            audioPlayer.pause();
            audioPlayer.src = trackData.url;
            await audioPlayer.play();
            
            currentTrack = { ...track, ...trackData };
            updatePlayerUI(currentTrack);
            updatePlayButton();
            showMiniNotification(currentTrack);
            showNotification('Воспроизводится через SoundCloud (обход блокировки)', 'info');
        }
    } catch (error) {
        console.error('Play queue item error:', error);
        showNotification('Ошибка воспроизведения', 'error');
    }
};

async function playTrackById(trackId, trackData) {
    try {
        const trackInfo = await apiCall('play_track/' + trackId);
        
        if (trackInfo && trackInfo.url) {
            audioPlayer.pause();
            audioPlayer.src = trackInfo.url;
            await audioPlayer.play();
            
            currentTrack = trackInfo;
            currentPlaylist = [{ id: trackId, ...trackInfo }];
            currentTrackIndex = 0;
            queue = [{ id: trackId, ...trackInfo }];
            
            updatePlayerUI(currentTrack);
            updatePlayButton();
            updateQueueUI();
            showMiniNotification(currentTrack);
            
            checkAndUpdateLikeButton(trackId);
        } else if (trackInfo && trackInfo.error) {
            showNotification(trackInfo.error, 'error');
        } else if (trackInfo && trackInfo.bypassed) {
            audioPlayer.pause();
            audioPlayer.src = trackInfo.url;
            await audioPlayer.play();
            
            currentTrack = { ...trackInfo };
            updatePlayerUI(currentTrack);
            updatePlayButton();
            showMiniNotification(currentTrack);
            showNotification('Воспроизводится через SoundCloud (обход блокировки)', 'info');
        }
    } catch (error) {
        console.error('Play track error:', error);
        showNotification('Ошибка воспроизведения', 'error');
    }
}

function checkAndUpdateLikeButton(trackId) {
    const likeBtn = document.getElementById('playerLikeBtn');
    if (!likeBtn) return;
    
    fetch('/api/favorites/' + trackId + '/check')
        .then(function(r) { return r.json(); })
        .then(function(data) {
            likeBtn.classList.toggle('liked', data.liked);
            likeBtn.innerHTML = data.liked ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        })
        .catch(console.error);
}

function updatePlayerUI(track) {
    const titleEl = document.getElementById('currentTrack');
    const artistEl = document.getElementById('currentArtist');
    const coverEl = document.getElementById('playerCover');
    
    if (titleEl) titleEl.textContent = track.title || 'Неизвестно';
    if (artistEl) artistEl.textContent = track.artists ? (Array.isArray(track.artists) ? track.artists.join(', ') : track.artists) : '-';
    
    if (coverEl) {
        if (track.cover_uri) {
            coverEl.innerHTML = '<img src="' + track.cover_uri + '" alt="">';
        } else {
            coverEl.innerHTML = '<i class="fas fa-music"></i>';
        }
    }
}

function showMiniNotification(track) {
    const existing = document.querySelector('.mini-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'mini-notification';
    notification.innerHTML = '<i class="fas fa-music"></i>' +
        '<div class="mini-notification-text">' +
        '<strong>Сейчас играет</strong>' +
        '<span>' + escapeHtml(track.title || 'Неизвестно') + ' - ' + escapeHtml(Array.isArray(track.artists) ? track.artists.join(', ') : (track.artists || '-')) + '</span>' +
        '</div>';
    document.body.appendChild(notification);
    
    setTimeout(function() { 
        if (notification.parentNode) notification.remove(); 
    }, 3000);
}

window.playTrack = playTrackById;

window.togglePlayerLike = function() {
    if (!currentTrack) return;
    const trackId = currentTrack.id || currentTrack.track_id;
    if (!trackId) return;
    
    toggleFavorite(trackId, currentTrack);
};

document.addEventListener('DOMContentLoaded', function() {
    initAudioPlayer();
    
    const playBtn = document.getElementById('playPauseBtn');
    if (playBtn) playBtn.addEventListener('click', togglePlay);
    
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) prevBtn.addEventListener('click', previousTrack);
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.addEventListener('click', nextTrack);
    
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) volumeSlider.addEventListener('input', function(e) { changeVolume(e.target.value); });
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.addEventListener('click', seekTrack);
    
    const likeBtn = document.getElementById('playerLikeBtn');
    if (likeBtn) likeBtn.addEventListener('click', togglePlayerLike);
    
    updateQueueUI();
});
