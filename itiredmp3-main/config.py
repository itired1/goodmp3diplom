import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = 'sqlite:///itired.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    PERMANENT_SESSION_LIFETIME = 30 * 24 * 3600  # 30 дней

    # Email для верификации (пример для Gmail)
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', 'itiredmp3@gmail.com')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', 'ozbg ahqs jack lerf')
    MAIL_DEFAULT_SENDER = ('iTired', MAIL_USERNAME)

    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
    GOOGLE_REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:5001/auth/google/callback')

    # SoundCloud Proxy (если заблокирован в России)
    # Формат: 'http://user:pass@host:port' или 'http://host:port'
    SOUNDCLOUD_PROXY = os.getenv('SOUNDCLOUD_PROXY', None)

    # Discord Rich Presence (Webhook для статуса)
    DISCORD_WEBHOOK_URL = os.getenv('DISCORD_WEBHOOK_URL', '')

    # Папка загрузки аватаров
    UPLOAD_FOLDER = 'static/uploads/avatars'
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB

    # Кэширование (простое, для разработки)
    CACHE_TYPE = 'SimpleCache'
    CACHE_DEFAULT_TIMEOUT = 300