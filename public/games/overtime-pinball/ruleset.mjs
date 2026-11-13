// Client rules identity shared by frozen snapshots, adapters and local-record partitions.
export const PINBALL_RULESETS=Object.freeze({60:'office-overtime-flow-60-v5',180:'office-overtime-flow-180-v5',0:'office-overtime-flow-unlimited-v5'});
export const localBestKey=limit=>[60,180].includes(Number(limit))?'overtime-pinball-best-timed-'+Number(limit)+'-flow-v5':'overtime-pinball-best-flow-v5';
