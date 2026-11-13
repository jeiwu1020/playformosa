// Client rules identity shared by frozen snapshots, adapters and local-record partitions.
export const PINBALL_RULESETS=Object.freeze({60:'office-overtime-flow-60-v6',180:'office-overtime-flow-180-v6',0:'office-overtime-flow-unlimited-v6'});
export const localBestKey=limit=>[60,180].includes(Number(limit))?'overtime-pinball-best-timed-'+Number(limit)+'-flow-v6':'overtime-pinball-best-flow-v6';
