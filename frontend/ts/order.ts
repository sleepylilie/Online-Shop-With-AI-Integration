export {};

/**
 * order.ts - страница оформления заказа
 *
 * Страница:
 * - загружает данные товаров, переданных из корзины, 
 * - считает сумму с учетом скидок и стоимости доставки, 
 * - дает пользователю заполнить форму.
 * При успешной отправке переход на страницу подтверждения, при ошибке - на страницу с описанием ошибки.
 */


// =============
// Описание структуры позиции корзины
// =============

interface CartItem {
    cart_item_id: number;
    product_id: number;
    product_name: string;
    price: string;
    old_price: string | null;
    quantity: number;
    image_url: string | null;
}


// =============
// Утилиты
// =============

const tok = (): string | null => localStorage.getItem('access_token');

// Цена форматируется со значком рубля
const fmt = (n: number): string => n.toLocaleString('ru-RU', { minimumFractionDigits: 0 }) + ' ₽';

// Форматирование дат в ДД.ММ.ГГГГ
const fmtDate = (d: Date): string =>
    d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Дата для API остается прежней
const isoDate = (d: Date): string => d.toISOString().split('T')[0];


// =============
// Состояние
// =============

let cartItems: CartItem[] = [];
let cartItemIds: number[] = [];
let selectedDate: string = '';
let selectedTime: string = '';

const DELIVERY_COST = 100;


// =============
// 1. Загрузка данных и расчёт суммы
// =============

const loadOrderSummary = async (): Promise<void> => {
    // Читаем ID позиций корзины из адресной строки
    const idsStr = new URLSearchParams(window.location.search).get('cart_items') ?? '';
    cartItemIds = idsStr.split(',').map(Number).filter(Boolean);

    if (!cartItemIds.length) {
        alert('Нет выбранных товаров. Вернитесь в корзину.');
        window.location.href = '/pages/cart.html';
        return;
    }

    if (!tok()) {
        window.location.href = '/pages/cart.html';
        return;
    }

    try {
        // Загружаем всю корзину и оставляем только выбранные позиции
        const res = await fetch('/api/cart/', { headers: { 'Authorization': `Bearer ${tok()}` } });
        if (!res.ok) throw new Error();

        const allItems: CartItem[] = await res.json();
        cartItems = allItems.filter(i => cartItemIds.includes(i.cart_item_id));

        recalcSummary();
    } catch {
        console.error('Ошибка загрузки корзины');
    }
};

const recalcSummary = (): void => {
    let totalQty = 0;     // кол-во товаров
    let totalFull = 0;    // сумма по ценам без скидки
    let totalActual = 0;  // сумма по ценам со скидкой

    cartItems.forEach(item => {
        const price = parseFloat(item.price);
        // Проверка на наличие скидки у товара
        const oldPrice = item.old_price ? parseFloat(item.old_price) : price;
        totalQty += item.quantity;
        totalFull += oldPrice * item.quantity;
        totalActual += price * item.quantity;
    });

    // Считаем скидку и итоговую сумму с доставкой
    const discount = totalFull - totalActual;
    const total = totalActual + DELIVERY_COST;

    // Вспомогательная функция чтобы не повторять getElementById
    const set = (id: string, val: string) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    // Обновляем все элементы блока итогов
    set('order__total-count', String(totalQty));
    set('order__items-price', fmt(totalFull));
    set('order__discount', discount > 0 ? `−${fmt(discount)}` : fmt(0));
    set('order__delivery-cost', fmt(DELIVERY_COST));
    set('order__final-price', fmt(total));
};


// =============
// 2. Кнопки выбора даты и времени
// =============

const initDeliveryButtons = (): void => {
    const datesContainer = document.getElementById('order__dates-container')!;
    const timesContainer = document.getElementById('order__times-container')!;

    // Генерируем три кнопки для даты: завтра, послезавтра, через два дня
    const today = new Date();
    for (let i = 1; i <= 3; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);

        const btn = document.createElement('button');
        btn.className = 'order__delivery-time';
        btn.textContent = fmtDate(d);
        btn.setAttribute('data-date', isoDate(d));
        datesContainer.appendChild(btn);
    }

    // Активное состояние может быть только на одной кнопке
    const dateButtons = datesContainer.querySelectorAll<HTMLButtonElement>('.order__delivery-time');
    const selectDate = (btn: HTMLButtonElement): void => {
        dateButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDate = btn.getAttribute('data-date') ?? '';
        checkFormValidity();
    };
    // Вешаем клик на каждую кнопку даты
    dateButtons.forEach(btn => btn.addEventListener('click', () => selectDate(btn)));
    // Первая дата выбрана по умолчанию
    if (dateButtons[0]) selectDate(dateButtons[0]);

    // То же самое для кнопок времени
    const timeButtons = timesContainer.querySelectorAll<HTMLButtonElement>('.order__delivery-time');
    const selectTime = (btn: HTMLButtonElement): void => {
        timeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTime = btn.getAttribute('data-time') ?? '';
        checkFormValidity();
    };
    // Вешаем клик на каждую кнопку времени
    timeButtons.forEach(btn => btn.addEventListener('click', () => selectTime(btn)));
    // По умолчанию выбираем первый временной слот
    if (timeButtons[0]) selectTime(timeButtons[0]);
};


// =============
// 3. Чекбокс "использовать данные из личного кабинета"
// =============

const initProfileCheckbox = (): void => {
    const checkbox = document.getElementById('order__use-profile-info') as HTMLInputElement | null;
    if (!checkbox) return;

    checkbox.addEventListener('change', async () => {
        if (!checkbox.checked) return;
        if (!tok()) { checkbox.checked = false; alert('Войдите в аккаунт.'); return; }

        try {
            // Запрашиваем данные профиля и подставляем в поля формы
            const res = await fetch('/api/auth/me/', {
                headers: { 'Authorization': `Bearer ${tok()}` }
            });
            if (!res.ok) throw new Error();
            const user = await res.json();

            const set = (id: string, val: string) => {
                const el = document.getElementById(id) as HTMLInputElement | null;
                // Заполняем поле только если значение есть
                if (el && val) el.value = val;
            };

            set('order__first-name', user.first_name ?? '');
            set('order__last-name', user.last_name ?? '');
            set('order__email', user.email ?? '');
            set('order__phone', user.phone ?? '');

            checkFormValidity();
        } catch {
            console.error('Не удалось загрузить данные профиля');
        }
    });
};


// =============
// 4. Валидация полей
// =============

// Показывает или убирает ошибку под полем
const showFieldErr = (msgId: string, text: string): void => {
    const el = document.getElementById(msgId);
    if (!el) return;
    el.textContent = text;
    el.style.display = text ? 'block' : 'none';
    el.style.color = text ? 'var(--error)' : '';

    const inp = el.closest('.text-input')?.querySelector<HTMLInputElement>('.text-input__field');
    if (inp) inp.style.borderBottomColor = text ? 'var(--error)' : '';
};

// Маска телефона +7(XXX) XXX-XX-XX строится пока пользователь вводит
const applyPhoneMask = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (!digits) return '';

    let result = '+7(';
    result += digits.slice(0, Math.min(3, digits.length));
    if (digits.length >= 3) result += ') ';
    if (digits.length > 3)  result += digits.slice(3, Math.min(6, digits.length));
    if (digits.length >= 6) result += '-';
    if (digits.length > 6)  result += digits.slice(6, Math.min(8, digits.length));
    if (digits.length >= 8) result += '-';
    if (digits.length > 8)  result += digits.slice(8, 10);
    return result;
};

// ПроверяетЖ, что номер телефона введен полностью
const valPhone = (v: string): string => {
    if (!v || v === '+7(') return 'Введите телефон.';
    if (v.replace(/\D/g, '').length < 11) return 'Введите номер полностью.';
    return '';
};

// Проверка почтового адреса
const valEmail = (v: string): string => {
    if (!v) return 'Введите email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Неверный формат email.';
    return '';
};

// Проверяет все обязательные поля и блокирует/разблокирует кнопку отправки
const checkFormValidity = (): void => {
    const submitBtn = document.getElementById('order__submit') as HTMLButtonElement | null;
    if (!submitBtn) return;

    const get = (id: string): string =>
        (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';

    // Форма валидна только если все обязательные поля заполнены правильно
    const valid =
        get('order__last-name') !== '' &&
        get('order__first-name') !== '' &&
        valEmail(get('order__email')) === '' &&
        valPhone(get('order__phone')) === '' &&
        get('order__city') !== '' &&
        get('order__street') !== '' &&
        get('order__apartment') !== '' &&
        selectedDate !== '' &&
        selectedTime !== '';

    // Стиль кнопки, когда она разблокировывается
    submitBtn.disabled = !valid;
    submitBtn.style.backgroundColor = valid ? '' : 'var(--dark-gray)';
    submitBtn.style.opacity = valid ? '1' : '0.7';
    submitBtn.style.cursor = valid ? 'pointer' : 'not-allowed';
};

// Обработчики для полей ввода
const initFieldValidation = (): void => {
    const valName = (v: string): string => {
        if (!v) return 'Введите имя/фамилию.';
        if (!/^[a-zA-Zа-яёА-ЯЁ][a-zA-Zа-яёА-ЯЁ\s\-]*$/.test(v))
            return 'Только буквы, пробел и дефис.';
        return '';
    };

    // Для имени и фамилии убираем цифры и спецсимволы
    ['order__last-name', 'order__first-name'].forEach(id => {
        const inp = document.getElementById(id) as HTMLInputElement | null;
        inp?.addEventListener('input', () => {
            const cleaned = inp.value.replace(/[^a-zA-Zа-яёА-ЯЁ\s\-]/g, '');
            if (cleaned !== inp.value) inp.value = cleaned;
        });
    });

    // Соответствие полей ввода и ошибок
    const fields: [string, string, (v: string) => string][] = [
        ['order__last-name', 'order__last-name-msg', valName],
        ['order__first-name', 'order__first-name-msg', valName],
        ['order__email', 'order__email-msg', valEmail],
        ['order__phone', 'order__phone-msg', valPhone],
        ['order__city', 'order__city-msg', v => v ? '' : 'Введите город.'],
        ['order__street', 'order__street-msg',  v => v ? '' : 'Введите улицу и дом.'],
        ['order__apartment', 'order__apartment-msg', v => v ? '' : 'Введите квартиру.'],
    ];

    // Для каждого поля вешаем проверку при вводе и при потере фокуса
    fields.forEach(([inputId, msgId, validator]) => {
        if (inputId === 'order__phone') return; // телефон обрабатывается отдельно ниже
        const inp = document.getElementById(inputId) as HTMLInputElement | null;
        if (!inp) return;
        inp.addEventListener('input', () => {
            showFieldErr(msgId, validator(inp.value.trim()));
            checkFormValidity();
        });
        inp.addEventListener('blur', () => {
            showFieldErr(msgId, validator(inp.value.trim()));
        });
    });

    // Особая обработка поля телефона (чтобы работало с маской)
    const phoneInput = document.getElementById('order__phone') as HTMLInputElement | null;
    if (phoneInput) {
        phoneInput.addEventListener('input', (e: Event) => {
            let digits = (e.target as HTMLInputElement).value.replace(/\D/g, '');
            if (digits.startsWith('7')) digits = digits.slice(1);
            const masked = applyPhoneMask(digits);
            (e.target as HTMLInputElement).value = masked;
            showFieldErr('order__phone-msg', valPhone(masked));
            checkFormValidity();
        });

        phoneInput.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Backspace') {
                e.preventDefault();
                // Удаляется последнюю введенная цифра, а не символы маски
                const digits = phoneInput.value.replace(/\D/g, '');
                const local = digits.startsWith('7') ? digits.slice(1) : digits;
                if (local.length === 0) { phoneInput.value = ''; }
                else {
                    const trimmed = local.slice(0, -1);
                    phoneInput.value = applyPhoneMask(trimmed);
                }
                showFieldErr('order__phone-msg', valPhone(phoneInput.value));
                checkFormValidity();
                return;
            }
            // Разрешаем только цифры и клавиши навигации
            if (!/[\d]/.test(e.key) &&
                !['Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key) &&
                !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
            }
        });

        phoneInput.setAttribute('placeholder', '+7(___) ___-__-__');
        // При потере фокуса показываем ошибку, если номер не полный
        phoneInput.addEventListener('blur', () => {
            showFieldErr('order__phone-msg', valPhone(phoneInput.value));
        });
    }
};


// =============
// 5. Отправка заказа
// =============

const submitOrder = async (): Promise<void> => {
    const submitBtn = document.getElementById('order__submit') as HTMLButtonElement | null;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.backgroundColor = 'var(--dark-gray)';
        submitBtn.style.cursor = 'not-allowed';
    }

    // Собираем все данные формы в один объект
    const get = (id: string): string =>
        (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? '';
    const getRadio = (): string =>
        (document.querySelector<HTMLInputElement>('input[name="payment_method"]:checked'))?.value ?? '';

    const payload = {
        cart_item_ids: cartItemIds,
        first_name: get('order__first-name'),
        last_name: get('order__last-name'),
        email: get('order__email'),
        phone: get('order__phone'),
        city: get('order__city'),
        street: get('order__street'),
        apartment: get('order__apartment'),
        entrance: get('order__entrance'),
        floor: get('order__floor'),
        comment: get('order__comment'),
        delivery_date: selectedDate,
        delivery_time_slot: selectedTime,
        payment_method: getRadio(),
    };

    try {
        // Отправляем запрос на создание нового заказа
        const res = await fetch('/api/orders/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok()}` },
            body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (res.ok) {
            // При успехе переход на страницу успешного оформления
            window.location.href = `/pages/order-successful.html?order_number=${data.order_number}`;
        } else {
            console.error('Order error:', data);
            window.location.href = '/pages/order-error.html';
        }
    } catch (err) {
        console.error(err);
        window.location.href = '/pages/order-error.html';
    }
};

document.getElementById('order__submit')?.addEventListener('click', submitOrder);


// =============
// Инициализация
// =============

initDeliveryButtons();
initFieldValidation();
initProfileCheckbox();
loadOrderSummary();
