# recreate_database.py
from app import app, db
from models import User, UserCurrency, ShopCategory, ShopItem, UserInventory, CurrencyTransaction
import os
import bcrypt
import sqlite3

def recreate_database():
    print("🔄 Полная пересоздание базы данных...")
    
    if os.path.exists('itired.db'):
        os.remove('itired.db')
        print("🗑️ Старая база данных удалена")
    
    with app.app_context():
        db.create_all()
        print("✅ Новые таблицы SQLAlchemy созданы")
        
        create_sqlite_tables()
        
        init_shop_data()
        create_admin_user()
        
        print("🎉 База данных полностью пересоздана!")

def create_sqlite_tables():
    """Создаем стандартные таблицы SQLite"""
    try:
        conn = sqlite3.connect('itired.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                display_name TEXT,
                email TEXT UNIQUE,
                password_hash TEXT NOT NULL,
                yandex_token TEXT,
                yandex_uid TEXT,
                vk_token TEXT,
                avatar_url TEXT,
                bio TEXT,
                email_verified BOOLEAN DEFAULT FALSE,
                verification_code TEXT,
                verification_code_expires DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Таблица настроек
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_settings (
                user_id INTEGER PRIMARY KEY,
                theme TEXT DEFAULT 'dark',
                language TEXT DEFAULT 'ru',
                auto_play BOOLEAN DEFAULT TRUE,
                show_explicit BOOLEAN DEFAULT TRUE,
                music_service TEXT DEFAULT 'yandex',
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Таблица активности
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                activity_type TEXT NOT NULL,
                activity_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Таблица друзей
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS friends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                friend_id INTEGER,
                status TEXT DEFAULT 'pending',
                taste_match INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (friend_id) REFERENCES users (id),
                UNIQUE(user_id, friend_id)
            )
        ''')
        
        # История прослушивания
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS listening_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                track_id TEXT,
                track_data TEXT,
                played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Пользовательские темы
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_themes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                colors TEXT NOT NULL,
                background_url TEXT,
                is_default BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        conn.close()
        print("✅ Стандартные SQLite таблицы созданы")
        
    except Exception as e:
        print(f"❌ Ошибка создания SQLite таблиц: {e}")

def init_shop_data():
    """Инициализация данных магазина"""
    try:
        # Создаем категории
        categories = [
            ('themes', 'Темы оформления', 'fas fa-palette'),
            ('avatars', 'Аватары', 'fas fa-user'),
            ('banners', 'Баннеры профиля', 'fas fa-image'),
            ('badges', 'Бейджи', 'fas fa-medal'),
            ('effects', 'Эффекты плеера', 'fas fa-magic'),
            ('animations', 'Анимации', 'fas fa-film')
        ]
        
        for cat_name, cat_desc, cat_icon in categories:
            category = ShopCategory.query.filter_by(name=cat_name).first()
            if not category:
                category = ShopCategory(
                    name=cat_name,
                    description=cat_desc,
                    icon=cat_icon
                )
                db.session.add(category)
        
        db.session.commit()
        
        # Добавляем товары
        shop_items = [
            ('Темная тема Premium', 'theme', 'themes', 50, 
             '{"styles": {"--bg-primary": "#0a0a0a", "--bg-secondary": "#141414", "--accent": "#ff6b6b", "--text-primary": "#ffffff"}}', 'rare'),
            
            ('Синяя тема Ocean', 'theme', 'themes', 40,
             '{"styles": {"--bg-primary": "#0a1929", "--bg-secondary": "#132f4c", "--accent": "#1976d2", "--text-primary": "#e3f2fd"}}', 'common'),
            
            ('Аватар "Звезда"', 'avatar', 'avatars', 20,
             '{"image_url": "/static/shop/avatars/star.png", "unlockable": true}', 'common'),
            
            ('Аватар "Лунный свет"', 'avatar', 'avatars', 25,
             '{"image_url": "/static/shop/avatars/moon.png", "unlockable": true}', 'common'),
            
            ('Бейдж "Меломан"', 'badge', 'badges', 15,
             '{"text": "🎵 Меломан", "color": "#ff6b6b", "animation": "pulse"}', 'common'),
            
            ('Бейдж "VIP"', 'badge', 'badges', 30,
             '{"text": "⭐ VIP", "color": "#ffd700", "animation": "glow"}', 'rare'),
            
            ('Эффект "Неоновое сияние"', 'effect', 'effects', 75,
             '{"css": ".player { filter: drop-shadow(0 0 10px #ff00ff); }", "duration": 30000}', 'epic'),
            
            ('Анимация "Вращение"', 'animation', 'animations', 45,
             '{"css": "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }", "element": ".album-cover"}', 'rare')
        ]
        
        for name, item_type, category_name, price, data, rarity in shop_items:
            category = ShopCategory.query.filter_by(name=category_name).first()
            if category:
                item = ShopItem.query.filter_by(name=name).first()
                if not item:
                    item = ShopItem(
                        name=name,
                        type=item_type,
                        category_id=category.id,
                        price=price,
                        data=data,
                        rarity=rarity
                    )
                    db.session.add(item)
        
        db.session.commit()
        print("✅ Данные магазина инициализированы")
        
    except Exception as e:
        print(f"❌ Ошибка инициализации магазина: {e}")
        db.session.rollback()

def create_admin_user():
    """Создание администратора"""
    try:
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            password_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            admin_user = User(
                username='admin',
                email='admin@itired.com',
                password_hash=password_hash,
                display_name='Administrator',
                is_admin=True,
                email_verified=True
            )
            db.session.add(admin_user)
            db.session.commit()
            
            # Добавляем валюту админу
            currency = UserCurrency(user_id=admin_user.id, balance=1000)
            db.session.add(currency)
            db.session.commit()
            
            print("✅ Администратор создан: admin / admin123")
    except Exception as e:
        print(f"❌ Ошибка создания администратора: {e}")
        db.session.rollback()

if __name__ == '__main__':
    recreate_database()