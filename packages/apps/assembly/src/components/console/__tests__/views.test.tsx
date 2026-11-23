import {
  AccessView,
  ConsoleView,
  DappView,
  GridView,
  IdentityView,
  MainBreakerView,
  ToastView,
} from '@eveworld/ui-components'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

const noop = () => {}

describe('MainBreakerView', () => {
  it('gives writers a lever', () => {
    const html = renderToStaticMarkup(
      <MainBreakerView on writable locked={false} onSwitch={noop} />,
    )
    expect(html).toContain('role="switch"')
    expect(html).toContain('aria-checked="true"')
    expect(html).not.toContain('class="plate')
  })

  it('gives read-only viewers a lamp plate', () => {
    const html = renderToStaticMarkup(
      <MainBreakerView
        on={false}
        writable={false}
        locked={false}
        onSwitch={noop}
      />,
    )
    expect(html).not.toContain('role="switch"')
    expect(html).toContain('class="plate off"')
    expect(html).toContain('The grid is switched off.')
  })
})

describe('IdentityView', () => {
  const props = {
    code: 'Assembly · 1',
    name: null,
    lamp: { state: 'on' as const, label: 'Online', detail: ['2 of 3 online'] },
    rows: [
      { label: 'Shell', value: 'Oro' },
      { label: 'Dapp', value: 'example.com', href: 'https://example.com/' },
    ],
  }

  it('shows the edit icon only when the viewer can edit', () => {
    expect(
      renderToStaticMarkup(<IdentityView {...props} canEdit={false} />),
    ).not.toContain('Edit name, description and URL')
    expect(
      renderToStaticMarkup(<IdentityView {...props} canEdit onEdit={noop} />),
    ).toContain('Edit name, description and URL')
  })

  it('names an unnamed Assembly and links the dapp row', () => {
    const html = renderToStaticMarkup(
      <IdentityView {...props} canEdit={false} />,
    )
    expect(html).toContain('Unnamed Assembly')
    expect(html).toContain('href="https://example.com/"')
  })

  it('replaces the name and list with the editor', () => {
    const html = renderToStaticMarkup(
      <IdentityView {...props} canEdit editor={<form id="ed" />} />,
    )
    expect(html).toContain('id="ed"')
    expect(html).not.toContain('Unnamed Assembly')
    expect(html).toContain('Online')
  })
})

describe('ToastView', () => {
  it('renders nothing but the live region without a toast', () => {
    expect(
      renderToStaticMarkup(<ToastView toast={null} onDismiss={noop} />),
    ).toBe('<div class="gc-toast-host" role="status"></div>')
  })

  it('has no dismiss while sending', () => {
    const html = renderToStaticMarkup(
      <ToastView
        toast={{ id: 1, kind: 'sending', title: 'Adding Oro' }}
        onDismiss={noop}
      />,
    )
    expect(html).toContain('Adding Oro')
    expect(html).not.toContain('aria-label="Dismiss"')
  })

  it('links a done transaction', () => {
    const html = renderToStaticMarkup(
      <ToastView
        toast={{
          id: 2,
          kind: 'done',
          title: 'Oro added as a controller',
          digest: '8Kx2…qm4T',
          href: 'https://suiscan.xyz/testnet/tx/8Kx2',
        }}
        onDismiss={noop}
      />,
    )
    expect(html).toContain('href="https://suiscan.xyz/testnet/tx/8Kx2"')
    expect(html).toContain('aria-label="Dismiss"')
  })

  it('announces a failure as an alert with Show details for a raw error', () => {
    const html = renderToStaticMarkup(
      <ToastView
        toast={{
          id: 3,
          kind: 'failed',
          title: "Couldn't add Oro",
          detail: 'The chain rejected the transaction.',
          raw: 'MoveAbort(…)',
        }}
        onDismiss={noop}
      />,
    )
    expect(html).toContain('role="alert"')
    expect(html).toContain('Show details')
    expect(html).not.toContain('MoveAbort')
  })
})

describe('GridView', () => {
  it('says when there is no power grid', () => {
    expect(
      renderToStaticMarkup(
        <GridView grid={null} sections={[]} breaker={null} />,
      ),
    ).toContain('This Assembly has no power grid.')
  })
})

describe('DappView', () => {
  it('loads an https dapp, and explains why another is not shown', () => {
    expect(
      renderToStaticMarkup(
        <DappView host="example.com" src="https://example.com/?itemId=1" />,
      ),
    ).toContain('<iframe')
    expect(
      renderToStaticMarkup(<DappView host="example.com" src={null} />),
    ).toContain('Only https dapps on another site can be shown here.')
    expect(renderToStaticMarkup(<DappView host={null} src={null} />)).toContain(
      'No dapp',
    )
  })
})

describe('AccessView', () => {
  const add = {
    open: false,
    onOpen: noop,
    onClose: noop,
    searchOn: false,
    value: '',
    onChange: noop,
    error: null,
    picked: null,
    search: null,
    directoryError: false,
    canSubmit: false,
    onSubmit: noop,
  }

  it('has no Remove on the shell row', () => {
    const html = renderToStaticMarkup(
      <AccessView
        rows={[
          {
            key: 's',
            name: 'Oro',
            isShell: true,
            isYou: true,
            address: '0x1…2',
          },
        ]}
        loading={false}
        locked={false}
        add={add}
      />,
    )
    expect(html).toContain('Shell')
    expect(html).not.toContain('Remove')
  })

  it('offers Remove on other rows', () => {
    const html = renderToStaticMarkup(
      <AccessView
        rows={[
          {
            key: 'c',
            name: 'Vex',
            isShell: false,
            isYou: false,
            address: '0x3…4',
            onRemove: noop,
          },
        ]}
        loading={false}
        locked={false}
        add={add}
      />,
    )
    expect(html).toContain('Remove')
  })
})

describe('ConsoleView', () => {
  const frame = { roleChip: null, wallet: null, onConnect: noop }

  it('shows the note in place of the body', () => {
    const html = renderToStaticMarkup(
      <ConsoleView {...frame} note="Reading the Assembly…" />,
    )
    expect(html).toContain('Reading the Assembly…')
    expect(html).toContain('Connect wallet')
    expect(html).not.toContain('role="tablist"')
  })

  it('draws a tab for each tab given, with the active one selected', () => {
    const html = renderToStaticMarkup(
      <ConsoleView
        {...frame}
        tabs={['grid', 'access']}
        active="access"
        onSelectTab={noop}
        locked
      />,
    )
    expect(html.match(/role="tab"/g)).toHaveLength(2)
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('Transaction in flight')
  })
})
