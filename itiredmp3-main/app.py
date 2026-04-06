from flask import Flask, render_template, request, jsonify, session, redirect, url_for, current_app
from config import Config
from models import db, User, UserCurrency, UserSetting, Friend, UserActivity, ListeningHistory, LikedTrack, UserInventory, ShopItem, Playlist, PlaylistTrack
from utils import send_verification_email, get_yandex_client, get_vk_api, Recommender
import bcrypt
import uuid
from datetime import datetime, timedelta
import json
import random
from functools import wraps
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

limiter = Limiter(get_remote_address, app=app, default_limits=["200 per day", "50 per hour"])
cache = Cache(app)

def init_db():
    with app.app_context():
        db.create_all()
        if not db.session.query(User).filter_by(username='admin').first():
            admin = User(username='admin', email='admin@itired.com', is_admin=True, email_verified=True)
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            db.session.add(UserCurrency(user_id=admin.id, balance=1000))
            db.session.commit()
            print("Admin: admin / admin123")

init_db()

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

def add_currency(user_id, amount, reason):
    curr = db.session.query(UserCurrency).filter_by(user_id=user_id).first()
    if curr:
        curr.balance += amount
    else:
        curr = UserCurrency(user_id=user_id, balance=amount)
        db.session.add(curr)
    db.session.commit()
    return curr.balance

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
@limiter.limit("5 per minute")
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = db.session.query(User).filter((User.username == username) | (User.email == username)).first()
        if user and user.check_password(password):
            session.permanent = True
            session['user_id'] = user.id
            return redirect(url_for('index'))
        return render_template('auth.html', mode='login', error='Неверные данные')
    return render_template('auth.html', mode='login')

@app.route('/register', methods=['GET', 'POST'])
@limiter.limit("3 per minute")
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm = request.form.get('confirm_password')
        display_name = request.form.get('display_name')
        
        if password != confirm:
            return render_template('auth.html', mode='register', error='Пароли не совпадают')
        if len(password) < 6:
            return render_template('auth.html', mode='register', error='Пароль минимум 6 символов')
        if db.session.query(User).filter((User.username == username) | (User.email == email)).first():
            return render_template('auth.html', mode='register', error='Пользователь уже существует')
        
        user = User(username=username, email=email, display_name=display_name or username, email_verified=True)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        db.session.add(UserCurrency(user_id=user.id, balance=500))
        db.session.add(UserSetting(user_id=user.id))
        db.session.commit()
        session['user_id'] = user.id
        return redirect(url_for('index'))
    return render_template('auth.html', mode='register')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/auth/google')
def google_auth():
    from urllib.parse import urlencode
    
    if not current_app.config.get('GOOGLE_CLIENT_ID'):
        return render_template('auth.html', mode='login', error='Google OAuth не настроен. Добавьте GOOGLE_CLIENT_ID в .env файл')
    
    params = {
        'client_id': current_app.config['GOOGLE_CLIENT_ID'],
        'redirect_uri': current_app.config['GOOGLE_REDIRECT_URI'],
        'response_type': 'code',
        'scope': 'email profile',
        'access_type': 'online',
        'prompt': 'select_account'
    }
    
    return redirect('https://accounts.google.com/o/oauth2/v2/auth?' + urlencode(params))

@app.route('/auth/google/callback')
def google_callback():
    from urllib.parse import urlencode
    import requests
    
    code = request.args.get('code')
    if not code:
        return redirect(url_for('login'))
    
    try:
        token_data = {
            'code': code,
            'client_id': current_app.config['GOOGLE_CLIENT_ID'],
            'client_secret': current_app.config['GOOGLE_CLIENT_SECRET'],
            'redirect_uri': current_app.config['GOOGLE_REDIRECT_URI'],
            'grant_type': 'authorization_code'
        }
        
        token_response = requests.post('https://oauth2.googleapis.com/token', data=token_data)
        token_json = token_response.json()
        
        if 'access_token' not in token_json:
            return render_template('auth.html', mode='login', error='Ошибка авторизации через Google')
        
        access_token = token_json['access_token']
        
        user_response = requests.get('https://www.googleapis.com/oauth2/v2/userinfo', 
                                   headers={'Authorization': f'Bearer {access_token}'})
        user_data = user_response.json()
        
        email = user_data.get('email')
        google_id = user_data.get('id')
        name = user_data.get('name')
        picture = user_data.get('picture')
        
        user = db.session.query(User).filter_by(email=email).first()
        
        if not user:
            import string
            import random
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while db.session.query(User).filter_by(username=username).first():
                username = f"{base_username}{random.randint(1, 9999)}"
            
            user = User(
                username=username,
                email=email,
                display_name=name or username,
                avatar_url=picture,
                email_verified=True
            )
            user.set_password(google_id)
            db.session.add(user)
            db.session.commit()
            db.session.add(UserCurrency(user_id=user.id, balance=500))
            db.session.add(UserSetting(user_id=user.id))
            db.session.commit()
        
        session['user_id'] = user.id
        return redirect(url_for('index'))
        
    except Exception as e:
        print(f"Google auth error: {e}")
        return render_template('auth.html', mode='login', error='Ошибка авторизации через Google')

@app.route('/api/profile')
@login_required
def api_profile():
    user = db.session.get(User, session['user_id'])
    yandex_info = None
    vk_info = None
    
    if user and user.yandex_token:
        client = get_yandex_client(user.yandex_token)
        if client:
            try:
                acc = client.account_status()
                yandex_info = {'login': acc.account.login, 'premium': acc.account.premium}
            except: pass
    
    if user and user.vk_token:
        vk = get_vk_api(user.vk_token)
        if vk:
            try:
                vk_user = vk.users.get()[0]
                vk_info = {'name': f"{vk_user['first_name']} {vk_user['last_name']}"}
            except: pass
    
    if user:
        return jsonify({
            'local': {
                'username': user.username,
                'display_name': user.display_name,
                'email': user.email,
                'bio': user.bio,
                'avatar_url': user.avatar_url,
                'yandex_token_set': bool(user.yandex_token),
                'vk_token_set': bool(user.vk_token),
                'soundcloud_token_set': False,
                'current_source': user.current_source or 'yandex',
                'created_at': user.created_at.isoformat()
            },
            'yandex': yandex_info,
            'vk': vk_info
        })
    return jsonify({'error': 'User not found'}), 404

@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile_page():
    if request.method == 'POST':
        data = request.get_json()
        user = db.session.get(User, session['user_id'])
        
        if 'display_name' in data:
            user.display_name = data['display_name']
        if 'bio' in data:
            user.bio = data['bio']
        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url']
        if 'current_source' in data:
            user.current_source = data['current_source']
            session['active_sources'] = [data['current_source']] if data['current_source'] != 'all' else ['yandex', 'vk']
        if 'yandex_token' in data and data['yandex_token']:
            user.yandex_token = data['yandex_token']
            client = get_yandex_client(data['yandex_token'])
            if client:
                db.session.commit()
                return jsonify({'success': True, 'message': 'Токен Яндекс.Музыки сохранён', 'source': 'yandex'})
            return jsonify({'success': False, 'message': 'Неверный токен Яндекс.Музыки'})
        if 'vk_token' in data and data['vk_token']:
            user.vk_token = data['vk_token']
            vk = get_vk_api(data['vk_token'])
            if vk:
                db.session.commit()
                return jsonify({'success': True, 'message': 'Токен VK сохранён', 'source': 'vk'})
            return jsonify({'success': False, 'message': 'Неверный токен VK'})
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Профиль обновлён'})
    return redirect(url_for('index'))

@app.route('/api/recommendations')
@login_required
def recommendations():
    user = db.session.get(User, session['user_id'])
    services = session.get('active_sources', ['yandex'])
    recs = Recommender.get_recommendations(user.id if user else None, services)
    return jsonify(recs)

@app.route('/api/search')
@login_required
def search():
    q = request.args.get('q', '')
    services = request.args.getlist('services') or session.get('active_sources', ['yandex'])
    
    if not q:
        return jsonify({'tracks': []})
    
    result = {'tracks': []}
    user = db.session.get(User, session['user_id'])
    
    if 'yandex' in services and user and user.yandex_token:
        client = get_yandex_client(user.yandex_token)
        if client:
            try:
                search_res = client.search(q)
                if search_res.tracks:
                    for t in search_res.tracks.results[:15]:
                        cover = f"https://{t.cover_uri.replace('%%', '300x300')}" if t.cover_uri else None
                        result['tracks'].append({
                            'id': f"yandex_{t.id}",
                            'title': t.title,
                            'artists': [a.name for a in t.artists],
                            'duration': t.duration_ms,
                            'cover_uri': cover,
                            'service': 'yandex'
                        })
            except Exception as e:
                print(f"Yandex search error: {e}")
    
    if 'vk' in services and user and user.vk_token:
        vk = get_vk_api(user.vk_token)
        if vk:
            try:
                search_res = vk.audio.search(q=q, count=15)
                if 'items' in search_res:
                    for t in search_res['items']:
                        result['tracks'].append({
                            'id': f"vk_{t['id']}",
                            'title': t['title'],
                            'artists': [t['artist']],
                            'duration': t['duration'] * 1000,
                            'cover_uri': t.get('album', {}).get('thumb', {}).get('photo_300'),
                            'service': 'vk'
                        })
            except Exception as e:
                print(f"VK search error: {e}")
    
    return jsonify(result)

@app.route('/api/playlists')
@login_required
def playlists():
    user = db.session.get(User, session['user_id'])
    services = session.get('active_sources', ['yandex'])
    result = []
    
    if 'yandex' in services and user and user.yandex_token:
        client = get_yandex_client(user.yandex_token)
        if client:
            try:
                plists = client.users_playlists_list()
                for p in plists:
                    if hasattr(p, 'collective') and p.collective:
                        continue
                    cover = f"https://{p.cover.uri.replace('%%', '300x300')}" if p.cover and p.cover.uri else None
                    result.append({
                        'id': f"yandex_{p.kind}",
                        'title': p.title,
                        'track_count': p.track_count,
                        'cover_uri': cover,
                        'service': 'yandex'
                    })
            except Exception as e:
                print(f"Yandex playlists error: {e}")
    
    if 'vk' in services and user and user.vk_token:
        vk = get_vk_api(user.vk_token)
        if vk:
            try:
                plists = vk.audio.getPlaylists()
                if 'items' in plists:
                    for p in plists['items']:
                        result.append({
                            'id': f"vk_{p['id']}",
                            'title': p['title'],
                            'track_count': p['count'],
                            'cover_uri': p.get('photo', {}).get('photo_300'),
                            'service': 'vk'
                        })
            except Exception as e:
                print(f"VK playlists error: {e}")
    
    user_playlists = db.session.query(Playlist).filter_by(user_id=session['user_id']).order_by(Playlist.created_at.desc()).all()
    for p in user_playlists:
        track_count = db.session.query(PlaylistTrack).filter_by(playlist_id=p.id).count()
        result.insert(0, {
            'id': f"local_{p.id}",
            'title': p.title,
            'track_count': track_count,
            'cover_uri': None,
            'service': 'local'
        })
    
    return jsonify(result)

@app.route('/api/playlists/create', methods=['POST'])
@login_required
def create_playlist():
    data = request.get_json()
    name = data.get('name', 'Новый плейлист')
    description = data.get('description', '')
    is_public = data.get('is_public', False)
    
    playlist = Playlist(
        user_id=session['user_id'],
        title=name,
        description=description,
        is_public=is_public
    )
    db.session.add(playlist)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Плейлист создан',
        'playlist': {
            'id': f"local_{playlist.id}",
            'title': playlist.title,
            'track_count': 0,
            'cover_uri': None,
            'service': 'local'
        }
    })

@app.route('/api/playlists/<playlist_id>/tracks')
@login_required
def playlist_tracks(playlist_id):
    user = db.session.get(User, session['user_id'])
    tracks = []
    
    if playlist_id.startswith('yandex_'):
        kind = int(playlist_id.replace('yandex_', ''))
        client = get_yandex_client(user.yandex_token) if user else None
        if client:
            try:
                all_playlists = client.users_playlists_list()
                target_playlist = None
                for p in all_playlists:
                    if p.kind == kind:
                        target_playlist = p
                        break
                
                if target_playlist:
                    for pt in target_playlist.tracks:
                        try:
                            t = pt.fetch_track()
                            if t:
                                cover = None
                                if t.cover_uri:
                                    cover = f"https://{t.cover_uri.replace('%%', '300x300')}"
                                artists = []
                                if t.artists:
                                    for a in t.artists:
                                        if hasattr(a, 'name'):
                                            artists.append(a.name)
                                        elif isinstance(a, str):
                                            artists.append(a)
                                        else:
                                            artists.append(str(a))
                                
                                tracks.append({
                                    'id': f"yandex_{t.id}",
                                    'title': t.title,
                                    'artists': artists if artists else ['Unknown'],
                                    'duration': t.duration_ms,
                                    'cover_uri': cover,
                                    'service': 'yandex'
                                })
                        except Exception as te:
                            print(f"Track fetch error: {te}")
                            continue
            except Exception as e:
                print(f"Yandex playlist error: {e}")
                import traceback
                traceback.print_exc()
    
    elif playlist_id.startswith('vk_'):
        vk_id = playlist_id.replace('vk_', '')
        vk = get_vk_api(user.vk_token) if user else None
        if vk:
            try:
                audios = vk.audio.get(owner_id=int(vk_id))
                for t in audios['items']:
                    tracks.append({
                        'id': f"vk_{t['id']}",
                        'title': t['title'],
                        'artists': [t['artist']],
                        'duration': t['duration'] * 1000,
                        'cover_uri': t.get('album', {}).get('thumb', {}).get('photo_300'),
                        'service': 'vk'
                    })
            except Exception as e:
                print(f"VK playlist error: {e}")
    
    elif playlist_id.startswith('local_'):
        playlist_db_id = int(playlist_id.replace('local_', ''))
        playlist_tracks_query = db.session.query(PlaylistTrack).filter_by(playlist_id=playlist_db_id).order_by(PlaylistTrack.position).all()
        for pt in playlist_tracks_query:
            if pt.track_data:
                track_data = json.loads(pt.track_data)
                tracks.append({
                    'id': pt.track_id,
                    'title': track_data.get('title', 'Неизвестно'),
                    'artists': track_data.get('artists', []),
                    'duration': track_data.get('duration', 0),
                    'cover_uri': track_data.get('cover_uri'),
                    'service': 'local'
                })
    
    return jsonify(tracks)

@app.route('/api/play_track/<track_id>')
@login_required
def play_track(track_id):
    user = db.session.get(User, session['user_id'])
    
    service, tid = track_id.split('_', 1)
    url = None
    track_info = None
    
    if service == 'yandex':
        client = get_yandex_client(user.yandex_token) if user else None
        if client:
            try:
                track = client.tracks(int(tid))[0]
                download_info = track.get_download_info()
                if download_info:
                    best = max(download_info, key=lambda x: x.bitrate_in_kbps)
                    url = best.get_direct_link()
                    track_info = {
                        'title': track.title,
                        'artists': [a.name for a in track.artists],
                        'duration': track.duration_ms,
                        'cover_uri': f"https://{track.cover_uri.replace('%%', '300x300')}" if track.cover_uri else None,
                        'service': 'yandex'
                    }
            except Exception as e:
                print(f"Yandex play error: {e}")
    
    elif service == 'vk':
        vk = get_vk_api(user.vk_token) if user else None
        if vk:
            try:
                audio = vk.audio.getById(audios=track_id.replace('vk_', ''))
                if audio and 'url' in audio[0]:
                    url = audio[0]['url']
                    track_info = {
                        'title': audio[0]['title'],
                        'artists': [audio[0]['artist']],
                        'duration': audio[0]['duration'] * 1000,
                        'cover_uri': audio[0].get('album', {}).get('thumb', {}).get('photo_300'),
                        'service': 'vk'
                    }
            except Exception as e:
                print(f"VK play error: {e}")
    
    if url:
        hist = ListeningHistory(user_id=user.id, track_id=track_id, track_data=json.dumps(track_info))
        db.session.add(hist)
        act = UserActivity(user_id=user.id, activity_type='listen', activity_data=json.dumps({'track': track_info.get('title', '')}))
        db.session.add(act)
        add_currency(user.id, 1, 'listen')
        db.session.commit()
        
        return jsonify({'url': url, **track_info})
    
    return jsonify({'error': 'Трек недоступен'}), 404

@app.route('/api/stats')
@login_required
def stats():
    user = db.session.get(User, session['user_id'])
    services = session.get('active_sources', ['yandex'])
    total_playlists = 0
    total_liked = 0
    
    if 'yandex' in services and user and user.yandex_token:
        client = get_yandex_client(user.yandex_token)
        if client:
            try:
                total_playlists = len(client.users_playlists_list())
                total_liked = len(client.users_likes_tracks())
            except: pass
    
    return jsonify({
        'total_playlists': total_playlists,
        'total_liked_tracks': total_liked
    })

@app.route('/api/listening_history')
@login_required
def listening_history():
    history = db.session.query(ListeningHistory).filter_by(user_id=session['user_id']).order_by(ListeningHistory.played_at.desc()).limit(50).all()
    result = []
    for h in history:
        data = json.loads(h.track_data) if h.track_data else {}
        data['id'] = h.track_id
        data['played_at'] = h.played_at.isoformat()
        result.append(data)
    return jsonify(result)

@app.route('/api/favorites')
@login_required
def get_favorites():
    favorites = db.session.query(LikedTrack).filter_by(user_id=session['user_id']).order_by(LikedTrack.liked_at.desc()).all()
    result = []
    for f in favorites:
        data = json.loads(f.track_data) if f.track_data else {}
        data['id'] = f.track_id
        data['liked'] = True
        result.append(data)
    return jsonify(result)

@app.route('/api/favorites/<track_id>', methods=['POST', 'DELETE'])
@login_required
def toggle_favorite(track_id):
    user_id = session['user_id']
    existing = db.session.query(LikedTrack).filter_by(user_id=user_id, track_id=track_id).first()
    
    if request.method == 'POST':
        if existing:
            return jsonify({'liked': True, 'message': 'Уже в избранном'})
        
        data = request.get_json() if request.is_json else {}
        track_data = data.get('track_data', {})
        
        favorite = LikedTrack(
            user_id=user_id,
            track_id=track_id,
            track_data=json.dumps(track_data) if track_data else None
        )
        db.session.add(favorite)
        db.session.commit()
        return jsonify({'liked': True, 'message': 'Добавлено в избранное'})
    
    elif request.method == 'DELETE':
        if existing:
            db.session.delete(existing)
            db.session.commit()
        return jsonify({'liked': False, 'message': 'Удалено из избранного'})

@app.route('/api/favorites/<track_id>/check')
@login_required
def check_favorite(track_id):
    existing = db.session.query(LikedTrack).filter_by(user_id=session['user_id'], track_id=track_id).first()
    return jsonify({'liked': existing is not None})

@app.route('/api/listening_history/clear', methods=['POST'])
@login_required
def clear_listening_history():
    db.session.query(ListeningHistory).filter_by(user_id=session['user_id']).delete()
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/settings', methods=['GET', 'POST'])
@login_required
def user_settings():
    user = db.session.get(User, session['user_id'])
    setting = user.settings if user else None
    if not setting:
        setting = UserSetting(user_id=user.id)
        db.session.add(setting)
        db.session.commit()
    
    if request.method == 'GET':
        return jsonify({
            'theme': setting.theme,
            'music_service': setting.music_service,
            'active_sources': session.get('active_sources', ['yandex']),
            'bypass_censorship': session.get('bypass_censorship', True)
        })
    else:
        data = request.get_json()
        setting.theme = data.get('theme', setting.theme)
        setting.music_service = data.get('music_service', setting.music_service)
        
        if 'active_sources' in data:
            session['active_sources'] = data['active_sources']
        if 'bypass_censorship' in data:
            session['bypass_censorship'] = data['bypass_censorship']
        
        db.session.commit()
        return jsonify({'success': True})

@app.route('/api/currency/balance')
@login_required
def currency_balance():
    user = db.session.get(User, session['user_id'])
    return jsonify({'balance': user.get_balance() if user else 0})

@app.route('/api/friends')
@login_required
def friends_list():
    user = db.session.get(User, session['user_id'])
    friends = []
    sent = db.session.query(Friend).filter_by(user_id=user.id).all()
    received = db.session.query(Friend).filter_by(friend_id=user.id).all()
    for f in sent:
        other = db.session.get(User, f.friend_id)
        if other:
            friends.append({
                'id': other.id,
                'username': other.username,
                'display_name': other.display_name,
                'avatar_url': other.avatar_url,
                'status': f.status,
                'direction': 'outgoing'
            })
    for f in received:
        other = db.session.get(User, f.user_id)
        if other:
            friends.append({
                'id': other.id,
                'username': other.username,
                'display_name': other.display_name,
                'avatar_url': other.avatar_url,
                'status': f.status,
                'direction': 'incoming'
            })
    return jsonify(friends)

@app.route('/api/friends/add/<int:friend_id>', methods=['POST'])
@login_required
def add_friend(friend_id):
    user = db.session.get(User, session['user_id'])
    if user.id == friend_id:
        return jsonify({'success': False, 'message': 'Нельзя добавить себя'}), 400
    existing = db.session.query(Friend).filter(
        ((Friend.user_id == user.id) & (Friend.friend_id == friend_id)) |
        ((Friend.user_id == friend_id) & (Friend.friend_id == user.id))
    ).first()
    if existing:
        return jsonify({'success': False, 'message': 'Запрос уже существует'}), 400
    friend = Friend(user_id=user.id, friend_id=friend_id, status='pending', taste_match=random.randint(40, 95))
    db.session.add(friend)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Запрос отправлен'})

@app.route('/api/friends/accept/<int:friend_id>', methods=['POST'])
@login_required
def accept_friend(friend_id):
    user = db.session.get(User, session['user_id'])
    req = db.session.query(Friend).filter_by(user_id=friend_id, friend_id=user.id, status='pending').first()
    if not req:
        return jsonify({'success': False, 'message': 'Запрос не найден'}), 404
    req.status = 'accepted'
    db.session.commit()
    return jsonify({'success': True, 'message': 'Друг добавлен'})

@app.route('/api/friends/search')
@login_required
def search_friends():
    query = request.args.get('q', '')
    if not query or len(query) < 2:
        return jsonify([])
    
    user = db.session.get(User, session['user_id'])
    
    users = db.session.query(User).filter(
        User.id != user.id,
        User.username.ilike(f'%{query}%') | User.display_name.ilike(f'%{query}%')
    ).limit(10).all()
    
    existing_friend_ids = [f.friend_id for f in db.session.query(Friend).filter_by(user_id=user.id).all()]
    existing_friend_ids.extend([f.user_id for f in db.session.query(Friend).filter_by(friend_id=user.id).all()])
    
    result = []
    for u in users:
        result.append({
            'id': u.id,
            'username': u.username,
            'display_name': u.display_name,
            'avatar_url': u.avatar_url,
            'is_friend': u.id in existing_friend_ids
        })
    
    return jsonify(result)

@app.route('/api/notifications')
@login_required
def get_notifications():
    user_id = session['user_id']
    notifications = []
    
    pending_requests = db.session.query(Friend).filter_by(friend_id=user_id, status='pending').all()
    for req in pending_requests:
        sender = db.session.get(User, req.user_id)
        if sender:
            notifications.append({
                'id': f"fr_{req.id}",
                'type': 'friend_request',
                'title': 'Запрос в друзья',
                'message': f'{sender.display_name or sender.username} хочет добавить вас',
                'action_id': sender.id,
                'read': False
            })
    
    gift_activities = db.session.query(UserActivity).filter_by(user_id=user_id, activity_type='gift_received').order_by(UserActivity.created_at.desc()).limit(10).all()
    for act in gift_activities:
        gift_data = json.loads(act.activity_data) if act.activity_data else {}
        notifications.append({
            'id': f"gift_{act.id}",
            'type': 'gift_received',
            'title': 'Подарок!',
            'message': f'{gift_data.get("from_username", "Друг")} подарил вам {gift_data.get("item_name", "предмет")}',
            'gift_data': gift_data,
            'read': False,
            'created_at': act.created_at.isoformat()
        })
    
    notifications.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return jsonify(notifications[:20])

@app.route('/api/notifications/<notif_id>/read', methods=['POST'])
@login_required
def mark_notification_read(notif_id):
    return jsonify({'success': True})

@app.route('/api/user/<int:user_id>')
@login_required
def get_user_profile(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'id': user.id,
        'username': user.username,
        'display_name': user.display_name,
        'bio': user.bio,
        'avatar_url': user.avatar_url
    })

BANNERS = {
    'banner_1': {'name': 'Неоновый закат', 'price': 100, 'rarity': 'common', 'image': '/static/shop/banners/xz.jpg'},
    'banner_2': {'name': 'Космос', 'price': 150, 'rarity': 'rare', 'image': '/static/shop/banners/xz1.jpg'},
    'banner_3': {'name': 'Лесной туман', 'price': 100, 'rarity': 'common', 'image': '/static/shop/banners/xz2.jpg'},
    'banner_4': {'name': 'Крутой GIF', 'price': 200, 'rarity': 'epic', 'image': '/static/shop/banners/kruto.gif'},
    'banner_5': {'name': 'Дракон', 'price': 300, 'rarity': 'legendary', 'image': '/static/shop/banners/dragon.gif'},
    'banner_6': {'name': 'Крутой 2', 'price': 200, 'rarity': 'epic', 'image': '/static/shop/banners/kruto1.gif'},
    'banner_7': {'name': 'Крутой 3', 'price': 180, 'rarity': 'rare', 'image': '/static/shop/banners/kruto2.gif'},
    'banner_8': {'name': 'Крутой 4', 'price': 150, 'rarity': 'rare', 'image': '/static/shop/banners/kruto3.gif'},
}

@app.route('/api/shop/buy', methods=['POST'])
@login_required
def buy_item():
    data = request.get_json()
    item_id = data.get('item_id')
    
    if item_id not in BANNERS:
        return jsonify({'success': False, 'message': 'Предмет не найден'}), 404
    
    item = BANNERS[item_id]
    user = db.session.get(User, session['user_id'])
    balance = user.get_balance()
    
    if balance < item['price']:
        return jsonify({'success': False, 'message': 'Недостаточно монет'})
    
    existing = db.session.query(UserInventory).filter_by(user_id=user.id, item_id=item_id).first()
    if existing:
        return jsonify({'success': False, 'message': 'Предмет уже куплен'})
    
    add_currency(user.id, -item['price'], f'Покупка: {item["name"]}')
    
    inv = UserInventory(user_id=user.id, item_id=item_id, data=json.dumps({
        'type': 'banner', 
        'name': item['name'],
        'image': item.get('image', ''),
        'rarity': item['rarity']
    }))
    db.session.add(inv)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Покупка совершена', 'new_balance': user.get_balance()})

@app.route('/api/shop/gift', methods=['POST'])
@login_required
def gift_item():
    data = request.get_json()
    item_id = data.get('item_id')
    friend_id = data.get('friend_id')
    
    if item_id not in BANNERS:
        return jsonify({'success': False, 'message': 'Предмет не найден'}), 404
    
    if not friend_id:
        return jsonify({'success': False, 'message': 'Укажите получателя'})
    
    friend = db.session.get(User, friend_id)
    if not friend:
        return jsonify({'success': False, 'message': 'Пользователь не найден'})
    
    item = BANNERS[item_id]
    user = db.session.get(User, session['user_id'])
    balance = user.get_balance()
    
    if balance < item['price']:
        return jsonify({'success': False, 'message': 'Недостаточно монет'})
    
    add_currency(user.id, -item['price'], f'Подарок: {item["name"]} для {friend.username}')
    
    inv = UserInventory(user_id=friend_id, item_id=item_id, data=json.dumps({
        'type': 'banner', 
        'name': item['name'],
        'image': item.get('image', ''),
        'rarity': item['rarity'],
        'from_user': user.username,
        'gifted': True
    }))
    db.session.add(inv)
    
    notif = UserActivity(user_id=friend_id, activity_type='gift_received', activity_data=json.dumps({
        'item_name': item['name'],
        'from_username': user.username
    }))
    db.session.add(notif)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Подарок отправлен', 'new_balance': user.get_balance()})

@app.route('/api/shop/inventory')
@login_required
def get_inventory():
    inventory = db.session.query(UserInventory).filter_by(user_id=session['user_id']).all()
    items = []
    for inv in inventory:
        items.append({
            'id': inv.id,
            'item_id': inv.item_id,
            'data': json.loads(inv.data) if inv.data else {},
            'equipped': inv.equipped
        })
    return jsonify(items)

@app.route('/api/shop/equip/<int:inventory_id>', methods=['POST'])
@login_required
def equip_banner(inventory_id):
    user = db.session.get(User, session['user_id'])
    
    inv = db.session.query(UserInventory).filter_by(id=inventory_id, user_id=user.id).first()
    if not inv:
        return jsonify({'success': False, 'message': 'Предмет не найден'}), 404
    
    db.session.query(UserInventory).filter_by(user_id=user.id).update({'equipped': False})
    inv.equipped = True
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Баннер установлен'})

@app.route('/api/upload/avatar', methods=['POST'])
@login_required
def upload_avatar():
    if 'avatar' not in request.files:
        return jsonify({'success': False, 'message': 'Нет файла'}), 400
    
    file = request.files['avatar']
    if not file.filename:
        return jsonify({'success': False, 'message': 'Нет файла'}), 400
    
    import os
    from PIL import Image
    from io import BytesIO
    
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    
    if ext not in allowed_extensions:
        return jsonify({'success': False, 'message': 'Неподдерживаемый формат'}), 400
    
    try:
        img = Image.open(file)
        img = img.convert('RGBA')
        
        size = (256, 256)
        img.thumbnail(size, Image.Resampling.LANCZOS)
        
        new_img = Image.new('RGBA', size, (0, 0, 0, 0))
        x = (size[0] - img.size[0]) // 2
        y = (size[1] - img.size[1]) // 2
        new_img.paste(img, (x, y))
        
        os.makedirs('static/uploads/avatars', exist_ok=True)
        filename = f"avatar_{session['user_id']}_{datetime.now().strftime('%Y%m%d%H%M%S')}.png"
        filepath = os.path.join('static/uploads/avatars', filename)
        
        buffer = BytesIO()
        new_img.save(buffer, format='PNG')
        buffer.seek(0)
        
        with open(filepath, 'wb') as f:
            f.write(buffer.getvalue())
        
        avatar_url = '/' + filepath
        
        user = db.session.get(User, session['user_id'])
        user.avatar_url = avatar_url
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Аватарка загружена', 'avatar_url': avatar_url})
    
    except Exception as e:
        print(f"Avatar upload error: {e}")
        return jsonify({'success': False, 'message': 'Ошибка загрузки'}), 500

@app.route('/api/shop/active-banner')
@login_required
def get_active_banner():
    inv = db.session.query(UserInventory).filter_by(user_id=session['user_id'], equipped=True).first()
    if inv and inv.data:
        return jsonify(json.loads(inv.data))
    return jsonify(None)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
