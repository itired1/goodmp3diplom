from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import bcrypt

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    display_name = db.Column(db.String(80))
    avatar_url = db.Column(db.String(200))
    bio = db.Column(db.Text)
    yandex_token = db.Column(db.String(500))
    vk_token = db.Column(db.String(500))
    soundcloud_token = db.Column(db.String(500))
    current_source = db.Column(db.String(20), default='yandex')
    discord_webhook = db.Column(db.String(500))
    discord_enabled = db.Column(db.Boolean, default=False)
    is_admin = db.Column(db.Boolean, default=False)
    email_verified = db.Column(db.Boolean, default=False)
    verification_code = db.Column(db.String(6))
    verification_code_expires = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    currency = db.relationship('UserCurrency', backref='user', uselist=False)
    inventory = db.relationship('UserInventory', backref='user')
    transactions = db.relationship('CurrencyTransaction', backref='user')
    settings = db.relationship('UserSetting', backref='user', uselist=False)
    themes = db.relationship('UserTheme', backref='user')
    sent_friend_requests = db.relationship('Friend', foreign_keys='Friend.user_id', backref='from_user')
    received_friend_requests = db.relationship('Friend', foreign_keys='Friend.friend_id', backref='to_user')
    activities = db.relationship('UserActivity', backref='user')
    listening_history = db.relationship('ListeningHistory', backref='user')

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def get_balance(self):
        return self.currency.balance if self.currency else 0

    @classmethod
    def get_current(cls):
        from flask import session
        if 'user_id' in session:
            return cls.query.get(session['user_id'])
        return None

class UserCurrency(db.Model):
    __tablename__ = 'user_currency'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    balance = db.Column(db.Integer, default=0)

class ShopCategory(db.Model):
    __tablename__ = 'shop_categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(200))
    icon = db.Column(db.String(50))

class ShopItem(db.Model):
    __tablename__ = 'shop_items'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # theme, avatar, profile_banner, badge, effect
    category_id = db.Column(db.Integer, db.ForeignKey('shop_categories.id'))
    price = db.Column(db.Integer, nullable=False)
    data = db.Column(db.Text)  # JSON с параметрами предмета
    rarity = db.Column(db.String(20), default='common')
    is_active = db.Column(db.Boolean, default=True)

    def get_data_dict(self):
        import json
        return json.loads(self.data) if self.data else {}

class UserInventory(db.Model):
    __tablename__ = 'user_inventory'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    item_id = db.Column(db.String(100), nullable=False)  # строка для совместимости с BANNERS dict
    data = db.Column(db.Text)
    purchased_at = db.Column(db.DateTime, default=datetime.utcnow)
    equipped = db.Column(db.Boolean, default=False)

class CurrencyTransaction(db.Model):
    __tablename__ = 'currency_transactions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserSetting(db.Model):
    __tablename__ = 'user_settings'
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    theme = db.Column(db.String(20), default='dark')
    language = db.Column(db.String(5), default='ru')
    auto_play = db.Column(db.Boolean, default=True)
    show_explicit = db.Column(db.Boolean, default=True)
    music_service = db.Column(db.String(20), default='yandex')

class UserTheme(db.Model):
    __tablename__ = 'user_themes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    colors = db.Column(db.Text, nullable=False)  # JSON
    background_url = db.Column(db.String(200))
    is_default = db.Column(db.Boolean, default=False)

class Friend(db.Model):
    __tablename__ = 'friends'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    friend_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected
    taste_match = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserActivity(db.Model):
    __tablename__ = 'user_activity'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    activity_type = db.Column(db.String(50), nullable=False)
    activity_data = db.Column(db.Text)  # JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ListeningHistory(db.Model):
    __tablename__ = 'listening_history'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    track_id = db.Column(db.String(100))
    track_data = db.Column(db.Text)  # JSON
    played_at = db.Column(db.DateTime, default=datetime.utcnow)

class Playlist(db.Model):
    __tablename__ = 'playlists'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    cover_url = db.Column(db.String(200))
    is_public = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    tracks = db.relationship('PlaylistTrack', backref='playlist', lazy='dynamic', cascade='all, delete-orphan')
    user = db.relationship('User', backref='user_playlists')

class PlaylistTrack(db.Model):
    __tablename__ = 'playlist_tracks'
    id = db.Column(db.Integer, primary_key=True)
    playlist_id = db.Column(db.Integer, db.ForeignKey('playlists.id'), nullable=False)
    track_id = db.Column(db.String(100), nullable=False)
    track_data = db.Column(db.Text)  # JSON with track info
    position = db.Column(db.Integer, default=0)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

class LikedTrack(db.Model):
    __tablename__ = 'liked_tracks'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    track_id = db.Column(db.String(100), nullable=False)
    track_data = db.Column(db.Text)
    liked_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='liked_tracks')