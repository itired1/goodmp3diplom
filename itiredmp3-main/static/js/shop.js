let shopItems = [];
let userBalance = 0;
let userInventory = [];

const DEFAULT_BANNERS = [
    { id: 'banner_1', name: 'Неоновый закат', type: 'banner', price: 100, rarity: 'common', data: { image: '/static/shop/banners/xz.jpg' } },
    { id: 'banner_2', name: 'Космос', type: 'banner', price: 150, rarity: 'rare', data: { image: '/static/shop/banners/xz1.jpg' } },
    { id: 'banner_3', name: 'Лесной туман', type: 'banner', price: 100, rarity: 'common', data: { image: '/static/shop/banners/xz2.jpg' } },
    { id: 'banner_4', name: 'Крутой GIF', type: 'banner', price: 200, rarity: 'epic', data: { image: '/static/shop/banners/kruto.gif' } },
    { id: 'banner_5', name: 'Дракон', type: 'banner', price: 300, rarity: 'legendary', data: { image: '/static/shop/banners/dragon.gif' } },
    { id: 'banner_6', name: 'Крутой 2', type: 'banner', price: 200, rarity: 'epic', data: { image: '/static/shop/banners/kruto1.gif' } },
    { id: 'banner_7', name: 'Крутой 3', type: 'banner', price: 180, rarity: 'rare', data: { image: '/static/shop/banners/kruto2.gif' } },
    { id: 'banner_8', name: 'Крутой 4', type: 'banner', price: 150, rarity: 'rare', data: { image: '/static/shop/banners/kruto3.gif' } },
];

async function loadShopItems() {
    const container = document.getElementById('shopItemsList');
    if (!container) {
        console.log('Shop container not found');
        return;
    }
    
    container.innerHTML = '<div style="padding: 40px; text-align: center;"><i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i><p style="margin-top: 12px;">Загрузка...</p></div>';
    
    userBalance = 0;
    try {
        const balance = await apiCall('currency/balance');
        if (balance && balance.balance !== undefined) {
            userBalance = balance.balance;
        }
    } catch (error) {
        console.error('Balance error:', error);
    }
    
    updateBalanceDisplay();
    
    try {
        const inventory = await apiCall('shop/inventory');
        userInventory = inventory || [];
    } catch (error) {
        console.error('Inventory error:', error);
        userInventory = [];
    }
    
    shopItems = DEFAULT_BANNERS;
    displayShopItems();
}

function displayShopItems(category) {
    const container = document.getElementById('shopItemsList');
    if (!container) {
        console.log('Container shopItemsList not found!');
        return;
    }
    
    if (!shopItems || !shopItems.length) {
        console.log('No shop items loaded!');
        container.innerHTML = '<div style="padding: 40px; text-align: center;"><i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #ff6b6b;"></i><p>Товары не загружены</p></div>';
        return;
    }
    
    const filteredItems = (category === 'all' || !category) 
        ? shopItems 
        : shopItems.filter(function(item) { return item.type === category; });
    
    console.log('Displaying ' + filteredItems.length + ' items (category: ' + category + ')');
    
    if (!filteredItems.length) {
        container.innerHTML = '<div style="padding: 40px; text-align: center;"><i class="fas fa-shopping-bag" style="font-size: 3rem; color: var(--text-muted);"></i><p>Пусто</p></div>';
        return;
    }
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px;">';
    filteredItems.forEach(function(item) {
        const rarityColors = {
            common: '#9ca3af',
            rare: '#3b82f6',
            epic: '#a855f7',
            legendary: '#f59e0b'
        };
        const rarityColor = rarityColors[item.rarity] || '#9ca3af';
        const owned = userInventory.some(function(inv) { return inv.item_id === item.id; });
        const canAfford = userBalance >= item.price;
        
        html += '<div style="background: var(--bg-elevated); border: 2px solid ' + rarityColor + '; border-radius: 12px; overflow: hidden; cursor: pointer;" onclick="openShopItemModal(\'' + item.id + '\')">' +
            '<div style="height: 140px; overflow: hidden; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center;">' +
            '<img src="' + (item.data.image || '/static/shop/banners/xz.jpg') + '" alt="" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display=\'none\'">' +
            '</div>' +
            '<div style="padding: 12px;">' +
            '<h4 style="margin: 0 0 4px; font-size: 14px;">' + escapeHtml(item.name) + '</h4>' +
            '<span style="font-size: 11px; color: ' + rarityColor + '; text-transform: uppercase; font-weight: bold;">' + item.rarity + '</span>';
        
        if (owned) {
            html += '<div style="margin-top: 8px; color: #2ed573; font-size: 12px;"><i class="fas fa-check-circle"></i> Куплено</div>';
        } else {
            html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">' +
                '<span style="color: ' + (canAfford ? 'var(--accent)' : '#ff6b6b') + '; font-weight: 600;"><i class="fas fa-coins"></i> ' + item.price + '</span>' +
                '<button class="btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="event.stopPropagation(); buyItem(\'' + item.id + '\')">Купить</button>' +
                '</div>';
        }
        
        html += '</div></div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}

window.openShopItemModal = function(itemId) {
    const item = shopItems.find(function(i) { return i.id === itemId; });
    if (!item) return;
    
    const modal = document.getElementById('shopItemModal');
    if (!modal) return;
    
    const previewEl = document.getElementById('shopItemPreview');
    const nameEl = document.getElementById('shopItemName');
    const rarityEl = document.getElementById('shopItemRarity');
    const priceEl = document.getElementById('shopItemPrice');
    const buyBtn = document.getElementById('shopItemBuyBtn');
    const giftBtn = modal.querySelector('.glass-btn');
    
    if (previewEl) {
        previewEl.innerHTML = '<img src="' + (item.data.image || '') + '" alt="" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">';
    }
    if (nameEl) nameEl.textContent = item.name;
    if (rarityEl) rarityEl.textContent = item.rarity;
    if (priceEl) priceEl.innerHTML = '<i class="fas fa-coins"></i> ' + item.price;
    
    const owned = userInventory.some(function(inv) { return inv.item_id === itemId; });
    
    if (buyBtn) {
        if (owned) {
            buyBtn.textContent = 'Куплено';
            buyBtn.disabled = true;
            buyBtn.style.opacity = '0.5';
        } else {
            buyBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Купить';
            buyBtn.disabled = userBalance < item.price;
            buyBtn.style.opacity = userBalance < item.price ? '0.5' : '1';
        }
        buyBtn.onclick = function() { 
            if (!owned) buyItem(itemId); 
            closeModal('shopItemModal'); 
        };
    }
    
    if (giftBtn) {
        giftBtn.style.display = owned ? 'none' : 'flex';
        giftBtn.onclick = function() { 
            closeModal('shopItemModal');
            giftItem(itemId); 
        };
    }
    
    modal.dataset.itemId = itemId;
    openModal('shopItemModal');
};

window.buyItem = async function(itemId) {
    const item = shopItems.find(function(i) { return i.id === itemId; });
    if (!item) return;
    
    if (userBalance < item.price) {
        showNotification('Недостаточно монет', 'error');
        return;
    }
    
    try {
        const result = await apiCall('shop/buy', {
            method: 'POST',
            body: JSON.stringify({ item_id: itemId })
        });
        
        if (result && result.success) {
            showNotification('Покупка совершена!', 'success');
            userBalance = result.new_balance;
            updateBalanceDisplay();
            loadShopItems();
        } else {
            showNotification(result?.message || 'Ошибка покупки', 'error');
        }
    } catch (error) {
        console.error('Buy item error:', error);
        showNotification('Ошибка покупки', 'error');
    }
};

window.giftItem = async function(itemId) {
    const friendId = prompt('Введите ID пользователя для подарка:');
    if (!friendId) return;
    
    const item = shopItems.find(function(i) { return i.id === itemId; });
    if (!item) return;
    
    if (userBalance < item.price) {
        showNotification('Недостаточно монет', 'error');
        return;
    }
    
    try {
        const result = await apiCall('shop/gift', {
            method: 'POST',
            body: JSON.stringify({ item_id: itemId, friend_id: parseInt(friendId) })
        });
        
        if (result && result.success) {
            showNotification('Подарок отправлен!', 'success');
            userBalance = result.new_balance;
            updateBalanceDisplay();
        } else {
            showNotification(result?.message || 'Ошибка отправки подарка', 'error');
        }
    } catch (error) {
        console.error('Gift item error:', error);
        showNotification('Ошибка отправки подарка', 'error');
    }
};

window.equipBanner = async function(inventoryId) {
    try {
        const result = await apiCall('shop/equip/' + inventoryId, {
            method: 'POST'
        });
        
        if (result && result.success) {
            showNotification('Баннер установлен!', 'success');
            loadInventory();
        } else {
            showNotification(result?.message || 'Ошибка', 'error');
        }
    } catch (error) {
        showNotification('Ошибка установки баннера', 'error');
    }
};

async function loadInventory() {
    try {
        const inventory = await apiCall('shop/inventory');
        userInventory = inventory || [];
        displayInventory();
    } catch (error) {
        console.error('Load inventory error:', error);
    }
}

function displayInventory() {
    const container = document.getElementById('inventoryItems');
    if (!container) return;
    
    if (!userInventory.length) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px;">У вас пока нет купленных предметов. Купите что-нибудь в магазине!</p>';
        return;
    }
    
    let html = '';
    userInventory.forEach(function(item) {
        const data = item.data || {};
        const rarityColors = {
            common: '#9ca3af',
            rare: '#3b82f6',
            epic: '#a855f7',
            legendary: '#f59e0b'
        };
        const rarityColor = rarityColors[data.rarity] || '#9ca3af';
        
        html += '<div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-elevated); border-radius: 8px; margin-bottom: 8px; border-left: 4px solid ' + rarityColor + ';">' +
            '<img src="' + (data.image || '/static/shop/banners/xz.jpg') + '" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" onerror="this.style.display=\'none\'">' +
            '<div style="flex: 1;">' +
            '<h4 style="margin: 0;">' + escapeHtml(data.name || 'Баннер') + '</h4>' +
            '<span style="font-size: 12px; color: ' + rarityColor + '; text-transform: uppercase;">' + (data.rarity || '') + '</span>' +
            (item.equipped ? '<span style="margin-left: 8px; font-size: 11px; color: #2ed573;">(Установлен)</span>' : '') +
            '</div>' +
            '<button class="btn-primary" onclick="equipBanner(' + item.id + ')" ' + (item.equipped ? 'disabled style="opacity: 0.5;"' : '') + '>' +
            '<i class="fas fa-check"></i> ' + (item.equipped ? 'Установлен' : 'Установить') +
            '</button>' +
            '</div>';
    });
    container.innerHTML = html;
}

window.showInventory = function() {
    const shopList = document.getElementById('shopItemsList');
    const inventoryList = document.getElementById('inventoryList');
    
    if (shopList) shopList.style.display = 'none';
    if (inventoryList) {
        inventoryList.style.display = 'block';
        loadInventory();
    }
    
    document.querySelectorAll('.cat-chip').forEach(function(c) { c.classList.remove('active'); });
};

function updateBalanceDisplay() {
    const els = document.querySelectorAll('#userBalance, #headerBalance, #coinBadge');
    els.forEach(function(el) {
        if (el) {
            if (el.id === 'coinBadge') {
                el.textContent = userBalance > 0 ? userBalance : '';
                el.style.display = userBalance > 0 ? 'inline' : 'none';
            } else {
                el.textContent = userBalance;
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.cat-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.cat-chip').forEach(function(c) { c.classList.remove('active'); });
            chip.classList.add('active');
            
            var shopList = document.getElementById('shopItemsList');
            var inventoryList = document.getElementById('inventoryList');
            
            if (chip.dataset.category === 'inventory') {
                if (shopList) shopList.style.display = 'none';
                if (inventoryList) inventoryList.style.display = 'block';
                loadInventory();
            } else {
                if (shopList) shopList.style.display = 'block';
                if (inventoryList) inventoryList.style.display = 'none';
                displayShopItems(chip.dataset.category);
            }
        });
    });
});
