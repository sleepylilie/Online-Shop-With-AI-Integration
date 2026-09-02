/**
 * header.ts — логика хедера
 *
 * Реализовано:
 *  - поп-апы входа и регистрации с валидацией полей;
 *  - проверка токена при загрузке: если устарел, то выход и предупреждение;
 *  - кнопки профиля/избранного/корзины ведут на страницы или открывают вход;
 *  - строка поиска с подсказками;
 *  - поп-ап каталога с категориями и подкатегориями;
 *  - тап-бар для мобильных устройств.
 */

function initHeader(): void {

    // =============
    // Утилиты для работы с токенами авторизации
    // =============

    // Токены хранятся в localStorage, сохраняясь после закрытия страницы
    const isLoggedIn = (): boolean => Boolean(localStorage.getItem('access_token'));
    const getUserName = (): string  => localStorage.getItem('user_name') ?? '';

    // Сохраняем токены и имя пользователя после успешного входа
    const saveTokens = (access: string, refresh: string, name: string): void => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        localStorage.setItem('user_name', name);
    };

    // Удаляем все данные пользователя из localStorage при выходе
    const clearTokens = (): void => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_name');
    };

    // Обновляем текст кнопки "Профиль" в хедере на имя пользователя
    const updateProfileBtn = (): void => {
        const span = document.querySelector<HTMLElement>('#header__btn-profile span');
        if (!span) return;
        span.textContent = isLoggedIn() ? (getUserName() || 'Профиль') : 'Профиль';
    };

    // Проверяем токен при каждой загрузке страницы через запрос к API
    const checkAuthStatus = async (): Promise<void> => {
        const tok = localStorage.getItem('access_token');
        if (!tok) { updateProfileBtn(); return; }

        try {
            const res = await fetch('/api/auth/me/', {
                headers: { 'Authorization': `Bearer ${tok}` }
            });
            if (res.status === 401) {
                // Сессия истекла, предупреждение только если пользователь был авторизован
                const wasLoggedIn = Boolean(localStorage.getItem('user_name'));
                clearTokens();
                updateProfileBtn();
                if (wasLoggedIn) {
                    alert('Ваша сессия истекла. Пожалуйста, войдите снова.');
                    window.location.href = '/index.html';
                }
            } else {
                updateProfileBtn();
            }
        } catch {
            updateProfileBtn();
        }
    };


    // =============
    // Поп-апы входа и регистрации
    // =============

    const overlay = document.getElementById('auth-overlay');
    const loginPopup = document.getElementById('popup__login');
    const registerPopup = document.getElementById('popup__register');

    // Затемнение фона и открытие поп-апа
    const openPopup = (popup: HTMLElement | null): void => {
        // Сначала закрываем другой поп-ап если был открыт
        closeAuthPopups();
        if (!popup || !overlay) return;
        overlay.style.display = 'flex';
        popup.style.display = 'flex';
        popup.style.flexDirection = 'column';
    };

    // Скрываем оба поп-апа и очищаем все ошибки валидации
    const closeAuthPopups = (): void => {
        if (overlay) overlay.style.display = 'none';
        if (loginPopup) loginPopup.style.display = 'none';
        if (registerPopup) registerPopup.style.display = 'none';
        clearErrors();
    };

    const openLoginPopup = (): void => openPopup(loginPopup);
    const openRegisterPopup = (): void => openPopup(registerPopup);

    // Закрытие поп-апа
    overlay?.addEventListener('click', closeAuthPopups);
    document.getElementById('login__close-btn')?.addEventListener('click', closeAuthPopups);
    document.getElementById('register__close-btn')?.addEventListener('click', closeAuthPopups);
    document.getElementById('login__go-to-register')?.addEventListener('click', (e) => { e.preventDefault(); openRegisterPopup(); });
    document.getElementById('register__go-to-login')?.addEventListener('click', (e) => { e.preventDefault(); openLoginPopup(); });
    document.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') closeAuthPopups(); });


    // =============
    // Валидация полей в поп-апах
    // =============

    // Сбрасываем все ошибки при открытии поп-апа
    const clearErrors = (): void => {
        ['login__email-msg','login__password-msg','login__general-msg',
         'register__first-name-msg','register__email-msg','register__password-msg',
         'register__password-confirm-msg','register__general-msg'
        ].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.textContent = ''; el.style.display = 'none'; }
        });
        // Сбрасываем подсветку полей ввода
        document.querySelectorAll<HTMLInputElement>('.login-popup .text-input__field')
            .forEach(inp => { inp.style.borderBottomColor = ''; });
    };

    // Показываем ошибку под полем и подсвечиваем поле красным
    const showErr = (id: string, msg: string): void => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = msg; el.style.display = msg ? 'block' : 'none'; el.style.color = 'var(--error)';
        const inp = el.closest('.text-input')?.querySelector<HTMLInputElement>('.text-input__field');
        if (inp) inp.style.borderBottomColor = msg ? 'var(--error)' : '';
    };

    // Проверяем формат почты
    const valEmail = (v: string): string => {
        if (!v) return 'Введите email.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Неверный формат. Пример: user@mail.ru';
        return '';
    };

    const valPwd = (v: string): string => {
        if (!v) return 'Введите пароль.';
        if (v.length < 6) return 'Пароль должен быть не менее 6 символов.';
        return '';
    };


    // =============
    // Логика входа
    // =============

    const loginEmail = document.getElementById('login__email')    as HTMLInputElement | null;
    const loginPwd   = document.getElementById('login__password') as HTMLInputElement | null;
    const loginBtn   = document.getElementById('login__submit')   as HTMLButtonElement | null;

    loginEmail?.addEventListener('input', () => showErr('login__email-msg', ''));
    loginPwd?.addEventListener('input', () => showErr('login__password-msg', ''));

    const doLogin = async (): Promise<void> => {
        const email = loginEmail?.value.trim() ?? '';
        const pwd   = loginPwd?.value           ?? '';

        // Сначала проверяем поля локально
        let err = false;
        const ee = valEmail(email); if (ee) { showErr('login__email-msg', ee); err = true; }
        const pe = valPwd(pwd); if (pe) { showErr('login__password-msg', pe); err = true; }
        if (err) return;

        // Блокируем кнопку на время запроса, чтобы не было двойной отправки
        if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Входим...'; }
        try {
            const res  = await fetch('/api/auth/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: pwd })
            });
            const data = await res.json();
            if (!res.ok) {
                // Показываем ошибки от сервера
                if (data.errors?.email) showErr('login__email-msg', data.errors.email);
                if (data.errors?.password) showErr('login__password-msg', data.errors.password);
                if (data.errors?.general) showErr('login__general-msg',  data.errors.general);
            } else {
                // Успех, сохраняем токены и закрываем поп-ап
                saveTokens(data.access, data.refresh, data.user.first_name);
                updateProfileBtn();
                closeAuthPopups();
            }
        } catch { showErr('login__general-msg', 'Ошибка сети.'); }
        finally { if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Войти'; } }
    };

    loginBtn?.addEventListener('click', doLogin);
    // Enter в любом поле тоже отправляет форму
    loginEmail?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
    loginPwd?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });


    // =============
    // Логика регистрации
    // =============

    const regName    = document.getElementById('register__first-name')       as HTMLInputElement | null;
    const regEmail   = document.getElementById('register__email')            as HTMLInputElement | null;
    const regPwd     = document.getElementById('register__password')         as HTMLInputElement | null;
    const regConfirm = document.getElementById('register__password-confirm') as HTMLInputElement | null;
    const regBtn     = document.getElementById('register__submit')           as HTMLButtonElement | null;

    regName?.addEventListener('input', () => {
        showErr('register__first-name-msg', '');
        // Убираем цифры и спецсимволы прямо при вводе
        if (regName) {
            const cleaned = regName.value.replace(/[^a-zA-Zа-яёА-ЯЁ\s\-]/g, '');
            if (cleaned !== regName.value) regName.value = cleaned;
        }
    });
    regEmail?.addEventListener('input', () => showErr('register__email-msg', ''));
    regPwd?.addEventListener('input', () => showErr('register__password-msg', ''));
    regConfirm?.addEventListener('input', () => showErr('register__password-confirm-msg', ''));

    const doRegister = async (): Promise<void> => {
        const name = regName?.value.trim() ?? '';
        const email = regEmail?.value.trim() ?? '';
        const pwd = regPwd?.value ?? '';
        const conf = regConfirm?.value ?? '';

        // Проверяем все поля перед отправкой
        let err = false;
        if (!name) { showErr('register__first-name-msg', 'Введите имя.'); err = true; }
        else if (!/^[a-zA-Zа-яёА-ЯЁ][a-zA-Zа-яёА-ЯЁ\s\-]*$/.test(name)) {
            showErr('register__first-name-msg', 'Только буквы, пробел и дефис.'); err = true;
        }
        const ee = valEmail(email); if (ee) { showErr('register__email-msg', ee); err = true; }
        const pe = valPwd(pwd); if (pe) { showErr('register__password-msg', pe); err = true; }
        if (pwd !== conf) { showErr('register__password-confirm-msg', 'Пароли не совпадают.'); err = true; }
        if (err) return;

        if (regBtn) { regBtn.disabled = true; regBtn.textContent = 'Регистрируемся...'; }
        try {
            const res  = await fetch('/api/auth/register/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ first_name: name, email, password: pwd })
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.errors?.first_name) showErr('register__first-name-msg', data.errors.first_name);
                if (data.errors?.email)  showErr('register__email-msg', data.errors.email);
                if (data.errors?.password) showErr('register__password-msg', data.errors.password);
                if (data.errors?.general) showErr('register__general-msg', data.errors.general);
            } else {
                saveTokens(data.access, data.refresh, data.user.first_name);
                updateProfileBtn();
                closeAuthPopups();
            }
        } catch { showErr('register__general-msg', 'Ошибка сети.'); }
        finally { if (regBtn) { regBtn.disabled = false; regBtn.textContent = 'Зарегистрироваться'; } }
    };

    regBtn?.addEventListener('click', doRegister);
    // Enter на любом поле тоже отправляет форму регистрации
    [regName, regEmail, regPwd, regConfirm].forEach(inp =>
        inp?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doRegister(); })
    );


    // =============
    // Кнопки профиля, избранного и корзины
    // =============

    // Открытие поп-апа входа, если вход не был выполнен
    const guardedNav = (path: string): void => {
        if (isLoggedIn()) window.location.href = path;
        else openLoginPopup();
    };

    // Подключаем все кнопки навигации в хедере
    document.getElementById('header__btn-profile')?.addEventListener('click', () => guardedNav('/pages/profile.html'));
    document.getElementById('header__btn-favorites')?.addEventListener('click', () => guardedNav('/pages/profile.html?tab=favorites'));
    document.getElementById('header__btn-cart')?.addEventListener('click', () => guardedNav('/pages/cart.html'));
    document.getElementById('header__logo')?.addEventListener('click', () => { window.location.href = '/index.html'; });

    // Проверяем токен сразу при загрузке страницы
    checkAuthStatus();


    // =============
    // Строка поиска
    // =============

    const searchPopup = document.getElementById('search-popup');
    const searchDesk  = document.getElementById('search-desktop')             as HTMLInputElement | null;
    const searchMob   = document.getElementById('search-mobile')              as HTMLInputElement | null;
    const searchBtnD  = document.getElementById('header__search-btn-desktop') as HTMLButtonElement | null;
    const searchBtnM  = document.getElementById('header__search-btn-mobile')  as HTMLButtonElement | null;

    // Переходим в каталог с поисковым запросом в URL
    const doSearch = (q: string): void => {
        if (q.trim()) window.location.href = `/pages/catalog.html?search=${encodeURIComponent(q.trim())}`;
    };

    // Подключаем поиск к десктопной и мобильной строке
    const setupSearch = (inp: HTMLInputElement | null, btn: HTMLButtonElement | null): void => {
        if (!inp) return;
        // При фокусе показываем подсказки, при потере фокуса скрываем
        inp.addEventListener('focus', () => { if (searchPopup) searchPopup.style.display = 'block'; });
        inp.addEventListener('blur', () => { setTimeout(() => { if (searchPopup) searchPopup.style.display = 'none'; }, 200); });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(inp.value); } });
        btn?.addEventListener('click', () => doSearch(inp.value));

        // Клик по подсказке подставляет текст и выполняет поиск
        if (inp === searchDesk) {
            searchPopup?.querySelectorAll<HTMLElement>('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    const t = item.querySelector('p')?.textContent ?? '';
                    if (searchDesk) searchDesk.value = t;
                    if (searchMob) searchMob.value  = t;
                    if (searchPopup) searchPopup.style.display = 'none';
                    doSearch(t);
                });
            });
        }
    };

    setupSearch(searchDesk, searchBtnD);
    setupSearch(searchMob,  searchBtnM);

    // Скрываем подсказки при клике в любом другом месте страницы
    document.addEventListener('click', (e: MouseEvent) => {
        if (!searchPopup) return;
        const t = e.target as Node;
        if (!(searchDesk?.contains(t)) && !(searchMob?.contains(t)) &&
            !(searchBtnD?.contains(t)) && !(searchBtnM?.contains(t)) &&
            !searchPopup.contains(t)) {
            searchPopup.style.display = 'none';
        }
    });


    // =============
    // Тап-бар
    // =============

    // Пути навигации для кнопок
    const tapRoutes: Record<string, string> = {
        home: '/index.html',
        generator: '/pages/idea-generator.html',
        blog: '/pages/blog.html',
        about: '/pages/about-project.html',
        contacts: '/pages/contacts.html',
    };

    document.querySelectorAll<HTMLButtonElement>('.tapbar-item').forEach(btn => {
        const page = btn.getAttribute('data-page');
        if (page && tapRoutes[page]) {
            btn.addEventListener('click', () => { window.location.href = tapRoutes[page]; }); // переход по нужной ссылке
        }
    });


    // =============
    // Поп-ап каталога
    // =============

    // Интерфейсы для данных из API
    interface Cat { id: number; category_name: string; url_key: string; icon_url: string | null; }
    interface Sub { id: number; subcategory_name: string; url_key: string; category_id: number; }

    let cats: Cat[] = [], subs: Sub[] = [], curCatId: number | null = null;

    // На десктопе подкатегории показываются при ховере
    const isDesktop = (): boolean => window.innerWidth > 1279;

    const catalogBtn = document.getElementById('catalog-btn') as HTMLButtonElement | null;
    const catalogIcon = document.getElementById('catalog-btn__icon') as HTMLImageElement  | null;
    const iconOpen = catalogIcon?.src ?? '';
    const iconClose = '/static/assets/icons/icon_close_white.svg';

    const catOverlay = document.createElement('div');
    catOverlay.id = 'catalog-overlay-js';
    catOverlay.style.cssText = 'display:none;position:fixed;top:156px;left:0;right:0;bottom:0;z-index:500;background-color:#FEF9F0;overflow-y:auto;';
    // Добавляем в body чтобы оверлей всегда был поверх всего контента страницы
    document.body.appendChild(catOverlay);

    // Строим HTML оверлея
    const buildOverlayHTML = (): string => {
        const isDesk = window.innerWidth > 1279;
        const grid   = isDesk
            ? 'display:grid;grid-template-columns:280px 1fr;gap:20px;'
            : 'display:block;';
        return `<div style="max-width:1280px;width:100%;height:100%;margin:0 auto;padding:20px 32px;${grid}box-sizing:border-box;">
            <div id="js-cat-list" style="${isDesk ? 'border-right:2px solid #F5E5C8;' : ''}overflow-y:auto;padding-right:8px;">
                <div style="padding:20px;color:#6B6B6B;font-family:Manrope,sans-serif;">Загрузка...</div>
            </div>
            <div id="js-sub-panel" style="overflow-y:auto;padding:0 ${isDesk ? '20px' : '0'};${isDesk ? '' : 'display:none;margin-top:12px;'}">
                <button id="js-back-btn" style="display:none;padding:8px 0;cursor:pointer;font-family:Manrope,sans-serif;font-size:14px;color:#2D93AD;background:none;border:none;">Назад к категориям</button>
                <p id="js-cat-title" style="font-family:Manrope,sans-serif;font-size:18px;font-weight:600;padding:8px 0;display:none;"></p>
                <div id="js-sub-list"><div style="padding:20px;text-align:center;color:#6B6B6B;font-family:Manrope,sans-serif;font-size:14px;">Наведите на категорию</div></div>
            </div>
        </div>`;
    };

    let jsCatList: HTMLElement, jsSubPanel: HTMLElement, jsSubList: HTMLElement, jsBackBtn: HTMLElement, jsCatTitle: HTMLElement;

    // Сохраняем ссылки на элементы внутри оверлея после его создания
    const initOverlayRefs = (): void => {
        jsCatList = catOverlay.querySelector('#js-cat-list')!;
        jsSubPanel = catOverlay.querySelector('#js-sub-panel')!;
        jsSubList = catOverlay.querySelector('#js-sub-list')!;
        jsBackBtn = catOverlay.querySelector('#js-back-btn')!;
        jsCatTitle = catOverlay.querySelector('#js-cat-title')!;

        // Кнопка "Назад к категориям" для планшетов и мобильных
        jsBackBtn?.addEventListener('click', () => {
            if (jsCatList)  jsCatList.style.display = 'block';
            if (jsSubPanel) jsSubPanel.style.display = 'none';
            if (jsBackBtn)  jsBackBtn.style.display = 'none';
        });
    };

    const isCatalogOpen = (): boolean => catOverlay.style.display !== 'none';

    const openCatalog = (): void => {
        // Пересобираем HTML на случай если изменился размер экрана
        catOverlay.innerHTML = buildOverlayHTML();
        initOverlayRefs();

        catOverlay.style.display  = 'block';
        document.body.style.overflow = 'hidden'; // запрещаем скролл страницы
        if (catalogIcon) catalogIcon.src = iconClose;

        // Запрос к API, если данные еще не были загружены
        if (!cats.length) { loadCatalog(); }
        else { renderCats(); }
    };

    const closeCatalog = (): void => {
        catOverlay.style.display  = 'none';
        document.body.style.overflow = '';
        if (catalogIcon) catalogIcon.src = iconOpen;
        curCatId = null;
    };

    // Подсвечиваем активную категорию 
    const highlightCat = (id: number): void => {
        catOverlay.querySelectorAll<HTMLElement>('.js-cat-item').forEach(el => {
            const active = parseInt(el.getAttribute('data-id') ?? '0') === id;
            el.style.background = active ? 'var(--pastel-yellow)' : '';
            el.style.borderLeft = active ? '2px solid var(--accent1)' : '2px solid transparent';
        });
    };

    // Показываем подкатегории для выбранной категории
    const showSubs = (catId: number, catName: string, slide = false): void => {
        curCatId = catId;
        if (jsCatTitle) { jsCatTitle.textContent = catName; jsCatTitle.style.display = 'block'; }

        const filtered = subs.filter(s => s.category_id === catId);
        const cat = cats.find(c => c.id === catId);

        if (jsSubList) {
            jsSubList.innerHTML = filtered.length === 0
                ? '<div style="padding:20px;color:#6B6B6B;font-family:Manrope,sans-serif;font-size:14px;">Нет подкатегорий</div>'
                : '<div class="subcategories-grid">' +
                    filtered.map(s =>
                        `<a href="/pages/catalog.html?category=${cat?.url_key ?? ''}&subcategory=${s.url_key}" class="subcategory-link">${s.subcategory_name}</a>`
                    ).join('') +
                  '</div>';
        }

        if (!isDesktop()) {
            // На мобильном/планшете показываем подкатегории вместо категорий
            if (jsCatList) jsCatList.style.display = 'none';
            if (jsSubPanel) jsSubPanel.style.display = 'block';
            if (jsBackBtn) jsBackBtn.style.display = 'block';
        } else {
            // На десктопе оба столбца видны одновременно
            if (jsSubPanel) jsSubPanel.style.display = 'block';
        }
    };

    // Список категорий добавляется слева
    const renderCats = (): void => {
        if (!jsCatList) return;
        jsCatList.innerHTML = '';

        cats.forEach(c => {
            const item = document.createElement('div');
            item.className = 'js-cat-item';
            item.setAttribute('data-id',  String(c.id));
            item.setAttribute('data-url', c.url_key);
            item.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;border-left:2px solid transparent;font-family:Manrope,sans-serif;font-size:14px;transition:background 0.15s;';
            item.innerHTML = (c.icon_url
                ? `<img src="${c.icon_url}" style="width:36px;height:36px;flex-shrink:0;" alt="" />`
                : '<span style="width:36px;text-align:center;flex-shrink:0;">📁</span>')
                + `<span>${c.category_name}</span>`;

            item.addEventListener('mouseenter', () => {
                item.style.background = 'var(--light-yellow)';
                // На десктопе подкатегории показываются при наведении
                if (isDesktop()) { showSubs(c.id, c.category_name); highlightCat(c.id); }
            });
            item.addEventListener('mouseleave', () => {
                // Убираем подсветку только если это не активная категория
                if (parseInt(item.getAttribute('data-id') ?? '0') !== curCatId) {
                    item.style.background = '';
                }
            });
            item.addEventListener('click', () => {
                if (!isDesktop()) {
                    // На мобилках клик открывает подкатегории для категории
                    showSubs(c.id, c.category_name, true);
                    highlightCat(c.id);
                } else {
                    // На десктопе клик переходит в каталог по подкатегории
                    window.location.href = `/pages/catalog.html?category=${c.url_key}`;
                }
            });
            jsCatList.appendChild(item);
        });

        // На десктопе сразу показываем подкатегории первой категории
        if (isDesktop() && cats.length > 0) {
            showSubs(cats[0].id, cats[0].category_name);
            highlightCat(cats[0].id);
        }
    };

    // Загружаем категории и подкатегории
    const loadCatalog = async (): Promise<void> => {
        if (jsCatList) jsCatList.innerHTML = '<div style="padding:20px;color:var(--dark-gray);font-family:Manrope,sans-serif;">Загрузка...</div>';
        try {
            // Загружаем категории и подкатегории параллельно
            const [catsRes, subsRes] = await Promise.all([
                fetch('/api/categories/'),
                fetch('/api/subcategories/')
            ]);
            if (!catsRes.ok) throw new Error('categories ' + catsRes.status);
            if (!subsRes.ok) throw new Error('subcategories ' + subsRes.status);
            cats = await catsRes.json() as Cat[];
            subs = await subsRes.json() as Sub[];
            renderCats();
        } catch (err) {
            console.error('loadCatalog:', err);
            if (jsCatList) jsCatList.innerHTML = '<div style="padding:20px;color:var(--error);font-family:Manrope,sans-serif;">Ошибка загрузки</div>';
        }
    };

    // Открываем/закрываем каталог по кнопке
    catalogBtn?.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        isCatalogOpen() ? closeCatalog() : openCatalog();
    });

    // Клик на затемненную область закрывает каталог
    catOverlay.addEventListener('click', (e: MouseEvent) => {
        if (e.target === catOverlay) closeCatalog();
    });

    // Escape закрывает каталог
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isCatalogOpen()) closeCatalog();
    });

}
