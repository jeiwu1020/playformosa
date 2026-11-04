import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=new URL('../../',import.meta.url);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
// Before pins come from published 928772e and its complete 500dec1 tree.
// After pins are computed from those parent bytes using only the approved names.
// This independent immutable contract is never inferred from current runtime files.
const EXPECTED=freeze({
  "schemaVersion": 1,
  "baseCommit": "928772e5083ad08fedbef6a78536c08f3ff20bb7",
  "baseTree": "500dec1dd2eee10290ac0d275d88d1cb991707f3",
  "files": [
    {
      "path": "public/games/fast-hands/catch.html",
      "baseGitBlob": "3f9286bcb7b3692b84c63b4364a2ce8c4f6f2371",
      "beforeSha256": "21ccdd54fb9aec059ac65950fe65cb74b0cc89599efaf5d05939a94826aa9703",
      "sha256": "baa2639c743d49ab0af9e21574ba7023e2f878667a49b4c78ee326bd920ede85",
      "replacements": [
        {
          "before": "玩具彈接接樂",
          "after": "彈無虛接",
          "count": 6
        },
        {
          "before": "十回合對決",
          "after": "快手對決",
          "count": 2
        }
      ]
    },
    {
      "path": "public/games/fast-hands/duel.html",
      "baseGitBlob": "be30689f1b327987019321ca9668d208352a76dc",
      "beforeSha256": "6564ac4bd5841a2d36fa9294f72dee6544f0245ab10b0527974c8af14f1ca65a",
      "sha256": "cdd19689fd57bfc507e7ff5decb1d7a714bcae485460d9307466f7ba5a6bdca8",
      "replacements": [
        {
          "before": "玩具彈接接樂",
          "after": "彈無虛接",
          "count": 2
        },
        {
          "before": "十回合對決",
          "after": "快手對決",
          "count": 6
        }
      ]
    },
    {
      "path": "public/games/fast-hands/index.html",
      "baseGitBlob": "02ccc3fe9a5ff327e3d7e44ebeb217fc98c90fe2",
      "beforeSha256": "6affb3ed5121c47d5835134258b468b69592fb59ec186a832e1296caa9beada4",
      "sha256": "88e4e259ca9ef8905d85839455e8a42015ea39ee37b600bd8b062e09d47a6cf9",
      "replacements": [
        {
          "before": "玩具彈接接樂",
          "after": "彈無虛接",
          "count": 2
        },
        {
          "before": "十回合對決",
          "after": "快手對決",
          "count": 2
        }
      ]
    },
    {
      "path": "public/games/fast-hands/levels-leaderboard.mjs",
      "baseGitBlob": "0d35520b2ca04189be9dcd94969f3ad6412b9d93",
      "beforeSha256": "63e2e876824039078a864b9b5993d95c2d707fe2d66d172ad567238260857c6a",
      "sha256": "13d6f16e6312416820e1195e5ca368faefac6429e9c5b44f08dbcc279f7bc440",
      "replacements": [
        {
          "before": "十回合對決",
          "after": "快手對決",
          "count": 1
        },
        {
          "before": "label:'玩具彈通關'",
          "after": "label:'彈無虛接'",
          "count": 1
        }
      ]
    },
    {
      "path": "public/games/fast-hands/levels-score-image.mjs",
      "baseGitBlob": "c9cd73874484e52f21ac6647281a1c226d22d461",
      "beforeSha256": "5ef76529d8ed67840479546c1a9f843db126e68e5a370b818579438f087e4d47",
      "sha256": "cefa04ef35a9cb918726b3c23b4239abddd0a74bc8aa7aad11d35f46dd789ea0",
      "replacements": [
        {
          "before": "玩具彈接接樂",
          "after": "彈無虛接",
          "count": 1
        },
        {
          "before": "十回合對決",
          "after": "快手對決",
          "count": 1
        }
      ]
    },
    {
      "path": "public/index.html",
      "baseGitBlob": "14e697466d81f0823b76c745b8c98a547f0ddab8",
      "beforeSha256": "7db788c0ebd2db12985b6c845f26a83f5d19dbd1092c1706d9b1be551eaf4524",
      "sha256": "738df15eb328c753d90c8bc4f88ba642c7cb8732995b8a758b634516c5998250",
      "replacements": [
        {
          "before": "玩具彈接接樂",
          "after": "彈無虛接",
          "count": 2
        },
        {
          "before": "十回合對決",
          "after": "快手對決",
          "count": 2
        }
      ]
    },
    {
      "path": "src/catalog.mjs",
      "baseGitBlob": "6ec06ccfb51e5c4d7fbd2d6be50519963b2e6496",
      "beforeSha256": "596cc724e7f8e906475ce4b9162f8a7b54654c8918985afee59b47de1f84573d",
      "sha256": "397d972da56b6ea458b83cc4ffda83cb97c3e774f912b4b696cdb216bc2f567b",
      "replacements": [
        {
          "before": "玩具彈接接樂",
          "after": "彈無虛接",
          "count": 1
        },
        {
          "before": "十回合對決",
          "after": "快手對決",
          "count": 1
        }
      ]
    }
  ]
});
export const NAME_REFRESH_PATHS=Object.freeze(EXPECTED.files.map(row=>row.path));

export function validateNameRefreshLedger(ledger){
 assert.deepEqual(ledger,EXPECTED,'Pinned name refresh manifest, inventory, replacements and digests');
 return ledger;
}
export const nameRefreshLedger=()=>validateNameRefreshLedger(JSON.parse(readFileSync(new URL('docs/fast-hands/NAME-REFRESH-MANIFEST.json',root),'utf8')));

function transform(row,bytes,reverse=false){
 let source=bytes.toString('utf8');
 const replacements=reverse?[...row.replacements].reverse():row.replacements;
 for(const replacement of replacements){
  const from=reverse?replacement.after:replacement.before,to=reverse?replacement.before:replacement.after;
  assert.equal(source.split(from).length-1,replacement.count,'Pinned name refresh replacement count '+row.path);
  source=source.replaceAll(from,to);
 }
 return Buffer.from(source,'utf8');
}
function validateParent(row,bytes){
 assert.equal(sha(bytes),row.beforeSha256,'Restored name refresh bytes '+row.path);
 assert.equal(blob(bytes),row.baseGitBlob,'Restored name refresh parent Git blob '+row.path);
 assert.equal(sha(transform(row,bytes)),row.sha256,'Pinned name refresh forward bytes '+row.path);
 return bytes;
}

/** Current-state gate: unlike historical reversal, stale parent bytes are rejected. */
export function assertNameRefreshCurrent(path,bytes,ledger=nameRefreshLedger()){
 validateNameRefreshLedger(ledger);
 const row=ledger.files.find(row=>row.path===path);
 assert.ok(row,'Unapproved name refresh path '+path);
 const current=Buffer.from(bytes);
 assert.equal(sha(current),row.sha256,'Name refresh current bytes '+path);
 const parent=validateParent(row,transform(row,current,true));
 assert.deepEqual(transform(row,parent),current,'Exact name refresh forward round trip '+path);
 return current;
}

/** Restore only the exact approved rename, retaining exact parent input for old layers. */
export function reverseNameRefresh(path,bytes,ledger=nameRefreshLedger()){
 validateNameRefreshLedger(ledger);
 const row=ledger.files.find(row=>row.path===path),current=Buffer.from(bytes);
 if(!row)return current;
 if(sha(current)===row.beforeSha256)return validateParent(row,current);
 assertNameRefreshCurrent(path,current,ledger);
 return validateParent(row,transform(row,current,true));
}
