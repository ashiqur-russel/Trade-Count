import { describe, expect, it } from 'vitest';
import { networkKeys } from './client-network.js';

describe('networkKeys', () => {
  it('uses the address itself and its /24 for IPv4', () => {
    expect(networkKeys('203.0.113.77')).toEqual({ precise: 'v4:203.0.113.77', coarse: 'v4:203.0.113.0/24' });
  });

  it('treats every address inside one IPv6 /64 as the same client, and a /48 as the same network', () => {
    const a = networkKeys('2001:db8:1:2:aaaa:bbbb:cccc:dddd');
    const b = networkKeys('2001:db8:1:2::1');
    const otherSubnet = networkKeys('2001:db8:1:9::1');

    expect(a.precise).toBe(b.precise);
    expect(a.precise).toBe('v6:2001:db8:1:2::/64');
    expect(otherSubnet.precise).not.toBe(a.precise);
    expect(otherSubnet.coarse).toBe(a.coarse);
    expect(a.coarse).toBe('v6:2001:db8:1::/48');
  });

  it('reads every way of writing the same IPv6 address as one key', () => {
    const forms = ['2001:0db8:0000:0000:0000:0000:0000:0001', '2001:db8::1', '2001:DB8:0:0:0:0:0:1', '2001:db8::1%en0'];

    expect(new Set(forms.map((f) => networkKeys(f).precise)).size).toBe(1);
  });

  it('treats an IPv4 address written as IPv6 like the IPv4 address', () => {
    expect(networkKeys('::ffff:203.0.113.77')).toEqual(networkKeys('203.0.113.77'));
    expect(networkKeys('::ffff:cb00:714d')).toEqual(networkKeys('203.0.113.77'));
  });

  it('falls back to one shared bucket for missing or invalid addresses', () => {
    for (const bad of [null, '', 'not-an-ip', '999.1.1.1', '1:2:3', '1::2::3', 'gggg::1']) {
      expect(networkKeys(bad)).toEqual({ precise: 'unknown', coarse: 'unknown' });
    }
  });
});
