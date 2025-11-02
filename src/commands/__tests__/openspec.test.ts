import { describe, it, expect, vi, afterEach } from 'bun:test'
import {
  openSpecProposalCommand,
  openSpecValidateCommand,
} from '@commands/openspec'
import {
  runOpenSpecValidate,
  MissingOpenSpecBinaryError,
} from '@services/openspec'
import {
  OPEN_SPEC_TEMPLATES,
  getOpenSpecTemplate,
} from '@constants/openspecTemplates'

describe('OpenSpec prompt commands', () => {
  it('embeds canonical proposal instructions and user arguments', async () => {
    const prompt = await openSpecProposalCommand.getPromptForCommand(
      'add multi-tenant settings',
    )

    expect(prompt).toHaveLength(1)
    const message = prompt[0]
    expect(message.role).toBe('user')
    const blocks = message.content
    expect(Array.isArray(blocks)).toBe(true)
    const textBlock = (blocks as any[])[0]
    expect(textBlock.type).toBe('text')
    expect(textBlock.text).toContain(getOpenSpecTemplate('proposal'))
    expect(textBlock.text).toContain('add multi-tenant settings')
  })
})

describe('OpenSpec template sync', () => {
  it('stays aligned with the canonical OpenSpec templates', async () => {
    const url = new URL(
      '../../../../OpenSpec/src/core/templates/slash-command-templates.ts',
      import.meta.url,
    )
    const canonicalModule = await import(url.href)
    expect(OPEN_SPEC_TEMPLATES).toEqual(canonicalModule.slashCommandBodies)
  })
})

describe('runOpenSpecValidate', () => {
  it('falls back to pnpm exec when openspec binary is missing', async () => {
    const runner = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('missing'), { code: 'ENOENT' }))
      .mockResolvedValueOnce({ code: 0, stdout: 'ok', stderr: '' })

    const result = await runOpenSpecValidate('demo-change', runner as any)

    expect(result.code).toBe(0)
    expect(runner).toHaveBeenCalledTimes(2)
    expect(runner.mock.calls[0][0]).toEqual({
      command: 'openspec',
      args: ['validate', 'demo-change', '--strict'],
    })
    expect(runner.mock.calls[1][0]).toEqual({
      command: 'pnpm',
      args: ['exec', 'openspec', 'validate', 'demo-change', '--strict'],
    })
  })

  it('throws MissingOpenSpecBinaryError when no attempt succeeds', async () => {
    const runner = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }))

    await expect(runOpenSpecValidate('', runner as any)).rejects.toBeInstanceOf(
      MissingOpenSpecBinaryError,
    )
  })
})

describe('openSpecValidateCommand', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('formats stdout when validation succeeds', async () => {
    const spy = vi.spyOn(await import('@services/openspec'), 'runOpenSpecValidate')
    spy.mockResolvedValue({
      code: 0,
      stdout: 'All checks passed',
      stderr: '',
      attempted: {
        command: 'pnpm',
        args: ['exec', 'openspec', 'validate', 'demo', '--strict'],
      },
    })

    const output = await openSpecValidateCommand.call('demo', {
      options: { commands: [], tools: [], slowAndCapableModel: 'main' },
    } as any)

    expect(output).toContain('✅ OpenSpec validation passed')
    expect(output).toContain('All checks passed')
    expect(output).toContain('pnpm exec openspec validate demo --strict')
  })

  it('returns guidance when the binary is missing', async () => {
    const error = new MissingOpenSpecBinaryError([
      { command: 'openspec', args: ['validate', '--strict'] },
      { command: 'pnpm', args: ['exec', 'openspec', 'validate', '--strict'] },
    ])
    const spy = vi.spyOn(await import('@services/openspec'), 'runOpenSpecValidate')
    spy.mockRejectedValue(error)

    const output = await openSpecValidateCommand.call('', {
      options: { commands: [], tools: [], slowAndCapableModel: 'main' },
    } as any)

    expect(output).toContain('未找到可执行的 `openspec` CLI')
    expect(output).toContain('pnpm exec openspec')
  })
})
