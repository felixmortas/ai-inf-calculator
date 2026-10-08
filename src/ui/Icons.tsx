const paths = {
  back: ['M15 5l-7 7 7 7'],
  leaf: ['M5 19c0-8 4-13 14-14 0 9-4 14-12 14', 'M5 19c3-4 6-7 9-9'],
  drop: ['M12 3c3.5 4.2 6 7.2 6 10.2A6 6 0 0 1 6 13.2C6 10.2 8.5 7.2 12 3z', 'M9.5 14.5a2.5 2.5 0 0 0 2 2'],
  bolt: ['M13.5 3.5L6 13.2h5l-1 7.3 7.5-9.7h-5z'],
  bulb: ['M9 17.5h6M10 20.5h4M12 3.5a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3.5z', 'M12 16v-4.5c1.2 0 2-.7 2.6-1.6'],
  shower: ['M4 12a8 8 0 0 1 16 0z', 'M12 4V2.5M8 15.5l-.8 2M12 15.5v2.5M16 15.5l.8 2M6.5 20.5l-.5 1M12 21l0 1M17.5 20.5l.5 1'],
  globe: ['M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z'],
  trash: ['M5 7h14M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M7 7l.8 11a2 2 0 0 0 2 1.9h4.4a2 2 0 0 0 2-1.9L17 7M10 11v5M14 11v5'],
  share: ['M12 15V4M8 7.5L12 4l4 3.5M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6'],
  plus: ['M12 5v14M5 12h14'],
  chev: ['M7 10l5 5 5-5'],
} as const;

export type IconName = keyof typeof paths;

/** Icône SVG au trait, décorative (le nom et l’unité restent écrits à côté). */
export function Icon({ name }: { readonly name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {name === 'globe' ? <circle cx="12" cy="12" r="9" /> : null}
      {paths[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
