# 发布 Omni SQL Formatter 到 VS Code Marketplace

首次发布建议采用“本地打包 + 网页上传”。本项目尚未创建 Marketplace 发布者或执行远程发布。

## 1. 创建发布者

访问 https://marketplace.visualstudio.com/manage ，使用 Microsoft 账号登录，选择 **Create publisher**。

- Name 可以填写 `tatenlee`。
- ID 尝试填写 `tatenlee`；是否可用以页面为准。如果已被占用，选择另一个 ID。
- 记下实际创建成功的 ID。它决定扩展的完整标识，创建后不可更改。

`author` 是作者信息，`publisher` 是 Marketplace 发布者 ID；二者不是同一个字段。项目现已将二者配置为 `tatenlee`。发布前确认管理页存在该发布者且当前账号有发布权限，本地配置并不验证其归属。

## 2. 填入真实发布信息

`package.json` 已配置如下。如果管理页实际注册的 ID 不同，再将 `publisher` 改为该 ID：

```json
{
  "name": "omni-sql-formatter",
  "displayName": "Omni SQL Formatter",
  "publisher": "tatenlee",
  "author": "tatenlee"
}
```

这是需要修改的字段片段，不要替换整个文件。`name` 保持不变。

将源码推到 GitHub 后，增加指向实际仓库的 `repository` 字段，以及需要时的 `homepage`、`bugs.url`。不要填写尚不存在的示例仓库地址。README 的默认格式化器示例也应改为 `<实际发布者ID>.omni-sql-formatter`。

打开设置命令及扩展宿主测试会自动读取发布者标识，不需要修改源码中的 ID。更换 publisher 后，本地 VS Code 会把它视为另一个插件；卸载旧的 `sql-layout.omni-sql-formatter` 并选择新的默认格式化器。

## 3. 打包和本地试用

需要 Node.js 22 或更新版本。在项目根目录执行：

```sh
npx --yes pnpm@10.28.2 install --frozen-lockfile
npx --yes pnpm@10.28.2 run package
code --install-extension omni-sql-formatter.vsix --force
```

`run package` 会先运行类型检查、单元测试和构建，再生成 VSIX。pnpm 会自动应用项目里的补丁，因此不要换用 npm install。

重载 VS Code 后检查：格式化文档、Settings 中六类设置、SELECT hint 示例，以及带字符串的复杂 SQL。可运行 `npx --yes pnpm@10.28.2 run test:extension` 验证真实扩展宿主；无桌面的 Linux 需要在命令前加 `xvfb-run -a`。

## 4. 上传到 Marketplace

返回 https://marketplace.visualstudio.com/manage ：

1. 进入自己的 publisher。
2. 选择 **New extension → Visual Studio Code**。
3. 上传刚生成的 `omni-sql-formatter.vsix`。
4. 按页面提示完成提交，等待平台处理，并检查状态和扩展详情页。

发布完成后，社区用户即可从 VS Code 扩展面板搜索并安装。GitHub 上的 Release 或 Actions 安装包不会自动出现在 Marketplace。

网页上传不需要在本地配置 PAT。不要把访问令牌写入项目、README 或 GitHub 仓库。

## 5. 后续更新

保持 publisher 和 name 不变，修改 `package.json` 中的版本号，例如将 `0.3.0` 改为 `0.3.1`，更新 `CHANGELOG.md`，重新执行打包命令。然后在管理页中为已有扩展上传新版，不能重复使用已经发布的版本号。

现有 GitHub Actions 只执行验证和生成 VSIX，不会自动发布。后续需要自动发布时，按照官方文档配置 GitHub Actions Trusted Publishing；官方公告指出全局 Azure DevOps PAT 将于 2026-12-01 退役，因此这里不以长期 PAT 作为新工作流的默认方案。

## 官方参考

- 发布者注册、VSIX 上传、版本更新：https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- Marketplace 管理页：https://marketplace.visualstudio.com/manage
- Lindorm hint 语法：https://help.aliyun.com/zh/lindorm/hint-introduction
