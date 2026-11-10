# Omni SQL Formatter

打开 SQL 文件后，点击状态栏的 **Dialect: sql** 可快速切换方言；也可运行命令 **Omni SQL Formatter: change dialect**。当前方言置顶并标记 Current。选择保存到当前文件所属工作区文件夹；未打开项目时保存到用户设置。切换编辑器或修改设置后，状态栏自动更新。

可配置的多方言 SQL 格式化插件。MIT 开源许可，本地执行，无需数据库连接。当前版本 0.3.0。

作者：tatenlee。

## 设置入口

命令面板执行 **Omni SQL Formatter: 打开格式化设置**，或在 Settings 搜索 `@ext:tatenlee.omni-sql-formatter`。

设置分为六类，支持用户级和工作区级配置，修改后下次格式化立即生效：

| 类别 | 配置 | 作用 |
| --- | --- | --- |
| 方言 | `dialect` | 默认 `sql`（通用 SQL），另支持 PostgreSQL、MySQL、Hive、Spark 等，共 20 种解析模式 |
| 关键词 | `keywords.case` | `upper`、`lower`、`preserve` |
| 关键词 | `keywords.include` / `keywords.exclude` | 补充或排除关键词、短语，不区分大小写 |
| 数据类型 | `dataTypes.case` | 类型大小写，独立于关键词 |
| 数据类型 | `dataTypes.include` / `dataTypes.exclude` | 补充或排除类型名称、短语 |
| 关键词后换行 | `newlineAfter.select` 等 | 18 个复选框，可分别开关 |
| 缩进与间距 | `indentation.style` | `editor`、`tabs`、`spaces`、`none` |
| 缩进与间距 | `indentation.size` | spaces 模式下每层 1–16 个空格 |
| 缩进与间距 | `linesBetweenQueries` | 语句间 0–5 个空白行 |
| 缩进与间距 | `expressionWidth` | 简单括号表达式的单行长度阈值 |
| SELECT Hints | `hints.enabled` | 启用 SELECT 后的 hint 识别 |
| SELECT Hints | `hints.placement` | `sameLine` 与 SELECT 同行，或 `nextLine` 单独缩进一行 |
| SELECT Hints | `hints.formatContent` | 是否规范 hint 内部的间距 |

以上配置均以 `omniSqlFormatter.` 开头。换行开关包括 `select`、`update`、`insert`、`set`、`values`、`from`、`where`、`group_by`、`order_by`、`having`、`limit`、`offset`、`returning`、`case`、`when`、`then`、`else`、`end`。INSERT 开关作用于 INSERT INTO 等完整短语。

关闭 SELECT 后换行也会让字段列表保持同行；子查询和注释仍保留必要换行。CASE 控制分支布局，WHEN、THEN、ELSE 控制各自后面的表达式；END 开启时，其后别名或表达式换行。none 表示换行但不缩进，不代表在词之间删除空格。

同类 exclude 优先于 include；同时补充为类型和关键词时，类型优先。排除会取消该词的分类，因此排除类型后括号前可能出现普通标识符间距。include 只增加词汇分类，不会定义新的语法；排除 CASE、END 等结构词后，真正使用这些结构的查询可能无法解析。字符串、引号标识符和注释不受 include/exclude 影响。

四个 include/exclude 设置都使用列表：可通过“添加项”逐项输入，也可在一项内用英文逗号 `,` 或中文逗号 `，` 分隔多个词。匹配不区分大小写，会自动去掉首尾空格和重复项。短语内部用空格，如 `CUSTOM TYPE`，不要用空格分隔多个独立词。

例如 ` ["foo", "Bar"] ` 与 ` ["foo, Bar"] ` 效果相同；`["varchar，JSONB"]` 也可以。settings.json 中仍需使用 JSON 数组：

```json
{
  "omniSqlFormatter.keywords.include": ["customword, CUSTOM FLAG"],
  "omniSqlFormatter.keywords.exclude": ["foo，Bar"],
  "omniSqlFormatter.dataTypes.include": ["vector, CUSTOM TYPE"],
  "omniSqlFormatter.dataTypes.exclude": ["varchar，jsonb"]
}
```

不同方言共享排版规则，但词法不能无条件混用：引号、转义、参数和运算符存在差异。`sql` 不是自动识别模式，不会在解析失败后猜测方言。使用 JSONB、美元引用等 PostgreSQL 语法时请选择 `postgresql`；反引号语法选择相应 MySQL/Hive/Spark 方言。

紧凑风格示例：

```json
{
  "omniSqlFormatter.dialect": "mysql",
  "omniSqlFormatter.keywords.case": "upper",
  "omniSqlFormatter.newlineAfter.select": false,
  "omniSqlFormatter.newlineAfter.from": false,
  "omniSqlFormatter.newlineAfter.where": false,
  "omniSqlFormatter.indentation.style": "spaces",
  "omniSqlFormatter.indentation.size": 4
}
```

```sql
SELECT a, b, c
FROM ttt
WHERE xxx
```

## SELECT Hints

默认将紧跟 SELECT 的参数型 hint 放在同一行：

```sql
SELECT /* prefix=xxx, xiw=gzk, postfix=1 */
	a,
	b
FROM
	t;
```

输入 `/*prefix=xxx,xiw = gzk, postfix=1*/` 会得到上面的间距。同时支持 Lindorm 官方使用的 `/*+ ... */` 形式：

```sql
SELECT /*+ _l_operation_timeout_(1000), _l_force_index_('idx1') */
	*
FROM
	t;
```

`hints.placement` 只控制 hint 与 SELECT 的位置，字段列表是否另起一行仍由 `newlineAfter.select` 控制。此版本只对 SELECT 后的 hint 做特殊处理，其他语句中的注释保持原有处理方式。

hint 参数支持标量、带引号字符串及 JSON/Python 风格的列表、对象和元组，例如 `cfg={"a": [1, 2]}, pair=(1,)`。仅调整空白，不排序、不改变值或大小写、不执行 Python、不进行 JSON 序列化；字符串内部以及元组尾逗号保持原样。它不是完整的 Python 格式化器，函数表达式等未支持内容原样保留。

普通说明注释不会被当作 hint。无 `+` 的注释仅在内容以 `key=value` 参数形式开头时识别，只有整个参数列表都能解析时才格式化内部间距；不确定、不完整或未支持的表达式保持内容不变，只应用位置设置。`/*+ ... */` 使用相同的保守处理方式。

## 安装与打包

需要 Node.js 22 或更新版本。首次构建：

```sh
cd /data/Code/sql-formatter
npx --yes pnpm@10.28.2 install --frozen-lockfile
npx --yes pnpm@10.28.2 run package
```

生成项目根目录的 `omni-sql-formatter.vsix`。`package` 自动执行类型检查、测试和构建。

安装：

```sh
code --install-extension omni-sql-formatter.vsix --force
```

也可以在 VS Code 扩展面板右上角菜单选择“从 VSIX 安装”。在 SQL 文件中执行“格式化文档方式…”并选择本插件。

推荐设置：

```json
{
  "[sql]": {
    "editor.defaultFormatter": "tatenlee.omni-sql-formatter",
    "editor.formatOnSave": true,
    "editor.insertSpaces": false,
    "editor.detectIndentation": false,
    "editor.tabSize": 4
  },
  "omniSqlFormatter.dialect": "postgresql",
  "omniSqlFormatter.expressionWidth": 100
}
```

支持 `sql`、`postgresql`、`postgres` 语言 ID。后两者由其他语言插件提供；使用对应 ID 时，将上面的 `[sql]` 改为该 ID。

## 排版约定

- CASE 和 END 对齐；WHEN、ELSE 多缩进一级。
- 简单 WHEN 条件、THEN 结果保持同行。
- 默认 SELECT、FROM、WHERE 等子句后换行，子查询展开，别名跟随右括号；可逐项关闭。
- 函数参数含 CASE 时展开，简单窗口表达式尽量保持单行。
- 默认关键字及内置类型大写，函数与标识符保留原始大小写。
- 默认缩进跟随 VS Code 的 Tab/空格设置，也可独立配置。

```sql
SELECT
	jsonb_array_elements(
		CASE
			WHEN kind = 'array' THEN content
			ELSE '[]'::JSONB
		END
	) AS items
FROM
	samples;
```

基于固定版本 `sql-formatter`，不是完整的数据库语法校验器，不承诺覆盖所有存储过程、psql 命令或模板 SQL。仅支持整篇文档格式化。解析失败时保留原文并提示错误。

`expressionWidth` 控制括号表达式的紧凑程度，不是整行长度上限。深层缩进允许长行。复杂 CASE 的括号布局统一处理，不追求保留输入的任意换行。

## 开发

```sh
npx --yes pnpm@10.28.2 run check
npx --yes pnpm@10.28.2 test
npx --yes pnpm@10.28.2 run build
```

在 VS Code 打开项目，构建后按 F5 启动扩展开发窗口。

- `src/formatter.ts`：格式化策略和配置。
- `src/settings.ts`：设置校验及默认值。
- `src/configuration.ts`：VS Code 设置读取。
- `src/dialect.ts`：方言词汇的 include/exclude。
- `src/extension.ts`：VS Code 格式化接口。
- `tests/fixtures/`：SQL 回归样例。
- `scripts/build.mjs`：将运行时依赖打包进单个文件，安装者不需要 Node 或 pnpm。
- `patches/sql-formatter@15.9.0.patch`：ESM/CJS 两套入口的排版修改，由 pnpm 自动应用；不要用 npm install 绕过补丁。

`tests/fixtures/nested.expected.sql` 保存 PostgreSQL 模式下完整嵌套查询的预期排版，可直接打开检查。0.2.0 中 WHERE 后换行开关同样作用于括号条件；关闭可恢复 `WHERE (` 风格。

真实 VS Code 扩展宿主测试：`npx --yes pnpm@10.28.2 run test:extension`。Linux 无桌面环境时加 `xvfb-run -a` 前缀。首次运行会下载固定版本 VS Code。

新增需求时先增加输入/期望输出测试，再改格式化策略。不要使用正则替换 SQL 内容来修补缩进。

## 放到 GitHub

发布到 VS Code 扩展市场的步骤见项目中的 `PUBLISHING.md`。GitHub 源码公开和 Marketplace 发布是两个独立步骤。

这是一个独立源码目录，尚未替你创建远程仓库或推送。创建 GitHub 空仓库后，可在本目录执行：

```sh
git init
git add .
git commit -m "Initial PostgreSQL formatter extension"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/sql-formatter.git
git push -u origin main
```

将 `YOUR_NAME` 换成你的 GitHub 用户名；已有仓库则使用其地址。发布前可在 `package.json` 增加真实 `repository` 字段。

发布者已配置为 `tatenlee`，完整插件标识为 `tatenlee.omni-sql-formatter`。上传 Marketplace 时须使用拥有该发布者权限的账号；本地配置不会创建发布者或验证其归属。GitHub 开源和本地安装 VSIX 不需要 Marketplace 账号。

GitHub Actions 会检查、测试、打包，并把 VSIX 作为构建产物上传。VSIX 和 node_modules 已被 gitignore 排除。

## 上游

核心：[sql-formatter](https://github.com/sql-formatter-org/sql-formatter)。依赖版本由锁文件固定，许可证保留于 THIRD_PARTY_NOTICES.md。
