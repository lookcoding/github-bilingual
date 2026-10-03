/**
 * GitHub 汉化与双语预览 (GitHub CN)
 * Content Script 注入脚本
 */

(function () {
  'use strict';

  /* =========================== 1. 常量与状态声明 (全局置顶，杜绝 TDZ) =========================== */

  // 默认配置
  const DEFAULT_SETTINGS = {
    enabled: true,              // 汉化总开关
    showEnglishTooltip: true,   // 鼠标悬停显示英文原词
    showDottedUnderline: false, // 汉化词汇下划线点缀
    altKeyToggle: true,         // 按住 Alt 临时切回英文
    enableRegExp: true          // 启用正则规则
  };

  let settings = { ...DEFAULT_SETTINGS };
  let isAltPreviewing = false;
  let isInitialized = false;

  // 记录所有被汉化的节点，用于 Alt 键毫秒级切换与动态还原
  // Map: textNode -> { original: string, translated: string, parent: Element }
  const textNodeRegistry = new Map();
  // Map: element -> Map(attrName -> { original: string, translated: string })
  const elementAttrRegistry = new Map();

  // 内部状态
  const State = {
    pageConfig: null,
    currentURL: window.location.href,
    mutationObserver: null,
    portalObserver: null,
    pendingMutations: false,
    toastElement: null,
    translateNav: null
  };

  // 保留的第一级系统路径集合
  const RESERVED_FIRST_PATHS = new Set([
    '', 'login', 'signup', 'logout', 'session', 'sessions', 'password_reset',
    'settings', 'orgs', 'organizations', 'explore', 'topics', 'trending',
    'search', 'marketplace', 'sponsors', 'notifications', 'watching', 'stars',
    'issues', 'pulls', 'repos', 'new', 'import', 'features', 'security',
    'pricing', 'about', 'customer-stories', 'readme', 'enterprise', 'team',
    'dashboard', 'feed', 'collections', 'events', 'discussions'
  ]);

  // 严格全局忽略元素标签（代码、输入框、脚本、图标等）
  const GLOBAL_IGNORE_TAGS = new Set([
    'SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'INPUT',
    'SVG', 'IMG', 'CANVAS', 'VIDEO', 'KBD'
  ]);

  // 可翻译的交互与提示属性列表（涵盖按钮悬停提示、无障碍说明、表单占位符等）
  const TRANSLATABLE_ATTRS = ['title', 'aria-label', 'placeholder', 'data-tooltip', 'data-tooltip-text', 'data-placeholder'];

  /* =========================== 2. 页面类型检测与配置构建 =========================== */

  function detectPageType() {
    try {
      const url = new URL(window.location.href);
      const { hostname, pathname } = url;
      const I18N = window.I18N;
      if (!I18N || !I18N.conf) return false;

      const pageMap = {
        'gist.github.com': 'gist',
        'www.githubstatus.com': 'status',
        'skills.github.com': 'skills',
        'education.github.com': 'education'
      };

      const site = pageMap[hostname] || 'github';
      if (site !== 'github') return site;

      const parts = pathname.replace(/^\/|\/$/g, '').split('/');
      if (parts.length === 0 || parts[0] === '') {
        const isLogin = document.body ? document.body.classList.contains('logged-in') : true;
        return isLogin ? 'dashboard' : 'homepage';
      }

      const first = parts[0];

      // 特殊登录会话
      if (document.body?.classList.contains('session-authentication') || first === 'login' || first === 'session') {
        return 'session-authentication';
      }

      // 保留系统路径 (settings, orgs, search, notifications 等)
      if (RESERVED_FIRST_PATHS.has(first)) {
        if (first === 'settings') {
          return parts[1] ? `settings/${parts[1]}` : 'settings';
        }
        if (first === 'orgs' || first === 'organizations') {
          return parts[2] ? `orgs/${parts[2]}` : 'orgs';
        }
        if (first === 'new') {
          return parts[1] ? `new/${parts[1]}` : 'new';
        }
        const pathMatch = pathname.match(I18N.conf.rePagePath);
        return pathMatch ? (pathMatch[1] || pathMatch.slice(-1)[0]) : first;
      }

      // 只有 1 级路径 (如 /torvalds) -> 个人主页
      if (parts.length === 1) {
        const tabParam = new URLSearchParams(url.search).get('tab');
        return pathname.includes('/stars') ? 'page-profile/stars' : (tabParam ? `page-profile/${tabParam}` : 'page-profile');
      }

      // 2 级及以上路径 (如 /torvalds/linux 或 /torvalds/linux/issues) -> 仓库页
      if (parts.length >= 2) {
        const repoMatch = pathname.match(I18N.conf.rePagePathRepo);
        if (repoMatch) {
          return `repository/${repoMatch[1]}`;
        }
        if (parts.length === 2) {
          return 'repository';
        }
        return `repository/${parts[2]}`;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  function buildPageConfig(pageType) {
    const I18N = window.I18N;
    if (!I18N || !I18N['zh-CN']) return null;

    const zhCN = I18N['zh-CN'];
    const conf = I18N.conf || {};

    const pageData = zhCN[pageType] || {};
    const publicData = zhCN.public || {};

    // 级联词典：按上下文深度整合通用与局部词典
    const cascadedStatic = {};

    // 1. 全局公共词库（已包含 dict_addon.js 注入的丰富 UI、设置、下拉和 Tooltip 词条）
    Object.assign(cascadedStatic, publicData.static || {});

    // 2. 设置页面级联（确保各类个人与仓库设置栏子页面均拥有设置专有词条）
    if (pageType && (pageType.includes('settings') || window.location.pathname.includes('/settings'))) {
      if (zhCN['settings-menu']?.static) Object.assign(cascadedStatic, zhCN['settings-menu'].static);
      if (zhCN['settings']?.static) Object.assign(cascadedStatic, zhCN['settings'].static);
      if (zhCN['repository-settings-menu']?.static) Object.assign(cascadedStatic, zhCN['repository-settings-menu'].static);
      if (zhCN['orgs-settings-menu']?.static) Object.assign(cascadedStatic, zhCN['orgs-settings-menu'].static);
    }

    // 3. 仓库上下文页面级联 (代码、分支、标签、拉取请求、议题)
    if (pageType && (pageType.startsWith('repository') || window.location.pathname.match(/\/[^\/]+\/[^\/]+/))) {
      if (zhCN['repository']?.static) Object.assign(cascadedStatic, zhCN['repository'].static);
      if (zhCN['repository-public']?.static) Object.assign(cascadedStatic, zhCN['repository-public'].static);
      if (zhCN['repository/pull_issue_public']?.static) Object.assign(cascadedStatic, zhCN['repository/pull_issue_public'].static);
    }

    // 4. 当前具体页面专有字典覆盖
    if (pageData.static) {
      Object.assign(cascadedStatic, pageData.static);
    }

    const staticDict = cascadedStatic;

    const regexpRules = [
      ...(pageData.regexp || []),
      ...(publicData.regexp || [])
    ];

    const ignoreSelectorsList = [
      ...(conf.ignoreSelectorPage?.['*'] || []),
      ...(conf.ignoreSelectorPage?.[pageType] || [])
    ];

    const ignoreMutationSelectorsList = [
      ...(conf.ignoreMutationSelectorPage?.['*'] || []),
      ...(conf.ignoreMutationSelectorPage?.[pageType] || [])
    ];

    return {
      currentPageType: pageType,
      currentPath: window.location.pathname,
      staticDict,
      regexpRules,
      ignoreSelectors: ignoreSelectorsList.join(', '),
      ignoreMutationSelectors: ignoreMutationSelectorsList.join(', '),
      characterData: (conf.characterDataPage || []).includes(pageType),
      transSelectors: [
        ...(publicData.selector || []),
        ...(pageData.selector || [])
      ]
    };
  }

  function updatePageConfig(trigger) {
    const pageType = detectPageType();
    State.pageConfig = buildPageConfig(pageType);
  }

  /* =========================== 3. 文本与属性汉化核心 =========================== */

  function transText(text) {
    if (!text || typeof text !== 'string') return false;

    // 跳过纯空白、纯数字、纯中文或不含英文字母的文本
    if (/^[\s0-9]*$/.test(text) || /^[\u4e00-\u9fa5]+$/.test(text) || !/[a-zA-Z,.]/.test(text)) {
      return false;
    }

    const trimmedText = text.trim();
    const cleanedText = trimmedText.replace(/\xa0|[\s]+/g, ' ');

    const activeDict = State.pageConfig?.staticDict || window.I18N?.['zh-CN']?.public?.static || {};
    const globalDict = window.I18N?.['zh-CN']?.public?.static || {};

    // 1. 静态词典精确匹配
    let staticResult = activeDict[cleanedText] || globalDict[cleanedText];
    if (typeof staticResult === 'string' && staticResult !== cleanedText) {
      return text.replace(trimmedText, staticResult);
    }

    // 1.1 省略号兼容匹配 (... 与 …)
    const altEllipsis = cleanedText.includes('…')
      ? cleanedText.replace(/…/g, '...')
      : (cleanedText.includes('...') ? cleanedText.replace(/\.\.\./g, '…') : null);
    if (altEllipsis) {
      const match = activeDict[altEllipsis] || globalDict[altEllipsis];
      if (typeof match === 'string' && match !== cleanedText) {
        return text.replace(trimmedText, match);
      }
    }

    // 1.2 智能拆分匹配：带快捷键后缀（如 "Issues (g i)" -> "议题 (g i)"，"Search (/)" -> "搜索 (/)"）
    const shortcutMatch = cleanedText.match(/^(.*?)\s*(\([a-zA-Z0-9\s\+\/,-]+\))$/);
    if (shortcutMatch) {
      const prefix = shortcutMatch[1].trim();
      const shortcutSuffix = shortcutMatch[2];
      const prefixResult = activeDict[prefix] || globalDict[prefix];
      if (prefixResult) {
        return text.replace(trimmedText, `${prefixResult} ${shortcutSuffix}`);
      }
    }

    // 1.3 智能拆分匹配：带冒号的表单标签（如 "Label:" -> "标签:"）
    if (cleanedText.endsWith(':')) {
      const prefix = cleanedText.slice(0, -1).trim();
      const prefixResult = activeDict[prefix] || globalDict[prefix];
      if (prefixResult) {
        return text.replace(trimmedText, `${prefixResult}:`);
      }
    }

    // 2. 正则规则匹配
    if (settings.enableRegExp && State.pageConfig?.regexpRules) {
      for (const [pattern, replacement] of State.pageConfig.regexpRules) {
        const result = cleanedText.replace(pattern, replacement);
        if (result !== cleanedText) {
          return text.replace(trimmedText, result);
        }
      }
    }

    return false;
  }

  // 处理文本节点（实现保留英文预览的核心）
  function handleTextNode(node) {
    if (!settings.enabled || isAltPreviewing) return;
    if (node.length > 500) return;

    const originalText = node.data;
    if (!originalText) return;

    const parent = node.parentElement;
    if (!parent) return;
    if (GLOBAL_IGNORE_TAGS.has(parent.tagName)) return;

    // 检查黑名单选择器
    if (State.pageConfig?.ignoreSelectors && parent.closest(State.pageConfig.ignoreSelectors)) {
      return;
    }

    const translatedText = transText(originalText);
    if (translatedText && translatedText !== originalText) {
      const trimmedOriginal = originalText.trim();

      // 登记到内存映射表
      textNodeRegistry.set(node, {
        original: originalText,
        translated: translatedText,
        parent: parent
      });

      // 保留英文原词信息到父元素属性上
      if (!parent.hasAttribute('data-ghcn-en')) {
        parent.setAttribute('data-ghcn-en', trimmedOriginal);
        parent.setAttribute('data-ghcn-translated', 'true');

        if (settings.showEnglishTooltip && !parent.hasAttribute('title')) {
          parent.setAttribute('data-ghcn-orig-title', '');
          parent.setAttribute('title', `原英文: ${trimmedOriginal}`);
        }

        if (settings.showDottedUnderline) {
          parent.classList.add('ghcn-underline');
        }
      }

      // 执行替换
      node.data = translatedText;
    }
  }

  // 批量/单个属性翻译
  function transElementAttr(target, attrName) {
    if (!settings.enabled || isAltPreviewing) return;
    const original = target.getAttribute ? target.getAttribute(attrName) : target[attrName];
    if (!original || typeof original !== 'string') return;

    const translated = transText(original);
    if (translated && translated !== original) {
      if (target instanceof Element) {
        if (!elementAttrRegistry.has(target)) {
          elementAttrRegistry.set(target, new Map());
        }
        elementAttrRegistry.get(target).set(attrName, {
          original: original,
          translated: translated
        });
        target.setAttribute(attrName, translated);
      } else {
        target[attrName] = translated;
      }
    }
  }

  function handleElementNode(node) {
    if (!settings.enabled || isAltPreviewing) return;
    const tag = node.tagName;

    if (tag === 'RELATIVE-TIME') {
      if (node.shadowRoot) {
        const text = node.shadowRoot.textContent;
        if (text && /^on/.test(text)) {
          node.shadowRoot.textContent = text.replace(/^on\s*/, '');
        }
      }
      return;
    }

    if (tag === 'TOOL-TIP') {
      // 深度处理 Primer 自定义悬停提示标签组件
      if (node.textContent) {
        const tr = transText(node.textContent);
        if (tr && tr !== node.textContent) {
          node.textContent = tr;
        }
      }
      if (node.shadowRoot && node.shadowRoot.textContent) {
        const trShadow = transText(node.shadowRoot.textContent);
        if (trShadow && trShadow !== node.shadowRoot.textContent) {
          node.shadowRoot.textContent = trShadow;
        }
      }
      return;
    }

    // 翻译任意交互元素（button, a, summary, div, span, clipboard-copy, input 等）上的悬停提示与无障碍说明
    for (const attr of TRANSLATABLE_ATTRS) {
      if (node.hasAttribute && node.hasAttribute(attr)) {
        transElementAttr(node, attr);
      }
    }

    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      if (['button', 'submit', 'reset'].includes(node.type)) {
        transElementAttr(node, 'value');
      }
      return;
    }

    if (tag === 'OPTGROUP') {
      transElementAttr(node, 'label');
    }
  }

  // 执行基于特定选择器的精准翻译
  function transBySelector() {
    if (!State.pageConfig?.transSelectors) return;
    State.pageConfig.transSelectors.forEach(([selector, result]) => {
      const element = document.querySelector(selector);
      if (element && element.textContent !== result) {
        const original = element.textContent;
        element.setAttribute('data-ghcn-en', original.trim());
        if (settings.showEnglishTooltip && !element.hasAttribute('title')) {
          element.setAttribute('title', `原英文: ${original.trim()}`);
        }
        element.textContent = result;
      }
    });
  }

  /* =========================== 4. 节点遍历与 Turbo 适配 =========================== */

  function traverseNode(rootNode) {
    if (!settings.enabled || !rootNode) return;

    const ignoreSelectors = State.pageConfig?.ignoreSelectors;
    const walker = document.createTreeWalker(
      rootNode,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (GLOBAL_IGNORE_TAGS.has(node.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (ignoreSelectors && node.matches && node.matches(ignoreSelectors)) {
              return NodeFilter.FILTER_REJECT;
            }
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        handleElementNode(currentNode);
      } else if (currentNode.nodeType === Node.TEXT_NODE) {
        handleTextNode(currentNode);
      }
    }
  }

  function runFullTranslation() {
    if (!settings.enabled || !document.body) return;
    transBySelector();
    traverseNode(document.body);
  }

  /* =========================== 5. React Global Nav 导航栏与抽屉菜单处理 =========================== */

  function setupReactGlobalNavTranslation() {
    const labels = window.I18N?.conf?.reactGlobalNavLabels || {};

    function resolveNavLabel(source) {
      if (!source) return null;
      // 1. 显式配置的导航词条
      if (labels[source]) return labels[source];
      // 2. 当前页面配置字典
      if (State.pageConfig?.staticDict?.[source]) return State.pageConfig.staticDict[source];
      // 3. 全局公共字典
      if (window.I18N?.['zh-CN']?.public?.static?.[source]) return window.I18N['zh-CN'].public.static[source];
      // 4. transText 兜底匹配（支持去除空白、省略号、快捷键后匹配）
      const transResult = transText(source);
      if (transResult && transResult !== source) return transResult;
      return null;
    }

    // 专门翻译 Primer Tooltip 浮层内容，保护快捷键 <kbd> 标签不被污染
    function translateTooltipElement(tooltipEl) {
      if (!settings.enabled || isAltPreviewing || !tooltipEl) return;
      if (tooltipEl.shadowRoot) {
        translateTooltipElement(tooltipEl.shadowRoot);
      }
      const walker = document.createTreeWalker(tooltipEl, NodeFilter.SHOW_TEXT);
      let textNode;
      while ((textNode = walker.nextNode())) {
        // 绝不翻译 <kbd> 内的快捷键字符（如 'G', 'I'）
        if (textNode.parentElement && textNode.parentElement.tagName === 'KBD') continue;
        const raw = textNode.data;
        const trimmed = raw.trim();
        if (!trimmed) continue;
        const target = resolveNavLabel(trimmed);
        if (target && trimmed !== target) {
          if (!tooltipEl.hasAttribute('data-ghcn-en')) {
            tooltipEl.setAttribute('data-ghcn-en', trimmed);
            tooltipEl.setAttribute('data-ghcn-translated', 'true');
          }
          textNodeRegistry.set(textNode, {
            original: raw,
            translated: raw.replace(trimmed, target),
            parent: textNode.parentElement
          });
          textNode.data = raw.replace(trimmed, target);
        }
      }
    }

    function translateAllTooltips() {
      if (!settings.enabled || isAltPreviewing) return;
      document.querySelectorAll('tool-tip, [role="tooltip"], .Primer-Tooltip').forEach(translateTooltipElement);
    }

    function translateNav() {
      if (!settings.enabled || isAltPreviewing) return;

      // 1. 如果存在 Primer 弹层根容器，执行深度节点遍历与属性翻译
      const portalRoot = document.getElementById('__primerPortalRoot__');
      if (portalRoot) {
        traverseNode(portalRoot);
        // 如果尚未监听 portalRoot，挂载专属监听器
        if (!State.portalObserver) {
          State.portalObserver = new MutationObserver(() => {
            traverseNode(portalRoot);
            translateAllTooltips();
          });
          State.portalObserver.observe(portalRoot, { childList: true, subtree: true, attributes: true });
        }
      }

      // 2. 左侧抽屉菜单与导航对话框
      const drawers = document.querySelectorAll('dialog, .AppHeader-drawer, nav[aria-label="Global"]');
      drawers.forEach(drawer => traverseNode(drawer));

      // 3. 全局 Tooltip 集中翻译
      translateAllTooltips();

      // 4. 定向查找所有导航与下拉项叶子节点，绝不破坏原有 DOM 树与 Flex 排版
      const selectors = [
        'header.GlobalNav [data-component="text"]',
        'header.GlobalNav .ActionList-item-label',
        '#__primerPortalRoot__ .ActionList-item-label',
        '#__primerPortalRoot__ .ActionList-item-description',
        '#__primerPortalRoot__ [data-component="ActionList.Item--text"]',
        'dialog[aria-label="Global"] .ActionList-item-label',
        'dialog[aria-label="Global navigation"] .ActionList-item-label',
        'dialog .ActionList-item-label',
        '.AppHeader-drawer .ActionList-item-label',
        'nav[aria-label="Global"] span',
        'nav[aria-label="Global"] [data-component="text"]',
        '[data-target*="drawer"] span',
        '.ActionList-item-label',
        '.ActionList-item-description',
        '[data-component="ActionList.Item--text"]',
        '.SelectMenu-item span',
        '.SelectMenu-tab',
        '.SelectMenu-title',
        '.select-menu-item-text',
        'details-menu .select-menu-item span',
        '.dropdown-item span',
        'tool-tip',
        '[role="tooltip"]'
      ].join(', ');

      const navElements = document.querySelectorAll(selectors);
      navElements.forEach(el => {
        if (GLOBAL_IGNORE_TAGS.has(el.tagName)) return;

        // 如果是 Tooltip 自定义组件，由专用方法递归安全处理
        if (el.tagName === 'TOOL-TIP' || el.getAttribute?.('role') === 'tooltip') {
          translateTooltipElement(el);
          return;
        }

        // 同时翻译该元素上的悬停提示与无障碍说明
        for (const attr of TRANSLATABLE_ATTRS) {
          if (el.hasAttribute && el.hasAttribute(attr)) {
            transElementAttr(el, attr);
          }
        }

        const text = el.textContent?.trim();
        if (!text) return;
        const targetLabel = resolveNavLabel(text);
        if (targetLabel && text !== targetLabel) {
          if (!el.hasAttribute('data-ghcn-en')) {
            el.setAttribute('data-ghcn-en', text);
            el.setAttribute('data-ghcn-translated', 'true');
            if (settings.showEnglishTooltip && !el.hasAttribute('title')) {
              el.setAttribute('data-ghcn-orig-title', el.getAttribute('title') || '');
              el.setAttribute('title', `原英文: ${text}`);
            }
            if (settings.showDottedUnderline) {
              el.classList.add('ghcn-underline');
            }
          }

          // 核心修复：只查找并更新具体文本节点，绝不粗暴覆盖 el.textContent，100% 保持 GitHub 原生样式与弹性盒布局
          let matchedTextNode = null;
          for (const child of el.childNodes) {
            if (child.nodeType === Node.TEXT_NODE && child.data.trim() === text) {
              matchedTextNode = child;
              break;
            }
          }

          // 若直接子节点未命中，深层查找文本节点，严禁清除 childNodes
          if (!matchedTextNode) {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            let cur;
            while ((cur = walker.nextNode())) {
              if (cur.data.trim() === text || cur.data.includes(text)) {
                matchedTextNode = cur;
                break;
              }
            }
          }

          if (matchedTextNode) {
            textNodeRegistry.set(matchedTextNode, {
              original: matchedTextNode.data,
              translated: matchedTextNode.data.replace(text, targetLabel),
              parent: el
            });
            matchedTextNode.data = matchedTextNode.data.replace(text, targetLabel);
          } else if (el.children.length === 0) {
            // 仅当没有任何子元素时，才安全设置文本
            el.textContent = targetLabel;
          }
        }
      });

      translateAllTooltips();
    }

    State.translateNav = translateNav;
    translateNav();

    // 监听各类交互点击（汉堡菜单、下拉菜单 summary、按钮、ActionMenu 等）
    document.addEventListener('click', (e) => {
      if (e.target.closest('summary, button, [role="button"], [aria-haspopup], [aria-expanded], action-menu, details, .AppHeader-globalBar-start, [data-component="IconButton"], header.GlobalNav')) {
        setTimeout(translateNav, 20);
        setTimeout(translateNav, 100);
        setTimeout(translateNav, 300);
      }
    }, { capture: true, passive: true });

    // 悬停与聚焦时检测动态渲染的 Tooltip 与按钮描述
    function handleHoverOrFocus(target) {
      if (!settings.enabled || isAltPreviewing || !target || target.nodeType !== Node.ELEMENT_NODE) return;

      // 1. 如果鼠标在 icon/svg/path 上，找到其交互宿主元素（button, a, summary 等）
      const interactiveEl = target.closest('button, a, summary, [aria-label], [title], [data-tooltip], [data-tooltip-text], tool-tip, [role="tooltip"]');
      const elementsToTranslate = [target];
      if (interactiveEl && interactiveEl !== target) {
        elementsToTranslate.push(interactiveEl);
      }

      // 2. 翻译属性（title, aria-label, data-tooltip 等）
      for (const el of elementsToTranslate) {
        for (const attr of TRANSLATABLE_ATTRS) {
          if (el.hasAttribute && el.hasAttribute(attr)) {
            transElementAttr(el, attr);
          }
        }
      }

      // 3. 关联的 Tooltip 浮层检查：aria-describedby / tool-tip[for=id]
      for (const el of elementsToTranslate) {
        const id = el.id;
        if (id) {
          const linkedByFor = document.querySelector(`tool-tip[for="${id}"], [role="tooltip"][for="${id}"]`);
          if (linkedByFor) translateTooltipElement(linkedByFor);
        }
        const descId = el.getAttribute?.('aria-describedby');
        if (descId) {
          descId.split(/\s+/).forEach(tid => {
            if (!tid) return;
            const tipEl = document.getElementById(tid);
            if (tipEl) translateTooltipElement(tipEl);
          });
        }
        if (el.tagName === 'TOOL-TIP' || el.getAttribute?.('role') === 'tooltip') {
          translateTooltipElement(el);
        } else {
          const childTip = el.querySelector?.('tool-tip, [role="tooltip"], .Primer-Tooltip');
          if (childTip) translateTooltipElement(childTip);
        }
      }
    }

    document.addEventListener('mouseover', (e) => {
      handleHoverOrFocus(e.target);
    }, { passive: true });

    document.addEventListener('focusin', (e) => {
      handleHoverOrFocus(e.target);
    }, { passive: true });
  }

  /* =========================== 6. 英文原词保留与 Alt 快捷键 =========================== */

  // 创建快捷键提示浮层
  function getOrCreateToast() {
    if (State.toastElement) return State.toastElement;
    if (!document.body) return null;
    const toast = document.createElement('div');
    toast.className = 'ghcn-alt-toast';
    toast.innerHTML = `<span class="ghcn-alt-toast-badge">ENG</span><span>已临时切为原英文 (松开 Alt 恢复)</span>`;
    document.body.appendChild(toast);
    State.toastElement = toast;
    return toast;
  }

  // 绑定 Alt 键
  function setupAltKeyShortcut() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Alt' && !e.repeat && settings.altKeyToggle && settings.enabled) {
        if (!isAltPreviewing) {
          isAltPreviewing = true;
          toggleOriginalPreview(true);
        }
      }
    }, { passive: true });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Alt' && isAltPreviewing) {
        isAltPreviewing = false;
        toggleOriginalPreview(false);
      }
    }, { passive: true });

    // 窗口失去焦点时自动释放
    window.addEventListener('blur', () => {
      if (isAltPreviewing) {
        isAltPreviewing = false;
        toggleOriginalPreview(false);
      }
    });
  }

  // 切换中英文视图（按住 Alt）
  function toggleOriginalPreview(showOriginal) {
    if (showOriginal) {
      document.documentElement.classList.add('ghcn-alt-active');
      const toast = getOrCreateToast();
      if (toast) toast.classList.add('visible');
    } else {
      document.documentElement.classList.remove('ghcn-alt-active');
      if (State.toastElement) {
        State.toastElement.classList.remove('visible');
      }
    }

    // 1. 切换所有文本节点
    for (const [node, info] of textNodeRegistry.entries()) {
      if (!node.isConnected) {
        textNodeRegistry.delete(node);
        continue;
      }
      node.data = showOriginal ? info.original : info.translated;
    }

    // 2. 切换所有属性（title, aria-label, placeholder）
    for (const [element, attrRecord] of elementAttrRegistry.entries()) {
      if (!element.isConnected) {
        elementAttrRegistry.delete(element);
        continue;
      }
      for (const [attrName, info] of attrRecord.entries()) {
        element.setAttribute(attrName, showOriginal ? info.original : info.translated);
      }
    }
  }

  // 动态更新虚线样式
  function updateUnderlineStyle(enabled) {
    document.querySelectorAll('[data-ghcn-en]').forEach((el) => {
      if (enabled) el.classList.add('ghcn-underline');
      else el.classList.remove('ghcn-underline');
    });
  }

  // 动态更新 Tooltip 属性
  function updateTooltipStyle(enabled) {
    document.querySelectorAll('[data-ghcn-en]').forEach((el) => {
      const en = el.getAttribute('data-ghcn-en');
      if (!en) return;
      if (enabled) {
        el.setAttribute('title', `原英文: ${en}`);
      } else {
        const origTitle = el.getAttribute('data-ghcn-orig-title');
        if (origTitle) el.setAttribute('title', origTitle);
        else el.removeAttribute('title');
      }
    });
  }

  // 彻底还原所有翻译（禁用时）
  function revertAllTranslations() {
    toggleOriginalPreview(true);
    document.documentElement.classList.remove('ghcn-alt-active');
    if (State.toastElement) State.toastElement.classList.remove('visible');

    document.querySelectorAll('[data-ghcn-en]').forEach((el) => {
      el.classList.remove('ghcn-underline');
      const origTitle = el.getAttribute('data-ghcn-orig-title');
      if (origTitle) el.setAttribute('title', origTitle);
      else el.removeAttribute('title');
      el.removeAttribute('data-ghcn-en');
      el.removeAttribute('data-ghcn-translated');
    });

    textNodeRegistry.clear();
    elementAttrRegistry.clear();
  }

  /* =========================== 7. MutationObserver 与 SPA 监听 =========================== */

  function setupMutationObserver() {
    if (State.mutationObserver) State.mutationObserver.disconnect();

    let pendingNodes = [];
    let rafHandle = null;

    State.mutationObserver = new MutationObserver((mutations) => {
      if (!settings.enabled || isAltPreviewing) return;

      const currentURL = window.location.href;
      if (currentURL !== State.currentURL) {
        State.currentURL = currentURL;
        updatePageConfig('URL变化');
        runFullTranslation();
        State.translateNav?.();
        return;
      }

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
              pendingNodes.push(node);
            }
          }
        } else if (mutation.type === 'characterData' && State.pageConfig?.characterData) {
          if (mutation.target.nodeType === Node.TEXT_NODE) {
            handleTextNode(mutation.target);
          }
        } else if (mutation.type === 'attributes') {
          const attr = mutation.attributeName;
          if (TRANSLATABLE_ATTRS.includes(attr) && mutation.target.nodeType === Node.ELEMENT_NODE) {
            transElementAttr(mutation.target, attr);
          }
        }
      }

      if (pendingNodes.length > 0 && !rafHandle) {
        rafHandle = requestAnimationFrame(() => {
          const nodes = pendingNodes;
          pendingNodes = [];
          rafHandle = null;
          nodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              traverseNode(node);
            } else if (node.nodeType === Node.TEXT_NODE) {
              handleTextNode(node);
            }
          });
          State.translateNav?.();
        });
      }
    });

    const targetRoot = document.documentElement || document;
    State.mutationObserver.observe(targetRoot, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRS
    });
  }

  function setupUrlChangeListener() {
    const handleUrl = () => {
      setTimeout(() => {
        updatePageConfig('History URL变化');
        runFullTranslation();
        State.translateNav?.();
      }, 80);
    };

    window.addEventListener('popstate', handleUrl);
    const originalPushState = history.pushState;
    if (originalPushState) {
      history.pushState = function (...args) {
        originalPushState.apply(this, args);
        handleUrl();
      };
    }
  }

  function setupTurboEvents() {
    document.addEventListener('turbo:load', () => {
      updatePageConfig('Turbo Load');
      runFullTranslation();
      State.translateNav?.();
    });
    document.addEventListener('turbo:render', () => {
      updatePageConfig('Turbo Render');
      runFullTranslation();
      State.translateNav?.();
    });
    document.addEventListener('turbo:visit', () => {
      updatePageConfig('Turbo Visit');
    });
  }

  function ensureI18NLoaded(callback) {
    if (window.I18N && window.I18N['zh-CN']) {
      callback(window.I18N);
      return;
    }
    const timer = setInterval(() => {
      if (window.I18N && window.I18N['zh-CN']) {
        clearInterval(timer);
        callback(window.I18N);
      }
    }, 50);
    // 超时兜底 5 秒
    setTimeout(() => clearInterval(timer), 5000);
  }

  function initPageLanguage() {
    try {
      if (document.documentElement) {
        document.documentElement.lang = 'zh-CN';
      }
    } catch (e) {}
  }

  function initEngine() {
    if (isInitialized) return;
    isInitialized = true;
    if (!settings.enabled) return;

    ensureI18NLoaded((I18N) => {
      setupAltKeyShortcut();
      initPageLanguage();
      updatePageConfig('初次初始化');
      setupMutationObserver();
      setupUrlChangeListener();
      setupTurboEvents();
      setupReactGlobalNavTranslation();
      runFullTranslation();
    });
  }

  function handleDomReady() {
    updatePageConfig('DOMReady');
    runFullTranslation();
    State.translateNav?.();
  }

  /* =========================== 8. 启动引擎与生命周期挂载 =========================== */

  // 1. 异步加载持久化配置并覆盖
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(DEFAULT_SETTINGS, (stored) => {
      settings = { ...DEFAULT_SETTINGS, ...stored };
      if (!settings.enabled) {
        revertAllTranslations();
      } else {
        updateUnderlineStyle(settings.showDottedUnderline);
        updateTooltipStyle(settings.showEnglishTooltip);
      }
    });

    // 实时监听来自 Popup 的配置变更
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      let needReTranslate = false;
      let needRevert = false;

      for (const [key, change] of Object.entries(changes)) {
        settings[key] = change.newValue;
        if (key === 'enabled') {
          if (!change.newValue) needRevert = true;
          else needReTranslate = true;
        } else if (key === 'showDottedUnderline') {
          updateUnderlineStyle(change.newValue);
        } else if (key === 'showEnglishTooltip') {
          updateTooltipStyle(change.newValue);
        }
      }

      if (needRevert) {
        revertAllTranslations();
      } else if (needReTranslate) {
        runFullTranslation();
        State.translateNav?.();
      }
    });
  }

  // 2. 立即启动核心引擎
  initEngine();

  // 3. 页面生命周期挂载点：确保在页面加载、刷新、水合完成时进行全面核查与汉化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleDomReady);
  } else {
    handleDomReady();
  }

  window.addEventListener('load', handleDomReady);
  setTimeout(handleDomReady, 200);
  setTimeout(handleDomReady, 600);
  setTimeout(handleDomReady, 1200);
})();
