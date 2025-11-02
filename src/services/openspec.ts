import { spawn } from 'child_process'
import { resolve } from 'path'
import { getCwd } from '@utils/state'
import type { MessageParam } from '@anthropic-ai/sdk/resources/index.mjs'
import {
  getOpenSpecTemplate,
  type OpenSpecTemplateId,
} from '@constants/openspecTemplates'

type RunnerSuccess = {
  stdout: string
  stderr: string
  code: number
}

type CommandAttempt = {
  command: string
  args: string[]
}

type Runner = (
  attempt: CommandAttempt,
  cwd: string,
) => Promise<RunnerSuccess>

export class MissingOpenSpecBinaryError extends Error {
  attempts: CommandAttempt[]

  constructor(attempts: CommandAttempt[]) {
    super(
      [
        '未找到可执行的 `openspec` 命令。',
        '请确认已全局安装 `@fission-ai/openspec`，或在项目根目录运行 `pnpm exec openspec`。',
      ].join('\n'),
    )
    this.attempts = attempts
    this.name = 'MissingOpenSpecBinaryError'
  }
}

export type OpenSpecValidateResult = RunnerSuccess & {
  attempted: CommandAttempt
}

export function getCanonicalOpenSpecBody(id: OpenSpecTemplateId): string {
  return getOpenSpecTemplate(id)
}

function defaultRunner(
  attempt: CommandAttempt,
  cwd: string,
): Promise<RunnerSuccess> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(attempt.command, attempt.args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', chunk => {
      stdout += chunk.toString()
    })

    child.stderr?.on('data', chunk => {
      stderr += chunk.toString()
    })

    child.once('error', error => {
      rejectPromise(error)
    })

    child.once('close', code => {
      resolvePromise({
        code: code ?? 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      })
    })
  })
}

export function buildPromptMessage(
  id: OpenSpecTemplateId,
  args: string,
): MessageParam[] {
  const body = getCanonicalOpenSpecBody(id)
  const trimmedArgs = args.trim()
  const changeRequest = trimmedArgs
    ? `\n\n<ChangeRequest>\n${trimmedArgs}\n</ChangeRequest>`
    : '\n\n<ChangeRequest>(no additional context provided)</ChangeRequest>'

  return [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: [
            `You are running the OpenSpec ${id} workflow from inside the Kode CLI.`,
            body,
            changeRequest,
          ].join('\n\n'),
        },
      ],
    },
  ]
}

export function parseValidateArgs(rawArgs: string): string[] {
  const trimmed = rawArgs.trim()
  if (!trimmed) {
    return []
  }

  const tokens = trimmed
    .match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)
    ?.map(token => {
      if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
        return token.slice(1, -1)
      }
      return token
    }) ?? []

  return tokens
}

function ensureStrictFlag(args: string[]): string[] {
  const hasStrict = args.some(arg => arg === '--strict' || arg.startsWith('--strict='))
  return hasStrict ? args : [...args, '--strict']
}

export async function runOpenSpecValidate(
  rawArgs: string,
  runner: Runner = defaultRunner,
): Promise<OpenSpecValidateResult> {
  const cwd = getCwd() || process.cwd()
  const absoluteCwd = resolve(cwd)
  const parsedArgs = ensureStrictFlag(parseValidateArgs(rawArgs))
  const commandArgs = ['validate', ...parsedArgs]

  const attempts: CommandAttempt[] = [
    { command: 'openspec', args: commandArgs },
    { command: 'pnpm', args: ['exec', 'openspec', ...commandArgs] },
  ]

  const collectedErrors: NodeJS.ErrnoException[] = []

  for (const attempt of attempts) {
    try {
      const result = await runner(attempt, absoluteCwd)
      return {
        ...result,
        attempted: attempt,
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code !== 'ENOENT') {
        throw err
      }
      collectedErrors.push(err)
    }
  }

  throw new MissingOpenSpecBinaryError(attempts)
}
