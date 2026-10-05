export interface NetworkKeys {
  /** The client's own network: an IPv4 address or an IPv6 /64, which is what one device or home gets. */
  precise: string;
  /** The wider network around it: an IPv4 /24 or an IPv6 /48, which a single operator can rotate through. */
  coarse: string;
}

const UNKNOWN: NetworkKeys = { precise: 'unknown', coarse: 'unknown' };

/**
 * Groups client addresses so one machine can't dodge a limit by switching address: with IPv6 a single
 * host can use billions of addresses inside its /64, so the /64 (not the address) is the unit that counts.
 */
export function networkKeys(address: string | null): NetworkKeys {
  if (!address) return UNKNOWN;
  const v4 = parseIpv4(address);
  if (v4) return fromIpv4(v4);

  const groups = parseIpv6(address);
  if (!groups) return UNKNOWN;
  const mapped = groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff;
  if (mapped) return fromIpv4([groups[6]! >> 8, groups[6]! & 255, groups[7]! >> 8, groups[7]! & 255]);

  const hex = (g: number) => g.toString(16);
  return {
    precise: `v6:${groups.slice(0, 4).map(hex).join(':')}::/64`,
    coarse: `v6:${groups.slice(0, 3).map(hex).join(':')}::/48`,
  };
}

function fromIpv4([a, b, c, d]: number[]): NetworkKeys {
  return { precise: `v4:${a}.${b}.${c}.${d}`, coarse: `v4:${a}.${b}.${c}.0/24` };
}

function parseIpv4(text: string): number[] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (!match) return null;
  const octets = match.slice(1).map(Number);
  return octets.every((o) => o <= 255) ? octets : null;
}

/** The eight 16-bit groups of an IPv6 address, or null when it isn't one. */
function parseIpv6(raw: string): number[] | null {
  let text = raw.toLowerCase().split('%')[0]!;
  const embedded = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text);
  if (embedded) {
    const octets = parseIpv4(embedded[1]!);
    if (!octets) return null;
    text = text.slice(0, embedded.index) + `${((octets[0]! << 8) | octets[1]!).toString(16)}:${((octets[2]! << 8) | octets[3]!).toString(16)}`;
  }

  const halves = text.split('::');
  if (halves.length > 2) return null;
  const parse = (part: string): number[] | null => {
    if (part === '') return [];
    const groups = part.split(':').map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : Number.NaN));
    return groups.some(Number.isNaN) ? null : groups;
  };
  const head = parse(halves[0]!);
  const tail = halves.length === 2 ? parse(halves[1]!) : [];
  if (!head || !tail) return null;

  if (halves.length === 1) return head.length === 8 ? head : null;
  const missing = 8 - head.length - tail.length;
  return missing >= 1 ? [...head, ...new Array<number>(missing).fill(0), ...tail] : null;
}
