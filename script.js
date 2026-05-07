// ========== 1. API СЕРВИС ==========
// Отправляет запросы к PHP-скриптам на сервере
class ApiService {
    constructor() {
        // Адрес папки с API (все PHP файлы лежат здесь)
        this.baseUrl = 'http://localhost/jewelryshop/api';
    }

    // GET-запрос: получение данных (товары, категории)
    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}/${endpoint}`);
            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // POST-запрос: отправка данных (регистрация, вход, заказ)
    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }
}

// ========== 2. КОРЗИНА ==========
// Хранит товары в localStorage (не исчезает после перезагрузки)
class CartService {
    constructor() {
        this.items = this.load();      // Загружаем сохранённую корзину
        this.listeners = [];           // Функции для обновления интерфейса
    }

    // Загрузка корзины из localStorage
    load() {
        try {
            const saved = localStorage.getItem('cart');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Ошибка загрузки корзины:', error);
            return [];
        }
    }

    // Сохранение корзины в localStorage
    save() {
        localStorage.setItem('cart', JSON.stringify(this.items));
        this.notify(); // Уведомляем интерфейс об изменениях
    }

    // Добавление товара: если уже есть — увеличиваем количество
    add(product) {
        const existing = this.items.find(item => item.id === product.id);
        
        if (existing) {
            existing.quantity++;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                image: product.image,
                quantity: 1
            });
        }
        this.save();
    }

    // Удаление товара по ID
    remove(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.save();
    }

    // Изменение количества товара (+1 или -1)
    updateQuantity(productId, delta) {
        const index = this.items.findIndex(item => item.id === productId);
        if (index === -1) return;

        const newQuantity = this.items[index].quantity + delta;
        
        if (newQuantity <= 0) {
            this.items.splice(index, 1); // Удаляем если количество стало 0
        } else {
            this.items[index].quantity = newQuantity;
        }
        this.save();
    }

    // Общая сумма (всегда 0, так как цены скрыты)
    getTotal() {
        return 0;
    }

    // Количество товаров в корзине
    getCount() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    // Очистка корзины
    clear() {
        this.items = [];
        this.save();
    }

    // Подписка на изменения (для обновления UI)
    subscribe(listener) {
        this.listeners.push(listener);
    }

    // Уведомление всех подписчиков
    notify() {
        this.listeners.forEach(listener => listener(this.items));
    }
}

// ========== 3. UI СЕРВИС ==========
// Управление загрузчиком и уведомлениями
class UIService {
    constructor() {
        this.loader = this.createLoader();
        this.notificationTimeout = null;
    }

    // Создание спиннера загрузки
    createLoader() {
        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.innerHTML = '<div class="loader__spinner"></div>';
        document.body.appendChild(loader);
        return loader;
    }

    // Показать загрузчик
    showLoader() {
        if (this.loader) this.loader.style.display = 'flex';
    }

    // Скрыть загрузчик
    hideLoader() {
        if (this.loader) this.loader.style.display = 'none';
    }

    // Показать всплывающее уведомление
    showNotification(message, type = 'success') {
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }

        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        this.notificationTimeout = setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// ========== 4. ГЛАВНЫЙ КЛАСС ПРИЛОЖЕНИЯ ==========
class App {
    constructor() {
        this.api = new ApiService();      // Для запросов к серверу
        this.cart = new CartService();     // Корзина
        this.ui = new UIService();         // UI-компоненты
        this.currentUser = null;           // Текущий авторизованный пользователь
        
        this.products = [];                // Список товаров из БД
        this.categories = [];              // Список категорий из БД
        
        this.init();                       // Запуск приложения
    }

    // Инициализация приложения
    async init() {
        this.initElements();               // Находим все DOM-элементы
        this.initEventListeners();         // Навешиваем обработчики событий
        this.cart.subscribe(() => this.renderCart()); // Обновляем корзину при изменениях
        
        await this.loadData();             // Загружаем товары и категории из БД
        await this.checkAuth();            // Проверяем авторизацию
        this.render();                     // Отрисовываем страницу
    }

    // Поиск всех DOM-элементов по ID
    initElements() {
        this.elements = {
            productsGrid: document.getElementById('productsGrid'),
            categoriesGrid: document.getElementById('categoriesGrid'),
            cartCount: document.getElementById('cartCount'),
            cartItems: document.getElementById('cartItems'),
            cartTotal: document.getElementById('cartTotalPrice'),
            searchToggle: document.getElementById('searchToggle'),
            searchPanel: document.getElementById('searchPanel'),
            searchForm: document.getElementById('searchForm'),
            searchInput: document.getElementById('searchInput'),
            cartToggle: document.getElementById('cartToggle'),
            cartModal: document.getElementById('cartModal'),
            closeCart: document.getElementById('closeCart'),
            userToggle: document.getElementById('userToggle'),
            authModal: document.getElementById('authModal'),
            closeAuth: document.getElementById('closeAuth'),
            checkoutBtn: document.getElementById('checkoutBtn')
        };
    }

    // Назначение обработчиков событий
    initEventListeners() {
        // Поиск: показать/скрыть панель
        this.elements.searchToggle?.addEventListener('click', () => {
            this.elements.searchPanel.classList.toggle('search-panel--active');
        });

        // Обработка формы поиска
        this.elements.searchForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = this.elements.searchInput.value;
            this.searchProducts(query);
        });

        // Корзина: открыть модальное окно
        this.elements.cartToggle?.addEventListener('click', () => {
            this.elements.cartModal.classList.add('modal--active');
        });

        // Закрыть корзину
        this.elements.closeCart?.addEventListener('click', () => {
            this.elements.cartModal.classList.remove('modal--active');
        });

        // Закрыть корзину по клику на оверлей
        this.elements.cartModal?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal__overlay')) {
                this.elements.cartModal.classList.remove('modal--active');
            }
        });

        // Кнопка пользователя: если не авторизован — открыть окно входа
        this.elements.userToggle?.addEventListener('click', () => {
            if (!this.currentUser) {
                this.elements.authModal.classList.add('modal--active');
            }
        });

        // Закрыть окно авторизации
        this.elements.closeAuth?.addEventListener('click', () => {
            this.elements.authModal.classList.remove('modal--active');
        });

        // Оформление заказа
        this.elements.checkoutBtn?.addEventListener('click', () => {
            this.handleCheckout();
        });

        // Закрытие модалок по клавише Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.elements.cartModal?.classList.remove('modal--active');
                this.elements.authModal?.classList.remove('modal--active');
            }
        });

        // Переключение между формами "Вход" и "Регистрация"
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const authModalTitle = document.getElementById('authModalTitle');
        const showRegisterBtn = document.getElementById('showRegisterBtn');
        const showLoginBtn = document.getElementById('showLoginBtn');

        showRegisterBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginForm && registerForm) {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
                if (authModalTitle) authModalTitle.textContent = 'Регистрация';
            }
        });

        showLoginBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            if (registerForm && loginForm) {
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
                if (authModalTitle) authModalTitle.textContent = 'Вход';
            }
        });

        // Отправка формы входа
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail')?.value;
            const password = document.getElementById('loginPassword')?.value;
            
            if (!email || !password) {
                this.ui.showNotification('Заполните все поля', 'error');
                return;
            }
            
            try {
                const result = await this.api.post('login.php', { email, password });
                if (result.success) {
                    this.ui.showNotification(`Добро пожаловать, ${result.user.name || result.user.email}!`);
                    this.currentUser = result.user;
                    this.elements.authModal.classList.remove('modal--active');
                    this.updateAuthUI();
                    document.getElementById('loginForm')?.reset();
                } else {
                    this.ui.showNotification(result.error || 'Ошибка входа', 'error');
                }
            } catch (error) {
                this.ui.showNotification('Ошибка соединения с сервером', 'error');
            }
        });

        // Отправка формы регистрации
        document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const firstName = document.getElementById('regFirstName')?.value;
            const lastName = document.getElementById('regLastName')?.value;
            const email = document.getElementById('regEmail')?.value;
            const password = document.getElementById('regPassword')?.value;
            
            if (!firstName || !lastName || !email || !password) {
                this.ui.showNotification('Заполните все поля', 'error');
                return;
            }
            
            try {
                const result = await this.api.post('register.php', { firstName, lastName, email, password });
                if (result.success) {
                    this.ui.showNotification('Регистрация успешна! Теперь войдите');
                    const loginForm = document.getElementById('loginForm');
                    const registerForm = document.getElementById('registerForm');
                    const authModalTitle = document.getElementById('authModalTitle');
                    if (loginForm && registerForm) {
                        registerForm.style.display = 'none';
                        loginForm.style.display = 'block';
                        if (authModalTitle) authModalTitle.textContent = 'Вход';
                    }
                    // Очищаем поля формы
                    document.getElementById('regFirstName').value = '';
                    document.getElementById('regLastName').value = '';
                    document.getElementById('regEmail').value = '';
                    document.getElementById('regPassword').value = '';
                } else {
                    this.ui.showNotification(result.error || 'Ошибка регистрации', 'error');
                }
            } catch (error) {
                this.ui.showNotification('Ошибка соединения с сервером', 'error');
            }
        });
    }

    // Загрузка данных с сервера
    async loadData() {
        this.ui.showLoader();
        
        try {
            // Параллельно загружаем товары и категории
            const [products, categories] = await Promise.all([
                this.api.get('products.php'),
                this.api.get('categories.php')
            ]);
            
            this.products = products;
            this.categories = categories;
        } catch (error) {
            // Если API недоступен — используем локальные тестовые данные
            console.warn('API недоступен, использую тестовые данные');
            this.products = this.getFallbackProducts();
            this.categories = this.getFallbackCategories();
        } finally {
            this.ui.hideLoader();
        }
    }

    // Проверка авторизации (есть ли активная сессия на сервере)
    async checkAuth() {
        try {
            const result = await this.api.get('check-auth.php');
            if (result.authenticated) {
                this.currentUser = result.user;
                this.updateAuthUI();
            }
        } catch (error) {
            console.log('Не авторизован');
        }
    }

    // Обновление интерфейса в зависимости от статуса авторизации
    updateAuthUI() {
        const userBtn = this.elements.userToggle;
        if (!userBtn) return;
        
        if (this.currentUser) {
            // Пользователь авторизован: меняем иконку, добавляем зелёную точку
            userBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="8" r="4" stroke-width="2"/>
                    <path d="M5 20V19C5 15.1 8.1 12 12 12C15.9 12 19 15.1 19 19V20" stroke-width="2"/>
                </svg>
                <span style="position: absolute; bottom: -2px; right: -2px; width: 10px; height: 10px; background: #4CAF50; border-radius: 50%;"></span>
            `;
            userBtn.title = `${this.currentUser.email} (кликните для выхода)`;
            // При клике — выход
            userBtn.onclick = () => {
                if (confirm('Выйти из аккаунта?')) {
                    this.logout();
                }
            };
        } else {
            // Пользователь не авторизован: стандартная иконка
            userBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="8" r="4" stroke-width="2"/>
                    <path d="M5 20V19C5 15.1 8.1 12 12 12C15.9 12 19 15.1 19 19V20" stroke-width="2"/>
                </svg>
            `;
            userBtn.title = 'Войти';
            userBtn.onclick = () => {
                this.elements.authModal?.classList.add('modal--active');
            };
        }
    }

    // Выход из аккаунта
    async logout() {
        try {
            await this.api.post('logout.php', {});
            this.currentUser = null;
            this.ui.showNotification('Вы вышли из аккаунта');
            this.updateAuthUI();
        } catch (error) {
            console.error('Ошибка выхода:', error);
        }
    }

    // Отрисовка всех компонентов
    render() {
        this.renderCategories();
        this.renderProducts();
        this.renderCart();
    }

    // Отрисовка категорий
    renderCategories() {
        if (!this.elements.categoriesGrid) return;

        if (!this.categories.length) {
            this.elements.categoriesGrid.innerHTML = '<p class="no-data">Категории не найдены</p>';
            return;
        }

        this.elements.categoriesGrid.innerHTML = this.categories.map(cat => `
            <div class="category-card" onclick="app.filterByCategory('${cat.name}')">
                <img src="${cat.image || 'https://via.placeholder.com/300x300?text=' + cat.name}" alt="${cat.name}" class="category-card__image" loading="lazy">
                <div class="category-card__overlay">
                    <h3 class="category-card__name">${cat.name}</h3>
                </div>
            </div>
        `).join('');
    }

    // Отрисовка товаров
    renderProducts(products = this.products) {
        if (!this.elements.productsGrid) return;

        if (!products || !products.length) {
            this.elements.productsGrid.innerHTML = '<p class="no-products">Товары не найдены</p>';
            return;
        }

        this.elements.productsGrid.innerHTML = products.map(product => `
            <div class="product-card" data-id="${product.id}">
                <div class="product-card__image-container">
                    <img src="${product.image || 'https://via.placeholder.com/300x300?text=' + product.name}" alt="${product.name}" class="product-card__image" loading="lazy">
                    ${product.badge ? `<span class="product-card__badge">${product.badge}</span>` : ''}
                    ${product.stock < 5 && product.stock > 0 ? `<span class="product-card__stock">Осталось ${product.stock}</span>` : ''}
                    ${product.stock === 0 ? `<span class="product-card__stock product-card__stock--out">Нет в наличии</span>` : ''}
                </div>
                <div class="product-card__info">
                    <p class="product-card__category">${product.category || 'Украшение'}</p>
                    <h3 class="product-card__title">${product.name}</h3>
                    <button class="product-card__btn" onclick="app.addToCart(${product.id})" 
                        ${product.stock === 0 ? 'disabled' : ''}>
                        ${product.stock === 0 ? 'Нет в наличии' : 'В корзину'}
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Отрисовка корзины
    renderCart() {
        // Обновляем счётчик на иконке корзины
        if (this.elements.cartCount) {
            this.elements.cartCount.textContent = this.cart.getCount();
        }
        
        if (!this.elements.cartItems) return;

        const items = this.cart.items;
        
        if (!items.length) {
            this.elements.cartItems.innerHTML = '<p class="cart-empty">Корзина пуста</p>';
            if (this.elements.cartTotal) {
                this.elements.cartTotal.textContent = '0 ₽';
            }
            return;
        }

        // Отрисовка каждого товара в корзине
        this.elements.cartItems.innerHTML = items.map(item => `
            <div class="cart-item">
                <img src="${item.image || 'https://via.placeholder.com/80x80'}" alt="${item.name}" class="cart-item__image" loading="lazy">
                <div class="cart-item__info">
                    <div class="cart-item__title">${item.name}</div>
                    <div class="cart-item__quantity">
                        <button class="quantity-btn" onclick="app.updateCartQuantity(${item.id}, -1)">−</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="app.updateCartQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
                <button class="cart-item__remove" onclick="app.removeFromCart(${item.id})" aria-label="Удалить">✕</button>
            </div>
        `).join('');

        // Итоговая сумма (всегда 0, так как цены скрыты)
        if (this.elements.cartTotal) {
            this.elements.cartTotal.textContent = `0 ₽`;
        }
    }

    // Добавление товара в корзину
    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        if (product.stock === 0) {
            this.ui.showNotification('Товара нет в наличии', 'error');
            return;
        }

        this.cart.add(product);
        this.ui.showNotification('Товар добавлен в корзину');
    }

    // Изменение количества товара в корзине
    updateCartQuantity(productId, delta) {
        this.cart.updateQuantity(productId, delta);
    }

    // Удаление товара из корзины
    removeFromCart(productId) {
        this.cart.remove(productId);
        this.ui.showNotification('Товар удален из корзины');
    }

    // Поиск товаров (по названию или категории)
    searchProducts(query) {
        if (!query.trim()) {
            this.renderProducts(this.products);
            return;
        }

        const filtered = this.products.filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            (product.category && product.category.toLowerCase().includes(query.toLowerCase()))
        );
        this.renderProducts(filtered);
        this.ui.showNotification(`Найдено товаров: ${filtered.length}`);
    }

    // Фильтрация товаров по категории
    filterByCategory(categoryName) {
        const filtered = this.products.filter(p => p.category === categoryName);
        this.renderProducts(filtered);
        this.ui.showNotification(`Категория: ${categoryName} (${filtered.length})`);
    }

    // Оформление заказа
    async handleCheckout() {
    if (!this.cart.items.length) {
        this.ui.showNotification('Корзина пуста', 'error');
        return;
    }

    if (!this.currentUser) {
        this.ui.showNotification('Сначала войдите в аккаунт', 'error');
        this.elements.authModal.classList.add('modal--active');
        return;
    }

    // Собираем данные заказа
    const orderData = {
        customerId: this.currentUser.id,
        items: this.cart.items,
        deliveryAddress: 'г. Москва, ул. Примерная, д. 1' // пока временный адрес
    };

    try {
        const response = await this.api.post('create-orders.php', orderData);
        if (response.success) {
            this.ui.showNotification('Заказ оформлен!');
            this.cart.clear();
            this.elements.cartModal.classList.remove('modal--active');
        } else {
            this.ui.showNotification(response.error || 'Ошибка оформления заказа', 'error');
        }
    } catch (error) {
        this.ui.showNotification('Ошибка сервера', 'error');
    }
}
    // Тестовые данные (если API недоступен)
    getFallbackProducts() {
        return [
            { id: 1, name: "Кольцо с бриллиантом", category: "Кольца", stock: 5, badge: "Хит", image: "https://img-edg.joomcdn.net/2c3d43fe6d146842a04ce839536a2cc88cd89f48_original.jpeg" },
            { id: 2, name: "Золотые серьги", category: "Серьги", stock: 3, badge: "Новинка", image: "https://i512.63pokupki.ru/item/x512/140d6bfe2a1fe186c6f76da63260e5083vujt31ogbgm6bw653.jpg" }
        ];
    }

    // Тестовые категории (если API недоступен)
    getFallbackCategories() {
        return [
            { name: "Кольца", image: "https://ir.ozone.ru/s3/multimedia-v/6737016739.jpg" },
            { name: "Серьги", image: "https://basket-03.wbbasket.ru/vol349/part34967/34967636/images/big/1.webp" }
        ];
    }
}

// Запуск приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});