import { describe, it, expect, vi, afterEach } from 'bun:test'
import {
  openSpecProposalCommand,
  openSpecTechDesignCommand,
  openSpecInitArchitectCommand,
  openSpecRefineArchitectCommand,
  openSpecSyncCodeToArchitectCommand,
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

  it('embeds canonical design-architect instructions and change id', async () => {
    const prompt = await openSpecTechDesignCommand.getPromptForCommand('update-search')

    expect(prompt).toHaveLength(1)
    const message = prompt[0]
    expect(message.role).toBe('user')
    const blocks = message.content
    expect(Array.isArray(blocks)).toBe(true)
    const textBlock = (blocks as any[])[0]
    expect(textBlock.type).toBe('text')
    expect(textBlock.text).toContain(getOpenSpecTemplate('design-architect'))
    expect(textBlock.text).toContain('update-search')
  })

  it('embeds canonical init-architect instructions and doc path', async () => {
    const prompt = await openSpecInitArchitectCommand.getPromptForCommand('docs/requirements.md')

    expect(prompt).toHaveLength(1)
    const message = prompt[0]
    expect(message.role).toBe('user')
    const blocks = message.content
    expect(Array.isArray(blocks)).toBe(true)
    const textBlock = (blocks as any[])[0]
    expect(textBlock.type).toBe('text')
    expect(textBlock.text).toContain(getOpenSpecTemplate('init-architect'))
    expect(textBlock.text).toContain('docs/requirements.md')
  })

  it('embeds canonical refine-architect instructions and prompt text', async () => {
    const prompt = await openSpecRefineArchitectCommand.getPromptForCommand('--change enhance-reporting --prompt "完善审批流程"')

    expect(prompt).toHaveLength(1)
    const message = prompt[0]
    expect(message.role).toBe('user')
    const blocks = message.content
    expect(Array.isArray(blocks)).toBe(true)
    const textBlock = (blocks as any[])[0]
    expect(textBlock.type).toBe('text')
    expect(textBlock.text).toContain(getOpenSpecTemplate('refine-architect'))
    expect(textBlock.text).toContain('--change enhance-reporting --prompt "完善审批流程"')
  })

  it('embeds canonical sync-code-to-architect instructions and arguments', async () => {
    const prompt = await openSpecSyncCodeToArchitectCommand.getPromptForCommand('--path src --change add-audit-log')

    expect(prompt).toHaveLength(1)
    const message = prompt[0]
    expect(message.role).toBe('user')
    const blocks = message.content
    expect(Array.isArray(blocks)).toBe(true)
    const textBlock = (blocks as any[])[0]
    expect(textBlock.type).toBe('text')
    expect(textBlock.text).toContain(getOpenSpecTemplate('sync-code-to-architect'))
    expect(textBlock.text).toContain('--path src --change add-audit-log')
  })
})

describe('OpenSpec template sync', () => {
  it('stays aligned with the canonical OpenSpec templates', async () => {
    const candidates = ['OpenSpec', 'OpenSpecDev']
    let canonicalModule: any = null

    for (const candidate of candidates) {
      const url = new URL(
        `../../../../${candidate}/src/core/templates/slash-command-templates.ts`,
        import.meta.url,
      )
      try {
        canonicalModule = await import(url.href)
        break
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ERR_MODULE_NOT_FOUND') {
          throw error
        }
      }
    }

    if (!canonicalModule) {
      throw new Error('Unable to locate canonical OpenSpec templates for comparison.')
    }

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
