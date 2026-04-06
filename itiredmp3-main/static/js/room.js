let socket = null;
let currentRoom = null;
let roomUsers = [];
let isHost = false;

function initSocket() {
    if (socket) return;
    
    socket = io({
        transports: ['websocket', 'polling']
    });
    
    socket.on('connect', function() {
        console.log('Socket connected');
    });
    
    socket.on('disconnect', function() {
        console.log('Socket disconnected');
        currentRoom = null;
        updateRoomUI();
    });
    
    socket.on('room_created', function(data) {
        currentRoom = data.room_code;
        roomUsers = Object.entries(data.room.users).map(([id, u]) => ({ id: parseInt(id), ...u }));
        isHost = true;
        updateRoomUI();
        showNotification('Комната создана: ' + data.room_code, 'success');
    });
    
    socket.on('room_joined', function(data) {
        currentRoom = data.room_code;
        roomUsers = data.users_list.map(u => ({ ...u, id: parseInt(u.id) }));
        isHost = data.room.host === parseInt(roomUsers.find(r => r.sid === socket.id)?.id || 0);
        updateRoomUI();
        showNotification('Вы присоединились к комнате', 'success');
    });
    
    socket.on('room_error', function(data) {
        showNotification(data.message, 'error');
    });
    
    socket.on('user_joined', function(data) {
        roomUsers.push(data);
        updateRoomUI();
        showNotification(data.username + ' присоединился', 'info');
    });
    
    socket.on('user_left', function(data) {
        roomUsers = roomUsers.filter(u => u.user_id !== data.user_id && u.id !== data.user_id);
        updateRoomUI();
    });
    
    socket.on('host_changed', function(data) {
        const user = roomUsers.find(u => u.id === data.new_host);
        if (user) {
            isHost = true;
            updateRoomUI();
            showNotification(user.username + ' стал ведущим', 'info');
        }
    });
    
    socket.on('track_played', function(data) {
        if (!isHost && audioPlayer) {
            audioPlayer.pause();
            if (currentTrack && currentTrack.id === data.track.id) {
                audioPlayer.currentTime = data.current_time;
                audioPlayer.play();
            } else {
                playTrackFromData(data.track).then(() => {
                    audioPlayer.currentTime = data.current_time;
                    audioPlayer.play();
                });
            }
        }
    });
    
    socket.on('track_paused', function(data) {
        if (!isHost && audioPlayer) {
            audioPlayer.pause();
            audioPlayer.currentTime = data.current_time;
        }
    });
    
    socket.on('time_synced', function(data) {
        if (!isHost && audioPlayer && audioPlayer.src) {
            const diff = Math.abs(audioPlayer.currentTime - data.current_time);
            if (diff > 0.5) {
                audioPlayer.currentTime = data.current_time;
            }
        }
    });
    
    socket.on('seek_synced', function(data) {
        if (!isHost && audioPlayer) {
            audioPlayer.currentTime = data.current_time;
        }
    });
    
    socket.on('playlist_updated', function(data) {
        updateRoomPlaylistUI(data.playlist);
    });
}

async function playTrackFromData(trackInfo) {
    if (!trackInfo) return;
    
    audioPlayer.pause();
    audioPlayer.src = trackInfo.url;
    await audioPlayer.play();
    
    currentTrack = trackInfo;
    updatePlayerUI(trackInfo);
    updatePlayButton();
    showMiniNotification(trackInfo);
}

window.createRoom = function() {
    if (!socket) initSocket();
    socket.emit('create_room', {});
};

window.joinRoom = function(roomCode) {
    if (!socket) initSocket();
    socket.emit('join_room', { room_code: roomCode });
};

window.leaveRoom = function() {
    if (socket && currentRoom) {
        socket.emit('leave_room', {});
        currentRoom = null;
        roomUsers = [];
        isHost = false;
        updateRoomUI();
    }
};

window.shareRoom = function() {
    if (!currentRoom) return;
    const url = window.location.origin + '?room=' + currentRoom;
    navigator.clipboard.writeText(url).then(() => {
        showNotification('Ссылка скопирована!', 'success');
    }).catch(() => {
        prompt('Скопируйте код комнаты:', currentRoom);
    });
};

function syncPlay() {
    if (socket && currentRoom && isHost && audioPlayer) {
        socket.emit('play_track', {
            track: currentTrack,
            current_time: audioPlayer.currentTime
        });
    }
}

function syncPause() {
    if (socket && currentRoom && isHost && audioPlayer) {
        socket.emit('pause_track', {
            current_time: audioPlayer.currentTime
        });
    }
}

function syncTime() {
    if (socket && currentRoom && isHost && audioPlayer) {
        socket.emit('sync_time', {
            current_time: audioPlayer.currentTime
        });
    }
}

function updateRoomUI() {
    const roomBtn = document.getElementById('roomBtn');
    const roomModal = document.getElementById('roomModal');
    
    if (!roomBtn) return;
    
    if (currentRoom) {
        roomBtn.innerHTML = '<i class="fas fa-users"></i> ' + currentRoom;
        roomBtn.style.background = 'var(--accent)';
        roomBtn.style.color = 'white';
    } else {
        roomBtn.innerHTML = '<i class="fas fa-users"></i>';
        roomBtn.style.background = '';
        roomBtn.style.color = '';
    }
    
    if (roomModal) {
        const content = document.getElementById('roomModalContent');
        if (currentRoom) {
            content.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">Код комнаты</div>
                    <div style="font-size: 2rem; font-weight: bold; letter-spacing: 0.2em; color: var(--accent);">${currentRoom}</div>
                    <button onclick="shareRoom()" class="btn-primary" style="margin-top: 12px; padding: 8px 16px;">
                        <i class="fas fa-share"></i> Поделиться
                    </button>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">
                        Участники (${roomUsers.length})
                        ${isHost ? '<span style="color: var(--accent);">(Вы ведущий)</span>' : ''}
                    </div>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${roomUsers.map(u => `
                            <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 6px;">
                                <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-user" style="color: white;"></i>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 500;">${escapeHtml(u.username || u.display_name || 'Пользователь')}</div>
                                </div>
                                ${u.id === roomUsers[0]?.id && isHost ? '<i class="fas fa-crown" style="color: gold;"></i>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div style="padding: 12px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 16px;">
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        ${isHost ? 'Управляйте воспроизведением - участники синхронизируются с вами' : 'Воспроизведение синхронизируется с ведущим'}
                    </div>
                </div>
                
                <button onclick="leaveRoom(); closeModal('roomModal');" class="glass-btn" style="width: 100%; padding: 12px; color: #ff6b6b;">
                    <i class="fas fa-door-open"></i> Покинуть комнату
                </button>
            `;
        } else {
            content.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <i class="fas fa-users" style="font-size: 3rem; color: var(--accent); margin-bottom: 16px;"></i>
                    <h3>Совместное прослушивание</h3>
                    <p style="color: var(--text-secondary);">Слушайте музыку вместе с друзьями в реальном времени</p>
                </div>
                
                <button onclick="createRoom(); closeModal('roomModal');" class="btn-primary" style="width: 100%; padding: 14px; margin-bottom: 12px;">
                    <i class="fas fa-plus"></i> Создать комнату
                </button>
                
                <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                    <input type="text" id="joinRoomCode" placeholder="Код комнаты" maxlength="6" style="flex: 1; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">
                    <button onclick="const code=document.getElementById('joinRoomCode').value;if(code){joinRoom(code);closeModal('roomModal');}" class="btn-primary" style="padding: 10px 20px;">
                        <i class="fas fa-sign-in-alt"></i>
                    </button>
                </div>
                
                <div style="font-size: 12px; color: var(--text-secondary); text-align: center;">
                    Войдите в комнату по коду или создайте свою
                </div>
            `;
        }
    }
}

function updateRoomPlaylistUI(playlist) {
    console.log('Room playlist updated:', playlist);
}

document.addEventListener('DOMContentLoaded', function() {
    initSocket();
    
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    if (roomCode) {
        setTimeout(() => {
            joinRoom(roomCode);
        }, 1000);
    }
});

const originalPlayTrack = window.playTrack;
window.playTrack = function(trackId) {
    if (socket && currentRoom && isHost) {
        setTimeout(() => {
            if (audioPlayer && audioPlayer.src) {
                socket.emit('play_track', {
                    track: currentTrack,
                    current_time: audioPlayer.currentTime
                });
            }
        }, 300);
    }
    
    if (originalPlayTrack) {
        originalPlayTrack(trackId);
    }
};

const originalPause = window.pauseTrack;
window.pauseTrack = function() {
    if (originalPause) originalPause();
    if (socket && currentRoom && isHost && audioPlayer) {
        socket.emit('pause_track', {
            current_time: audioPlayer.currentTime
        });
    }
};

window.syncSeek = function() {
    if (socket && currentRoom && isHost && audioPlayer) {
        socket.emit('seek_sync', {
            current_time: audioPlayer.currentTime
        });
    }
};

setInterval(() => {
    if (socket && currentRoom && isHost && audioPlayer && !audioPlayer.paused && audioPlayer.src) {
        socket.emit('sync_time', {
            current_time: audioPlayer.currentTime
        });
    }
}, 1000);

const originalSeek = window.seekTrack;
window.seekTrack = function(event) {
    if (originalSeek) originalSeek(event);
    if (socket && currentRoom && isHost) {
        setTimeout(syncSeek, 100);
    }
};
