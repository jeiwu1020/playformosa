/** Directory visibility only. This is not authentication or access control. */
export function resolveCatalogChannel(config) {
  if (config === undefined) return 'production';
  const channel=config?.channel;
  if (channel!=='preview' && channel!=='production') throw new Error('Invalid catalog channel: expected preview or production');
  return channel;
}
export function filterReleased(entries=[],channel='production') {
  resolveCatalogChannel({channel});
  return entries.filter(entry=>entry.release?.[channel]===true);
}
export function validateReleaseOutput(html,catalog,expectedChannel) {
  resolveCatalogChannel({channel:expectedChannel});
  if(!html.includes(`data-catalog-channel="${expectedChannel}"`)) throw new Error('Generated output channel does not match expected channel; rebuild before release');
  const expected=filterReleased([...(catalog.externalGames||[]),...(catalog.platforms||[])],expectedChannel).map(entry=>entry.id).sort();
  const actual=[...html.matchAll(/data-external-id="([a-z0-9-]+)"/g)].map(match=>match[1]).sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error('Generated output entries do not match the released catalog; rebuild before release');
  return actual;
}
