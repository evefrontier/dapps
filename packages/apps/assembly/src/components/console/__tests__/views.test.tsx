import {
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
