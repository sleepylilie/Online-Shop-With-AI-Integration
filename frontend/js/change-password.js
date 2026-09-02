/**
 * change-password.ts - страница смены пароля
 *
 * На этой странице пользователь задает новый пароль.
 * Если все прошло успешно — переходит на страницу подтверждения.
 */
// Берем токен авторизации из localStorage
const tok = () => localStorage.getItem('access_token');
// Если пользователь не авторизован, то перемещение на главную
if (!tok()) {
    window.location.href = '/index.html';
}
// Поля ввода и кнопка
const newPwdInput = document.getElementById('change-password__new');
const confirmInput = document.getElementById('change-password__confirm');
const submitBtn = document.getElementById('change-password__submit');
// Элементы для отображения ошибок
const newMsg = document.getElementById('change-password__new-msg');
const confirmMsg = document.getElementById('change-password__confirm-msg');
const generalMsg = document.getElementById('change-password__general-msg');
// =============
// Показ ошибок под полями
// =============
// Показываем ошибку под конкретным полем
const showErr = (el, text) => {
    el.textContent = text;
    el.style.display = text ? 'block' : 'none';
    el.style.color = 'var(--error)';
    // Находим родительское поле и подсвечиваем его нижнюю границу
    const inp = el.closest('.text-input')?.querySelector('.text-input__field');
    if (inp)
        inp.style.borderBottomColor = text ? 'var(--error)' : '';
};
// =============
// Валидация при вводе
// =============
// Проверяем длину пароля
newPwdInput?.addEventListener('input', () => {
    showErr(newMsg, newPwdInput.value.length > 0 && newPwdInput.value.length < 6
        ? 'Пароль — не менее 6 символов.' : '');
});
// Проверяем совпадение паролей
confirmInput?.addEventListener('input', () => {
    showErr(confirmMsg, confirmInput.value && confirmInput.value !== newPwdInput.value
        ? 'Пароли не совпадают.' : '');
});
// =============
// Отправка нового пароля
// =============
submitBtn?.addEventListener('click', async () => {
    const newPwd = newPwdInput.value;
    const confirm = confirmInput.value;
    // Финальная проверка перед отправкой
    let hasErr = false;
    if (!newPwd || newPwd.length < 6) {
        showErr(newMsg, 'Пароль должен быть не менее 6 символов.');
        hasErr = true;
    }
    if (!confirm) {
        showErr(confirmMsg, 'Повторите пароль.');
        hasErr = true;
    }
    else if (newPwd !== confirm) {
        showErr(confirmMsg, 'Пароли не совпадают.');
        hasErr = true;
    }
    if (hasErr)
        return;
    // Блокируем кнопку на время запроса чтобы не было двойной отправки
    submitBtn.disabled = true;
    submitBtn.textContent = 'Меняем пароль...';
    try {
        const token = tok();
        const res = await fetch('/api/auth/change-password/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ new_password: newPwd }),
        });
        // Читаем ответ как текст (если вернулся HTML вместо JSOn)
        const rawText = await res.text();
        if (res.ok) {
            // Удаление старых токенов
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_name');
            window.location.href = '/pages/change-password-success.html';
        }
        else {
            // Показываем ошибку от сервера
            let errorText = `Ошибка ${res.status}.`;
            try {
                const data = JSON.parse(rawText);
                errorText = data.error || data.detail || errorText;
            }
            catch { }
            generalMsg.textContent = errorText;
            generalMsg.style.display = 'block';
            // Возвращаем кнопку чтобы пользователь мог попробовать снова
            submitBtn.disabled = false;
            submitBtn.textContent = 'Сменить пароль';
        }
    }
    catch (err) {
        // Переход на страницу с ошибкой, если пароль не сменился
        console.error('change-password error:', err);
        window.location.href = '/pages/change-password-error.html';
    }
});
export {};
