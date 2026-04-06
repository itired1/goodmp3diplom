// static/js/auth.js
document.addEventListener('DOMContentLoaded', function() {
    // Функция повторной отправки кода
    window.resendVerification = function(email) {
        fetch('/api/force_resend_verification', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: email})
        })
        .then(r => r.json())
        .then(data => {
            alert(data.success ? '✅ Новый код отправлен!' : '❌ Ошибка: ' + data.message);
        })
        .catch(() => alert('Ошибка отправки запроса'));
    };

    // Валидация паролей (только если поля существуют)
    const pwd = document.getElementById('password');
    const cpwd = document.getElementById('confirm_password');
    if (pwd && cpwd) {
        function validate() {
            cpwd.setCustomValidity(pwd.value !== cpwd.value ? 'Пароли не совпадают' : '');
        }
        pwd.addEventListener('change', validate);
        cpwd.addEventListener('keyup', validate);
    }
});