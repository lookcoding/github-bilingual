# GitHub Bilingual (GitHub 汉化与双语对照)

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Manifest V3](https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-brightgreen.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/)

专为开发者打造的 GitHub 界面精细化汉化与中英双语对照扩展（支持 Chrome、Edge 等所有 Chromium 内核浏览器）。

不仅提供自然流畅的界面汉化，更独家提供**鼠标悬停英文原词预览**与**按住 <kbd>Alt</kbd> 键毫秒级切换原英文**，彻底告别“汉化后看不懂报错、查对不上官方英文文档”的烦恼！

---

## ✨ 核心特性

1. **精准汉化静态 UI 与细节覆盖**：
   - 深度覆盖 GitHub 全局顶栏、左侧抽屉导航、个人与仓库设置栏、Copilot 下拉菜单、新建菜单、各类筛选徽标与状态提示。
   - 智能识别带快捷键的按钮提示（如 `所有议题 G I`），在完成文字翻译的同时 100% 完整保留原生键盘 `<kbd>` 徽标。
2. **保留英文原词预览（独家特性）**：
   - **鼠标悬停预览**：光标悬停在任意汉化文字上，展示 `原英文: xxx` 提示框，随时核对原词；
   - **长按 <kbd>Alt</kbd> 键秒切全页英文**：按住键盘 `Alt` 键，整页立即 0 毫秒恢复为纯英文展示，松开瞬时恢复汉化；
   - **虚线点缀提示（可选）**：可在弹窗中开启细点状下划线，一眼辨识已被汉化的专有名词。
3. **严格的边界保护机制（绝不污染代码）**：
   - 绝不触碰任何代码行与 Diff 对比区域（`.blob-wrapper`, `pre`, `code` 等）；
   - 绝不篡改 Issue/PR Markdown 正文与评论区讨论；
   - 绝不汉化仓库名、分支名、用户名、提交记录信息（Commit Message）。
4. **100% 保持 GitHub 原生布局设计**：
   - 深度适配 GitHub 现代 Primer 设计系统，严格保护 Flexbox 弹性盒排版，彻底杜绝下拉菜单中文字符垂直单字折行的问题。
5. **即时响应与零刷新**：
   - 点击插件图标随时修改中英文开关、悬浮提示或虚下划线，当前页面即时动态生效，无需刷新页面。

---

## 🚀 极速安装使用指南（开发者模式 30 秒安装）

1. 克隆或下载本项目压缩包并解压到本地：
   ```bash
   git clone https://github.com/你的GitHub用户名/github-bilingual.git
   ```
2. 打开 Chrome 或 Edge 浏览器，在地址栏输入并回车：
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. 在页面右上角（或左侧导航栏）打开 **“开发者模式” (Developer mode)** 开关。
4. 点击左上角的 **“加载已解压的扩展程序” (Load unpacked)**。
5. 在弹出的文件选择器中，选择本项目的解压根目录（包含 `manifest.json` 的文件夹）。
6. 打开 [GitHub](https://github.com/) 任意页面，即可体验流畅汉化与中英双语对照！

---

## 🛠️ 快捷键与交互技巧

| 操作 | 效果 |
| :--- | :--- |
| **鼠标悬停 (Hover)** | 悬浮在汉化文字上，展示原英文提示。 |
| **长按 <kbd>Alt</kbd> 键** | 临时切回全页纯英文对照，松开恢复中文。 |
| **点击扩展图标** | 唤起控制面板，随时开启/关闭汉化、悬浮提示或虚下划线。 |

---

## 📂 项目结构

```
github-bilingual/
├── manifest.json         # Chrome MV3 扩展配置清单
├── locals.js             # 270+ 模块高精度基础中文词库与规则
├── LICENSE               # GNU GPL-3.0 开源许可证
├── .gitignore            # Git 忽略配置
├── content/
│   ├── content.js        # 汉化与双语注册引擎、Alt快捷键监听、Turbo 局部刷新观察器
│   ├── dict_addon.js     # 细枝末节补充词库（设置栏、抽屉、Copilot、悬停提示）
│   └── content.css       # Primer 弹性排版保护、虚下划线与快捷键状态浮层样式
├── popup/
│   ├── popup.html        # 设置弹窗界面
│   ├── popup.css         # GitHub 风格界面样式
│   └── popup.js          # 设置同步与持久化逻辑
└── icons/                # 插件图标 (16x16, 48x48, 128x128)
```

---

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！如果你在浏览 GitHub 时发现有未翻译的新页面、未汉化的按钮或更优美的译名，欢迎在 `content/dict_addon.js` 中扩充词条并提交 PR。

---

## 🙏 致谢与开源协议 (Acknowledgments & License)

- 本项目基于 [GNU General Public License v3.0 (GPL-3.0)](LICENSE) 协议开源。
- 本项目的基础词库数据与规则参考并衍化自社区开源前辈的杰出成果：
  - [maboloshi/github-chinese](https://github.com/maboloshi/github-chinese) (沙漠之子)
  - [52cik/github-hans](https://github.com/52cik/github-hans) (楼教主)
- 特别感谢上述开源作者为中文开发者社区所做出的卓越贡献！
