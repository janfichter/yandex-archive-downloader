// ==UserScript==
// @name         Yandex Archive Downloader (Persistent)
// @namespace    http://tampermonkey.net/
// @version      7.0
// @description  Постоянно перехватывает image-grant и добавляет кнопку скачивания. Переживает перезагрузку страницы.
// @match        https://yandex.ru/archive/*
// @match        https://ya.ru/archive/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.log('🛡️ [YA-Persistent] Скрипт загружен и будет работать постоянно.');

    let grantData = null;

    // Перехват fetch
    const origFetch = window.fetch;
    window.fetch = function(...args) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] ? args[0].url : '');
        if (url && url.includes('image-grant')) {
            return origFetch.apply(this, args).then(async res => {
                const clone = res.clone();
                try {
                    const data = await clone.json();
                    if (data && data.url) {
                        grantData = { url: data.url, token: data.token || null };
                        updateButton('🟢 СКАЧАТЬ ОРИГИНАЛ', true);
                    }
                } catch (e) {}
                return res;
            });
        }
        return origFetch.apply(this, args);
    };

    function createButton() {
        if (document.getElementById('ya-persistent-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'ya-persistent-btn';
        btn.innerText = '⏳ Кликните по изображению...';
        btn.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 999999;
            padding: 15px 25px; background: #333; color: #fff;
            border: 2px solid #fc0; border-radius: 8px; cursor: pointer;
            font-weight: bold; font-size: 14px; font-family: Arial, sans-serif;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        `;
        btn.onclick = async () => {
            if (!grantData || !grantData.url) {
                alert('Сначала кликните по изображению или измените масштаб, чтобы скрипт перехватил данные.');
                return;
            }
            btn.innerText = '⏳ Загрузка...';
            btn.disabled = true;
            try {
                const headers = {};
                if (grantData.token) headers['X-Archive-Image-Token'] = grantData.token;
                
                const res = await fetch(grantData.url, { 
                    method: 'GET', 
                    credentials: 'include', 
                    headers 
                });
                
                if (!res.ok) throw new Error('HTTP ' + res.status);
                
                const blob = await res.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'archive_doc.jpg';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                btn.innerText = '✅ Скачано!';
                setTimeout(() => { 
                    btn.innerText = '🟢 СКАЧАТЬ ОРИГИНАЛ'; 
                    btn.disabled = false; 
                }, 2000);
            } catch (e) {
                console.error('Ошибка:', e);
                btn.innerText = '❌ Ошибка';
                btn.disabled = false;
            }
        };
        document.body.appendChild(btn);
    }

    function updateButton(text, active) {
        const btn = document.getElementById('ya-persistent-btn');
        if (btn) {
            btn.innerText = text;
            if (active) {
                btn.style.background = '#00aa00';
                btn.style.borderColor = '#008800';
            }
        }
    }

    // Создаем кнопку сразу и следим за DOM (для SPA-навигации)
    createButton();
    new MutationObserver(() => {
        if (!document.getElementById('ya-persistent-btn')) createButton();
    }).observe(document.body, { childList: true, subtree: true });
})();
