const root = document.querySelector<HTMLElement>('#app');

if (!root) throw new Error('app_root_missing');

root.innerHTML = '<main><h1>Дачаметр</h1><p>Калькулятор участка готовится к запуску.</p></main>';
