# 🎧 iTired - Музыкальная платформа нового поколения

Единая платформа для прослушивания музыки из Яндекс.Музыки и VK в одном месте.

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-2.3-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ Возможности

### Музыкальные источники
- 🎵 **Яндекс.Музыка** — плейлисты, лайкнутые треки, рекомендации, чарты
- 💬 **VK Музыка** — аудиозаписи, плейлисты ВКонтакте
- 📁 **Локальные файлы** — ваша коллекция

### Функции
- 🔍 **Умный поиск** по всем источникам одновременно
- 📋 **Плейлисты** — создавайте и управляйте
- ❤️ **Избранное** — сохраняйте любимые треки
- 📜 **История** — никогда не теряйте треки
- 👥 **Друзья** — делитесь музыкой
- 🏪 **Магазин** — покупайте баннеры и темы
- 🎁 **Подарки** — дарите предметы друзьям
- 💰 **Система монет** — зарабатывайте за прослушивание

### Социальные функции
- Google OAuth авторизация
- Уведомления о подарках и запросах в друзья
- Совместные плейлисты

## 🚀 Быстрый старт

### Установка

1. Клонируйте репозиторий:
```bash
git clone <repo-url>
cd itiredmp3-main
```

2. Установите зависимости:
```bash
pip install -r requirements.txt
```

3. Создайте файл `.env` (скопируйте из `.env.example`):
```env
SECRET_KEY=your-secret-key-here
```

4. Запустите приложение:
```bash
python app.py
```

5. Откройте в браузере: `http://localhost:5001`

### Получение токенов

#### Яндекс.Музыка
1. Установите расширение [Yandex Music Token](https://chromewebstore.google.com/detail/yandex-music-token/lcbjeookjibfhjjopieifgjnhlegmkib) для Chrome
2. Перейдите на [music.yandex.ru](https://music.yandex.ru)
3. Нажмите на иконку расширения и скопируйте токен
4. Вставьте токен в настройках профиля

#### VK
1. Перейдите на [vkhost.github.io](https://vkhost.github.io)
2. Выберите "VK Audio"
3. Разрешите доступ
4. Скопируйте токен из URL (после `access_token=`)
5. Вставьте токен в настройках профиля

## 🌐 Запуск через ngrok (для Google OAuth)

Если вы хотите использовать авторизацию через Google с другого домена:

1. Установите ngrok:
```bash
# Windows
winget install ngrok

# или скачайте с https://ngrok.com/download
```

2. Запустите приложение:
```bash
python app.py
```

3. В новом терминале запустите ngrok:
```bash
ngrok http 5001
```

4. Скопируйте HTTPS URL (например: `https://abc123.ngrok-free.app`)

5. В Google Cloud Console добавьте этот URL в **Authorized redirect URIs**:
```
https://abc123.ngrok-free.app/auth/google/callback
```

6. Обновите `.env`:
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://abc123.ngrok-free.app/auth/google/callback
```

7. Перезапустите приложение

## 📁 Структура проекта

```
itiredmp3-main/
├── app.py              # Основное Flask приложение
├── models.py           # Модели базы данных
├── utils.py            # Утилиты и API клиенты
├── config.py          # Конфигурация
├── requirements.txt    # Зависимости Python
├── .env               # Переменные окружения (создать)
├── .env.example       # Пример .env
├── static/
│   ├── css/           # Стили
│   ├── js/            # JavaScript
│   └── shop/          # Изображения магазина
├── templates/
│   ├── base.html      # Базовый шаблон
│   ├── index.html     # Главная страница
│   └── auth.html      # Страница авторизации
└── landing/           # Лендинг
    └── index.html
```

## 🛠 Технологии

- **Backend**: Python, Flask, SQLAlchemy
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **База данных**: SQLite (по умолчанию)
- **API**: Yandex Music API, VK API, Google OAuth

### Зависимости
```
Flask==2.3.3
Flask-SQLAlchemy==3.1.1
Flask-Limiter==3.5.0
Flask-Caching==2.1.0
yandex-music==2.1.0
vk-api==6.7.1
bcrypt==4.0.1
Pillow==10.0.0
python-dotenv==1.0.0
requests==2.31.0
```

## ⚙️ Конфигурация

### Переменные окружения (.env)

| Переменная | Описание | Обязательно |
|------------|---------|-------------|
| `SECRET_KEY` | Секретный ключ для сессий | ✅ |
| `DATABASE_URL` | URL базы данных | По умолчанию SQLite |
| `GOOGLE_CLIENT_ID` | OAuth Client ID | Для Google авторизации |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret | Для Google авторизации |
| `GOOGLE_REDIRECT_URI` | Callback URL | Для Google авторизации |
| `MAIL_USERNAME` | Email для отправки | Для верификации |
| `MAIL_PASSWORD` | Пароль приложения | Для верификации |

## 🎨 Дизайн

Тёмная тема в стиле NoverPlay:
- Фон: `#050505`
- Акцент: `#6366f1` (индиго)
- Стеклянный эффект (glassmorphism)
- Адаптивный дизайн

## 🔧 Разработка

### Запуск в режиме разработки
```bash
python app.py
# Debug mode включен автоматически
```

### Очистка базы данных
```bash
rm itired.db  # Удалить БД
python app.py  # Создаст новую с админом
```

### Админ-доступ
```
Логин: admin
Пароль: admin123
```

## 📝 Лицензия

MIT License

## 🤝 Автор

**iTired** — Музыкальная платформа

---

*Создано с ❤️*
