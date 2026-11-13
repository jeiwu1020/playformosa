// Inner elevated rail changes travel time: v7 never compares or migrates earlier scores.
// Client rules identity shared by frozen snapshots, adapters and local-record partitions.
export const PINBALL_RULESETS=Object.freeze({60:'office-overtime-flow-60-v7',180:'office-overtime-flow-180-v7',0:'office-overtime-flow-unlimited-v7'});
export const localBestKey=limit=>[60,180].includes(Number(limit))?'overtime-pinball-best-timed-'+Number(limit)+'-flow-v7':'overtime-pinball-best-flow-v7';
