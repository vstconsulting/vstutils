# flake8: noqa: E501
TRANSLATION = {
    'new': 'Новый',
    'Create': 'Создать',
    'add': 'добавить',
    'Edit': 'Редактировать',
    'edit': 'Редактировать',
    'Save': 'Сохранить',
    'Remove': 'Удалить',
    'Reload': 'Перезагрузить',
    'send': 'отправить',
    'select': 'выбрать',
    'filters': 'фильтры',
    'apply': 'применить',
    'cancel': 'отменить',
    'field': 'поле',
    'actions': 'действия',
    'sublinks': 'вложенные ссылки',
    'name': 'наименование',
    'type': 'тип',
    'owner': 'владелец',
    'notes': 'заметки',
    'copy': 'копировать',
    'error': 'ошибка',
    'home': 'главная',
    'login': 'войти',
    'logout': 'выйти',
    'Profile': 'Профиль',
    'settings': 'настройки',
    'Settings': 'Настройки',
    'version': 'версий | версия | версии',
    'cache': 'кэш',
    'documentation': 'документация',
    'request': 'запрос',
    'repository': 'репозиторий',
    'app info': 'инфо',
    'status': 'статус',
    'List is empty': 'Список пуст',
    'child instances': 'вложенные объекты',
    'enter value': 'введите значение',
    'more info': 'подробнее',
    'search by': 'поиск по полю',
    'Search': 'Поиск',

    # x-menu generic
    'system': 'Система',
    'users': 'Пользователи',
    'Is active': 'Активен',
    'Is staff': 'Модератор',

    # field's validation
    # empty
    'Field "<b>{0}</b>" is empty.': 'Поле "<b>{0}</b>" пустое.',
    # required
    'Field "<b>{0}</b>" is required.': 'Поле "<b>{0}</b>" обязательно для заполнения.',
    # minLength
    'Field "<b>{0}</b>" is too short.<br> Field length should not be shorter, then {1}.': 'Длина поля "<b>{0}</b>" слишком мала.<br>Длина поля должна быть не меньше, чем {1}.',
    # maxLength
    'Field "<b>{0}</b>" is too long. <br> Field length should not be longer, then {1}.': 'Длина поля "<b>{0}</b>" слишком велика.<br>Длина поля должна быть не больше, чем {1}.',
    # min
    'Field "<b>{0}</b>" is too small.<br> Field should not be smaller, then {1}.': 'Значение поля "<b>{0}</b>" слишком мало.<br> Значение поля должно быть не меньше, чем {1}.',
    # max
    'Field "<b>{0}</b>" is too big.<br> Field should not be bigger, then {1}.': 'Значение поля "<b>{0}</b>" слишком велико.<br> Значение поля должно быть не больше, чем {1}.',
    # invalid
    '<b>{0} </b> value is not valid for <b>{1}</b> field.': 'Значение <b>{0}</b> не допустимо для поля <b>{1}</b>.',
    # email
    '<b>"{0}"</b> field should be written in <b>"example@mail.com"</b> format.': 'Поле <b>"{0}"</b> должно быть заполнено в формате <b>"example@mail.com"</b>.',


    # instance operation success
    # add
    'Child "<b>{0}</b>" instance was successfully added to parent list.': 'Дочерний объект "<b>{0}</b>" был успешно добавлен в родительский список.',
    # create
    'New "<b>{0}</b>" instance was successfully created.': 'Новый объект "<b>{0}</b>" был успешно создан.',
    # remove
    '"<b>{0}</b>" {1} was successfully removed.': '"<b>{0}</b>" {1} был(а) успешно удален.',
    # save
    'Changes in "<b>{0}</b>" {1} were successfully saved.': 'Изменения в объекте {1} "<b>{0}</b>" были успешно сохранены.',
    # execute
    'Action "<b>{0}</b>" was successfully executed on "<b>{1}</b>" instance.': 'Действие "<b>{0}</b>" было успешно запущено на объекте "<b>{1}</b>".',
    # instance operation error
    # add:
    'An error occurred during adding of child "<b>{0}</b>" instance to parent list.<br> Error details: {1}': 'Во время добавления дочернего объекта "<b>{0}</b>" к родительскому списку произошла ошибка.<br> Подробнее: {1}',
    # create:
    'An error occurred during creation.<br>Error details:<br>{0}': 'Во время создания нового объекта произошла ошибка.<br>Подробнее:<br>{0}',
    # remove:
    'An error occurred during removal process of "<b>{0}</b>" {1}.<br> Error details: {2}': 'Во время удаления {1} "<b>{0}</b>" произошла ошибка.<br> Подробнее: {2}',
    # save:
    'An error occurred during process.<br>Error details:<br>{0}': 'Во время сохранения произошла ошибка.<br>Подробнее:<br>{0}',
    # execute:
    'An error occurred during <b>{0}</b>. Error details:<br>{1}': 'Во время запуска действия <b>{0}</b> произошла ошибка. Подробнее:<br>{1}',

    # multiactions button
    'actions on': 'действия над',
    'on item': 'элементов | элементом | элементами | элементами',

    'key': 'ключ',
    'value': 'значение',
    'new owner': 'новый владелец',
    'detail': 'детали',
    'description': 'описание',
    'username': 'имя пользователя',
    'is active': 'активен',
    'user': 'пользователь',
    'yes': 'да',
    'no': 'нет',
    'is staff': 'админ',
    'first name': 'имя',
    'last name': 'фамилия',
    'password': 'пароль',
    'Password': 'Пароль',
    'Change password': 'Сменить пароль',
    'Change_password': 'сменить пароль',
    'generate password': 'сформировать пароль',
    'repeat password': 'повторить пароль',
    'Repeat password': 'Повторить пароль',
    'Old password': 'Старый пароль',
    'New password': 'Новый пароль',
    'Confirm new password': 'Подтвердить новый пароль',
    'kind': 'вид',
    'mode': 'режим',
    'options': 'опции',
    'information': 'информация',
    'date': 'дата',

    'file n selected': 'файл не выбран | 1 файл выбран | {n} файла выбрано | {n} файлов выбрано',
    'image n selected': 'изображение не выбрано | 1 изображение выбрано | {n} изображения выбрано | {n} изображений выбрано',

    # filters
    'Ordering': 'Порядок сортировки',
    'is_active': 'активен',
    'Username': 'Ник',
    'First name': 'Имя',
    'Last name': 'Фамилия',

    # filters description
    'boolean value meaning status of user.': 'булево значение обозначающее статус пользователя.',
    'users first name.': 'имя пользователя',
    'users last name.': 'фамилия пользователя',
    'users e-mail value.': 'email пользователя',
    'which field to use when ordering the results.': 'поле по которому производить сортировку результатов.',
    'a unique integer value (or comma separated list) identifying this instance.': 'уникальное числовое значение (или их последовательность разделенная запятой) идентифицирующая данный объект.',
    'a name string value (or comma separated list) of instance.': 'имя объекта - строковое значение (или их последовательность разделенная запятой).',

    'Page matching current url was not found': 'Cтраница, соответствующая данному url, не была найдена',
    'Unknown error': 'Неизвестная ошибка',
    'Error': 'Ошибка',

    'sign in to start your session': 'Войдите, чтобы начать сеанс',
    'sign in': 'войти',
    'sign up': 'зарегистрируйтесь',
    'forgot password': 'забыли пароль',
    'confirm password': 'подтвердите пароль',
    'register': 'регистрация',
    'fields with * is required': 'поля отмеченые * обязательны для заполнения',
    'Forgot your password? Enter your email address below, and an email with instructions for setting a new one will be sent.': 'Забыли пароль? Введите свой адрес и мы отправим вам инструкцию для восстановления.',
    'reset my Password': 'сбросить пароль',
    'We\'ve emailed you instructions for setting your password, if an account exists with the email you entered. You should receive them shortly.': 'Мы отправили вам письмо с инструкцией для сброса пароля.',
    'If you don\'t receive an email, please make sure you\'ve entered the address you registered with, and check your spam folder.': 'Если вы не получили письмо, пожалуйста убедитесь что введен верный адрес и проверьте папку со спамом.',
    'The password reset link was invalid, possibly because it has already been used. Please request a new Password reset.': 'Неверная ссылка для восстановления пароля, возможно она уже была использована. Пожалуйста попробуйте заново.',
    'Please enter your new password twice so we can verify you typed it in correctly.': 'Пожалуйста введите новый пароль.',
    'change my password': 'изменить пароль',
    'Your password has been set.  You may go ahead and log in now.': 'Ваш пароль был успешно установлен. Теперь вы можете войти.',
    'Please enter a correct %(username)s and password. Note that both fields may be case-sensitive.': 'Пожалуйста введите корректные %(username)s и пароль. Внимание, поля могуь быть регистрозвисимыми.',
    'or': 'или',
    'two-factor authentication code': 'код двухфакторной авторизации',
    'verify code': 'подтвердить код',
    'Enter the code from the two-factor app on your mobile device. If you\'ve lost your device, you may enter one of your recovery codes.': 'Введите код из двухфакторного приложения на мобильном устройстве. Если вы потеряли свое устройство, вы можете ввести один из кодов восстановления.',
    'Invalid authentication code': 'Неверный код авторизации',
    'Scan the image with the two-factor authentication app on your phone. If you can’t use a barcode, enter this text code instead.': 'Отсканируйте изображение с помощью приложения для двухфакторной аутентификации на вашем телефоне. Если вы не можете использовать штрих-код, введите вместо него текстовый код.',
    'Enter the six-digit code from the application': 'Введите шестисимвольный код из приложения',
    'code': 'код',
    'recovery codes': 'коды восстановления',
    'Recovery codes are used to access your account in the event you cannot receive two-factor authentication codes.': 'Коды восстановления используются для доступа к вашей учетной записи в случае, если вы не можете получить коды двухфакторной аутентификации.',
    'Disabling Two-Factor Authentication (2FA) will decrease your account\'s security': 'Отключение двухфакторной авторизации снизит безопасность вашей учетной записи.',
    'Enable': 'Включить',
    'Disable': 'Выключить',
    'Two factor authentication': 'Двухфакторная авторизация',
    'No {0} matches the given query.': "Ни один {0} не соответствует данному запросу.",
    'Password is not correct.': 'Неверный пароль.',
    'New passwords values are not equal.': 'Значения нового пароля не эквивалентны.',
    'This password is entirely numeric.': 'Этот пароль полностью числовой.',
    'Dark theme': 'Темная тема',
    'Language': 'Язык',
    'height': 'высота',
    'width': 'ширина',
    'More info': 'Подробнее',
    'Dark mode': 'Темная тема',
    'Execute': 'Выполнить',

    # validators
    'unsupported image file format, expected ({0}), got {1}': 'Неподдерживаемый формат изображение, Поддерживается ({0}), получен {1}',
    'For some reason, this image file cannot be opened': 'Не удалось открыть файл изображения',
    'Invalid image {0}. Expected from {1} to {2}, got {3}': 'Некорректная {0} изображения. Ожидалось от {1} до {2}, получено {3}',
    'imageValidationResolutionError': 'Должно быть не меньше {min} и не больше {max} px.',
    'This field must contain only digits': 'Это поле должно содержать только цифры',

    # Проверить
    'Changes in settings are successfully saved. Please refresh the page.': 'Изменения в настройках успешно сохранены. Пожалуйста обновите страницу.',
    'now': 'сейчас',
    'later': 'позже',
    'i accept the ': 'Я принимаю ',
    'terms of agreement': 'лицензионное соглашение',
    'Zoom': 'Зум',
    'Scale': 'Масштаб',
    'This file format is not supported': 'Данный формат файла не поддерживается',
    'Oops! Something went wrong.': 'Упс! Что-то пошло не так',
    '[Object not found]': '[Объект не найден]',
    'Execute action on {0}': 'Выполнить действие для {0}',
    '{n} instance': '0 объектов | {n} объекта | {n} объектов',
    'Open image': 'Открыть изображение',
}
