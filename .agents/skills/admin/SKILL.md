---
name: "admin"
description: "Sys"

Personal CRM Bot — Перехватчик
Telegram Business API бот в стиле @tutkonos_bot

Команды
Бесплатные:
/start — Главное меню с кнопками
/profile — Мой профиль (подписка, триал, рефералы)
/delete — Удалённые сообщения
/edit — Редактированные сообщения
/timed — Временные фото (исчезающие)
/anim — Анимации сообщений
С подпиской:
/always — Авто-анимация при каждом сообщении
/film — Мультики и фильмы
/game — Игры на двоих
/other — Дополнительные функции
/negotiator — AI переговорщик
/autodecrypt — Авторасшифровка
/dialog — История диалога AI
/summarize — Выжимка диалога
Анимации (префиксы):
_Текст — посимвольно
-Текст — бегущая строка
%Текст — сломанный текст
&Текст — анимация шрифтами
=Текст — слова по очереди
+Текст — медленное удаление
Пасхалко — весёлый удав
Админ:
/admin — 10 пунктов статистики
/genkey <срок> — генерация ключа (1h, 6h, 1d, 3d, 7d, 30d, perm)
Архитектура
personal_crm_bot/
├── bot.py                  # Точка входа + регистрация команд
├── config.py               # Настройки
├── redis_client.py         # Redis
├── database.py             # SQLite (users, keys, macros, audit, saved_media)
├── core/
│   └── __init__.py         # Автозагрузка modules/*.py
├── modules/
│   ├── access.py           # /start, /profile, /delete, /edit, /timed, /film, /game
│   ├── audit_log.py        # Удаления, правки, медиа, disappearing, реакции
│   ├── macros.py           # Анимации с префиксами + пасхалка
│   ├── negotiator.py       # AI переговорщик (Grok)
│   └── auto_decrypt.py     # Whisper + Vision
├── utils/
│   ├── text_effect.py      # Посимвольная печать
│   ├── media_handler.py    # Кэш + скачивание медиа
│   └── grok_client.py      # Grok API (chat, vision, whisper)
└── requirements.txt
Модели Grok
Диалоги: llama-3.3-70b-versatile
Vision: llama-3.2-90b-vision-preview
Whisper: whisper-large-v3
Запуск
cd /opt/personal_crm_bot
systemctl status personal_crm_bot
journalctl -u personal_crm_bot -f
systemctl restart personal_crm_bot
Сервер
IP: 64.188.66.249
OS: Ubuntu 24.04
Redis: запущен
Bot: @hmkolpo_bot (Перехватчик