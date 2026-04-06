class BackgroundManager {
    constructor() {
        this.loadBackgroundPreference();
    }
    loadBackgroundPreference() {
        const saved = localStorage.getItem('backgroundPreference');
        if (saved) {
            try {
                const pref = JSON.parse(saved);
                this.setBackground(pref.type, pref.config);
            } catch(e) {}
        }
    }
    setBackground(type, config) {
        if (type === 'gradient') {
            document.body.style.background = `linear-gradient(${config.angle}deg, ${config.colors.join(', ')})`;
        } else if (type === 'image') {
            document.body.style.backgroundImage = `url(${config.url})`;
            document.body.style.backgroundSize = 'cover';
        }
        localStorage.setItem('backgroundPreference', JSON.stringify({ type, config }));
    }
}
const backgroundManager = new BackgroundManager();