• - 在 OpenSpec/ 目录执行 pnpm install && pnpm run build 先生成最新的 dist/。
  - 本地注册 CLI 有两个常用做法：
      - pnpm link --global（或 npm link）把当前 OpenSpec 工程挂到全局；随后任何位置直接运行 openspec ... 都会使用这份源
        码构建。
      - pnpm pack 生成 @fission-ai/openspec-*.tgz，然后 npm install -g ./@fission-ai/openspec-*.tgz 通过本地 tarball 装
        到全局。
  - 如果只想在 Kode 项目里使用而不装全局，可以在 Kode/ 目录运行 npm install ../OpenSpec（或 pnpm add ../OpenSpec --save-
    dev）让它引用邻近源码版本。
  - 访问 CLI 逻辑时直接运行 node bin/openspec.js 也行，但要先 pnpm run build 确保 dist/ 最新。
  - 记得变更模板后执行 pnpm exec openspec update 验证新内容是否按预期写入 openspec/AGENTS.md 等文件。