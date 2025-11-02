export type OpenSpecTemplateId =
  | 'proposal'
  | 'design-architect'
  | 'init-architect'
  | 'refine-architect'
  | 'sync-code-to-architect'
  | 'apply'
  | 'archive'

const baseGuardrails = `**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to \`openspec/AGENTS.md\` (located inside the \`openspec/\` directory—run \`ls openspec\` or \`openspec update\` if you don't see it) if you need additional OpenSpec conventions or clarifications.`

const proposalGuardrails = `${baseGuardrails}\n- Identify any vague or ambiguous details and ask the necessary follow-up questions before editing files.`

const proposalSteps = `**Steps**
1. Review \`openspec/project.md\`, run \`openspec list\` and \`openspec list --specs\`, and inspect related code or docs (e.g., via \`rg\`/\`ls\`) to ground the proposal in current behaviour; note any gaps that require clarification.
2. Choose a unique verb-led \`change-id\` and scaffold \`proposal.md\`, \`tasks.md\`, and \`design.md\` (when needed) under \`openspec/changes/<id>/\`.
3. Map the change into concrete capabilities or requirements, breaking multi-scope efforts into distinct spec deltas with clear relationships and sequencing.
4. Capture architectural reasoning in \`design.md\` when the solution spans multiple systems, introduces new patterns, or demands trade-off discussion before committing to specs.
5. Draft spec deltas in \`changes/<id>/specs/<capability>/spec.md\` (one folder per capability) using \`## ADDED|MODIFIED|REMOVED Requirements\` with at least one \`#### Scenario:\` per requirement and cross-reference related capabilities when relevant.
6. Draft \`tasks.md\` as an ordered list of small, verifiable work items that deliver user-visible progress, include validation (tests, tooling), and highlight dependencies or parallelizable work.
7. Validate with \`openspec validate <id> --strict\` and resolve every issue before sharing the proposal.`

const proposalReferences = `**Reference**
- Use \`openspec show <id> --json --deltas-only\` or \`openspec show <spec> --type spec\` to inspect details when validation fails.
- Search existing requirements with \`rg -n "Requirement:|Scenario:" openspec/specs\` before writing new ones.
- Explore the codebase with \`rg <keyword>\`, \`ls\`, or direct file reads so proposals align with current implementation realities.`

const applySteps = `**Steps**
Track these steps as TODOs and complete them one by one.
1. Read \`changes/<id>/proposal.md\`, \`design.md\` (if present), and \`tasks.md\` to confirm scope and acceptance criteria.
2. Work through tasks sequentially, keeping edits minimal and focused on the requested change.
3. Confirm completion before updating statuses—make sure every item in \`tasks.md\` is finished.
4. Update the checklist after all work is done so each task is marked \`- [x]\` and reflects reality.
5. Reference \`openspec list\` or \`openspec show <item>\` when additional context is required.`

const applyReferences = `**Reference**
- Use \`openspec show <id> --json --deltas-only\` if you need additional context from the proposal while implementing.`

const techDesignGuardrails = `${baseGuardrails}
- Treat the architecture DSL under \`openspec/architect\` as the canonical snapshot—only update nodes that this change actually touches.
- Document every structural adjustment in the change-specific mutation log before editing the shared snapshot so reviewers can trace intent.
- Reuse existing modules/entities/procedures when possible; justify new nodes by linking them back to the spec deltas.`

const techDesignSteps = `**Steps**
1. Identify the active change: read the spec deltas in \`openspec/changes/<id>/specs/\` and confirm outstanding TODOs or open questions.
2. Ground yourself in the DSL: 阅读 \`openspec/architect/prompts/DSL结构定义.md\`、\`openspec/architect/prompts/DSL输出规范.md\` 获取字段说明与输出约束，并参考 \`openspec/architect/prompts/后端设计示例.md\` 或 \`openspec/architect/prompts/前端设计示例.md\` 确认写作风格。
3. Inspect the current snapshot in \`openspec/architect/\`: load the XML file for each affected node (paths mirror their IDs, for example \`openspec/architect/Common.module/Entity/B.entity\`).
4. Update the change log at \`openspec/changes/<id>/architect/mutations.xml\`: add one \`<MutationPartial>\` per create/update/delete, using the element type as the tag (e.g., \`<Module ...>\`) with a \`mutationType="Create|Update|Delete"\` attribute and a JSON payload inside \`<![CDATA[ ... ]]>\`. Capture version bumps and high-level reasoning inline.
5. Refresh the canonical XML snapshots in \`openspec/architect/\`: for every impacted node, rewrite the file using the exact field set described in \`openspec/architect/prompts/DSL结构定义.md\`（记得为长文本包裹 CDATA）。Create any missing intermediate folders so the final path matches the node ID.
6. Confirm referential integrity: verify IDs referenced in dependencies still exist, note open questions or follow-ups in the mutation log, and flag any spec/architecture drift that needs clarification.`

const techDesignReferences = `**Reference**
- Follow the attribute and payload structure recorded in \`openspec/architect/prompts/DSL输出规范.md\` when writing \`<MutationPartial>\` entries.
- When emitting XML snapshots for modules/entities/procedures/etc., map each field described in \`openspec/architect/prompts/DSL结构定义.md\` to an XML element (use CDATA for markdown, TypeScript, Mermaid, or pseudocode blocks).
- Keep the shared snapshot and per-change mutation log in sync so other tooling can parse the DSL accurately.`

const architectWorkflowGuardrails = techDesignGuardrails

const initArchitectSteps = `**Steps**
1. 从 <ChangeRequest> 中获取需求文档路径；如果缺失，则先向用户索取 Markdown/文本文件后再继续。
2. 在项目根目录运行 \`openspec init-architect <docPath>\`，让 CLI 生成 Module 与 ModuleRelationDiagram 的 MutationPartial。
3. 审阅命令输出以及 \`openspec/architect/logs/\` 下生成的备份，弄清楚新增了哪些模块与关联。
4. 应用这些 MutationPartial：刷新 \`openspec/architect/state.json\`，重写对应的 XML 快照，并在存在变更时更新 \`openspec/changes/<change-id>/architect/mutations.xml\`。
5. 在回复中标记尚未解决的疑问（模块职责、依赖边界等）及后续行动。`

const initArchitectReferences = `**Reference**
- 使用 \`openspec/architect/prompts/DSL结构定义.md\` 与 \`DSL输出规范.md\` 校验 CLI 输出的字段与格式。
- 需求文档若包含图示或流程，可额外在 MutationPartial 的说明中捕捉，方便后续 refine。`

const refineArchitectSteps = `**Steps**
1. 解析 <ChangeRequest> 获取目标（如模块/实体范围、变更原因、change-id）；若范围模糊先向用户澄清。
2. 在执行前先查看现有快照：读取 \`openspec/architect/state.json\` 及相关 XML 节点，确认当前结构。
3. 运行 \`openspec refine-architect --prompt "<text>"\`，并追加 <ChangeRequest> 中提到的其他参数（如 \`--change\`），生成 MutationPartial 建议。
4. 审核并应用这些建议：更新变更目录下的 \`architect/mutations.xml\`，同步 XML 快照，确保 version 递增与依赖指向正确。
5. 在总结中列出已处理的调整与仍需跟进的 TODO，必要时附带下一步建议。`

const refineArchitectReferences = `**Reference**
- 随时对照 \`openspec/architect/prompts/DSL结构定义.md\`、\`DSL输出规范.md\` 检查字段完整性与 CDATA 包裹。
- CLI 会在 \`openspec/architect/logs/\` 写入原始响应；若终端输出被截断，可查阅最新文件。`

const syncArchitectSteps = `**Steps**
1. 从 <ChangeRequest> 收集需要扫描的代码目录（默认尝试 \`src\`、\`app\`、\`api\`）以及补充说明或 change-id。
2. 根据收集到的参数运行 \`openspec sync-code-to-architect\`（可附带 \`--path\`、\`--change\`、\`--prompt\` 等），让 CLI 基于代码摘要生成 MutationPartial。
3. 通过 \`openspec/architect/state.json\` 判断是否为首次同步；若 CLI 仅输出宏观模块，可在后续根据需要再次运行并提供更聚焦的提示。
4. 像其他流程一样应用变更：刷新 \`openspec/changes/<change-id>/architect/mutations.xml\`、更新 XML 快照，并保持 state.json 同步。
5. 在结果中记录发现的缺口（遗失模块、过时流程等）与建议的后续检查。`

const syncArchitectReferences = `**Reference**
- 结合 CLI 生成的摘要（存于 \`openspec/architect/logs/\`）定位代码热点，可配合 \`rg\` 或语言感知工具深入确认实现细节。
- 如果同步过程中出现权限或路径问题，优先修正命令参数再重试。`

const archiveSteps = `**Steps**
1. Determine the change ID to archive:
   - If this prompt already includes a specific change ID (for example inside a \`<ChangeId>\` block populated by slash-command arguments), use that value after trimming whitespace.
   - If the conversation references a change loosely (for example by title or summary), run \`openspec list\` to surface likely IDs, share the relevant candidates, and confirm which one the user intends.
   - Otherwise, review the conversation, run \`openspec list\`, and ask the user which change to archive; wait for a confirmed change ID before proceeding.
   - If you still cannot identify a single change ID, stop and tell the user you cannot archive anything yet.
2. Validate the change ID by running \`openspec list\` (or \`openspec show <id>\`) and stop if the change is missing, already archived, or otherwise not ready to archive.
3. Run \`openspec archive <id> --yes\` so the CLI moves the change and applies spec updates without prompts (use \`--skip-specs\` only for tooling-only work).
4. Review the command output to confirm the target specs were updated and the change landed in \`changes/archive/\`.
5. Validate with \`openspec validate --strict\` and inspect with \`openspec show <id>\` if anything looks off.`

const archiveReferences = `**Reference**
- Use \`openspec list\` to confirm change IDs before archiving.
- Inspect refreshed specs with \`openspec list --specs\` and address any validation issues before handing off.`

export const OPEN_SPEC_TEMPLATES: Record<OpenSpecTemplateId, string> = {
  proposal: [proposalGuardrails, proposalSteps, proposalReferences].join('\n\n'),
  'design-architect': [techDesignGuardrails, techDesignSteps, techDesignReferences].join('\n\n'),
  'init-architect': [architectWorkflowGuardrails, initArchitectSteps, initArchitectReferences].join('\n\n'),
  'refine-architect': [architectWorkflowGuardrails, refineArchitectSteps, refineArchitectReferences].join('\n\n'),
  'sync-code-to-architect': [architectWorkflowGuardrails, syncArchitectSteps, syncArchitectReferences].join('\n\n'),
  apply: [baseGuardrails, applySteps, applyReferences].join('\n\n'),
  archive: [baseGuardrails, archiveSteps, archiveReferences].join('\n\n'),
}

export function getOpenSpecTemplate(id: OpenSpecTemplateId): string {
  return OPEN_SPEC_TEMPLATES[id]
}
