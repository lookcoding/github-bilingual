/**
 * GitHub 汉化与双语预览设置控制逻辑
 */

document.addEventListener('DOMContentLoaded', () => {
  const fields = [
    'enabled',
    'showEnglishTooltip',
    'altKeyToggle',
    'showDottedUnderline',
    'enableRegExp'
  ];

  const defaultValues = {
    enabled: true,
    showEnglishTooltip: true,
    altKeyToggle: true,
    showDottedUnderline: false,
    enableRegExp: true
  };

  // 读取已保存设置
  chrome.storage.local.get(defaultValues, (items) => {
    fields.forEach(field => {
      const el = document.getElementById(field);
      if (el) {
        el.checked = !!items[field];
      }
    });
  });

  // 绑定切换事件
  fields.forEach(field => {
    const el = document.getElementById(field);
    if (el) {
      el.addEventListener('change', () => {
        const update = {};
        update[field] = el.checked;
        chrome.storage.local.set(update);
      });
    }
  });
});
