# Zotero 笔记插件开发经验与复盘

本文记录本仓库从 0.1.3 到 0.5.2 迭代中沉淀的工程约定、踩坑与结论，供后续开发、Code Review 和排障直接引用。适用范围：`E:\Project\siyuan\siyuan-plugin-zotero-notes`（免构建 CommonJS 单文件插件，无 npm 运行时依赖）。

## 一、迭代脉络

| 版本 | 主题 | 关键结论 |
| --- | --- | --- |
| 0.1.3 | 主题适配、作者截断、按钮重排、顶栏点击进设置、自动同步与自动迁移 | 界面要跟思源主题变量走；同步频率必须可配置；迁移靠笔记上的属性标记而不是路径记忆 |
| 0.1.4 | 增量同步 | 刷新的瓶颈在 Zotero 侧，不在思源数据库侧；版本号比对才是省时的正确手段 |
| 0.1.5 | 渲染式回传预览 + 丢失格式提示 | 预览要展示"最终产物"，并把必然发生的格式损失显式告诉用户 |
| 0.1.6 | 导出清洗层 | 思源标准 Markdown 里混有思源专有痕迹，不清洗就会渲染成乱码或字面 HTML |
| 0.2.0–0.4.0 | Kimi 工作流导入、模板、数据库、多种导入格式 | 写入必须带哈希前提，冲突交由调用方决策，不擅自覆盖 |
| 0.5.0 | 翻译与高级工作流 | 子进程、密钥、并发、取消、超时都要有边界；密钥只存变量名 |
| 0.5.1 | 交互与恢复（恢复对话框、命令入口、分组设置、窄窗口适配） | 恢复流程必须让用户看清"将要创建/认领什么"，绝不静默换绑 |
| 0.5.2 | 并发兜底互斥、翻译等待修复 | 锁不能只依赖 `navigator.locks`；等待循环不能用 `unref` 定时器 |

## 二、核心经验

### 1. 先复现，再动手改代码

用户报告"渲染出 `<p class="indent--2">gggg</p>`"时，正确顺序不是猜 CSS 或 Lute 行为，而是用只读接口把真实数据取出来：

```bash
curl -s -X POST http://127.0.0.1:6806/api/lute/copyStdMarkdown \
  -H "Content-Type: application/json" -d '{"id":"<note-doc-id>"}'
```

拿到的导出样本直接指出了两个根因（空块占位符、缩进段落的原始 HTML）。**约定**：任何"界面看起来不对"的问题，先取一份真实样本，落成最小可复现输入，再写修复。

### 2. API 参数必须查文档或内核源码，不能凭记忆

本项目踩过的具体坑：

- 思源 `/api/filetree/moveDocs`、`renameDoc` 需要**数据库路径**（`/2026...xxx.sy`），而 `getHPathByID` 给的是**人类可读路径**（`/Zotero/论文名`）。二者混用会直接失败。
- 思源新增的 `/api/filetree/moveDocsByID {fromIDs, toID}`、`/api/filetree/renameDocByID {id, title}` 直接吃块 ID，省去路径换算，是迁移场景的首选。
- Zotero 本地 API 的 `itemKey` 是**逗号分隔**且**每批最多 50 个**；`format=versions` 返回全库 `{key: version}` 表，`?since=` 才是"只取变更项"的官方推荐。

**约定**：新增任何外部 API 调用前，先查官方文档或拉取上游源码确认参数名与取值范围，再写代码。

### 3. 性能问题先分清"瓶颈在哪一侧"

思源数据库（`/api/query/sql`）只能查思源的 SQLite 索引，**不可能**减少从 Zotero 拉取数据的时间。把思源数据库当成 Zotero 缓存是方向性错误。真正有效的是：版本号全表 → 差集 → 只拉变更条目 → 缓存里没有的 key 判定为删除。

同理，判断"重"要看**传输量**而不是"调用次数"：一次 `format=versions` 的小表，胜过十几次全量条目下载。

### 4. 导出内容要有一层显式的"清洗层"

思源的标准 Markdown 导出并不干净，混有思源专有痕迹：

- 空内容块 → `　　‍`（全角空格 + 零宽连接符 U+200D）占位段落；
- 带缩进的段落 → 原始 HTML `<p class="indent--2">…</p>`（表格单元格里也会出现）；
- 而 `md2html` 会转义原始 HTML，于是标签以**字面文本**显示。

**约定**：把清洗抽成独立纯函数（本仓库为 `prepareNoteMarkdown`），预览、实际回传、自动回传共用同一份结果；清洗规则要配套单元测试，用真实导出样本做输入。

### 5. 预览必须与最终产物同源，并显式列出损失

- 预览展示原始 Markdown 源码没有参考价值；应渲染**实际将要上传的 HTML**（清洗后的结果），用户看到的即写进 Zotero 的。
- 白名单清洗必然有损失（数学公式渲染、任务列表勾选框、语法高亮、行内样式、缩进、折叠块、播放器、尺寸属性）。预览窗口必须在渲染区下方**逐项列出本次内容命中的损失项**，没命中时明确说"未检测到"。

### 6. 并发与幂等：锁必须有进程内兜底

`navigator.locks` 在 Chromium 桌面端可用，但**不保证存在**（Node 测试环境、部分内嵌 WebView 没有）。一旦缺失，`withExclusiveLock` 退化为直接执行，同一窗口内的双击/并发调用就会重复创建文档（本轮就复现了"并发重建 Note 创建了两次"）。

**约定**：`withExclusiveLock` 统一叠加一层进程内互斥队列（同名串行），Web Locks 只作为跨窗口的额外保障；拿锁后必须**重新读取状态再决定是否创建**（双重检查），不能沿用加锁前的快照。

### 7. 写操作一律带版本前提

- 写 Zotero 用 `If-Unmodified-Since-Version`；版本不符即报告冲突，绝不覆盖。
- 写思源前用内容哈希判断是否真的需要写；自动回传只上传"内容有变化"的 Note。
- 用户侧文档内容哈希（如 `custom-research-content-hash`）让外部调用方能安全地做"冲突则报告"。

### 8. 测试策略

- 逻辑尽量下沉为**不依赖 DOM 的纯函数**（作者截断、版本差集、格式损失分析、Markdown 清洗、迁移判定），这样 `node --test` 可以覆盖，而不需要浏览器环境。
- 现有 31 个测试文件覆盖 173 个用例，`npm run check` = `node --check index.js` + `node --test`。
- 本机 PATH 中没有 Node 时，按全局约定用 **AB Download Manager CLI** 下载便携版到工作区（如 `E:\Project\siyuan\.tools\`），解压后直接调用 `node.exe`，避免安装系统级运行时。
- 注意 Node 与浏览器的定时器语义差异：等待循环里**不要** `timer.unref()`，否则事件循环会提前结束、测试以 "Promise resolution is still pending" 失败。

### 9. 交付纪律（每轮改动都要走完）

1. 改代码 → 补测试 → `npm run check` 全绿；
2. 升补丁版本号（`plugin.json` 与 `package.json` 保持一致）；
3. 同步 `README.md` / `README_zh_CN.md` / `i18n/*.json` / `index.js` 中的 `FALLBACK`（四份文案必须同进同出）；
4. 重打 `package.zip`（根层 10 个文件，不含 `tests/`）；
5. 同步到思源工作空间 `data/plugins/siyuan-plugin-zotero-notes/`，用 `/api/petal/setPetalEnabled` 重载，使改动立刻在运行的思源里生效；
6. **提交并推送 git 本地与云端**（用户明确要求：所有修改和小版本号都要更新，不能只留在工作区）。

## 三、易踩坑接口备忘

| 接口 | 关键参数 | 易错点 |
| --- | --- | --- |
| `/api/filetree/getHPathByID` | `{id}` | 返回人类可读路径，不是数据库路径 |
| `/api/filetree/moveDocsByID` | `{fromIDs, toID}` | `toID` 传根文档 ID 即成为其子文档；子文档随父移动 |
| `/api/filetree/renameDocByID` | `{id, title}` | 同名冲突时先改名再移动 |
| `/api/filetree/moveDocs` / `renameDoc` | 路径形参 | 需要 `.sy` 数据库路径，不能用 hpath |
| `/api/lute/copyStdMarkdown` | `{id}` | 输出含空块占位符与缩进原始 HTML，必须清洗 |
| `/api/lute/md2html` | `{markdown, mode}` | 会转义原始 HTML，清洗要在它之前 |
| Zotero `/items?format=versions` | — | 全库版本表，增删都能识别 |
| Zotero `/items?itemKey=` | 逗号分隔 | 每批最多 50 个 |
| Zotero 响应头 | `Zotero-Server-ID`、`Last-Modified-Version` | 换库必须丢弃旧缓存并全量重建 |
| 浏览器 `navigator.locks` | — | 不保证存在，需进程内互斥兜底 |

## 四、每轮收尾检查清单

- [ ] `npm run check` 全绿（语法 + 全部用例）
- [ ] `plugin.json` 与 `package.json` 版本号一致且已升补丁号
- [ ] 四份文案（FALLBACK、`i18n/zh_CN.json`、`i18n/en.json`、README）同步
- [ ] `package.zip` 重打包且结构与线上发布包一致
- [ ] 同步 `data/plugins/` 并重载插件，确认运行时版本号
- [ ] `git add -A` → `git commit` → `git push origin main`

## 五、阶段性状态与后续候选

- 插件仍处**内部测试**阶段：使用前备份思源工作空间与 Zotero 数据，不要让插件内容成为唯一副本。
- 翻译能力依赖用户自备并配置 pdf2zh；插件不安装第三方引擎，也不代管密钥。
- 导出为静态内容，不生成 Word 中可继续编辑的 Zotero 活域；复杂自定义 CSL 的正文规则不保证完全复刻。
- 后续候选方向：失效绑定检查做成可筛选列表、更多 CSL 样式与导出格式、附件双向同步、把"检查失效绑定"纳入命令面板与 Agent Action。

## 六、协作约定

- 每次改动结束必须完成本文档第四节的检查清单，包括提交并推送 git 本地与云端。
- 对外可见的文案改动需同步中英双语；内部注释保持克制，解释"为什么"而非"做了什么"。
- 涉及用户数据（思源文档、Zotero 条目）的操作，默认只读或最小改动，任何批量改写、删除、换绑都要显式确认。
