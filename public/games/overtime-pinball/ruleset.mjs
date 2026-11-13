// Client rules identity shared by frozen snapshots, adapters and local-record partitions.
export const PINBALL_RULESETS=Object.freeze({60:'office-overtime-shadow-60-v2',180:'office-overtime-shadow-180-v2',0:'office-overtime-shadow-unlimited-v2'});
export const localBestKey=limit=>[60,180].includes(Number(limit))?'overtime-pinball-best-timed-'+Number(limit)+'-shadow-v2':'overtime-pinball-best-shadow-v2';
