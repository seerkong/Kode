import type { Command } from '@commands'
import { buildPromptMessage, runOpenSpecValidate, MissingOpenSpecBinaryError } from '@services/openspec'
import type { OpenSpecTemplateId } from '@constants/openspecTemplates'
import { logError } from '@utils/log'

type PromptCommandMetadata = {
  description: string
  progressMessage: string
}

const PROMPT_COMMANDS: Record<OpenSpecTemplateId, PromptCommandMetadata> = {
  proposal: {
    description: 'Create an OpenSpec change proposal using canonical guardrails and steps',
    progressMessage: 'assembling OpenSpec proposal instructions',
  },
  apply: {
    description: 'Follow OpenSpec apply workflow and checklist',
    progressMessage: 'preparing OpenSpec apply guidance',
  },
  archive: {
    description: 'Archive an OpenSpec change using canonical workflow',
    progressMessage: 'preparing OpenSpec archive guidance',
  },
}

function toCommandName(id: string): string {
  return `openspec:${id}`
}

function createPromptCommand(id: OpenSpecTemplateId): Command {
  const meta = PROMPT_COMMANDS[id]
  return {
    type: 'prompt',
    name: toCommandName(id),
    description: meta.description,
    isEnabled: true,
    isHidden: false,
    progressMessage: meta.progressMessage,
    userFacingName() {
      return toCommandName(id)
    },
    async getPromptForCommand(args: string) {
      return buildPromptMessage(id, args)
    },
  }
}

export const openSpecProposalCommand = createPromptCommand('proposal')
export const openSpecApplyCommand = createPromptCommand('apply')
export const openSpecArchiveCommand = createPromptCommand('archive')

export const openSpecValidateCommand: Command = {
  type: 'local',
  name: toCommandName('validate'),
  description: 'Run `openspec validate --strict` from the current workspace',
  isEnabled: true,
  isHidden: false,
  userFacingName() {
    return toCommandName('validate')
  },
  async call(args) {
    try {
      const result = await runOpenSpecValidate(args)
      const header =
        result.code === 0
          ? '✅ OpenSpec validation passed'
          : `❌ OpenSpec validation failed (exit code ${result.code})`

      const lines = [
        header,
        `Command: ${result.attempted.command} ${result.attempted.args.join(' ')}`,
      ]

      if (result.stdout) {
        lines.push('', result.stdout)
      }

      if (result.stderr) {
        lines.push('', 'stderr:', result.stderr)
      }

      return lines.join('\n')
    } catch (error) {
      if (error instanceof MissingOpenSpecBinaryError) {
        const attempts = error.attempts
          .map(attempt => `- ${attempt.command} ${attempt.args.join(' ')}`)
          .join('\n')
        return [
          '❌ 未找到可执行的 `openspec` CLI。',
          '尝试的命令：',
          attempts,
          '',
          '请安装 `@fission-ai/openspec`，或在项目根目录运行 `pnpm exec openspec ...`。',
        ].join('\n')
      }

      logError(error)
      const message =
        error instanceof Error ? error.message : 'Unknown OpenSpec execution error'
      return `❌ OpenSpec validate 命令执行失败：${message}`
    }
  },
}

export const openSpecCommands: Command[] = [
  openSpecProposalCommand,
  openSpecApplyCommand,
  openSpecArchiveCommand,
  openSpecValidateCommand,
]

export default openSpecCommands
