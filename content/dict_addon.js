/**
 * GitHub 汉化增强词库与细节补全 (dict_addon.js)
 * 深度覆盖：设置栏、导航栏、各类下拉菜单、按钮悬停提示 (Tooltips)、无障碍标签 (aria-label)
 */

(function () {
  'use strict';

  const _global = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : globalThis);
  const I18N = _global.I18N = _global.I18N || {};
  if (!I18N['zh-CN']) I18N['zh-CN'] = {};
  const zhCN = I18N['zh-CN'];
  const pub = zhCN.public = zhCN.public || {};
  pub.static = pub.static || {};

  // 1. 深度补充细枝末节的 UI 词汇
  const COMPREHENSIVE_ADDON = {
    // ===== 全局导航与左侧抽屉 =====
    'Home': '首页',
    'Feed': '动态',
    'All issues': '所有议题',
    'All pull requests': '所有拉取请求',
    'All repositories': '所有仓库',
    'MCP registry': 'MCP 注册表',
    'GitHub Copilot': 'GitHub Copilot',
    'Explore': '探索',
    'Marketplace': '市场',
    'Discussions': '讨论',
    'Projects': '项目',
    'Codespaces': '代码空间',
    'Sponsors': '赞助',
    'Documentation': '文档',
    'GitHub Skills': 'GitHub 技能',
    'Support': '支持',
    'Give feedback': '提供反馈',

    // ===== 右上角头像与用户下拉菜单 =====
    'Signed in as': '已登录为',
    'Your profile': '个人资料',
    'Your repositories': '我的仓库',
    'Your projects': '我的项目',
    'Your stars': '我的星标',
    'Your gists': '我的代码片段',
    'Your sponsors': '我的赞助',
    'Your organizations': '我的组织',
    'Your enterprises': '我的企业',
    'Copilot settings': 'Copilot 设置',
    'Feature preview': '功能预览',
    'Appearance': '外观',
    'Accessibility': '无障碍',
    'Settings': '设置',
    'Sign out': '退出登录',
    'GitHub Support': 'GitHub 支持',
    'GitHub Docs': 'GitHub 文档',
    'GitHub Community': 'GitHub 社区',
    'Upgrade': '升级',
    'Try Enterprise': '试用企业版',
    'Help': '帮助',
    'Set status': '设置状态',
    'Edit status': '编辑状态',
    'Clear status': '清除状态',

    // ===== GitHub 顶部 Copilot 下拉菜单 =====
    'Ask Copilot...': '询问 Copilot…',
    'Ask Copilot…': '询问 Copilot…',
    'Ask Copilot': '询问 Copilot',
    'In immersive chat': '在沉浸式聊天中',
    'In Spaces': '在空间中',
    'In spaces': '在空间中',
    'Download extension...': '下载插件…',
    'Download extension…': '下载插件…',
    'Download extension': '下载插件',

    // ===== 按钮悬停提示 (Tooltips / aria-label) =====
    'All issues': '所有议题',
    'All pull requests': '所有拉取请求',
    'All repositories': '所有仓库',
    'Issues': '议题',
    'Pull requests': '拉取请求',
    'Discussions': '讨论',
    'Projects': '项目',
    'Inbox': '收件箱',
    'Create new...': '新建…',
    'Create new…': '新建…',
    'Create new': '新建',
    'New repository': '新建仓库',
    'Import repository': '导入仓库',
    'New codespace': '新建代码空间',
    'New gist': '新建代码片段 (Gist)',
    'New organization': '新建组织',
    'New project': '新建项目',
    'Watch': '关注',
    'Watching': '正在关注',
    'Unwatch': '取消关注',
    'Star': '标星',
    'Starred': '已标星',
    'Unstar': '取消标星',
    'Fork': '派生',
    'Forks': '派生',
    'Fork repository': '派生仓库',
    'Pin': '置顶',
    'Unpin': '取消置顶',
    'Type / to search': '输入 / 搜索',
    'Search or jump to...': '搜索或跳转到…',
    'Search or jump to…': '搜索或跳转到…',
    'Search': '搜索',
    'Notifications': '通知',
    'Star this repository': '标星此仓库',
    'Unstar this repository': '取消标星此仓库',
    'Watch this repository': '关注此仓库',
    'Unwatch this repository': '取消关注此仓库',
    'Fork your own copy of': '派生您自己的副本',
    'Fork this repository': '派生此仓库',
    'Copy permalink': '复制永久链接',
    'Copy path': '复制路径',
    'Copy URL': '复制链接',
    'Copy url': '复制链接',
    'Copy to clipboard': '复制到剪贴板',
    'Copy raw contents': '复制原始内容',
    'Copy file contents': '复制文件内容',
    'Copied!': '已复制！',
    'Edit this file': '编辑此文件',
    'Delete this file': '删除此文件',
    'Delete file': '删除文件',
    'Raw': '原始内容',
    'Blame': '溯源 (Blame)',
    'History': '历史记录',
    'More options': '更多选项',
    'Collapse': '折叠',
    'Expand': '展开',
    'Search or jump to...': '搜索或跳转到…',
    'Create new...': '新建…',
    'Notifications': '通知',
    'You have unread notifications': '您有未读通知',
    'View notifications': '查看通知',
    'Toggle navigation': '切换导航',
    'Open global navigation menu': '打开全局导航菜单',
    'Close menu': '关闭菜单',
    'Close': '关闭',
    'Preview': '预览',
    'Write': '编写',
    'Quote reply': '引用回复',
    'Reference in new issue': '在新议题中引用',
    'Copy link': '复制链接',
    'Sort by': '排序方式',
    'Sort': '排序',
    'Filter': '筛选',
    'Filter by': '按条件筛选',
    'Clear filter': '清除筛选',
    'Clear all filters': '清除所有筛选',
    'Jump to': '跳转至',
    'Select a branch': '选择分支',
    'Switch branches or tags': '切换分支或标签',
    'Filter branches/tags': '筛选分支/标签',
    'Find or create a branch...': '查找或创建分支…',
    'View all branches': '查看所有分支',
    'View all tags': '查看所有标签',

    // ===== 仓库顶部核心操作与下拉菜单 (Code, Add file, Branch) =====
    'Add file': '添加文件',
    'Create new file': '创建新文件',
    'Upload files': '上传文件',
    'Code': '代码',
    'Clone': '克隆',
    'Local': '本地',
    'Codespaces': '代码空间',
    'Clone with SSH': '使用 SSH 克隆',
    'Clone with HTTPS': '使用 HTTPS 克隆',
    'Clone with GitHub CLI': '使用 GitHub CLI 克隆',
    'Open with GitHub Desktop': '在 GitHub Desktop 中打开',
    'Open with Visual Studio': '在 Visual Studio 中打开',
    'Open with Xcode': '在 Xcode 中打开',
    'Download ZIP': '下载 ZIP 压缩包',
    'Branches': '分支',
    'Tags': '标签',
    'Latest commit': '最新提交',
    'Git stats': 'Git 统计',
    'Go to file': '跳转到文件',

    // ===== 筛选与排序下拉选项 =====
    'Select type': '选择类型',
    'Select language': '选择语言',
    'Select order': '选择排序',
    'Recently created': '最近创建',
    'Recently updated': '最近更新',
    'Most stars': '最多星标',
    'Fewest stars': '最少星标',
    'Most forks': '最多派生',
    'Fewest forks': '最少派生',
    'Newest': '最新',
    'Oldest': '最旧',
    'Most commented': '最多评论',
    'Least commented': '最少评论',

    // ===== 设置栏 (个人与仓库设置) =====
    'General': '常规',
    'Public profile': '基本资料',
    'Account': '账户',
    'Emails': '电子邮箱',
    'Billing and licensing': '账单和许可',
    'Usage': '使用情况',
    'AI usage': 'AI 用量',
    'Budgets and alerts': '预算和警报',
    'Licensing': '许可',
    'Payment information': '支付信息',
    'Payment history': '支付历史',
    'Additional billing details': '其他账单详情',
    'Education benefits': '教育福利',
    'Password and authentication': '密码和身份验证',
    'Sessions': '会话',
    'SSH and GPG keys': 'SSH 与 GPG 密钥',
    'Organizations': '组织',
    'Enterprises': '企业版',
    'Moderation': '节制',
    'Blocked users': '黑名单用户',
    'Interaction limits': '互动限制',
    'Code review limits': '代码审查限制',
    'Code, planning, and automation': '代码、规划与自动化',
    'Models': '模型',
    'Packages': '软件包',
    'Copilot': 'GitHub Copilot',
    'Features': '功能',
    'Coding agent': '编程智能体',
    'Pages': 'GitHub Pages',
    'Saved replies': '快捷回复',
    'Code security': '代码安全性',
    'Integrations': '集成',
    'Applications': '应用',
    'Scheduled reminders': '定时提醒',
    'Archives': '存档',
    'Security log': '安全日志',
    'Sponsorship log': '赞助日志',
    'Developer settings': '开发者设置',
    'Personal access tokens': '个人访问令牌',
    'Fine-grained tokens': '细粒度令牌',
    'Tokens (classic)': '传统令牌 (Classic)',
    'GitHub Apps': 'GitHub 应用',
    'OAuth Apps': 'OAuth 应用',
    'Collaborators and teams': '协作者与团队',
    'Team and member roles': '团队与成员职责',
    'Moderation options': '节制选项',
    'Rules': '规则',
    'Rulesets': '规则集',
    'Runners': '运行器 (Runners)',
    'Webhooks': 'Webhooks (Web 钩子)',
    'Environments': '环境',
    'Custom properties': '自定义属性',
    'Advanced Security': '高级安全',
    'Deploy keys': '部署密钥',
    'Secrets and variables': '机密与变量',
    'Actions': '操作 (Actions)',
    'Autolink references': '自动链接引用',
    'Email notifications': '邮件通知',

    // ===== 列表筛选栏与状态徽标 =====
    'All': '全部',
    'Open': '开启中',
    'Closed': '已关闭',
    'Merged': '已合并',
    'Draft': '草稿',
    'New': '新建',
    'New repository': '新建仓库',
    'Import repository': '导入仓库',
    'New project': '新建项目',
    'New organization': '新建组织',
    'New enterprise': '新建企业',
    'New issue': '新建议题',
    'New pull request': '新建拉取请求',
    'Compare': '比较',
    'Labels': '标签',
    'Milestones': '里程碑',
    'Author': '作者',
    'Assignee': '负责人',
    'Assignees': '负责人',
    'Label': '标签',
    'Projects': '项目',
    'Milestone': '里程碑',
    'Reviews': '评审',
    'Reviewers': '评审者',
    'Show more': '显示更多',
    'Show less': '收起',
    'Save': '保存',
    'Save changes': '保存更改',
    'Cancel': '取消',
    'Delete': '删除',
    'Edit': '编辑',
    'Update': '更新',
    'Confirm': '确认',
    'Submit': '提交',
    'Add': '添加',
    'Remove': '移除',
    'Change': '更改',
    'Select': '选择',
    'Default': '默认',
    'Learn more': '了解详情'
  };

  // 2. 将分散的公共菜单词典合并到底层公共词库
  const commonSections = [
    'settings-menu',
    'repository-settings-menu',
    'repository-public',
    'repository/pull_issue_public',
    'orgs-settings-menu',
    'repository-insights-menu',
    'page-profile-public',
    'repository'
  ];

  commonSections.forEach(sec => {
    if (zhCN[sec] && zhCN[sec].static) {
      Object.assign(pub.static, zhCN[sec].static);
    }
  });

  // 3. 将 ADDON 词典以最高优先级合并到 public.static（覆盖不恰当的子页面翻译，如 'Notifications' -> '通知'）
  Object.assign(pub.static, COMPREHENSIVE_ADDON);

  // 4. 同步扩充 reactGlobalNavLabels 专有字典
  if (I18N.conf && I18N.conf.reactGlobalNavLabels) {
    Object.assign(I18N.conf.reactGlobalNavLabels, COMPREHENSIVE_ADDON);
  }

  // 5. 解除顶栏与各类弹层下拉菜单的过度忽略（移除 header.GlobalNav、#__primerPortalRoot__、li.mt-2）
  if (I18N.conf) {
    const unblockSelectors = new Set(['header.GlobalNav', '#__primerPortalRoot__', 'li.mt-2']);
    if (I18N.conf.ignoreSelectorPage) {
      for (const [page, list] of Object.entries(I18N.conf.ignoreSelectorPage)) {
        if (Array.isArray(list)) {
          I18N.conf.ignoreSelectorPage[page] = list.filter(sel => !unblockSelectors.has(sel));
        }
      }
    }
    if (I18N.conf.ignoreMutationSelectorPage) {
      for (const [page, list] of Object.entries(I18N.conf.ignoreMutationSelectorPage)) {
        if (Array.isArray(list)) {
          I18N.conf.ignoreMutationSelectorPage[page] = list.filter(sel => !unblockSelectors.has(sel));
        }
      }
    }
  }

  // 挂载到全局供调试
  _global.I18N_ADDON = COMPREHENSIVE_ADDON;
})();
