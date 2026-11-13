// ../../shared/preview-gate-20261113/scripts/bundle-entry.mjs
import { readFileSync as readFileSync2 } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve as resolve2 } from "node:path";
import { createHash as createHash4 } from "node:crypto";

// ../../shared/preview-gate-20261113/scripts/preview-runner.mjs
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, lstatSync, readlinkSync } from "node:fs";
import { resolve } from "node:path";
import { createHash as createHash3 } from "node:crypto";

// ../../shared/preview-gate-20261113/scripts/preview-policy.mjs
import { createHash } from "node:crypto";
var validPath = (p) => typeof p === "string" && p.length > 0 && !p.startsWith("/") && !p.includes("\\") && !p.split("/").some((s) => s === ".." || s === "." || !s) && !/[\0\r\n]/.test(p);
function snapshotDigest(snapshot) {
  return createHash("sha256").update(JSON.stringify(Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b)))).digest("hex");
}
function planPreview(policy, current, { validatedMechanical = [] } = {}) {
  const hold = (reason) => ({ status: "hold", reason, tests: [] });
  if (policy?.reviewed !== true) return hold("The baseline and scope suite have not been reviewed.");
  const { baseline, scopes, guards } = policy;
  if (!baseline || !current || !Array.isArray(scopes) || !scopes.length || !Array.isArray(guards) || !guards.length) return hold("Incomplete policy.");
  const allPaths = [.../* @__PURE__ */ new Set([...Object.keys(baseline), ...Object.keys(current)])];
  if (allPaths.some((p) => !validPath(p))) return hold("Unsafe source path.");
  if (scopes.some((s) => !s.id || !validPath(s.prefix?.replace(/\/$/, "")) || !s.prefix.endsWith("/") || !Array.isArray(s.tests) || !s.tests.length)) return hold("Incomplete scope.");
  const allTests = [.../* @__PURE__ */ new Set([...guards, ...scopes.flatMap((s) => s.tests)])].sort();
  if (allTests.some((p) => !validPath(p) || !p.startsWith("tests/") || !p.endsWith(".test.mjs") || !baseline[p] || !current[p])) return hold("A mandatory test is absent.");
  const changed = allPaths.filter((p) => JSON.stringify(baseline[p]) !== JSON.stringify(current[p]));
  const affected = /* @__PURE__ */ new Set();
  for (const path of changed) {
    if (!baseline[path] || !current[path]) return hold(`Addition/deletion requires full review: ${path}`);
    if (baseline[path].mode !== "100644" || current[path].mode !== "100644") return hold(`Mode change requires full review: ${path}`);
    if (validatedMechanical.includes(path) && policy.mechanicalManifests?.[path]) continue;
    const matches = scopes.filter((s) => path.startsWith(s.prefix) && (!s.paths || s.paths.includes(path)));
    if (matches.length !== 1) return hold(`Shared or unknown impact requires full verification: ${path}`);
    affected.add(matches[0].id);
  }
  const selected = affected.size ? scopes.filter((s) => affected.has(s.id)) : scopes;
  return { status: "fast", changed, scopes: selected.map((s) => s.id), tests: [.../* @__PURE__ */ new Set([...guards, ...selected.flatMap((s) => s.tests)])].sort(), digest: snapshotDigest(current) };
}

// ../../shared/preview-gate-20261113/scripts/manifest-update.mjs
import { createHash as createHash2 } from "node:crypto";
var hash = (type, b) => createHash2(type).update(b).digest("hex");
var canonical = (x) => JSON.stringify(x && typeof x === "object" ? Array.isArray(x) ? x.map((v) => JSON.parse(canonical(v))) : Object.fromEntries(Object.keys(x).sort().map((k) => [k, JSON.parse(canonical(x[k]))])) : x);
function manifestShape(bytes, allowedPaths) {
  const m = JSON.parse(Buffer.from(bytes).toString()), allowed = new Set(allowedPaths), found = /* @__PURE__ */ new Set();
  if (!Array.isArray(m.files) || !Array.isArray(m.addedFiles)) throw Error("Invalid manifest records.");
  for (const record of [...m.files, ...m.addedFiles]) {
    if (typeof record.path !== "string" || found.has(record.path)) throw Error("Duplicate or invalid manifest path.");
    found.add(record.path);
    if (allowed.has(record.path)) {
      if (!/^[a-f0-9]{40}$/.test(record.gitBlob) || !/^[a-f0-9]{64}$/.test(record.sha256)) throw Error("Invalid after hash.");
      record.gitBlob = "<reviewed-after-blob>";
      record.sha256 = "<reviewed-after-sha256>";
    }
  }
  for (const p of allowed) if (!found.has(p)) throw Error("Reviewed runtime not in manifest.");
  return hash("sha256", canonical(m));
}
function verifyManifestUpdate(bytes, { shape, allowedPaths }, read) {
  if (manifestShape(bytes, allowedPaths) !== shape) throw Error("Manifest changes exceed after-hash updates.");
  const m = JSON.parse(Buffer.from(bytes).toString()), allowed = new Set(allowedPaths);
  for (const f of [...m.files, ...m.addedFiles].filter((f2) => allowed.has(f2.path))) {
    const b = Buffer.from(read(f.path));
    if (hash("sha1", Buffer.concat([Buffer.from(`blob ${b.length}\0`), b])) !== f.gitBlob || hash("sha256", b) !== f.sha256) throw Error("Manifest after hash does not match live runtime.");
  }
  return true;
}

// ../../shared/preview-gate-20261113/scripts/preview-runner.mjs
var git = (root, args, timeout = 3e5) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, timeout, killSignal: "SIGKILL" });
function snapshotTree(root, { deadline = Infinity } = {}) {
  const budget = () => {
    const ms = Math.min(3e5, deadline - performance.now());
    if (ms <= 0) throw Error("Verification time budget exhausted during source inventory.");
    return Math.max(1, Math.floor(ms));
  };
  const unexpected = git(root, ["ls-files", "--others", "--exclude=/node_modules/", "--exclude=/dist/", "-z"], budget()).split("\0").filter(Boolean).filter((p) => !p.startsWith("node_modules/") && !p.startsWith("dist/"));
  if (unexpected.length) throw Error(`Untracked source: ${unexpected.join(", ")}`);
  const out = /* @__PURE__ */ Object.create(null);
  for (const path of git(root, ["ls-files", "--cached", "-z"], budget()).split("\0").filter(Boolean)) {
    budget();
    let info;
    try {
      info = lstatSync(resolve(root, path));
    } catch (e) {
      if (e.code === "ENOENT") {
        out[path] = { missing: true };
        continue;
      }
      throw e;
    }
    if (!info.isFile() && !info.isSymbolicLink()) throw Error(`Unsupported source file type: ${path}`);
    if (info.size > 128 * 1024 * 1024) throw Error(`Source exceeds verification size limit: ${path}`);
    const bytes = info.isSymbolicLink() ? Buffer.from(readlinkSync(resolve(root, path))) : readFileSync(resolve(root, path));
    const sha = createHash3("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    out[path] = { sha, mode: info.isSymbolicLink() ? "120000" : info.mode & 73 ? "100755" : "100644" };
  }
  return out;
}
function runPreview(root, policy, { timeout = 3e5, externalPins = {} } = {}) {
  if (process.platform === "win32") throw Error("POSIX process-group timeout enforcement is required.");
  if (!Number.isFinite(timeout) || timeout <= 0) throw Error("Invalid verification time budget.");
  const deadline = performance.now() + timeout;
  const remaining = () => {
    const ms = deadline - performance.now();
    if (ms <= 0) throw Error("Verification time budget exhausted.");
    return Math.max(1, Math.floor(ms));
  };
  const fullStart = snapshotTree(root, { deadline }), fullDigest = snapshotDigest(fullStart), start = { ...fullStart }, validatedMechanical = [];
  if (JSON.stringify(Object.keys(externalPins).sort()) !== JSON.stringify([...policy.externalFiles || []].sort())) throw Error("Missing or unexpected external pin.");
  for (const path of policy.externalFiles || []) {
    if (policy.baseline[path] || start[path]?.mode !== "100644" || !/^[a-f0-9]{64}$/.test(externalPins[path] || "") || createHash3("sha256").update(readFileSync(resolve(root, path))).digest("hex") !== externalPins[path]) throw Error("Invalid external pin.");
    delete start[path];
  }
  for (const [path, rule] of Object.entries(policy.mechanicalManifests || {})) {
    if (!policy.baseline[path] || !start[path]) throw Error("Missing mechanical manifest.");
    if (JSON.stringify(policy.baseline[path]) !== JSON.stringify(start[path])) {
      verifyManifestUpdate(readFileSync(resolve(root, path)), rule, (p) => readFileSync(resolve(root, p)));
      validatedMechanical.push(path);
    }
  }
  const plan = planPreview(policy, start, { validatedMechanical });
  if (plan.status !== "fast") throw Error(`PREVIEW_HOLD: ${plan.reason}`);
  const verifyFrozen = () => {
    if (snapshotDigest(snapshotTree(root, { deadline })) !== fullDigest) throw Error("Source changed during verification. Discard output and rerun.");
  };
  const run = (bin, args) => {
    verifyFrozen();
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const p = spawnSync(bin, args, { cwd: root, stdio: "inherit", timeout: remaining(), killSignal: "SIGKILL", detached: true, env });
    if (p.pid) {
      try {
        process.kill(-p.pid, "SIGKILL");
      } catch (e) {
        if (e.code !== "ESRCH") throw e;
      }
    }
    if (p.error || p.status !== 0) throw Error(`Failed: ${bin} ${args.join(" ")} (${p.error?.message || p.status})`);
    verifyFrozen();
  };
  run(process.execPath, ["--test", ...plan.tests]);
  run("npm", ["run", "build"]);
  run(process.execPath, ["scripts/verify.mjs"]);
  run(process.execPath, ["scripts/check-release.mjs", "--expect=preview"]);
  remaining();
  return { ...plan, digest: fullDigest, verified: true, fullSuite: false };
}

// ../../shared/preview-gate-20261113/GENERATED-POLICY.json
var GENERATED_POLICY_default = {
  reviewed: true,
  repository: "jeiwu1020/playformosa",
  channel: "preview",
  parentCommit: "a5ee5ccc8eb7e8db7a866e461dec969272802f8a",
  parentTree: "39f3e0cdf95d11e8dbf0e39763ed607b6b086f44",
  externalFiles: [
    "scripts/preview-fast-gate.mjs"
  ],
  baseline: {
    ".gitignore": {
      sha: "53b9700cb1b47705e31c017cb6098f01f1bd4865",
      mode: "100644"
    },
    "APPLY-CANDIDATE.md": {
      sha: "e2ea1141edf813a3adf3733f4b878fe70b251323",
      mode: "100644"
    },
    "README.md": {
      sha: "0e7e61e9fab54b934cf72c20074078a200dba6fa",
      mode: "100644"
    },
    "config/catalog-channel.json": {
      sha: "cafd5e4a2404c86b25eb82633faa2e35a7cc70fc",
      mode: "100644"
    },
    "docs/GAME-UI-STANDARD.md": {
      sha: "ff51a9c137f4da7b03a0fc2fbcddc7840244f012",
      mode: "100644"
    },
    "docs/app-icons-completion/ART-SOURCES.json": {
      sha: "77095bed6eb67d73c8e04c2882677399c56f25de",
      mode: "100644"
    },
    "docs/app-icons-completion/BASELINE.json": {
      sha: "fc0a022d67dfe81231be5d30989fc877209785db",
      mode: "100644"
    },
    "docs/app-icons-completion/MANIFEST.json": {
      sha: "df17c8064e9c7d312ed60f40bd036ac36cb7a673",
      mode: "100644"
    },
    "docs/app-icons-completion/README.md": {
      sha: "e22fc3fe16037100d67e56476bfa2680bf381775",
      mode: "100644"
    },
    "docs/app-icons/ASSET-PROVENANCE.json": {
      sha: "8160bb28bbad5a811df5f1bb31a1a0d7ddedcb50",
      mode: "100644"
    },
    "docs/app-icons/INTEGRATION-MANIFEST.json": {
      sha: "1919bad42954b775a2f4188b275a292134d63763",
      mode: "100644"
    },
    "docs/app-icons/README.md": {
      sha: "457a46802c32e4bb1b9a3df6d512e8f7f5926a5d",
      mode: "100644"
    },
    "docs/audio/PROVENANCE.md": {
      sha: "4f8d2429257fb2bcb60f848a8b645e32ca01fb54",
      mode: "100644"
    },
    "docs/audio/QA-20261027.md": {
      sha: "924ded4bcf14877df76668bbcb4f38dd8c364ef2",
      mode: "100644"
    },
    "docs/audio/manifest.json": {
      sha: "da96712530b30e2e21d1388f3ee0824e1151b48e",
      mode: "100644"
    },
    "docs/audio/selected-manifest.json": {
      sha: "0cc18d088b5e273a231c05e851af24c62fa53fe6",
      mode: "100644"
    },
    "docs/audio/unified-audio-v1.md": {
      sha: "dc59174e5a45c3e18747d4b31c4b0839d955cfe8",
      mode: "100644"
    },
    "docs/batch1/INTEGRATION.md": {
      sha: "cfb33ca8ea6fac05127b4ec16bf38d9b8190797a",
      mode: "100644"
    },
    "docs/batch1/SOURCE-MANIFEST.json": {
      sha: "14dee6f9eacb6d1caeb848cba1978a9fa0872da4",
      mode: "100644"
    },
    "docs/batch2/INTEGRATION.md": {
      sha: "49d7a55295f2de7bfd91faea6773638b7dae03a3",
      mode: "100644"
    },
    "docs/batch2/SOURCE-MANIFEST.json": {
      sha: "0792368fdfd8e24e3d742d9951976b3897105eeb",
      mode: "100644"
    },
    "docs/cosmos/PROVENANCE.md": {
      sha: "172fb1586c8083c0b72db60c59b3456ed67a92a2",
      mode: "100644"
    },
    "docs/courtesy-contest/INTEGRATION-BASELINE.json": {
      sha: "3e6d0fd4bd84bc2c287fc0cddb7856abc317aa2f",
      mode: "100644"
    },
    "docs/courtesy-contest/INTEGRATION-MANIFEST.json": {
      sha: "04a04e970337b332ed21ab117387f8a4f37e333d",
      mode: "100644"
    },
    "docs/courtesy-contest/INTEGRATION.md": {
      sha: "af986ce3ba5b9d7ae38664ac49b5efca50fb842e",
      mode: "100644"
    },
    "docs/courtesy-contest/SOURCE-MANIFEST.json": {
      sha: "59d1f3a5bb147ada3b76706affecdcd454a179f4",
      mode: "100644"
    },
    "docs/courtesy-copy-preview/BASELINE.json": {
      sha: "a7a9593a292de02d6bf37103f25fed36376def03",
      mode: "100644"
    },
    "docs/courtesy-copy-preview/MANIFEST.json": {
      sha: "755ea857b13886799ea8972e61bc65cc47f73b1c",
      mode: "100644"
    },
    "docs/courtesy-platform-upgrade/BASELINE.json": {
      sha: "98802e387b5193a5eee9c4e8238695ce515c2da3",
      mode: "100644"
    },
    "docs/courtesy-platform-upgrade/MANIFEST.json": {
      sha: "229bbf27eec8e7f3157702ba92cccce15d58e949",
      mode: "100644"
    },
    "docs/courtesy-platform-upgrade/README.md": {
      sha: "2b773f784a8d715f728d89a7d859d8708200fcb4",
      mode: "100644"
    },
    "docs/courtesy-platform-upgrade/THUMBNAILS.json": {
      sha: "15b13f675be4ab564d04d01a7745515e26e72d65",
      mode: "100644"
    },
    "docs/courtesy-platform-upgrade/baseline-assets/run-1500m-card.png": {
      sha: "e83f6b38fc3226a13e39a326b3c07d058ad894cc",
      mode: "100644"
    },
    "docs/courtesy-platform-upgrade/baseline-assets/run-400m-card.png": {
      sha: "ec29f2d2b4a59ad0b7e5def7265993f2ae8af5e5",
      mode: "100644"
    },
    "docs/courtesy-platform-upgrade/regenerate.py": {
      sha: "0d77349bdc4b500c54ec11942cb6c17fde3c38c6",
      mode: "100644"
    },
    "docs/courtesy-result-mobile/BASELINE.json": {
      sha: "71e64bf0246d74f0c8a194915b3786a2981e0817",
      mode: "100644"
    },
    "docs/courtesy-result-mobile/MANIFEST.json": {
      sha: "c50ed4020464f627878974648036014a415944c0",
      mode: "100644"
    },
    "docs/courtesy-result-mobile/README.md": {
      sha: "60e9d003f24bf3451201b41454c663ac6314b22c",
      mode: "100644"
    },
    "docs/courtesy-result-mobile/regenerate.py": {
      sha: "b7c682ca4b5503b04d3cb51ca88b84eb3f8af6a2",
      mode: "100644"
    },
    "docs/courtesy-touch-coverage/MANIFEST.json": {
      sha: "04ba61e06647689b43d84b2aab779fe194868516",
      mode: "100644"
    },
    "docs/courtesy-touch-inventory-repair/BASELINE.json": {
      sha: "de187eb507d4e0f3d77a43536bb04c5e9aba2ff5",
      mode: "100644"
    },
    "docs/courtesy-touch-inventory-repair/MANIFEST.json": {
      sha: "b3785ef76c69e08ffc4c15f14908e127198617b8",
      mode: "100644"
    },
    "docs/courtesy-ui-polish/BASELINE.json": {
      sha: "f57804196a32bb488a40035048ac30780e01d773",
      mode: "100644"
    },
    "docs/courtesy-ui-polish/MANIFEST.json": {
      sha: "03b7e84a36aed04d0e2c6a1ae357aaaf5b895783",
      mode: "100644"
    },
    "docs/courtesy-ui-polish/README.md": {
      sha: "2ff1fa8ab6e2000e9314274bb8967f342afb61f8",
      mode: "100644"
    },
    "docs/courtesy-ui-polish/regenerate.py": {
      sha: "cc6a625c1a8d6b849639a62d28a563f8098fc6e3",
      mode: "100644"
    },
    "docs/dialog-layout/BASELINE.json": {
      sha: "c057919dbc654d44080d27df73463903de0fd9b8",
      mode: "100644"
    },
    "docs/dialog-layout/MANIFEST.json": {
      sha: "331637a68ce7d9c3477e81823e7cdac1e8496f9f",
      mode: "100644"
    },
    "docs/dialog-layout/REPAIR-BASELINE.json": {
      sha: "ecf2c376bb9460525e9718bd0e43f57bf5c8d5ca",
      mode: "100644"
    },
    "docs/dialog-layout/REPAIR-MANIFEST.json": {
      sha: "949ef00e30b97a73fe19b15382a9ff4d00a81b03",
      mode: "100644"
    },
    "docs/fast-hands/ART-POLISH-ASSETS.json": {
      sha: "68dfdf04714bc3c025d575effaafe4a1bde223ff",
      mode: "100644"
    },
    "docs/fast-hands/ART-POLISH-MANIFEST.json": {
      sha: "bb76103a99f3af2a289f855b4bdf5f8361476754",
      mode: "100644"
    },
    "docs/fast-hands/BUTTON-LAYOUT-MANIFEST.json": {
      sha: "51a5c1c29f8bfbb4756e93271b2b7ebe383b6f77",
      mode: "100644"
    },
    "docs/fast-hands/CHARACTER-APPEARANCE-MANIFEST.json": {
      sha: "cf0a0f22f26e8a4aff11e70a08b04a2b9b2be3ef",
      mode: "100644"
    },
    "docs/fast-hands/CLUB-MANIFEST.json": {
      sha: "65efca363c30fd911af7ee09ccfbc7f07af4a090",
      mode: "100644"
    },
    "docs/fast-hands/DESKTOP-MANIFEST.json": {
      sha: "6c3f8fd7eecfe162a48f9e860205cfd7e17ac6d3",
      mode: "100644"
    },
    "docs/fast-hands/DUEL-COVER-FINGERS-MANIFEST.json": {
      sha: "6e592ac5fce12c393ef99a5349dffe7370d8a024",
      mode: "100644"
    },
    "docs/fast-hands/ENTRY-MANIFEST.json": {
      sha: "88be807a880d4e790578960980e4828b21dbc7ee",
      mode: "100644"
    },
    "docs/fast-hands/FINALE-MANIFEST.json": {
      sha: "59d2e44a5dc991280d5b4985200920ff23341182",
      mode: "100644"
    },
    "docs/fast-hands/LAYOUT-DART-MANIFEST.json": {
      sha: "3354367f942f002f1c41e82846feaa4fc88c1f36",
      mode: "100644"
    },
    "docs/fast-hands/LEVELS-ART-MANIFEST.json": {
      sha: "5b8244262c5ab75b078d3c0e604f5ea631ba637a",
      mode: "100644"
    },
    "docs/fast-hands/LEVELS-MANIFEST.json": {
      sha: "18e1e0267092fccc76c2b7abc63692edbb1dbfc4",
      mode: "100644"
    },
    "docs/fast-hands/NAME-REFRESH-MANIFEST.json": {
      sha: "237394bb92852f65abbac198cf321c799e6c842a",
      mode: "100644"
    },
    "docs/fast-hands/NAME-REFRESH-RELEASE.md": {
      sha: "9c6e3d9c40411690c8c36ad99f9bd2116f5e9888",
      mode: "100644"
    },
    "docs/fast-hands/PLAY-COUNTS.md": {
      sha: "7e3726091a1584b945b84e6335745d5c462063db",
      mode: "100644"
    },
    "docs/fast-hands/QA-ART-POLISH.md": {
      sha: "5688248fc5e2923f3e1d4755742a3fee77a2f8ac",
      mode: "100644"
    },
    "docs/fast-hands/QA-CHARACTER-APPEARANCE.md": {
      sha: "b955b6491c71d41b7d2d90c25e261e8f000f2455",
      mode: "100644"
    },
    "docs/fast-hands/QA-DESKTOP.md": {
      sha: "612643354aff297b1e18fb982525b4c2dfd9aeb9",
      mode: "100644"
    },
    "docs/fast-hands/QA-ENTRY.md": {
      sha: "f273d3b17e8bb45b0cb95ca1d449a3c521348770",
      mode: "100644"
    },
    "docs/fast-hands/QA-FINALE.md": {
      sha: "0641b076c7b6f0e6663410e07be167e1710530b7",
      mode: "100644"
    },
    "docs/fast-hands/QA-LAYOUT-DART.md": {
      sha: "91610bec5b0f3a6075537a874628281065924f40",
      mode: "100644"
    },
    "docs/fast-hands/QA-LEADERBOARD-MANIFEST.json": {
      sha: "eb473c4cfb7a6ca976baf1e9fca61a398430500e",
      mode: "100644"
    },
    "docs/fast-hands/QA-LEADERBOARD-PLAN.md": {
      sha: "7def232b819e6846d87428f02b572c124b168e21",
      mode: "100644"
    },
    "docs/fast-hands/QA-LEVELS-ART.md": {
      sha: "966ec345a84222d44717881accd9cd532da96823",
      mode: "100644"
    },
    "docs/fast-hands/QA-LEVELS.md": {
      sha: "8f245e29996b6ea409ed8b693a13d0f944b7fb79",
      mode: "100644"
    },
    "docs/fast-hands/QA-REFINEMENT.md": {
      sha: "cec0c4342c5702cb34b63e2e9a6bd4a9fc653601",
      mode: "100644"
    },
    "docs/fast-hands/QA-SCREEN-ALPHA.md": {
      sha: "e485475340c9f64858ef3396e78f30b487dc21fb",
      mode: "100644"
    },
    "docs/fast-hands/QA-SHARING-FLOW.md": {
      sha: "430996186ed3a726bf0efe4a11a3a6338b5c8698",
      mode: "100644"
    },
    "docs/fast-hands/QA-SHARING.md": {
      sha: "143167788bf2ab4d4b9206275c65c429854240e0",
      mode: "100644"
    },
    "docs/fast-hands/QA-SPLIT-ENTRIES.md": {
      sha: "d3e9afdce35349a4011b5cef971d3121b842821c",
      mode: "100644"
    },
    "docs/fast-hands/QA-STABILITY.md": {
      sha: "325524f38642fd37875bd083865f64b43da51cb1",
      mode: "100644"
    },
    "docs/fast-hands/QA-UNIFIED.md": {
      sha: "f94a77dd47d99c9366a9d2d84cad981fb751c72a",
      mode: "100644"
    },
    "docs/fast-hands/QA.md": {
      sha: "a5646e1aed3d8df105816501694e3cbbafbb0de8",
      mode: "100644"
    },
    "docs/fast-hands/README.md": {
      sha: "426c79586d5306c34e698e121400783d648e1a62",
      mode: "100644"
    },
    "docs/fast-hands/RESULT-UPLOAD-MANIFEST.json": {
      sha: "9f7fc7483bd674a24051c57c96f334ae1908e3a0",
      mode: "100644"
    },
    "docs/fast-hands/RESULT-UPLOAD-QA.md": {
      sha: "5cf307af1e8e65abb28abd249a3e18623dc90c3f",
      mode: "100644"
    },
    "docs/fast-hands/SCREEN-ALPHA-MANIFEST.json": {
      sha: "57770219df59bf832f5402519e8afd2892a7df6d",
      mode: "100644"
    },
    "docs/fast-hands/SHARING-FLOW-MANIFEST.json": {
      sha: "e11840536548ed9dfe0b7bd4dadda71ea46aa2a3",
      mode: "100644"
    },
    "docs/fast-hands/SHARING-MANIFEST.json": {
      sha: "d1930cc83a3feb5f9e7844ff971cc21eb2b87ebd",
      mode: "100644"
    },
    "docs/fast-hands/SPLIT-ENTRIES-ASSETS.json": {
      sha: "2e8176dce313bbe19e81f34ccd492d44cbf9d195",
      mode: "100644"
    },
    "docs/fast-hands/SPLIT-ENTRIES-MANIFEST.json": {
      sha: "33fa0e316190a1d4273493f41a4719b6c0cab8fd",
      mode: "100644"
    },
    "docs/fast-hands/STABILITY-MANIFEST.json": {
      sha: "e6da1262b9002d629dc386715fe399fd8a43a3ab",
      mode: "100644"
    },
    "docs/fast-hands/UNIFIED-PLAN.md": {
      sha: "49885079dd18eb14c663f7a3958cf3291530b7f0",
      mode: "100644"
    },
    "docs/fast-hands/baselines/art-polish/public/games/fast-hands/catch.html": {
      sha: "5054ba34d47a62b4cf37c62fac547fe24869895d",
      mode: "100644"
    },
    "docs/fast-hands/baselines/art-polish/public/games/fast-hands/club.css": {
      sha: "93ba227b9acfcc3f91d3430210675985dc08ee84",
      mode: "100644"
    },
    "docs/fast-hands/baselines/art-polish/public/games/fast-hands/duel.html": {
      sha: "5ab47bc9ca74b74ffa479270f055dbb956e4e9fc",
      mode: "100644"
    },
    "docs/fast-hands/baselines/art-polish/public/games/fast-hands/finale-image.mjs": {
      sha: "0fccc0a42dc6587356174a7f80987833cfc98219",
      mode: "100644"
    },
    "docs/fast-hands/baselines/art-polish/public/games/fast-hands/finale.css": {
      sha: "370f5cf948a1a97bdfeb11e5e4c572ea50688d5a",
      mode: "100644"
    },
    "docs/fast-hands/baselines/art-polish/public/games/fast-hands/index.html": {
      sha: "0a8fb2acc0acbc824f21cd374845e8a9878e8e66",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/front-demo-poster.png": {
      sha: "63763baacb2d60dc03fb590aa28efa2cff67b9b4",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/front-demo.mp4": {
      sha: "4f0dd45dcfb5ebe46eb5eccf2b01363a0a4586c3",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-catch-empty-mid.png": {
      sha: "65027fc0feb379cad47baeb8ada25925c25d86f8",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-catch-grab.png": {
      sha: "c43ab22a080ed98008e33e8dc98e4efb6b301354",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-catch-guns.png": {
      sha: "fc52422098240f59de819cb21f3a86ccaecf46ce",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-catch-place.png": {
      sha: "a67e427d912b760ee509e726105ee6de8bf929dd",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-catch-reach.png": {
      sha: "4e4faaabe65567989abb78523e67d87d0894831d",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-catch-ready.png": {
      sha: "6a8b7f9a3f5ec6776bfc222aed46caafd69cd0ea",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-catch-return-mid.png": {
      sha: "78fd380a356b793587d2809922609290838b4363",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-catch-return.png": {
      sha: "d03d3895ddee3e65f4cf3217eb3168456598a46b",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-ai-grab.png": {
      sha: "dac5fee8cc5d0a85e33adcfbfad016fcf1432d79",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-ai-guns.png": {
      sha: "09d24b4c640acb3b7df7f65854d52eac6ea25072",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-ai-place.png": {
      sha: "f988eba4dcda2df8b73a02a52cc3683df2d981b3",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-ai-reach.png": {
      sha: "b70c948d2fd3613c2abc237b8a50df611f52865e",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-ai-return-mid.png": {
      sha: "5e01d93aeda9e8736bbdec1fd3fc1f7830395713",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-ai.png": {
      sha: "a21335dc312e235cb2f3a7a5d31b7336f89c0c79",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-neutral.png": {
      sha: "fac6f8dade259f5f9e26f63c78a1f5c6718125dd",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-player-grab.png": {
      sha: "b81ddecc06851ee45a95883e0e66c6dac01e453f",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-player-guns.png": {
      sha: "c7988b9b7be0c85c6920411e7ddcb3b1280d49c6",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-player-place.png": {
      sha: "02c6aab468a5ee4e4eac5ae588d661823ac38793",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-player-reach.png": {
      sha: "c8b1d7d2f8bf4f5134e6ffe93399837ad88e7500",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-player-return-mid.png": {
      sha: "3d7f68e6cdc31e6807d6410cc1af207523a267f8",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-player.png": {
      sha: "6a57fe36dfb2b116e3aa424e633cd5fb5bd4061b",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-duel-ready.png": {
      sha: "5a54960aa57f3607b0aa161a9b4980b23aa9ea47",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/assets/levels-pose-provenance.json": {
      sha: "3211bc2b31e60069697db5f1c665e897766da2eb",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/levels-world.mjs": {
      sha: "809c018d557e3ed39698f06e019cae8132ec99c1",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/three3d/rig.mjs": {
      sha: "91a4462e849ef1e76d9234c79412cb25213e4990",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/public/games/fast-hands/three3d/world.mjs": {
      sha: "95352ed884c193a7285f241633d09f78fe0ae42d",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/tests/fast-hands/eyes-3d.test.mjs": {
      sha: "8126c47169f4dd9eabb84a0ec428b9e301b6d7e3",
      mode: "100644"
    },
    "docs/fast-hands/baselines/character-appearance/tests/fast-hands/platform-integration.test.mjs": {
      sha: "8433078d926895e95638f3e7ebb9b19ee95ba853",
      mode: "100644"
    },
    "docs/fast-hands/baselines/club/index.html": {
      sha: "2b85a9ed2ad95f6ab97bdc33989382e52851273b",
      mode: "100644"
    },
    "docs/fast-hands/baselines/duel-cover-fingers/public/games/fast-hands/assets/intro-duel-generated.webp": {
      sha: "2e84ea583b5e758264fece8729d461bdcf4cda0c",
      mode: "100644"
    },
    "docs/fast-hands/baselines/duel-cover-fingers/tests/fast-hands/character-appearance-provenance.test.mjs": {
      sha: "0e7aaf0c4a72e60abe01d7d741540f9dc50b72f8",
      mode: "100644"
    },
    "docs/fast-hands/baselines/duel-cover-fingers/tests/helpers/fast-hands-character-appearance-provenance.mjs": {
      sha: "ee641ec1c83e9bcb464212521dce26ddd7e97188",
      mode: "100644"
    },
    "docs/fast-hands/baselines/feel-test-inventory/tests/reaction-rod/polish-provenance.test.mjs": {
      sha: "d025357619d40c5f2b4d0b35de97116faf7c44d7",
      mode: "100644"
    },
    "docs/fast-hands/baselines/feel-test-inventory/tests/reaction-rod/replay-provenance.test.mjs": {
      sha: "cfe42bf0924d5f1a5adaf8e7ad1e91d646d905ec",
      mode: "100644"
    },
    "docs/fast-hands/baselines/feel-test-layout/style.css": {
      sha: "662f90429e2a59b58927299dbb34fb099f11277e",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/app.mjs": {
      sha: "77bc01e9ab08adfab8455df048a0498e3930be53",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-catch-empty-mid.png": {
      sha: "d3dd1e9fa656d16cd3c8b363484cb80836125412",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-catch-grab.png": {
      sha: "a5f65effc919d0aadd8a77bd87fca649e6a46521",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-catch-reach.png": {
      sha: "253f14b6395a32b00254f20e34e386a8e08ccfe0",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-catch-ready.png": {
      sha: "5a080f2f80c776f022726b06fefcc2dec1d16868",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-catch-return-mid.png": {
      sha: "26c72b164f45f4aa2c168671d67afc4f48716d17",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-catch-return.png": {
      sha: "0d9ef67f6cfe45eb8509da82ae468cb672cbd98c",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-duel-ai-grab.png": {
      sha: "a74e564415413899ede1a31c60e05af1f9322c8d",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-duel-ai-reach.png": {
      sha: "bd45c206dc7fe7ff60df3b73c74cf888ef144129",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-duel-ai-return-mid.png": {
      sha: "c7d541b7828a3e63a5f1b70cb960ed793cce4109",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-duel-ai.png": {
      sha: "c06aae5cec4f8873e38a9c1c1d413b9b18415a0a",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-duel-player-grab.png": {
      sha: "28ffb90ad4b49a33e9a50febf0dfcdb6a2c46287",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-duel-player-reach.png": {
      sha: "19b385479bf8bf806767c4785a52e9e515408d82",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-duel-player-return-mid.png": {
      sha: "24495ff7dd574cf508f77c8d05c2b16b03c49799",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-duel-player.png": {
      sha: "8fdf38ea85d096084bb77c7a63dbd480569242e6",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-duel-ready.png": {
      sha: "6fdf13ff348b59ff822fded93a6e20c04a6b81d7",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/assets/levels-pose-provenance.json": {
      sha: "c726159bc3a7b30e2b88518225a82f0d89c958ae",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/catch.html": {
      sha: "31624ed5393e00fdb422109e9a4c8876dbeab550",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/duel.html": {
      sha: "12af46921c731056db25d400fa02f55bdf4ec02a",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/index.html": {
      sha: "8691fa624ee89e46db81384ebabfde4768b1ecd1",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/levels-app.mjs": {
      sha: "63f9b430e1df1cba90bfcf26f1d8e596e869e3d0",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/levels-motion.mjs": {
      sha: "ea4cf90f6307c23190dba5ed8e9ff533a8d2934b",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/public/games/fast-hands/levels-world.mjs": {
      sha: "c3c8aa690922df454571a2587348e5c52b441cef",
      mode: "100644"
    },
    "docs/fast-hands/baselines/finale/worker/leaderboard/index.mjs": {
      sha: "85ce1747a697568a4a9f33fde3d8976e51c09fb6",
      mode: "100644"
    },
    "docs/fast-hands/baselines/result-upload/public/games/fast-hands/app.mjs": {
      sha: "4973982ce1d32c243a81c347997968b666ace715",
      mode: "100644"
    },
    "docs/fast-hands/baselines/result-upload/public/games/fast-hands/catch.html": {
      sha: "035c7a00d5722e1e058159da21e7bf90729c891a",
      mode: "100644"
    },
    "docs/fast-hands/baselines/result-upload/public/games/fast-hands/club.css": {
      sha: "fd8541a674bce48fa0815722fccfc981cb217d80",
      mode: "100644"
    },
    "docs/fast-hands/baselines/result-upload/public/games/fast-hands/duel.html": {
      sha: "4e336cc5e3e5a0cacc6043bd5a9b34095b30afbf",
      mode: "100644"
    },
    "docs/fast-hands/baselines/result-upload/public/games/fast-hands/finale.css": {
      sha: "d99d8e731eeb9ecee3aaf1a474f35272c71bbfd1",
      mode: "100644"
    },
    "docs/fast-hands/baselines/result-upload/public/games/fast-hands/index.html": {
      sha: "9ea0f2c8f6a1e0478b680195ff33ff529b417a9a",
      mode: "100644"
    },
    "docs/fast-hands/baselines/result-upload/public/games/fast-hands/leaderboard.mjs": {
      sha: "2b33019d58cf72a249a7353a1566401c78c3025c",
      mode: "100644"
    },
    "docs/fast-hands/baselines/result-upload/public/games/fast-hands/levels-app.mjs": {
      sha: "52a24af6a5a99e66482d7efca30e740e526bc731",
      mode: "100644"
    },
    "docs/fast-hands/baselines/result-upload/public/games/fast-hands/levels-leaderboard.mjs": {
      sha: "9fedf535fa66a7e6962fe053da2fbdd7fc810dbd",
      mode: "100644"
    },
    "docs/fast-hands/baselines/screen-alpha/assets/duel-items-atlas.png": {
      sha: "5491d5280c2a2faeac41e9a19028698e9af015f8",
      mode: "100644"
    },
    "docs/fast-hands/baselines/screen-alpha/assets/levels-catch-grab.png": {
      sha: "74dce670c03a8e0be6295c8b4b9bfdc023a1e4be",
      mode: "100644"
    },
    "docs/fast-hands/baselines/screen-alpha/assets/levels-catch-ready.png": {
      sha: "66b2d977dca5c12fefeee7e340354e098b163f2e",
      mode: "100644"
    },
    "docs/fast-hands/baselines/sharing-flow/public/games/fast-hands/app.mjs": {
      sha: "11fec20b00107eba2219a3fbfcf9e19e60d3fb08",
      mode: "100644"
    },
    "docs/fast-hands/baselines/sharing-flow/public/games/fast-hands/catch.html": {
      sha: "fedb4185b35a9787e7d27fcd0077150ba6df259b",
      mode: "100644"
    },
    "docs/fast-hands/baselines/sharing-flow/public/games/fast-hands/club.css": {
      sha: "c7200e1ba7e2c3470982bf2815aa7ab7b56ff0d4",
      mode: "100644"
    },
    "docs/fast-hands/baselines/sharing-flow/public/games/fast-hands/club.mjs": {
      sha: "83855daab95d6fb929472960688a60cb4a7e6fb0",
      mode: "100644"
    },
    "docs/fast-hands/baselines/sharing-flow/public/games/fast-hands/duel.html": {
      sha: "f62e10a913d3cd2116c75b8c83fe9893fad8547d",
      mode: "100644"
    },
    "docs/fast-hands/baselines/sharing-flow/public/games/fast-hands/finale.css": {
      sha: "135b6d37dbd4d94cc2f650d6acadfee8cb7cdd69",
      mode: "100644"
    },
    "docs/fast-hands/baselines/sharing-flow/public/games/fast-hands/levels-app.mjs": {
      sha: "88d5504fd73ca69525f7199afd192798223ec136",
      mode: "100644"
    },
    "docs/fast-hands/baselines/sharing-flow/public/games/fast-hands/levels.css": {
      sha: "44a94698b63d1e17fd5056a16ca8adf14d95ab39",
      mode: "100644"
    },
    "docs/fast-hands/baselines/sharing-flow/public/games/fast-hands/share.mjs": {
      sha: "6121fffcb31e4c4edb5ce123395bf071724fad9b",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/games/fast-hands/app.mjs": {
      sha: "90d2c45187c6d95feebad0d2f12f4e3206ddc648",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/games/fast-hands/assets/intro-duel-generated.webp": {
      sha: "9ac60d7a0d174dcc22747d772c22de6ef05869bc",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/games/fast-hands/catch.html": {
      sha: "71d98491f55bfef1f3d129d52d607869b7abec9a",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/games/fast-hands/club.css": {
      sha: "3d3cb5388de353d927d9bcb30cb511cd07a7617b",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/games/fast-hands/club.mjs": {
      sha: "0f547da89a87593227056fe0a701ea4b63ca8607",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/games/fast-hands/duel.html": {
      sha: "6fc3897672d9f0576f779dd93cf18789b4492c93",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/games/fast-hands/index.html": {
      sha: "c05ae12abcedcd08f2c3399cd476e3244ef598bc",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/games/fast-hands/leaderboard.mjs": {
      sha: "bd50861b86cad3e49fdf9f156b1bbd1f663d1a36",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/games/fast-hands/levels-app.mjs": {
      sha: "eb758e705c9a519a06c42c9636a95e51798ea958",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/games/fast-hands/scene.mjs": {
      sha: "f0ae602f04aaf8f7aeaf95b56e25d6fbb8e0a35a",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/games/fast-hands/score-image.mjs": {
      sha: "01be82a3280b9e5c5f3c2824fa61106feb468ca6",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/games/fast-hands/share.mjs": {
      sha: "3b4324ff777a497781f8bc9ea24e227f579b0e67",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/games/fast-hands/three3d/stage.mjs": {
      sha: "9bff9d87a00e381294fb83a9eba80f9d9309abf5",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/public/index.html": {
      sha: "1dde60726b230b96fb87537567b43729e8363434",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/src/catalog.mjs": {
      sha: "ed9e927484f6f91493448df705bc3f8685f8581b",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/src/render.mjs": {
      sha: "1a4b48ce604b62d9207bc25e52748e579c308e20",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/tests/batch2-integration.test.mjs": {
      sha: "9c68deb844ee9f442c54bb9cd51fe8b72f36e6b3",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/worker/play-counts/index.mjs": {
      sha: "158b4479b24330a0b89145d14d1429da16711035",
      mode: "100644"
    },
    "docs/fast-hands/baselines/split-entries/worker/play-counts/repository.mjs": {
      sha: "74a0e72b176da92d2e705c2a29ccce5ccde2180e",
      mode: "100644"
    },
    "docs/fast-hands/baselines/stability/assets/levels-catch-grab.png": {
      sha: "6c94afc19963eceb1a2d6bb68aceb3d18d0e7056",
      mode: "100644"
    },
    "docs/fast-hands/baselines/stability/assets/levels-catch-ready.png": {
      sha: "7b58aa37bce9cc12b5bf32281ac3d608eb6419e8",
      mode: "100644"
    },
    "docs/fast-hands/baselines/stability/assets/levels-duel-ai.png": {
      sha: "12422984bef5eaecb5862006907f7078e5853a71",
      mode: "100644"
    },
    "docs/fast-hands/baselines/stability/assets/levels-duel-player.png": {
      sha: "5ab212814dff5b002c9bb8d292830485490c11d7",
      mode: "100644"
    },
    "docs/fast-hands/baselines/stability/assets/levels-duel-ready.png": {
      sha: "6fdf13ff348b59ff822fded93a6e20c04a6b81d7",
      mode: "100644"
    },
    "docs/fast-hands/baselines/stability/scripts/render-fast-hands-levels.mjs": {
      sha: "d7b7a5a0a82756ee48687dbc3594697a9b06b14f",
      mode: "100644"
    },
    "docs/fast-hands/import-manifest.json": {
      sha: "d82659a130ffaa9d89692c39a1933bf006bf77b0",
      mode: "100644"
    },
    "docs/fast-hands/platform-manifest.json": {
      sha: "adfa787a42547ed5072c0972c13d51171fb01d25",
      mode: "100644"
    },
    "docs/fast-hands/result-upload-qa/browser-geometry.json": {
      sha: "8ef21658c86f37ff9c9e8e260232bc0569bf4a18",
      mode: "100644"
    },
    "docs/fast-hands/result-upload-qa/intro-browser-geometry.json": {
      sha: "5444d4679990d5cd0c5af7d4f66beae3e5a9ebd7",
      mode: "100644"
    },
    "docs/fighter-entry-counts/BASELINE.json": {
      sha: "f43e1a4400d51d9685865a66f1d0f680409cd7f9",
      mode: "100644"
    },
    "docs/fighter-entry-counts/README.md": {
      sha: "df9b37b7e8297e605072cf61ec71ad0f6e291d82",
      mode: "100644"
    },
    "docs/fighter-entry-counts/SOURCE-MANIFEST.json": {
      sha: "bb111ca7bc87cb93f5bdf7915a35257e22628f08",
      mode: "100644"
    },
    "docs/high-jump/COMPACT-ENTRY-BASELINE.json": {
      sha: "68690a00cfc3a9bf53af65870582d5177c03a161",
      mode: "100644"
    },
    "docs/high-jump/COMPACT-ENTRY-MANIFEST.json": {
      sha: "2d7df3949f16e18f1771eced6fd20fd1345cbbd3",
      mode: "100644"
    },
    "docs/high-jump/COORDINATION-BASELINE.json": {
      sha: "fe0eba2dc28c67ee329fbd9e18819a20963b50d7",
      mode: "100644"
    },
    "docs/high-jump/COORDINATION-MANIFEST.json": {
      sha: "540258dc01e43b1955017bceef7f937ca4267b9f",
      mode: "100644"
    },
    "docs/high-jump/COORDINATION-VERIFICATION.md": {
      sha: "be96e7d5fc451525d484fcc08ac924286dc1c4e1",
      mode: "100644"
    },
    "docs/high-jump/RESULT-PREVIEW-BASELINE.json": {
      sha: "3ad14413005044c85dd80f8c0352daefdfa53683",
      mode: "100644"
    },
    "docs/high-jump/RESULT-PREVIEW-MANIFEST.json": {
      sha: "dcc974a859d5161ebb2ba553c25acbfc903bf115",
      mode: "100644"
    },
    "docs/history/long-jump-v7.md": {
      sha: "5b6f11ff4ba2015468c242e2ac8386f91cfa72d2",
      mode: "100644"
    },
    "docs/history/long-jump-v8-route.md": {
      sha: "fd4ef8a269b2813f367647728fd95918bd5cbe20",
      mode: "100644"
    },
    "docs/history/long-jump-v8.md": {
      sha: "72c36a73dfb26f2ea733d7c357856d1c1599de3b",
      mode: "100644"
    },
    "docs/history/v7-tests/README.md": {
      sha: "3853b6f7697ee4af38a6f9fa3e21e4340d5fc425",
      mode: "100644"
    },
    "docs/history/v7-tests/air-stride.test.mjs": {
      sha: "d3f868a24ee8dbcf2b2b748c318432a5e39b25b9",
      mode: "100644"
    },
    "docs/history/v7-tests/anatomy-flips.test.mjs": {
      sha: "ffc5b5f0ace3c2d8a895a8a72406a20a961d4834",
      mode: "100644"
    },
    "docs/history/v7-tests/controls-v06.test.mjs": {
      sha: "de65362f516cb0b4e6fdada60b4167638e2a1b4f",
      mode: "100644"
    },
    "docs/history/v7-tests/glides.test.mjs": {
      sha: "b7460b5f2435b97d5692f0363e2f11b688d9780a",
      mode: "100644"
    },
    "docs/history/v7-tests/intents-v06.test.mjs": {
      sha: "90a4b35c7123f26b04ad2fd15f4d5bf867ab99ac",
      mode: "100644"
    },
    "docs/history/v7-tests/landing-v7.test.mjs": {
      sha: "01411f5583665a179c6914e33cdee593ff4182e0",
      mode: "100644"
    },
    "docs/history/v7-tests/physics.test.mjs": {
      sha: "3b572bfab79bd49d1dc03530bfe4724e653f0aa0",
      mode: "100644"
    },
    "docs/history/v7-tests/readiness.test.mjs": {
      sha: "193cf0211eaaad88a6d59a190883710805bb4553",
      mode: "100644"
    },
    "docs/home-label/SOURCE-MANIFEST.json": {
      sha: "a00d2f602df2cfa06238b14f569ee559c0cd7c87",
      mode: "100644"
    },
    "docs/home-label/VERIFICATION.md": {
      sha: "dfaf91ad543b292d865441a867688cb1b1196d4c",
      mode: "100644"
    },
    "docs/hurdles/DESIGN.md": {
      sha: "bad6806fb817c4697ab17e76d99bf7802931c6a8",
      mode: "100644"
    },
    "docs/hurdles/INTEGRATION.md": {
      sha: "fff21f339552bf8d4bb06b8737ca852eeb62e19f",
      mode: "100644"
    },
    "docs/hurdles/PROVENANCE.md": {
      sha: "624bda98da95431f5aa8eddd7d66806103630383",
      mode: "100644"
    },
    "docs/hurdles/QA.md": {
      sha: "373038ded06a6cd4fc3b5e1bc795505f0316e0e6",
      mode: "100644"
    },
    "docs/hurdles/REPLAY.md": {
      sha: "85d7fadb50e8b151d23a9f49d7575703e642930e",
      mode: "100644"
    },
    "docs/hurdles/REVISION-1.1.md": {
      sha: "1775d0c0bfae749b036f8e34c68043eb6ae4b392",
      mode: "100644"
    },
    "docs/hurdles/REVISION-1.2.1.md": {
      sha: "97f8bd470da812e3187aecd7660e418e1cc8284b",
      mode: "100644"
    },
    "docs/hurdles/REVISION-1.3.md": {
      sha: "e4c95db7b29a670ee65b6eb3c9951d0c245e2599",
      mode: "100644"
    },
    "docs/hurdles/audio/PROVENANCE.md": {
      sha: "4f8d2429257fb2bcb60f848a8b645e32ca01fb54",
      mode: "100644"
    },
    "docs/hurdles/audio/historical-manifest.json": {
      sha: "da96712530b30e2e21d1388f3ee0824e1151b48e",
      mode: "100644"
    },
    "docs/hurdles/audio/latest-repo-verified.json": {
      sha: "426110f1bfd8847986ccccbefffe7e3bf546df37",
      mode: "100644"
    },
    "docs/hurdles/audio/selected-manifest.json": {
      sha: "0cc18d088b5e273a231c05e851af24c62fa53fe6",
      mode: "100644"
    },
    "docs/hurdles/qa/audio-decode.csv": {
      sha: "555690f57771c6e8b501c6706e26d182d87483e3",
      mode: "100644"
    },
    "docs/hurdles/qa/final-tests-v1.1.txt": {
      sha: "6f77181ae92278bdae0e241c2f17885c0d10e8db",
      mode: "100644"
    },
    "docs/hurdles/qa/final-tests-v1.2.1.txt": {
      sha: "dd1234e9d1c9b1864f961adcfcc89372efa6389b",
      mode: "100644"
    },
    "docs/hurdles/qa/final-tests-v1.2.txt": {
      sha: "22a57a04581941c508d322aa3d42162bb98e1947",
      mode: "100644"
    },
    "docs/hurdles/qa/final-tests-v1.3.txt": {
      sha: "6bb6aee34c29578458036316ecb7a38d7ea411b9",
      mode: "100644"
    },
    "docs/hurdles/qa/final-tests.txt": {
      sha: "ca974cc6a564950c30d7f2e21634016c61ecce57",
      mode: "100644"
    },
    "docs/hurdles/qa/matched-cadence-v1.1.json": {
      sha: "671c2952efc2664b9e38072809af85d152aee261",
      mode: "100644"
    },
    "docs/hurdles/qa/matched-cadence-v1.3.json": {
      sha: "5b26874c4e20132fc07438cb09643c562eee4203",
      mode: "100644"
    },
    "docs/hurdles/superpowers/plans/2026-10-28-eight-hurdle-flow.md": {
      sha: "09ddb8746035dd8528b20e43a3d19420b183b9a8",
      mode: "100644"
    },
    "docs/hurdles/superpowers/plans/2026-10-28-hurdles.md": {
      sha: "696f2839fa251db7fe2dabbbf370fd514b2e84a8",
      mode: "100644"
    },
    "docs/hurdles/superpowers/specs/2026-10-28-eight-hurdle-flow.md": {
      sha: "2ce23f342dfb22dbe5a312a2a7fa7081658138ca",
      mode: "100644"
    },
    "docs/hurdles/superpowers/specs/2026-10-28-result-touch-design.md": {
      sha: "4c762327aebf41159b6f7de8ad2b8dff1f5f3824",
      mode: "100644"
    },
    "docs/hurdles/upstream-README.md": {
      sha: "bcc19c4d43417d6c5128de1132156d667acbc4b2",
      mode: "100644"
    },
    "docs/hurdles/upstream-source-manifest.json": {
      sha: "0dbf8494b53f8bfeed006c7b9e0a4877a2b44e35",
      mode: "100644"
    },
    "docs/javelin/HUMOR-MANIFEST.json": {
      sha: "971b784ff2a153ffba348d06966f753d5c72448f",
      mode: "100644"
    },
    "docs/javelin/HUMOR-VERIFICATION.md": {
      sha: "10165b2d6887b51153ca9a1ea7c7e2f1e42fd7f0",
      mode: "100644"
    },
    "docs/javelin/RESULTS-MANIFEST.json": {
      sha: "a6830e227599913cf4394a69309f2fc40405929f",
      mode: "100644"
    },
    "docs/javelin/RESULTS-VERIFICATION.md": {
      sha: "9a15558efd5e8ae2cf4401f71d86a02b825ff8b2",
      mode: "100644"
    },
    "docs/landmark-art.md": {
      sha: "a0587bfe7e5e7e7a6d0d1e2ca05e988f56e40ea8",
      mode: "100644"
    },
    "docs/long-jump-physics.md": {
      sha: "e7b47d50ef646baf94421c667b960d236e86d005",
      mode: "100644"
    },
    "docs/long-jump.md": {
      sha: "15d911a42d331e03404a501cc3873b6d907650f1",
      mode: "100644"
    },
    "docs/minigames/INTEGRATION.md": {
      sha: "ef9f4f9ebc33bd5e9b1df6c43541693e55c5d6e0",
      mode: "100644"
    },
    "docs/minigames/LOADING-LOOK-MANIFEST.json": {
      sha: "b5979a66f70240bde7418f32cc9e85123c40ca28",
      mode: "100644"
    },
    "docs/minigames/REACTION-ROD-POLISH-MANIFEST.json": {
      sha: "7a89ac988210b5278d3a3cf0c1a7f42c85012ac9",
      mode: "100644"
    },
    "docs/minigames/REACTION-ROD-POLISH.md": {
      sha: "be9499d779c817da71cb5606ba6efb083d070d49",
      mode: "100644"
    },
    "docs/minigames/REACTION-ROD-REPLAY-MANIFEST.json": {
      sha: "c3eebb48240412dc0129664418f55db82078b079",
      mode: "100644"
    },
    "docs/minigames/REACTION-ROD-REPLAY.md": {
      sha: "0764f12ee0ee2ec77b195bdc39c0bf59ef648f75",
      mode: "100644"
    },
    "docs/minigames/REACTION-ROD-RESULT-MANIFEST.json": {
      sha: "c8bf34c17462425976bb2ff090b98392ed0e600b",
      mode: "100644"
    },
    "docs/minigames/REACTION-ROD-RESULT.md": {
      sha: "9099ee4bfc355fe2f778fc51712f0292416b3e6e",
      mode: "100644"
    },
    "docs/minigames/REACTION-ROD-VIEWPORT-MANIFEST.json": {
      sha: "44a8f045f7821a4ec090ca1a6744ed325268816e",
      mode: "100644"
    },
    "docs/minigames/REACTION-ROD-VIEWPORT.md": {
      sha: "e71e93b4cf4d01a843910a0a9b77f611d717da5e",
      mode: "100644"
    },
    "docs/minigames/SOURCE-MANIFEST.json": {
      sha: "3bbbd0ced733caa72c5386dc18ebe2fcb2383604",
      mode: "100644"
    },
    "docs/minigames/STARTUP-MANIFEST.json": {
      sha: "fdae46fe0664fef70e4a6807b68ff8739c234104",
      mode: "100644"
    },
    "docs/minigames/STUDIO-BRAND-MANIFEST.json": {
      sha: "44dfb67b6c26ce1e48f1acf6e17e04ec8cf02ff9",
      mode: "100644"
    },
    "docs/minigames/UI-STANDARD-MANIFEST.json": {
      sha: "e58e635ecda9ad2e70f630c39832f8c9df98f6df",
      mode: "100644"
    },
    "docs/mobile-gesture-page/BASELINE.json": {
      sha: "1060cf99924850e108685a1309ea91036dc631c6",
      mode: "100644"
    },
    "docs/mobile-gesture-page/MANIFEST.json": {
      sha: "1737ffdb8740abe4e21a8996071c13ba6243b3ab",
      mode: "100644"
    },
    "docs/mobile-gestures-preview/BASELINE.json": {
      sha: "cf4c4c034458c1591402d9e1582bd503aabf2766",
      mode: "100644"
    },
    "docs/mobile-gestures-preview/MANIFEST.json": {
      sha: "8d43848e7bf4eab95534ff30c5907875011533c5",
      mode: "100644"
    },
    "docs/mobile-gestures-preview/README.md": {
      sha: "8da76b342f5ace22519c7084acf0157198da592b",
      mode: "100644"
    },
    "docs/pinball-polish/BASELINE.json": {
      sha: "2cc1c3b30f118e83789cc0a39019520f86828e5a",
      mode: "100644"
    },
    "docs/pinball-polish/MANIFEST.json": {
      sha: "1d0c2297a20c34b1b8a78f40b9d8b90853b39f9f",
      mode: "100644"
    },
    "docs/pinball/BASELINE.json": {
      sha: "7ee671a951f0d736595964a8de55837002c94a5d",
      mode: "100644"
    },
    "docs/pinball/INTEGRATION-LEDGER.md": {
      sha: "6e9fc178dc9c991f28b4612ee261319ef94b50e5",
      mode: "100644"
    },
    "docs/pinball/ISOLATION-PREPARATION.md": {
      sha: "fc4bdd729b04cfc31c7536083dd5cd7dcccfa49e",
      mode: "100644"
    },
    "docs/pinball/MANIFEST.json": {
      sha: "97bb5178f5ba5a0f41facface951fb9749c4e109",
      mode: "100644"
    },
    "docs/pinball/PROVENANCE.md": {
      sha: "af5b09371bc803296b8cd0f7314ee1eff1c93538",
      mode: "100644"
    },
    "docs/pinball/frontend-integration.md": {
      sha: "fa546cca0b037a3a5de0d6bf9b2a9dfdf1ce695e",
      mode: "100644"
    },
    "docs/pinball/frontend-provenance.json": {
      sha: "e8521415c94e5b3ad7a1691625781ab332b2a6d2",
      mode: "100644"
    },
    "docs/plans/2026-10-25-approved-design.md": {
      sha: "7bc35adefdd55c3b2e3d3fb874b0872a55750c77",
      mode: "100644"
    },
    "docs/plans/2026-10-27-v8-implementation.md": {
      sha: "7ead56374493ce23a65f4ab1bda66c958e6402cb",
      mode: "100644"
    },
    "docs/player-help-cleanup/BASELINE.json": {
      sha: "878f6a31dc3c3859e020fd4c739488a9ef8e210d",
      mode: "100644"
    },
    "docs/player-help-cleanup/MANIFEST.json": {
      sha: "31822b4f5c9ef47973cfc92819991b894975b6cb",
      mode: "100644"
    },
    "docs/pole-vault/JOURNEY-MANIFEST.json": {
      sha: "d33124439a8a57c55790d9fb94e4563ec4eb4488",
      mode: "100644"
    },
    "docs/pole-vault/JOURNEY-VERIFICATION.md": {
      sha: "7de40073398b554c0e537530fe30619a8560af7c",
      mode: "100644"
    },
    "docs/pole-vault/PACE-MANIFEST.json": {
      sha: "391f27e778dafed264f3c3c2faea297b954c6c44",
      mode: "100644"
    },
    "docs/pole-vault/PACE-SIMULATION.json": {
      sha: "7b0277129848df4be838cbc4e25bc92fb8498190",
      mode: "100644"
    },
    "docs/pole-vault/SKY-MANIFEST.json": {
      sha: "8e39146c4200ddbf17341cce21afd201cc259ec4",
      mode: "100644"
    },
    "docs/pole-vault/SKY-VERIFICATION.md": {
      sha: "de92cfcf9103f3d95947e78c5aef1015ed61a44a",
      mode: "100644"
    },
    "docs/portal/RELEASE.md": {
      sha: "907dc4e24cad9a18ed3452fb064e52dacf072644",
      mode: "100644"
    },
    "docs/portal/sources/arcadeplatform.json": {
      sha: "b7011771995351a1a9e50bfe59a08a586263376d",
      mode: "100644"
    },
    "docs/portal/sources/echosboundary.json": {
      sha: "db4ba698c5e4718afb200ca265be1a442e9d5303",
      mode: "100644"
    },
    "docs/portal/sources/formosabattle.json": {
      sha: "f6b19e105ca6c6819dae4f623f8cc405f5a470cb",
      mode: "100644"
    },
    "docs/portal/sources/soul10power.json": {
      sha: "17ab0212a8791254ba17bc6b674f40e1c6576abf",
      mode: "100644"
    },
    "docs/portal/sources/taiwanfighter.json": {
      sha: "16de939d2adb8fd62de4f098e7f0de046576b231",
      mode: "100644"
    },
    "docs/portal/sources/taiwankart.json": {
      sha: "92ad78a26ef118b85d3b7217dbca82d88f86958d",
      mode: "100644"
    },
    "docs/preview-fast-gate/BASELINE.json": {
      sha: "7a6465575288e3eec249ceba723ed8d1b5cd4b06",
      mode: "100644"
    },
    "docs/preview-fast-gate/MANIFEST.json": {
      sha: "0000000000000000000000000000000000000000",
      mode: "100644"
    },
    "docs/preview-sports-counts/BASELINE.json": {
      sha: "af9381255c835b85d056118a379ac92734fc9cba",
      mode: "100644"
    },
    "docs/preview-sports-counts/MANIFEST.json": {
      sha: "db34e679976680675cf6dbe2a970ae4e702b45a7",
      mode: "100644"
    },
    "docs/run1500-tiers/BASELINE.json": {
      sha: "be94953025f67e3f08b54f3e682359065f9d56b4",
      mode: "100644"
    },
    "docs/run1500-tiers/MANIFEST.json": {
      sha: "3db4da954498cd087e50032742efcf5b29fcdf51",
      mode: "100644"
    },
    "docs/run1500-tiers/SIMULATION.json": {
      sha: "ceb10f57430312fd88e86d8104438caf6de04e34",
      mode: "100644"
    },
    "docs/run1500-tiers/VERIFICATION.md": {
      sha: "52f4786a61a25f293fefca851d65cc7c3b78ca26",
      mode: "100644"
    },
    "docs/run1500-variation/BASELINE.json": {
      sha: "53824d8a575439d2a4666238c1b6b07e741b81e2",
      mode: "100644"
    },
    "docs/run1500-variation/MANIFEST.json": {
      sha: "aa7692c0e55cc122ff05ffd69b6e98637a545db1",
      mode: "100644"
    },
    "docs/run1500-variation/SIMULATION.json": {
      sha: "0482166c5b55a8a775ffbd2ebd09079f1be1ac13",
      mode: "100644"
    },
    "docs/run1500-variation/VERIFICATION.md": {
      sha: "f057969369fabfe3d9e649886e03c6ecead808a2",
      mode: "100644"
    },
    "docs/runners/ART-PROVENANCE.json": {
      sha: "b662c8bb0e0f549c0b9737321f658dd6640068e9",
      mode: "100644"
    },
    "docs/runners/INTEGRATION-MANIFEST.json": {
      sha: "c0874f50582463359ce4b73765c51482d2c9b4cc",
      mode: "100644"
    },
    "docs/runners/INTEGRATION.md": {
      sha: "2f8c3a97bc4aad3300fdf2fcf5f5ea455f6fbf9a",
      mode: "100644"
    },
    "docs/runners/SOURCE-MANIFEST.json": {
      sha: "71c50fcb842713780f1c28ef51bac1721f4b9d92",
      mode: "100644"
    },
    "docs/runners/VISUAL-REVISION-MANIFEST.json": {
      sha: "901d9fac0f9f4f10002ff5734ad1033b854c0637",
      mode: "100644"
    },
    "docs/runners/VISUAL-REVISION.md": {
      sha: "ac20d80c36ef85b883efd95e2c393f06e5ac85b1",
      mode: "100644"
    },
    "docs/runners/implementation-plan.md": {
      sha: "33557f4a1eb1a50feb74ca04cb93b278f12acd22",
      mode: "100644"
    },
    "docs/sports-help/BASELINE.json": {
      sha: "bc09ea2b65e01a4baa0e0d2db729bbf245dd091a",
      mode: "100644"
    },
    "docs/sports-help/MANIFEST.json": {
      sha: "62b5744619000bee9b4a82f46d7fc16203784454",
      mode: "100644"
    },
    "docs/sports-results-portrait/BASELINE.json": {
      sha: "5072c7faa5b1dc2259d954d80612d1830816985e",
      mode: "100644"
    },
    "docs/sports-results-portrait/LAYOUT-BEFORE.json": {
      sha: "3dd8d10d15b5005a10d5be6dadb441046042a290",
      mode: "100644"
    },
    "docs/sports-results-portrait/LAYOUT.json": {
      sha: "45a5bd7241f6036a6441ec4d6ad4358db29c4952",
      mode: "100644"
    },
    "docs/sports-results-portrait/MANIFEST.json": {
      sha: "1e2400a49920b013b07d50d29a20e5a0792f0319",
      mode: "100644"
    },
    "docs/sports-results-portrait/MAP-LAYOUT-BEFORE.json": {
      sha: "79262c8b3b875bc8bf00967c91940595dabf0901",
      mode: "100644"
    },
    "docs/sports-results-portrait/MAP-LAYOUT.json": {
      sha: "d23b20d4c8754a6ffab3728b5f27461de02413fd",
      mode: "100644"
    },
    "docs/sports-results-portrait/MAP-START-SIGNAL-BEFORE.json": {
      sha: "99dcdf7a3c71bfc46fb0cc11dd40e657df426b57",
      mode: "100644"
    },
    "docs/sports-results-portrait/MAP-START-SIGNAL.json": {
      sha: "e3bbbfa1af8432b0e1e9cbe6b65c9bf8c0c7b8d5",
      mode: "100644"
    },
    "docs/sports-results-portrait/VERIFICATION.md": {
      sha: "175d8c7873e481c910a164379865536e0e431a16",
      mode: "100644"
    },
    "docs/sports-results-portrait/sports-results-portrait-context.patch": {
      sha: "cb5f2badf528aa5b829d1986394af0e7f3c048bb",
      mode: "100644"
    },
    "docs/sports-results-portrait/sports-results-portrait.patch": {
      sha: "958f38f416bfbf75939814cca6845483e5c4c903",
      mode: "100644"
    },
    "docs/sprint-100m/FALL-MANIFEST.json": {
      sha: "7e0effc90f2610c31107022c1d2d27d26e42ad7c",
      mode: "100644"
    },
    "docs/sprint-100m/FALL-VERIFICATION.md": {
      sha: "d5161a9421ccc8dd38162ac6a2ddaac54c4265e3",
      mode: "100644"
    },
    "docs/sprint-javelin-preview-integration.md": {
      sha: "c9e2a0db4746b0aba658c03602305df9398d8463",
      mode: "100644"
    },
    "docs/sprint-rival-tiers/BASELINE.json": {
      sha: "29f7a9cdb8aa2545ca171e4828c02e147a68d83c",
      mode: "100644"
    },
    "docs/sprint-rival-tiers/MANIFEST.json": {
      sha: "31e40bc0ff3034e255fac6729f3473e48d203ad4",
      mode: "100644"
    },
    "docs/sprint-rival-tiers/SIMULATION.json": {
      sha: "f3a957452efebce84005e8b8772d72ac27d519b8",
      mode: "100644"
    },
    "docs/sprint-rival-tiers/VERIFICATION.md": {
      sha: "1a311efb20da9fc1efcf0ba45632fe364dc874cb",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-10-27-adventure-route.md": {
      sha: "a6feab0f85eb0dbdbdf20d53f2ace9fdc8b81417",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-10-27-jump-polish.md": {
      sha: "c6a2c2e2c0e717ac68add7bc02816e0a6e0c7499",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-10-27-landmark-polish.md": {
      sha: "20a4e9d22f83957405b94694983fc1c33efa23db",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-10-28-cosmic-journey.md": {
      sha: "d45fa7318dd35ee715a13c1892d46bf4ffe5b1fb",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-10-28-current-visual-sandpits.md": {
      sha: "8f79df8dd932035aa755a6c510d1452b94914ed4",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-10-28-hurdles-preview.md": {
      sha: "3af356b5254ce20c54fa70d166f8d92b50ca890b",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-10-28-platform-game-ui.md": {
      sha: "f6c6f31f0f740322baf5b5d2c566f150ecc5f4ef",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-10-31-landing-replay.md": {
      sha: "3488c01148a6164cd9be052623d0291a0ffbc778",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-01-game-ui-harmonization.md": {
      sha: "6dac150d264774e91dffa671447cb4a03afbcbab",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-02-home-views.md": {
      sha: "213872babba841bf24d66336f9e59e16166cd7be",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-02-honor-board.md": {
      sha: "abdb4d3e40aedaafb5f74a761afc851a5dc3f34a",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-02-leaderboard.md": {
      sha: "ce8d5026482f54f15219e133cd4968580613389e",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-02-mobile-budget.md": {
      sha: "aced567783f6ced443832c7ced6a6b991b167ffe",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-02-nine-casual-boards.md": {
      sha: "0211457480f199346076aa5040336fd46e06590c",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-02-play-counts.md": {
      sha: "5fd9b7983cf31900404c8fdcd6c871bdb4f06c29",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-02-portal-catalog.md": {
      sha: "de4b29a6f42085e02ed3e55faaa89a60e6fa4c47",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-02-ranking-refinement.md": {
      sha: "ebfd09488ca501cc585eb2b99820e0f0f51ce452",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-02-shared-entry-controls.md": {
      sha: "693bcce7d9265d975387ef223796bfad1a5e2e15",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-02-unified-game-audio.md": {
      sha: "7096cc2c05cfa275b9efc2785e1e4fe7c3b1d0e8",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-02-unified-help.md": {
      sha: "3a5ba1efe93436f0f23d13cc8d35ee3361c65961",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-02-v2-game-menus.md": {
      sha: "21f3b61eca648d5dc9b580cfed2ecd272db75dae",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-03-reaction-rod-replay.md": {
      sha: "61678d19f5fbc7e2aa7068bd7c8096ab1c56d208",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-03-reaction-rod-result-polish.md": {
      sha: "d52aca3ccd3ee94581158181ec9c6c9beed4cc43",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-03-reaction-rod-result.md": {
      sha: "9058858fd589b90c02d9eb3585a6fc1070f6b6eb",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-04-fast-hands-art-polish.md": {
      sha: "5eb7fa0365edf0ffaa9f665857e9ad794b516238",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-04-fast-hands-finale.md": {
      sha: "9ffcf5e40ec08f27749b6262b4072576bcd06761",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-04-fast-hands-result-upload.md": {
      sha: "ca78f72a7311899121bc029151bd197f2001b306",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-04-fast-hands-sharing-flow.md": {
      sha: "70344ec47b74eb349fc3c03d0e97a8d4a1cc3281",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-04-fast-hands-split-entries.md": {
      sha: "50f5e1d3c53de59a827fb2bf53e30e69133c5129",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-05-vault-journey-stages.md": {
      sha: "6c598207535da01a3678c3a383d7054b2bacc138",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-05-vault-sky.md": {
      sha: "fbc16b475e79636df605f80ca323f71108115b1c",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-06-runner-hair-arm.md": {
      sha: "6db9ad0be18ed5ab51efdc6e89ad99c91e3b9ed2",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-06-vault-paced-ascent.md": {
      sha: "73bfc711e06d230fd916552997ec208f5e625659",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-07-high-jump-compact-entry.md": {
      sha: "b2439017cdaba18e4b7d8e09301537338233d5d5",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-07-high-jump-coordination.md": {
      sha: "632169d9ae5dba4e4e3cb43eb715ed1e26c24bb6",
      mode: "100644"
    },
    "docs/superpowers/plans/2026-11-12-pinball-platform-isolation.md": {
      sha: "5f74578a5b15cc112490089211b950670244a6e4",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-10-27-adventure-route-design.md": {
      sha: "50101290e39ef6b783009e9e01cb64072bbf0ad4",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-10-27-landmark-polish.md": {
      sha: "9646c18ae8039f249bc74cdb3354741a89b7f55e",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-10-28-cosmic-journey.md": {
      sha: "44fd4dfc3c03a53a919d52ee3e74d6747c035ed1",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-10-28-platform-game-ui-design.md": {
      sha: "a5df6a8a815061383c4c7c0844a5661ef0b349fe",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-10-28-visual-sandpits-design.md": {
      sha: "bc44e0752e896475d3a5cd89052a96584c5fe636",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-01-game-ui-harmonization.md": {
      sha: "bc987b9b8f66c584b84951670ace43a110bbb9d5",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-02-home-views-design.md": {
      sha: "d872afca7e40868a9be775a531fc026ae9b98847",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-02-play-counts-design.md": {
      sha: "d4ca6bea64b306551f608f6ff226b72ede332bb5",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-02-portal-catalog.md": {
      sha: "c1780eb459cd5cffea430f7a32e20eb759ac8e21",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-02-shared-entry-controls-design.md": {
      sha: "39c8650f98fea563500752ca27d73a62cd0db9f7",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-02-v2-game-menus.md": {
      sha: "46792fb754d0360f90c726cf5ea5342c5e94b278",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-04-fast-hands-art-polish-design.md": {
      sha: "582883fe8c9007ef90af95e2628a2ad3b831e159",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-04-fast-hands-result-upload-design.md": {
      sha: "6d8b0cbd952e6e2c1ab82047a5261dd09ca40d2b",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-04-fast-hands-sharing-flow-design.md": {
      sha: "1e4c76911a0db3e5345d7c8c526432697dedaae3",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-04-fast-hands-split-entries-design.md": {
      sha: "fc740c4dc90f2cb0b7c92686f4a3cbe663a722fb",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-05-vault-journey-stages-design.md": {
      sha: "5f56f668d3f20ae67a4b30fba9fe1c409cc562fe",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-05-vault-sky-design.md": {
      sha: "d819c97478a9891f5237cb0a8211dd5211686ad3",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-06-runner-hair-arm-design.md": {
      sha: "f22a5568fe23b6a58485fe99c064fca100f8ba86",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-06-vault-paced-ascent-design.md": {
      sha: "a2bb08e15bab94d6b52099febf4d943cb4bbc099",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-07-high-jump-compact-entry-design.md": {
      sha: "f37bc6063662205113fcc98c2e0e0e688d598e15",
      mode: "100644"
    },
    "docs/superpowers/specs/2026-11-07-high-jump-coordination.md": {
      sha: "43bf98ee3afc12f1f4fa725a8e3bfd92d9409fd2",
      mode: "100644"
    },
    "docs/upload-toolbar-polish/README.md": {
      sha: "2ad7d9962302d67631e3bf5a2760966d8451828a",
      mode: "100644"
    },
    "docs/upload-toolbar-polish/SOURCE-MANIFEST.json": {
      sha: "4d794a8f3cb7a2b48a81375bef71ee73f17e334d",
      mode: "100644"
    },
    "docs/v2-boards/CONTRACT.md": {
      sha: "4becdd7d70deae2be0ad4a9b839a4ea9a2f86e7c",
      mode: "100644"
    },
    "docs/vault-air-balance/BASELINE.json": {
      sha: "e9154a936d4d89ddfc6290d1dfe7bdc53cee6016",
      mode: "100644"
    },
    "docs/vault-air-balance/MANIFEST.json": {
      sha: "bff76ef4d836a5ad4863e848b014aec2d0e0aefe",
      mode: "100644"
    },
    "docs/vault-air-coordination/BASELINE.json": {
      sha: "8710c10a882b6ad0d5790a48e090faf5ef53c739",
      mode: "100644"
    },
    "docs/vault-air-coordination/MANIFEST.json": {
      sha: "0e1ec13854a3860f20d70ead205493aaa91dea86",
      mode: "100644"
    },
    "docs/vault-coordination-merge/BASELINE.json": {
      sha: "1bab4a79cf697ad65ae6db23cf6dc995196f6a63",
      mode: "100644"
    },
    "docs/vault-coordination-merge/MANIFEST.json": {
      sha: "ddf2bc72945d871ea04eb01fc7ee6adc0b1b6f67",
      mode: "100644"
    },
    "docs/verification.md": {
      sha: "a838cda265f5cad171cd59c97808bff93f2ddde4",
      mode: "100644"
    },
    "evidence/fast-hands/browser-checks.json": {
      sha: "0d3eeaa658efafecb18484667886a1fc84f84d57",
      mode: "100644"
    },
    "evidence/platform-ui/BROWSER-BLOCKED.md": {
      sha: "3d0d8380945df961fd732b969535d30422cc502d",
      mode: "100644"
    },
    "evidence/platform-ui/VERIFICATION.md": {
      sha: "f329f5c4268d610f66b677d29800d216a8db8ff3",
      mode: "100644"
    },
    "evidence/platform-ui/node-check.log": {
      sha: "96443687b7c4a94b9bdfc25a438c7194c9492b64",
      mode: "100644"
    },
    "package-lock.json": {
      sha: "43b33b3f476dc41f0d158b66aef7d3310c47c037",
      mode: "100644"
    },
    "package.json": {
      sha: "9a29d61f4051e350c8e4f833bc8a7139a88d9064",
      mode: "100644"
    },
    "public/assets/app-icons/beer-slide/apple-touch-icon.png": {
      sha: "53006898fe3950ad5976bec410e9c79f8f1d1d04",
      mode: "100644"
    },
    "public/assets/app-icons/beer-slide/favicon-32.png": {
      sha: "66794c11c2204a9d1e01ab43cc9b2e598b9d40a2",
      mode: "100644"
    },
    "public/assets/app-icons/beer-slide/favicon-48.png": {
      sha: "26f3d89999f38de317b4dfd875ae8db591c7b806",
      mode: "100644"
    },
    "public/assets/app-icons/beer-slide/icon-192.png": {
      sha: "41f4edf9c3b89c9180f2b6f0b7f315bca735ce5e",
      mode: "100644"
    },
    "public/assets/app-icons/beer-slide/icon-512.png": {
      sha: "d16fd303120ef263ee72b0e17f05e86c4ac1cbe6",
      mode: "100644"
    },
    "public/assets/app-icons/beer-slide/icon-maskable-512.png": {
      sha: "d16fd303120ef263ee72b0e17f05e86c4ac1cbe6",
      mode: "100644"
    },
    "public/assets/app-icons/courtesy-contest/apple-touch-icon.png": {
      sha: "bef233024063e92b583764f74e2bc3044dd99fcd",
      mode: "100644"
    },
    "public/assets/app-icons/courtesy-contest/favicon-32.png": {
      sha: "f1329375da2f2b1d435770124f36481d2b2867e2",
      mode: "100644"
    },
    "public/assets/app-icons/courtesy-contest/favicon-48.png": {
      sha: "3c06a70b63bffbcc4a568245b7703237d6af7f38",
      mode: "100644"
    },
    "public/assets/app-icons/courtesy-contest/icon-192.png": {
      sha: "8aceb7fa3e440bb6aaad949abdcf044763391b4a",
      mode: "100644"
    },
    "public/assets/app-icons/courtesy-contest/icon-512.png": {
      sha: "65484dd2760aeb2b4b70fbfee7db365d95c88ab1",
      mode: "100644"
    },
    "public/assets/app-icons/courtesy-contest/icon-maskable-512.png": {
      sha: "65484dd2760aeb2b4b70fbfee7db365d95c88ab1",
      mode: "100644"
    },
    "public/assets/app-icons/discus/apple-touch-icon.png": {
      sha: "add902c90031431a02732e5328675b0b545f76aa",
      mode: "100644"
    },
    "public/assets/app-icons/discus/favicon-32.png": {
      sha: "e26c1545ddc6328c2f98c2bfebcc91b3b05407e2",
      mode: "100644"
    },
    "public/assets/app-icons/discus/favicon-48.png": {
      sha: "dc6c0b4a9b14d776f476f1700a61bb7c382e7b51",
      mode: "100644"
    },
    "public/assets/app-icons/discus/icon-192.png": {
      sha: "687d3ab5c7dc1f89544c76a651649cc6bf704fa4",
      mode: "100644"
    },
    "public/assets/app-icons/discus/icon-512.png": {
      sha: "c1bb83f89ac16c6f5163b5506d9a3db6c5918e5b",
      mode: "100644"
    },
    "public/assets/app-icons/discus/icon-maskable-512.png": {
      sha: "c1bb83f89ac16c6f5163b5506d9a3db6c5918e5b",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands-catch/apple-touch-icon.png": {
      sha: "6e58fd8da2f2b0f1a3e1bee4dbe49a40c9630e2d",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands-catch/favicon-32.png": {
      sha: "12a42e1f5e52b44ffe4d9a7ea20d78b5c5608620",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands-catch/favicon-48.png": {
      sha: "609800ade1e481ce874b91ece672997f9f3f9078",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands-catch/icon-192.png": {
      sha: "fc383acb30d3b419c3f659e457dffd7b753c8701",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands-catch/icon-512.png": {
      sha: "86510ca08d0e053ab94d8db36cbb40d7235b5334",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands-catch/icon-maskable-512.png": {
      sha: "86510ca08d0e053ab94d8db36cbb40d7235b5334",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands-duel/apple-touch-icon.png": {
      sha: "f09d73f815a3f2ff0934f7de0daebd52f827836c",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands-duel/favicon-32.png": {
      sha: "4fb6add7e3c9b24e11ffade7e38a7adf8f7ff04d",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands-duel/favicon-48.png": {
      sha: "2b3d8b093c0b429970426cd8b4282ff9fafab96b",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands-duel/icon-192.png": {
      sha: "1dc8f1ff49c9eb48d65d65cc3ce6622187ab606b",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands-duel/icon-512.png": {
      sha: "4dfbf897bdd1501407306a0a82036e6144eccc8b",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands-duel/icon-maskable-512.png": {
      sha: "4dfbf897bdd1501407306a0a82036e6144eccc8b",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands/apple-touch-icon.png": {
      sha: "d3317d47556aed5d08519f86f2c9fce57ac9e73a",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands/favicon-32.png": {
      sha: "04683b15370216a13d15384759ad5f4b633432ba",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands/favicon-48.png": {
      sha: "bd94a138b5d9aee74acc122d3ce30286e83914d3",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands/icon-192.png": {
      sha: "04c4842b415775e694893c2265f01ad5cea54e39",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands/icon-512.png": {
      sha: "f9627233e745088e9849657b327a9ca33b0eb916",
      mode: "100644"
    },
    "public/assets/app-icons/fast-hands/icon-maskable-512.png": {
      sha: "f9627233e745088e9849657b327a9ca33b0eb916",
      mode: "100644"
    },
    "public/assets/app-icons/high-jump/apple-touch-icon.png": {
      sha: "ccfa9729307faa95da3aae85fded2e6ac55f3eec",
      mode: "100644"
    },
    "public/assets/app-icons/high-jump/favicon-32.png": {
      sha: "e06851e7914b307cebca6c0bfd655106ba68b337",
      mode: "100644"
    },
    "public/assets/app-icons/high-jump/favicon-48.png": {
      sha: "d46ca3d04a1f9022fa450e7c31d7c30edb6e53ec",
      mode: "100644"
    },
    "public/assets/app-icons/high-jump/icon-192.png": {
      sha: "0cb6e702d79894a48cecb2f585e1115e6720af72",
      mode: "100644"
    },
    "public/assets/app-icons/high-jump/icon-512.png": {
      sha: "ebd7be464a8a7ea28c963aeea2409c2208d64be6",
      mode: "100644"
    },
    "public/assets/app-icons/high-jump/icon-maskable-512.png": {
      sha: "135710da7d5f8a3afa15e8a66ad338fdfa2aef54",
      mode: "100644"
    },
    "public/assets/app-icons/hurdles/apple-touch-icon.png": {
      sha: "1925e531295289eeb930d89c08fda13eed1c81e0",
      mode: "100644"
    },
    "public/assets/app-icons/hurdles/favicon-32.png": {
      sha: "e5f5573e097a9b461482f1f78f5dc90ef2fc0f1e",
      mode: "100644"
    },
    "public/assets/app-icons/hurdles/favicon-48.png": {
      sha: "2d84fc504212446ab3c5df1f00593ec78142ea39",
      mode: "100644"
    },
    "public/assets/app-icons/hurdles/icon-192.png": {
      sha: "a711bf06b5ddd05a5d4584b1da0c625e8130492d",
      mode: "100644"
    },
    "public/assets/app-icons/hurdles/icon-512.png": {
      sha: "57918aea81959f435abf558877bcd9f9d4e2461d",
      mode: "100644"
    },
    "public/assets/app-icons/hurdles/icon-maskable-512.png": {
      sha: "57918aea81959f435abf558877bcd9f9d4e2461d",
      mode: "100644"
    },
    "public/assets/app-icons/javelin/apple-touch-icon-v2.png": {
      sha: "215d86f382d7b785f806a21ca08c7d19566c97ff",
      mode: "100644"
    },
    "public/assets/app-icons/javelin/apple-touch-icon.png": {
      sha: "bee7e41c03e74cb65a2cffc9abc84f28ff6af12a",
      mode: "100644"
    },
    "public/assets/app-icons/javelin/favicon-32.png": {
      sha: "038c64653b8532a85890d2523b25ccd8431fcd30",
      mode: "100644"
    },
    "public/assets/app-icons/javelin/favicon-48.png": {
      sha: "51ed760ef449480abbb79b33e809fe08956889ee",
      mode: "100644"
    },
    "public/assets/app-icons/javelin/icon-192.png": {
      sha: "6ce7f7dfee96c652fc60d04a4ff4853ae6d44068",
      mode: "100644"
    },
    "public/assets/app-icons/javelin/icon-512.png": {
      sha: "1a69cbb777dae4452deb70ef3f9c454aa2a1a64f",
      mode: "100644"
    },
    "public/assets/app-icons/javelin/icon-maskable-512.png": {
      sha: "1a69cbb777dae4452deb70ef3f9c454aa2a1a64f",
      mode: "100644"
    },
    "public/assets/app-icons/long-jump/apple-touch-icon.png": {
      sha: "6fd4c6232959e7e29c11fa20134bde1b589cf440",
      mode: "100644"
    },
    "public/assets/app-icons/long-jump/favicon-32.png": {
      sha: "ef945c4a18164c7ca40d692a88d3942257b4d6a7",
      mode: "100644"
    },
    "public/assets/app-icons/long-jump/favicon-48.png": {
      sha: "a571ee42abffa13cb4d635b42d2dfa72b73e7c5c",
      mode: "100644"
    },
    "public/assets/app-icons/long-jump/icon-192.png": {
      sha: "ca7cfb984d41af6cd446941ac8820c7931070772",
      mode: "100644"
    },
    "public/assets/app-icons/long-jump/icon-512.png": {
      sha: "c0739019cda5c544caa39793142ae6740a6dcfaf",
      mode: "100644"
    },
    "public/assets/app-icons/long-jump/icon-maskable-512.png": {
      sha: "c0739019cda5c544caa39793142ae6740a6dcfaf",
      mode: "100644"
    },
    "public/assets/app-icons/platform/apple-touch-icon.png": {
      sha: "8672db4ed34ccf1f27010362ea1e64897e6068bf",
      mode: "100644"
    },
    "public/assets/app-icons/platform/favicon-32.png": {
      sha: "279b02dfac70a4c0ffa8049ee846169b4cbe93f0",
      mode: "100644"
    },
    "public/assets/app-icons/platform/favicon-48.png": {
      sha: "b6978b692ca8da9f23232808c530be5da188bf6e",
      mode: "100644"
    },
    "public/assets/app-icons/platform/icon-192.png": {
      sha: "0fec80b83cb6b8c3093159ac25261fda8b06a4f8",
      mode: "100644"
    },
    "public/assets/app-icons/platform/icon-512.png": {
      sha: "359c490ff9842e32d8bf59aba98e5a404c7ff808",
      mode: "100644"
    },
    "public/assets/app-icons/platform/icon-maskable-512.png": {
      sha: "314aed68f60b72f7447d6bd35bde11cdbc06b7cd",
      mode: "100644"
    },
    "public/assets/app-icons/pole-vault/apple-touch-icon.png": {
      sha: "893296071d52188717fa1e9d942db148ad6b9b30",
      mode: "100644"
    },
    "public/assets/app-icons/pole-vault/favicon-32.png": {
      sha: "e20f78d41804e378b5ffd04ec527e8ec9b3a97c8",
      mode: "100644"
    },
    "public/assets/app-icons/pole-vault/favicon-48.png": {
      sha: "07ae59c936d957cefddcebdeb71abf59fd0fa852",
      mode: "100644"
    },
    "public/assets/app-icons/pole-vault/icon-192.png": {
      sha: "60cb7915dae1c647e1db32e9e460ec9407ef6d7d",
      mode: "100644"
    },
    "public/assets/app-icons/pole-vault/icon-512.png": {
      sha: "6ad02f0567b961bebfab7fe4d864684253e058d6",
      mode: "100644"
    },
    "public/assets/app-icons/pole-vault/icon-maskable-512.png": {
      sha: "6ad02f0567b961bebfab7fe4d864684253e058d6",
      mode: "100644"
    },
    "public/assets/app-icons/reaction-rod/apple-touch-icon.png": {
      sha: "0f754034fcee82e39586f54d8318fe4190450085",
      mode: "100644"
    },
    "public/assets/app-icons/reaction-rod/favicon-32.png": {
      sha: "182ea863240591cb74680057017112c74a431c86",
      mode: "100644"
    },
    "public/assets/app-icons/reaction-rod/favicon-48.png": {
      sha: "3e3a7de068275715476175adc375ef68782ba3d3",
      mode: "100644"
    },
    "public/assets/app-icons/reaction-rod/icon-192.png": {
      sha: "a9e7cf9490debdbee239655a815366a1868bf142",
      mode: "100644"
    },
    "public/assets/app-icons/reaction-rod/icon-512.png": {
      sha: "20b8b3e04703c0232d9ecedb7f5721423448db02",
      mode: "100644"
    },
    "public/assets/app-icons/reaction-rod/icon-maskable-512.png": {
      sha: "20b8b3e04703c0232d9ecedb7f5721423448db02",
      mode: "100644"
    },
    "public/assets/app-icons/run-1500m/apple-touch-icon.png": {
      sha: "df916ac147476907b53c94fddee663f4cea85eb5",
      mode: "100644"
    },
    "public/assets/app-icons/run-1500m/favicon-32.png": {
      sha: "aec2d4ebcfed283ccd36a445cb0b3bd0ebd1283a",
      mode: "100644"
    },
    "public/assets/app-icons/run-1500m/favicon-48.png": {
      sha: "3d7944179241ae7243c9d6fa24980959e23ce6e8",
      mode: "100644"
    },
    "public/assets/app-icons/run-1500m/icon-192.png": {
      sha: "37277f03450f54043bdfb19da6b7a98052a0c4e2",
      mode: "100644"
    },
    "public/assets/app-icons/run-1500m/icon-512.png": {
      sha: "c1703c141f3c24cac8e68b252deb944d40945b79",
      mode: "100644"
    },
    "public/assets/app-icons/run-400m/apple-touch-icon.png": {
      sha: "b5efc9004581bd11519241f4fe0fac5085c0198d",
      mode: "100644"
    },
    "public/assets/app-icons/run-400m/favicon-32.png": {
      sha: "42da20f696e4c1801f7dfd0f693a7e4df5ad4934",
      mode: "100644"
    },
    "public/assets/app-icons/run-400m/favicon-48.png": {
      sha: "92a1a15967a734b636c3b60dea874fc9e6353816",
      mode: "100644"
    },
    "public/assets/app-icons/run-400m/icon-192.png": {
      sha: "f5cbb2b7597908f3b7ad87fa05194297fa4f2462",
      mode: "100644"
    },
    "public/assets/app-icons/run-400m/icon-512.png": {
      sha: "ef4092d61849dd646f531bd1794c59eee71b4087",
      mode: "100644"
    },
    "public/assets/app-icons/shot-put/apple-touch-icon.png": {
      sha: "97be2efcbe3aa1e8767224397a9380b814bb442a",
      mode: "100644"
    },
    "public/assets/app-icons/shot-put/favicon-32.png": {
      sha: "2add795a0823be42ef15296cdb5ce225769a9c01",
      mode: "100644"
    },
    "public/assets/app-icons/shot-put/favicon-48.png": {
      sha: "e453132ea47081212868404d761d057478c887bd",
      mode: "100644"
    },
    "public/assets/app-icons/shot-put/icon-192.png": {
      sha: "d6b9cda6ed7a6805cbac1dd0c2e7f33b65f73529",
      mode: "100644"
    },
    "public/assets/app-icons/shot-put/icon-512.png": {
      sha: "8484317737471b4b095b6248e3dd5d18a08b7920",
      mode: "100644"
    },
    "public/assets/app-icons/shot-put/icon-maskable-512.png": {
      sha: "8484317737471b4b095b6248e3dd5d18a08b7920",
      mode: "100644"
    },
    "public/assets/app-icons/sprint-100m/apple-touch-icon-v2.png": {
      sha: "050521999132738c58809ba4ab401da76d940ae1",
      mode: "100644"
    },
    "public/assets/app-icons/sprint-100m/apple-touch-icon.png": {
      sha: "658f67882b9b7906e8d2e9f9a8134b84d36695f5",
      mode: "100644"
    },
    "public/assets/app-icons/sprint-100m/favicon-32.png": {
      sha: "63da0fa3ae69b8010e285f299bd3a95e87275517",
      mode: "100644"
    },
    "public/assets/app-icons/sprint-100m/favicon-48.png": {
      sha: "995cd3e4895a402496649aeaa97d9e8347b208bd",
      mode: "100644"
    },
    "public/assets/app-icons/sprint-100m/icon-192.png": {
      sha: "a16bbe6ba6f9e13b24e63069e12aefdcfffd16bd",
      mode: "100644"
    },
    "public/assets/app-icons/sprint-100m/icon-512.png": {
      sha: "e7b8a3906b38aa72f6d0e4a311fbe5a2f31fa047",
      mode: "100644"
    },
    "public/assets/app-icons/sprint-100m/icon-maskable-512.png": {
      sha: "e7b8a3906b38aa72f6d0e4a311fbe5a2f31fa047",
      mode: "100644"
    },
    "public/assets/app-icons/tower-climb/apple-touch-icon.png": {
      sha: "53952e1885d44cf07bd1c7667346e237a3e6ca0e",
      mode: "100644"
    },
    "public/assets/app-icons/tower-climb/favicon-32.png": {
      sha: "f62d63939aaffdf2789e6a53fefd6bccc40923c1",
      mode: "100644"
    },
    "public/assets/app-icons/tower-climb/favicon-48.png": {
      sha: "1e5fc5cb06fee5d53c3f5ccc2864532e5b02c8be",
      mode: "100644"
    },
    "public/assets/app-icons/tower-climb/icon-192.png": {
      sha: "69e5c817c40925622438fef77b2eb52423bb694b",
      mode: "100644"
    },
    "public/assets/app-icons/tower-climb/icon-512.png": {
      sha: "340997475f223e94a1dcb646f7e35fa6174538ff",
      mode: "100644"
    },
    "public/assets/app-icons/tower-climb/icon-maskable-512.png": {
      sha: "340997475f223e94a1dcb646f7e35fa6174538ff",
      mode: "100644"
    },
    "public/assets/beer-slide-card-v2.webp": {
      sha: "5a3ec492a2a7951d6788c7588e45c372046c3881",
      mode: "100644"
    },
    "public/assets/beer-slide-card.svg": {
      sha: "134f2c595a903257a51d12d271fad5c10e2032a2",
      mode: "100644"
    },
    "public/assets/courtesy-contest-card.jpg": {
      sha: "61dd90d0fdaca2ab6678d52c53eb9ceec261ec18",
      mode: "100644"
    },
    "public/assets/discus-card.png": {
      sha: "d06d54918503c0331ae60b3e76be1965e84911b6",
      mode: "100644"
    },
    "public/assets/fast-hands-card-v2.webp": {
      sha: "63dfaffe91b4ab5c96b6948ca3874c1eb7abcb59",
      mode: "100644"
    },
    "public/assets/fast-hands-card.png": {
      sha: "63763baacb2d60dc03fb590aa28efa2cff67b9b4",
      mode: "100644"
    },
    "public/assets/favicon.svg": {
      sha: "0953ffa38027e37ebc75bef4a2f05ae4668e6e5a",
      mode: "100644"
    },
    "public/assets/hero-long-jump.png": {
      sha: "89d8dd2580a7b4c0842b6c7091bae7a8fa8fcc1f",
      mode: "100644"
    },
    "public/assets/high-jump-card.png": {
      sha: "4a128d0e717b50344e62a697adda34423c0e232d",
      mode: "100644"
    },
    "public/assets/home.css": {
      sha: "367fe6d1b8edc3bdb424671d813d3f65cabc9752",
      mode: "100644"
    },
    "public/assets/hurdles-card.jpg": {
      sha: "47724980f888e06079b4c8106c2a775b25f2c44f",
      mode: "100644"
    },
    "public/assets/hurdles-card.png": {
      sha: "db89fb323cfff286621308512a944ee2d62d9824",
      mode: "100644"
    },
    "public/assets/javelin-card.png": {
      sha: "bee7e41c03e74cb65a2cffc9abc84f28ff6af12a",
      mode: "100644"
    },
    "public/assets/overtime-pinball-card-v2.png": {
      sha: "b60eff8be997bd0435f91f0a4923ad3b8016ef7c",
      mode: "100644"
    },
    "public/assets/overtime-pinball-card.png": {
      sha: "06ddeea0ef82218d06b9ee1182229b2c615a956f",
      mode: "100644"
    },
    "public/assets/play-counts.mjs": {
      sha: "75fd926dffc5d294100ce28fc2e26a83c97927e1",
      mode: "100644"
    },
    "public/assets/pole-vault-card.png": {
      sha: "3cf0d64cdb6ac290fff92a81ac73f34e6a3dffdd",
      mode: "100644"
    },
    "public/assets/portal-echosboundary.png": {
      sha: "22828e9e635002915501ce5168caeb6f6c41e112",
      mode: "100644"
    },
    "public/assets/portal-formosabattle.png": {
      sha: "18e96edb9eef1988c5cbc34e037b6b92a2ebe155",
      mode: "100644"
    },
    "public/assets/portal-soul10power.webp": {
      sha: "9237848c336af677e8d99152bd927fe125f595af",
      mode: "100644"
    },
    "public/assets/portal-taiwanfighter-logo.webp": {
      sha: "a840112e019937ea49ae99f6a019d4425a0eded2",
      mode: "100644"
    },
    "public/assets/portal-taiwanfighter.webp": {
      sha: "c438378b7a7290552051608b1bdb78dd92c1c7a2",
      mode: "100644"
    },
    "public/assets/portal-taiwankart.webp": {
      sha: "0bcb6bd7f4240d32ef51c244ea854b53fcc1a234",
      mode: "100644"
    },
    "public/assets/reaction-rod-card.png": {
      sha: "8405deb9228d1402625b2f9a1703f1c216e59126",
      mode: "100644"
    },
    "public/assets/run-1500m-card.png": {
      sha: "2d8e8ce80bf027b4a05dfd13596e6bcdc0c14e5d",
      mode: "100644"
    },
    "public/assets/run-400m-card.png": {
      sha: "5c6623accb09d55e30f969a0a598f775961c4e87",
      mode: "100644"
    },
    "public/assets/shot-put-card.png": {
      sha: "a4333c66526a6e7a0d60913960a0610c87e1fcad",
      mode: "100644"
    },
    "public/assets/sprint-100m-card.png": {
      sha: "658f67882b9b7906e8d2e9f9a8134b84d36695f5",
      mode: "100644"
    },
    "public/assets/tower-climb-card.png": {
      sha: "1f31e119fd8a5eab0bcafb6539096ae04a74b6be",
      mode: "100644"
    },
    "public/experiments/long-jump-physics/controls.mjs": {
      sha: "00975e353a7a0a91c6095141a9cb1b148bbe771d",
      mode: "100644"
    },
    "public/experiments/long-jump-physics/game.mjs": {
      sha: "113c39ebb70ac7d1f264574029cf43f90bc64a2a",
      mode: "100644"
    },
    "public/experiments/long-jump-physics/index.html": {
      sha: "7dac875884f8f01b318109124e7c888525e69faf",
      mode: "100644"
    },
    "public/experiments/long-jump-physics/physics.mjs": {
      sha: "33cf9cda1715efa2caf0538851c5bdfe84f44949",
      mode: "100644"
    },
    "public/experiments/long-jump-physics/style.css": {
      sha: "95816ca7ba03531212d7f6d21e822e8f1a04a4f4",
      mode: "100644"
    },
    "public/games/beer-slide/audio-ui.mjs": {
      sha: "63b471c84a19571fefac2f30db0e6b3d01c93269",
      mode: "100644"
    },
    "public/games/beer-slide/audio.mjs": {
      sha: "e2af4d2c8d7f3724fa47e54b68c299cce61385b0",
      mode: "100644"
    },
    "public/games/beer-slide/audio/CREDITS.md": {
      sha: "a71da106d3f5835a3cbaf4d87b2d6b0094ad0ed8",
      mode: "100644"
    },
    "public/games/beer-slide/audio/asset-manifest.json": {
      sha: "611a429472d39c73b3b39f89a6fb850133e08f79",
      mode: "100644"
    },
    "public/games/beer-slide/audio/chill-menu.mp3": {
      sha: "50b833fcbec85ca8dd559aac6b09fdb05377aea9",
      mode: "100644"
    },
    "public/games/beer-slide/audio/glass-tap.wav": {
      sha: "479a2ff557800655a2bee89f08e1ef96c62d78c3",
      mode: "100644"
    },
    "public/games/beer-slide/audio/result-pizzicato.wav": {
      sha: "70f22029a827ea19dbdac069dfd5c5e317226684",
      mode: "100644"
    },
    "public/games/beer-slide/audio/spill-drop.wav": {
      sha: "a5bd77ea257f6c582ba4763890cf579fb8d442f8",
      mode: "100644"
    },
    "public/games/beer-slide/audio/ui-click.wav": {
      sha: "fa58352694a1e6e0f3fd16b77a127d95252455e3",
      mode: "100644"
    },
    "public/games/beer-slide/camera.mjs": {
      sha: "cd99d5940638711909031fe81896ff53658b493a",
      mode: "100644"
    },
    "public/games/beer-slide/game.mjs": {
      sha: "190836911e31b3104f75b7ad1cb04266675013c6",
      mode: "100644"
    },
    "public/games/beer-slide/index.html": {
      sha: "56519f0356ca931c5214149d27696a5f3aae7599",
      mode: "100644"
    },
    "public/games/beer-slide/licenses/CC0-1.0-legalcode.txt": {
      sha: "0c805e98c2aff9b5d29b2a2aaa9cd7768678787a",
      mode: "100644"
    },
    "public/games/beer-slide/licenses/Kenney-Interface-License.txt": {
      sha: "1fc5acf8243a8ac899403e7297f8c5efdc4258f2",
      mode: "100644"
    },
    "public/games/beer-slide/licenses/Kenney-Music-Jingles-License.txt": {
      sha: "52934bc6b47b927751efcc20fcf346d8031a7c31",
      mode: "100644"
    },
    "public/games/beer-slide/licenses/Not-Jam-License.txt": {
      sha: "60e049509bdf6f0102fa4815ac1d031c7d77b428",
      mode: "100644"
    },
    "public/games/beer-slide/licenses/Not-Jam-player-config.json": {
      sha: "961ce13eb85371219c66778658eb15293bf70fd9",
      mode: "100644"
    },
    "public/games/beer-slide/manifest.webmanifest": {
      sha: "e812ee9e9050f6fcb3f72056e84c78a2c3616502",
      mode: "100644"
    },
    "public/games/beer-slide/physics.mjs": {
      sha: "d429466139cf1c275bebafeb73bd63d6e08fc286",
      mode: "100644"
    },
    "public/games/beer-slide/platform.mjs": {
      sha: "1d250eba7d40c26bc82528df57743ee42f5bd866",
      mode: "100644"
    },
    "public/games/beer-slide/replay.mjs": {
      sha: "ec3d976735e47b99a95474b6edd9249d7ad40155",
      mode: "100644"
    },
    "public/games/beer-slide/session.mjs": {
      sha: "300f402328caa3be2f822edbb4f35d92b97c4453",
      mode: "100644"
    },
    "public/games/beer-slide/share.mjs": {
      sha: "e7f3b69cf54a765459e30823e1107580c692ee60",
      mode: "100644"
    },
    "public/games/beer-slide/style.css": {
      sha: "93ea2864f8f0d929c4c3c78d20c13e6063ac0aa7",
      mode: "100644"
    },
    "public/games/beer-slide/vendor/THREE-LICENSE.txt": {
      sha: "556cb495510b5d4d61fa986975217a7ae2a76530",
      mode: "100644"
    },
    "public/games/beer-slide/vendor/three.core.min.js": {
      sha: "316285237e5460597ad7c75bee315f73508611b3",
      mode: "100644"
    },
    "public/games/beer-slide/vendor/three.module.min.js": {
      sha: "de2723256517cb522aa91fe273f3e68446701c0e",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/aunt-v4-frames.json": {
      sha: "ac026f4cf2445203f884615ad744fd89f9024ae3",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/aunt-v4.png": {
      sha: "53bdc97a0f7660b468248a814deef8e5c343907b",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/commuters.png": {
      sha: "514af03c888791169be73b45cef23c541e807a91",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/frames.json": {
      sha: "059e63d76079fdac10286d4aadba982c96cde7ac",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/hero-v3-frames.json": {
      sha: "50eccb5fd95f430acfce1a80b0eef6861c58ed06",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/hero-v3.png": {
      sha: "355446efc279774b9c5ef9934ec8a20147d55dad",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/intruders-v4.png": {
      sha: "1d124ebbf1bfb69355e36e06b7c119f8e5860430",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/metro.png": {
      sha: "b94c662bb1cac2fa916e5bc9e8be753f4c1ca68f",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/music/attribution.md": {
      sha: "97529ffe73ffcd6237029e8fc8ec40aeff42a8a5",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/music/monkeys-spinning-monkeys-game.mp3": {
      sha: "c8504f9284a3cc4651cf7e4180a1ceb338c0e62b",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/music/monkeys-spinning-monkeys.mp3": {
      sha: "b85cc7c99eb472e3e345f715158ddc4051255e10",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/office-v7.png": {
      sha: "fa3ae8616ea4403a4594a9340cfd8cba90456230",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/passengers-v3.png": {
      sha: "5cfc90c3943c67b3b0c8e23458c2a57c76be93b7",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/seated-gesture-v7.png": {
      sha: "283210a0f941855ecc26cf06b60b202ab13d984e",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/seated-v7.png": {
      sha: "23b919e36c39579b1b3edfdb06029e31de0b3d82",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/sfx/credits.txt": {
      sha: "e15be65e006b58462becf8d3f582e7179615c789",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/stubborn-v7.png": {
      sha: "ec02a79351b8412c8123c62f3be33fdfd02f8bee",
      mode: "100644"
    },
    "public/games/courtesy-contest/assets/variation-v7.json": {
      sha: "2a9f8f2e2aefc16e2d3ace400c69a0c71b73bcc8",
      mode: "100644"
    },
    "public/games/courtesy-contest/bench-layout.js": {
      sha: "3ead7470e74bb73b97638a1a3d6a9ef5e56ba492",
      mode: "100644"
    },
    "public/games/courtesy-contest/comic-events.js": {
      sha: "c32f45044018eee90f69de3e461396edfd1003e6",
      mode: "100644"
    },
    "public/games/courtesy-contest/game.js": {
      sha: "b1fdad410e80d361085a749314b45cc70f3d405d",
      mode: "100644"
    },
    "public/games/courtesy-contest/index.html": {
      sha: "f56f9f21f056dcc4b7e454397d5b1fe05c99e0e8",
      mode: "100644"
    },
    "public/games/courtesy-contest/manifest.webmanifest": {
      sha: "b17bae475e99a47f72b5b3e40e6968a89499bf55",
      mode: "100644"
    },
    "public/games/courtesy-contest/music.js": {
      sha: "80e1de9a4b38a7e1d8719f2e3e546e32b08c3df9",
      mode: "100644"
    },
    "public/games/courtesy-contest/platform.css": {
      sha: "680a52a4fb33f6b707f34bb4f088037196af9a63",
      mode: "100644"
    },
    "public/games/courtesy-contest/platform.mjs": {
      sha: "808f0b71a6844c53cee312fd1d1a525843a2ff1f",
      mode: "100644"
    },
    "public/games/courtesy-contest/round-clock.js": {
      sha: "22b48be38f1ab6458c9bff5a7e26df8d579306a5",
      mode: "100644"
    },
    "public/games/courtesy-contest/round-variation.js": {
      sha: "f81566feb9ac3f4bcc5fb34a714045837c40723f",
      mode: "100644"
    },
    "public/games/courtesy-contest/rules.js": {
      sha: "5cf38ffd6f9197550d9cfea6ce5c5d8094a38d16",
      mode: "100644"
    },
    "public/games/courtesy-contest/score-card.mjs": {
      sha: "63c7adef3b5708f096105902b85aa41741d917b6",
      mode: "100644"
    },
    "public/games/courtesy-contest/sfx.js": {
      sha: "08a82357e0ce5a3100e6e7c131dc2c54098bbc57",
      mode: "100644"
    },
    "public/games/courtesy-contest/share.mjs": {
      sha: "b01092c31ae88f07869c6c4e632f5697d8f07d06",
      mode: "100644"
    },
    "public/games/courtesy-contest/style.css": {
      sha: "af0263b036e827137b9a70cc303f5d09c7b5f9ca",
      mode: "100644"
    },
    "public/games/courtesy-contest/threat-plan.js": {
      sha: "034a6d30270067e94d1e76ea05d827c2ef125601",
      mode: "100644"
    },
    "public/games/courtesy-contest/touch-controls.js": {
      sha: "f19f3887cf4f8b72e08852441134ff04451bffdf",
      mode: "100644"
    },
    "public/games/courtesy-contest/vendor/PHASER-LICENSE.txt": {
      sha: "48792fed249c6ac1ef1b491f4b22dc8f30af7c12",
      mode: "100644"
    },
    "public/games/courtesy-contest/vendor/phaser-3.90.0.min.js": {
      sha: "eae45486b1e634facb1f65fc4ee40ad5695750fc",
      mode: "100644"
    },
    "public/games/discus/audio/CC-BY-4.0-legalcode.txt": {
      sha: "865093b9e5e5c4e2544bcc32cf14b4bd2e1ee99f",
      mode: "100644"
    },
    "public/games/discus/audio/NotJam-CC0-source-statement.txt": {
      sha: "1ef3611968eaad15814890ef9330d3ea58fc495d",
      mode: "100644"
    },
    "public/games/discus/audio/bgm.mp3": {
      sha: "1c4cde8e211854f2d820329cfd40205fa6cb8a2b",
      mode: "100644"
    },
    "public/games/discus/character.mjs": {
      sha: "8740bb55bfeedd2ad70a97ca65bb1283957bc4ce",
      mode: "100644"
    },
    "public/games/discus/distance-marks.mjs": {
      sha: "7c6bbb1fa6e41c5bd66fb9787315af6c832305fa",
      mode: "100644"
    },
    "public/games/discus/engine.mjs": {
      sha: "83bb1213d8d6e0827eeb5c0e8392c1f32d64398d",
      mode: "100644"
    },
    "public/games/discus/field.mjs": {
      sha: "f058a87caf542ab78a9b125bbda62df6a9a7afea",
      mode: "100644"
    },
    "public/games/discus/game.mjs": {
      sha: "6fe6983077abc387c6e55573176bde08dd1fa610",
      mode: "100644"
    },
    "public/games/discus/gust-audio.mjs": {
      sha: "709780e6caa709e6f5efd83c56e02a8c7da2ef13",
      mode: "100644"
    },
    "public/games/discus/index.html": {
      sha: "6b8bc369953b4892c62b2dece7913b0f5a9ed4b3",
      mode: "100644"
    },
    "public/games/discus/input.mjs": {
      sha: "86fc4b1b186d9e212412c7994a8f06260f1357f3",
      mode: "100644"
    },
    "public/games/discus/landing-presentation.mjs": {
      sha: "db6e6ec9dd6a143c2fa0a484fc77626ea446a96d",
      mode: "100644"
    },
    "public/games/discus/landscape.mjs": {
      sha: "f416b274ccfe73983d41e2e8c7a4aede0440fd03",
      mode: "100644"
    },
    "public/games/discus/manifest.webmanifest": {
      sha: "e854bf1f2fee352632a4cd68e9e6e592149a6272",
      mode: "100644"
    },
    "public/games/discus/pose.mjs": {
      sha: "d4d40486318e1399939c805690997aa3d7dd9b6d",
      mode: "100644"
    },
    "public/games/discus/render.mjs": {
      sha: "92480a21fa0d20282273bda6a18f1d52339cac9e",
      mode: "100644"
    },
    "public/games/discus/share.mjs": {
      sha: "71a43ce618dfd7caf38fec0e2cfbfb483b2ffdab",
      mode: "100644"
    },
    "public/games/discus/shared/game-ui.css": {
      sha: "0ee8856c87cd01a000c447f5edba7b1c6cce1abf",
      mode: "100644"
    },
    "public/games/discus/shared/game-ui.mjs": {
      sha: "5612f1a8b28df61df4f81651756380a07c77af08",
      mode: "100644"
    },
    "public/games/discus/shoe-contact.mjs": {
      sha: "f0def9a3a109e6668766d16e973b2d02a53bed8b",
      mode: "100644"
    },
    "public/games/discus/software-renderer.mjs": {
      sha: "8407761687a1df4a6ed2a0459d3b68421e613abf",
      mode: "100644"
    },
    "public/games/discus/style.css": {
      sha: "11fca38ba1ba0fd003c498b037fe6dadecdb5148",
      mode: "100644"
    },
    "public/games/discus/vendor/THREE-LICENSE.txt": {
      sha: "cf781430404b0ae0ba7d8dea3457a3515dd7c9b9",
      mode: "100644"
    },
    "public/games/discus/vendor/three.core.min.js": {
      sha: "70c40977daa0f6e1e312c6b58e9bfe49cb5a87a4",
      mode: "100644"
    },
    "public/games/discus/vendor/three.module.min.js": {
      sha: "20d3c112761a519c7780a5ccc9f72a40937fa83b",
      mode: "100644"
    },
    "public/games/discus/wind-art.mjs": {
      sha: "8b6a5c9b33682fc9a9bfad422f417d55635e961e",
      mode: "100644"
    },
    "public/games/discus/wind.mjs": {
      sha: "76c36706b22630d6c49c23f44cd7a08068ad5482",
      mode: "100644"
    },
    "public/games/fast-hands-test/app.mjs": {
      sha: "118ca0840f8fbc5d49c00a405ac9700eed707710",
      mode: "100644"
    },
    "public/games/fast-hands-test/index.html": {
      sha: "517404308fc31a97c41805097557eb981334dc5c",
      mode: "100644"
    },
    "public/games/fast-hands-test/rules.mjs": {
      sha: "a70783c7858d5f4453dc8a43cad5b4e7b334b878",
      mode: "100644"
    },
    "public/games/fast-hands-test/style.css": {
      sha: "38f30168f124f953953401f11c2aa8464263afcc",
      mode: "100644"
    },
    "public/games/fast-hands/app.mjs": {
      sha: "e1568f14a5ad23066cffc7367c11238ad0f2e5bf",
      mode: "100644"
    },
    "public/games/fast-hands/assets/control-bill.svg": {
      sha: "acf7cc7b9f503e708bfe95411d9d8b7a6febd3e8",
      mode: "100644"
    },
    "public/games/fast-hands/assets/control-duck.svg": {
      sha: "c9b7e5eddbabd2c3ba6f5695a89a8b568149ad62",
      mode: "100644"
    },
    "public/games/fast-hands/assets/duel-items-atlas.png": {
      sha: "741d8b24c9e7f402333c59583b99b78ee9f2e8ca",
      mode: "100644"
    },
    "public/games/fast-hands/assets/front-demo-poster.png": {
      sha: "8cad948afd1baf956543bd9bcb78975cdd21a080",
      mode: "100644"
    },
    "public/games/fast-hands/assets/front-demo.mp4": {
      sha: "0f2c5a65a08eebd54546a665636b477dfb26faf5",
      mode: "100644"
    },
    "public/games/fast-hands/assets/intro-catch-generated.webp": {
      sha: "da515e5321fe7194f48092a3484551588d2f9208",
      mode: "100644"
    },
    "public/games/fast-hands/assets/intro-duel-generated.webp": {
      sha: "38e526d4d88b251d3967ff275137e72f52cb4471",
      mode: "100644"
    },
    "public/games/fast-hands/assets/king-torso-v3.png": {
      sha: "e80c08fc3e9aefeddbd525b647f4bd0027ce2ae3",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-catch-empty-mid.png": {
      sha: "551acd20b9edc63add8b858e6f47cb3419ff2be0",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-catch-grab.png": {
      sha: "218d744facb8697fc2ddd9e0a21699fcbc3441ac",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-catch-guns.png": {
      sha: "24b6410081a938fc99fe24f0bdd511cd67ae55f8",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-catch-place.png": {
      sha: "8d4dfbd3a2ef94526461a491bc8808662841a2e3",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-catch-reach.png": {
      sha: "3e1cf8cc9a3e5ec6eaceb6cd3da97a8651a470d6",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-catch-ready.png": {
      sha: "eaaa9d91b90bf31540b61a66b175c5374cd7d6e6",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-catch-return-mid.png": {
      sha: "05a265158770eb52521388ca34996672ff06c2e0",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-catch-return.png": {
      sha: "b87520533ff559f33c4bb61289c94ce922e22049",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-ai-grab.png": {
      sha: "b2e78c669b094cd8aaf4119f0232e06d3a247f3d",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-ai-guns.png": {
      sha: "b569ebe8e71c032d39463bd9977344915ae7fb93",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-ai-place.png": {
      sha: "efa589889b8d73e25cde3bba6bdd90496fa369c1",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-ai-reach.png": {
      sha: "32705b647ca9e5b0fd57d4643b3638d3b23b5fac",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-ai-return-mid.png": {
      sha: "b8859c6a4572707e29fab491778cb7f771f752db",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-ai.png": {
      sha: "61b3f5e0779d6786ea7d729e0796768e370b549d",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-neutral.png": {
      sha: "a02d19881a08fcb6a1238747525d704479e0118f",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-player-grab.png": {
      sha: "773849fd960220c38251966d0119a53f744f87e3",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-player-guns.png": {
      sha: "9ad53826585cc71993c766edef13e67930481b56",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-player-place.png": {
      sha: "d9b73888ce30d4b6119c6929e5a9d9141d87007f",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-player-reach.png": {
      sha: "ed8b57433c4d531322a60999222fd23711c72e9f",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-player-return-mid.png": {
      sha: "725b248967eeb64e9bab42cd64bc21e54dd313c4",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-player.png": {
      sha: "38e44936310dea5857ee92d0c99daaf9e3ebcf80",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-duel-ready.png": {
      sha: "30cf8cf1b7ad71b0d04075ae83f35824434a16c0",
      mode: "100644"
    },
    "public/games/fast-hands/assets/levels-pose-provenance.json": {
      sha: "f342f75b907c1349c53e2e97753042e33f5fef2e",
      mode: "100644"
    },
    "public/games/fast-hands/assets/result-pose.png": {
      sha: "6f925b5de0ece016e35f5fbc699213fd740b35aa",
      mode: "100644"
    },
    "public/games/fast-hands/auto-input.mjs": {
      sha: "4e8b2aced85f47f1ac91e8779584a194a0c2c96b",
      mode: "100644"
    },
    "public/games/fast-hands/catch.html": {
      sha: "fc218adbcf1651fcb05cbfa2c28a7410069ad1e3",
      mode: "100644"
    },
    "public/games/fast-hands/catch.webmanifest": {
      sha: "814c45e87587b1c26be83f5ab6d0f9b97ec92eea",
      mode: "100644"
    },
    "public/games/fast-hands/challenge.mjs": {
      sha: "3095f5b1a62acceb1d0167fea63d3580882b5077",
      mode: "100644"
    },
    "public/games/fast-hands/club.css": {
      sha: "67ae11fbdf45ca60035afb6459920cadff9201f7",
      mode: "100644"
    },
    "public/games/fast-hands/club.mjs": {
      sha: "7e7eb2644adfa75904f7b8158bb23e3b9f9a2319",
      mode: "100644"
    },
    "public/games/fast-hands/duck-startup.css": {
      sha: "b26ba4673f380c051b633e8a6ae6f61da77e46c6",
      mode: "100644"
    },
    "public/games/fast-hands/duel.html": {
      sha: "daa0560b5c6d39bee5a7948baabc8f1eda8e5304",
      mode: "100644"
    },
    "public/games/fast-hands/duel.webmanifest": {
      sha: "2ba0e683d1130063dfbd9257e1c8fe1bd451befe",
      mode: "100644"
    },
    "public/games/fast-hands/finale-image.mjs": {
      sha: "e2952f9bdfee8a4ba03bec389b59e0ad4fc03321",
      mode: "100644"
    },
    "public/games/fast-hands/finale.css": {
      sha: "7049abb931b958eb558e90cfc3528bdaae0f04d1",
      mode: "100644"
    },
    "public/games/fast-hands/finish-timing.mjs": {
      sha: "e0b93656dea0831beeecae383a871ddc92d5caaf",
      mode: "100644"
    },
    "public/games/fast-hands/index.html": {
      sha: "1c0df88f4818f524d5c3dc12e621b8eef38deaed",
      mode: "100644"
    },
    "public/games/fast-hands/input-clock.mjs": {
      sha: "572f16b5c907f63f7cf9dfb56dfbe59a8a981514",
      mode: "100644"
    },
    "public/games/fast-hands/input.mjs": {
      sha: "7c354c8ff949db76ff1e78d75f6527671a4e9b65",
      mode: "100644"
    },
    "public/games/fast-hands/leaderboard.mjs": {
      sha: "6c11195211e0f34b777ddfa283165ec3a3103a25",
      mode: "100644"
    },
    "public/games/fast-hands/level-nav.css": {
      sha: "0922d5cf74107931069d80d85dec51e6b66fa8a6",
      mode: "100644"
    },
    "public/games/fast-hands/levels-app.mjs": {
      sha: "80bc06170e80a881680efb0c3a5226db4ca04a78",
      mode: "100644"
    },
    "public/games/fast-hands/levels-leaderboard.mjs": {
      sha: "fe5fdf0a4a435359ee247d24bdc548c8c8fb38fd",
      mode: "100644"
    },
    "public/games/fast-hands/levels-motion.mjs": {
      sha: "b456da480a40acc78d1816b957d1091984becc5a",
      mode: "100644"
    },
    "public/games/fast-hands/levels-ranking.css": {
      sha: "5e9ab05c767ea6d7a7cd05cd18278361ff289a07",
      mode: "100644"
    },
    "public/games/fast-hands/levels-replay.mjs": {
      sha: "1ebc4274cb1bec6ad0f4d51279bc4488f918cd0f",
      mode: "100644"
    },
    "public/games/fast-hands/levels-rules.mjs": {
      sha: "ffb5418b603b75c39d79225a911ceaaa9489732b",
      mode: "100644"
    },
    "public/games/fast-hands/levels-score-image.mjs": {
      sha: "212114ae6e3336ac8840330c3db8a4d2df6e3df0",
      mode: "100644"
    },
    "public/games/fast-hands/levels-sharing.mjs": {
      sha: "c746c686af577b34547b237781e6fb8c4faf111f",
      mode: "100644"
    },
    "public/games/fast-hands/levels-sound.mjs": {
      sha: "12ee8e782d229abea23ca572465c496393b6ca54",
      mode: "100644"
    },
    "public/games/fast-hands/levels-stage.mjs": {
      sha: "01cb7a4ddc53858a0942128f7344221f96b1a1df",
      mode: "100644"
    },
    "public/games/fast-hands/levels-world.mjs": {
      sha: "c84a34a9d483ea95f9a1b52b454ef11c984c319a",
      mode: "100644"
    },
    "public/games/fast-hands/levels.css": {
      sha: "b8dbe736d2e5e8a6719209b80cb22f3f6d277e7e",
      mode: "100644"
    },
    "public/games/fast-hands/manifest.webmanifest": {
      sha: "1f134c0da34bd4270915d655e1879277032dc12f",
      mode: "100644"
    },
    "public/games/fast-hands/physics.mjs": {
      sha: "bbdd03c707b7bc490566992d0ebdd07207d49774",
      mode: "100644"
    },
    "public/games/fast-hands/play-counts.mjs": {
      sha: "c908a8abb4878e418133605d59d3167bbfee5c1b",
      mode: "100644"
    },
    "public/games/fast-hands/records.mjs": {
      sha: "8bb7603073d21c1ee583cf39087e8acaa9d95d80",
      mode: "100644"
    },
    "public/games/fast-hands/replay.mjs": {
      sha: "58c74cb8f0a69cb7adc1c7c42595d6d5aabdfecd",
      mode: "100644"
    },
    "public/games/fast-hands/result-copy.mjs": {
      sha: "fee03c6d176442407d9be31a22bf9d0f13bf8ac2",
      mode: "100644"
    },
    "public/games/fast-hands/result-upload-host.mjs": {
      sha: "17a8e134e16ba0b660c40f34e521a1e6eab2967a",
      mode: "100644"
    },
    "public/games/fast-hands/scene.mjs": {
      sha: "3ed9bffeaa564d18bdcc252d388e75b78633bd00",
      mode: "100644"
    },
    "public/games/fast-hands/score-image.mjs": {
      sha: "1762a8218a7b92398108023d65926d97001cdd39",
      mode: "100644"
    },
    "public/games/fast-hands/share.mjs": {
      sha: "55e1f502ae4418a5219fe18d6942606228fc4f15",
      mode: "100644"
    },
    "public/games/fast-hands/shuttle.mjs": {
      sha: "db235d35a165bf6a02da942f6c4524535349af71",
      mode: "100644"
    },
    "public/games/fast-hands/sound.mjs": {
      sha: "146cad743392eec5d2218f60f96e8f9db35fe0ef",
      mode: "100644"
    },
    "public/games/fast-hands/style.css": {
      sha: "4e43e86d15d60c755db126a6ba292935fbcb014c",
      mode: "100644"
    },
    "public/games/fast-hands/three3d/duck-room.mjs": {
      sha: "b0628b56a7f517c5eb2238c738d4457d0278d781",
      mode: "100644"
    },
    "public/games/fast-hands/three3d/game-motion.mjs": {
      sha: "ba59e9985bbca875c08352634299175f1e9a15b4",
      mode: "100644"
    },
    "public/games/fast-hands/three3d/presentation.mjs": {
      sha: "90ffc329bafc968fe4f2f082c06141a687f3b350",
      mode: "100644"
    },
    "public/games/fast-hands/three3d/rig.mjs": {
      sha: "7a83ceed7aa4117c67ef2155aa91822a2c7dd9c2",
      mode: "100644"
    },
    "public/games/fast-hands/three3d/stage.mjs": {
      sha: "1c31148f792c056ef0eb5ebe6d46d875f5629756",
      mode: "100644"
    },
    "public/games/fast-hands/three3d/timeline.mjs": {
      sha: "18dd04914133e799f8195bfc5dcf6f011e179ef7",
      mode: "100644"
    },
    "public/games/fast-hands/three3d/vendor/THREE-LICENSE.txt": {
      sha: "556cb495510b5d4d61fa986975217a7ae2a76530",
      mode: "100644"
    },
    "public/games/fast-hands/three3d/vendor/three.core.min.js": {
      sha: "316285237e5460597ad7c75bee315f73508611b3",
      mode: "100644"
    },
    "public/games/fast-hands/three3d/vendor/three.module.min.js": {
      sha: "de2723256517cb522aa91fe273f3e68446701c0e",
      mode: "100644"
    },
    "public/games/fast-hands/three3d/view.mjs": {
      sha: "4bbcb02830b843a598a241f83bad89dc945b0e92",
      mode: "100644"
    },
    "public/games/fast-hands/three3d/world.mjs": {
      sha: "b18411038a15cf5696939e61809ac86ecd37814d",
      mode: "100644"
    },
    "public/games/high-jump/action-inputs.mjs": {
      sha: "bd45b5d8675195cb50583488a4c03edf03b8839c",
      mode: "100644"
    },
    "public/games/high-jump/audio/CC-BY-4.0-legalcode.txt": {
      sha: "865093b9e5e5c4e2544bcc32cf14b4bd2e1ee99f",
      mode: "100644"
    },
    "public/games/high-jump/audio/Kenney-RPG-License.txt": {
      sha: "c19921a2fb2402ead892083a2a5d09ce90e7e9e4",
      mode: "100644"
    },
    "public/games/high-jump/audio/NotJam-CC0-source-statement.txt": {
      sha: "1ef3611968eaad15814890ef9330d3ea58fc495d",
      mode: "100644"
    },
    "public/games/high-jump/audio/bgm.mp3": {
      sha: "1c4cde8e211854f2d820329cfd40205fa6cb8a2b",
      mode: "100644"
    },
    "public/games/high-jump/character.mjs": {
      sha: "0864ddd50162f562f54032138984cb6206b99e91",
      mode: "100644"
    },
    "public/games/high-jump/clock.mjs": {
      sha: "bdda17c49e819a5e1b4cdce92c0b3661e12cab39",
      mode: "100644"
    },
    "public/games/high-jump/control-bindings.mjs": {
      sha: "898bbd604f2d115bd38d72a1093ad7990365876e",
      mode: "100644"
    },
    "public/games/high-jump/game.mjs": {
      sha: "0a77f8d46162d7d5a3b6875692983a8951643200",
      mode: "100644"
    },
    "public/games/high-jump/index.html": {
      sha: "4e14d5f5484ee924bf5ad582df5212bc03df8311",
      mode: "100644"
    },
    "public/games/high-jump/manifest.webmanifest": {
      sha: "0cf6062502e0949cd73d528781f8581bdf0ce87f",
      mode: "100644"
    },
    "public/games/high-jump/physics.mjs": {
      sha: "c2e4e733244117dd4c62c1ff6fb001083e5c593b",
      mode: "100644"
    },
    "public/games/high-jump/render-transaction.mjs": {
      sha: "bc1dcd17626d1edc0cc65b765bf3d399e3fb6af9",
      mode: "100644"
    },
    "public/games/high-jump/render.mjs": {
      sha: "51623aa420d0523c8bcb11bc5e280fe631dc1c1f",
      mode: "100644"
    },
    "public/games/high-jump/replay.mjs": {
      sha: "7871da0f644a2e55a4814422bfe1f5ddb5f8caec",
      mode: "100644"
    },
    "public/games/high-jump/score-card.mjs": {
      sha: "da7a65fde2c0e0d46f2919c6979856f5616f8cc3",
      mode: "100644"
    },
    "public/games/high-jump/share.mjs": {
      sha: "4ba781773ae47cdbdcde8e8b529a0898c110e30a",
      mode: "100644"
    },
    "public/games/high-jump/shared/game-ui.css": {
      sha: "0ee8856c87cd01a000c447f5edba7b1c6cce1abf",
      mode: "100644"
    },
    "public/games/high-jump/shared/game-ui.mjs": {
      sha: "5612f1a8b28df61df4f81651756380a07c77af08",
      mode: "100644"
    },
    "public/games/high-jump/software-renderer.mjs": {
      sha: "a1e9be262883449f3366b2907901953622238231",
      mode: "100644"
    },
    "public/games/high-jump/style.css": {
      sha: "ae6e6074d8e895d2360e14e6ef745b40999c4b0b",
      mode: "100644"
    },
    "public/games/high-jump/vendor/THREE-LICENSE.txt": {
      sha: "556cb495510b5d4d61fa986975217a7ae2a76530",
      mode: "100644"
    },
    "public/games/high-jump/vendor/three.core.min.js": {
      sha: "316285237e5460597ad7c75bee315f73508611b3",
      mode: "100644"
    },
    "public/games/high-jump/vendor/three.module.min.js": {
      sha: "de2723256517cb522aa91fe273f3e68446701c0e",
      mode: "100644"
    },
    "public/games/high-jump/verdicts.mjs": {
      sha: "95d1d122adfa45269ebdf3af81cee2c17c0a4874",
      mode: "100644"
    },
    "public/games/hurdles/audio.mjs": {
      sha: "f15b585380c89fb7d6ddd1fac0867348a1306c20",
      mode: "100644"
    },
    "public/games/hurdles/audio/CC-BY-4.0-legalcode.txt": {
      sha: "865093b9e5e5c4e2544bcc32cf14b4bd2e1ee99f",
      mode: "100644"
    },
    "public/games/hurdles/audio/Kenney-RPG-License.txt": {
      sha: "c19921a2fb2402ead892083a2a5d09ce90e7e9e4",
      mode: "100644"
    },
    "public/games/hurdles/audio/NotJam-CC0-source-statement.txt": {
      sha: "1ef3611968eaad15814890ef9330d3ea58fc495d",
      mode: "100644"
    },
    "public/games/hurdles/audio/bgm.mp3": {
      sha: "1c4cde8e211854f2d820329cfd40205fa6cb8a2b",
      mode: "100644"
    },
    "public/games/hurdles/audio/bgm.ogg": {
      sha: "60a770bd5cd1fd030ad24153f5d091ec6021d189",
      mode: "100644"
    },
    "public/games/hurdles/audio/flight.mp3": {
      sha: "914c682a51bb3bc81bf34a34cea126c340257cc6",
      mode: "100644"
    },
    "public/games/hurdles/audio/flight.ogg": {
      sha: "04a054a7c6bc6404eb475096652c39439fec5a74",
      mode: "100644"
    },
    "public/games/hurdles/audio/jump.mp3": {
      sha: "505f256d29a5a9abf548a330c61e9c931cea5566",
      mode: "100644"
    },
    "public/games/hurdles/audio/jump.ogg": {
      sha: "769e7019e13806ad6c7b7f95cea39ddfbd77030a",
      mode: "100644"
    },
    "public/games/hurdles/audio/land.mp3": {
      sha: "3fd8fddeb89c546c302e064a613bdba29e8babb6",
      mode: "100644"
    },
    "public/games/hurdles/audio/land.ogg": {
      sha: "a6677e0956b575f08f963445915c03af5a4558e9",
      mode: "100644"
    },
    "public/games/hurdles/audio/result.mp3": {
      sha: "1cfd3b5f5c7cce6a0e00a6b75d92e8d637924ef5",
      mode: "100644"
    },
    "public/games/hurdles/audio/result.ogg": {
      sha: "480a8bb5e028b7f16709114667d4ef563d2fe65b",
      mode: "100644"
    },
    "public/games/hurdles/audio/step.mp3": {
      sha: "6691ba621d5b1c2b6506fd87cf6ad1cfd786c2ea",
      mode: "100644"
    },
    "public/games/hurdles/audio/step.ogg": {
      sha: "c78918965fd3984b48e3d2813a06c764ac4a3f3b",
      mode: "100644"
    },
    "public/games/hurdles/character.mjs": {
      sha: "c0ae4bd873a7b54e50b1df669615c4abc7307ae2",
      mode: "100644"
    },
    "public/games/hurdles/countdown.mjs": {
      sha: "e9d283733f265ea9ad1af01b071dfbec6d01c0f9",
      mode: "100644"
    },
    "public/games/hurdles/favicon.svg": {
      sha: "ae2b279c109df77c8d731fb2e00abfa4ce17431a",
      mode: "100644"
    },
    "public/games/hurdles/game.mjs": {
      sha: "0e62f221b929408fb90d3296979a3681ba00bb78",
      mode: "100644"
    },
    "public/games/hurdles/index.html": {
      sha: "0f717e803e6f4320c2f1682098744dd75a63ac11",
      mode: "100644"
    },
    "public/games/hurdles/input.mjs": {
      sha: "a27e3758767227254404a8575392231e3767e7d1",
      mode: "100644"
    },
    "public/games/hurdles/manifest.webmanifest": {
      sha: "9df59d473fda2a5f905ca0f22f03d5ed1fb516c6",
      mode: "100644"
    },
    "public/games/hurdles/physics.mjs": {
      sha: "81a794a34f82b9e5129f17b62528598a7d98e77b",
      mode: "100644"
    },
    "public/games/hurdles/play-surface.mjs": {
      sha: "b64dbd9d42d3d402fa9424bb5400333065f57184",
      mode: "100644"
    },
    "public/games/hurdles/render.mjs": {
      sha: "911b132a60bf3822586d86ac5b651d5819daf4eb",
      mode: "100644"
    },
    "public/games/hurdles/replay.mjs": {
      sha: "e9ee9e6842cddc56cf53539525071888b694fa7a",
      mode: "100644"
    },
    "public/games/hurdles/result-guard.mjs": {
      sha: "684bf04991b61dca268ede1e58d0ea4f14c530f4",
      mode: "100644"
    },
    "public/games/hurdles/share.mjs": {
      sha: "a34b3e0f54bf195686c61d0b4b8437d59559fd35",
      mode: "100644"
    },
    "public/games/hurdles/software-renderer.mjs": {
      sha: "a1e9be262883449f3366b2907901953622238231",
      mode: "100644"
    },
    "public/games/hurdles/style.css": {
      sha: "6fa3dfc2df3178f9c9f09eb9ce17e8bf93e1e374",
      mode: "100644"
    },
    "public/games/hurdles/vendor/THREE-LICENSE.txt": {
      sha: "556cb495510b5d4d61fa986975217a7ae2a76530",
      mode: "100644"
    },
    "public/games/hurdles/vendor/three.core.min.js": {
      sha: "316285237e5460597ad7c75bee315f73508611b3",
      mode: "100644"
    },
    "public/games/hurdles/vendor/three.module.min.js": {
      sha: "de2723256517cb522aa91fe273f3e68446701c0e",
      mode: "100644"
    },
    "public/games/javelin/app.mjs": {
      sha: "2807e04574095d0d6fe30e1718e59466659b7dee",
      mode: "100644"
    },
    "public/games/javelin/audio.mjs": {
      sha: "9a12965e09cebc70fc5b49c4c27e33418b5653ed",
      mode: "100644"
    },
    "public/games/javelin/audio/CREDITS.md": {
      sha: "f95394f55192dba49eea6d56769f8b04412e0f93",
      mode: "100644"
    },
    "public/games/javelin/audio/bgm.mp3": {
      sha: "1c4cde8e211854f2d820329cfd40205fa6cb8a2b",
      mode: "100644"
    },
    "public/games/javelin/audio/land.mp3": {
      sha: "3fd8fddeb89c546c302e064a613bdba29e8babb6",
      mode: "100644"
    },
    "public/games/javelin/audio/result.mp3": {
      sha: "1cfd3b5f5c7cce6a0e00a6b75d92e8d637924ef5",
      mode: "100644"
    },
    "public/games/javelin/audio/step.mp3": {
      sha: "6691ba621d5b1c2b6506fd87cf6ad1cfd786c2ea",
      mode: "100644"
    },
    "public/games/javelin/character3d.mjs": {
      sha: "b3e2964b89eaff3d8b3ba6780199264cb3a16873",
      mode: "100644"
    },
    "public/games/javelin/controls-shell.css": {
      sha: "987bba24c132b4c21928283f3e72e360cebabc2a",
      mode: "100644"
    },
    "public/games/javelin/game-ui.css": {
      sha: "b23ca1ab928171cd245103e642f99ae5fb04f258",
      mode: "100644"
    },
    "public/games/javelin/index.html": {
      sha: "2bbf1e9f30d99fb3c8e1d7df79ab082c5bb89dd2",
      mode: "100644"
    },
    "public/games/javelin/manifest.webmanifest": {
      sha: "861a074ef661c595fbdbfdd8755a3bf1c2f5f0eb",
      mode: "100644"
    },
    "public/games/javelin/physics.mjs": {
      sha: "d411e28f3b5c4a024e778a2b71cb224d1c3d8c81",
      mode: "100644"
    },
    "public/games/javelin/platform-audio.mjs": {
      sha: "7d18241f74774f1b6c241150cc153d1e7f17259e",
      mode: "100644"
    },
    "public/games/javelin/platform.css": {
      sha: "1cd52f1895044196284c879ca3f45fd6b5ac106b",
      mode: "100644"
    },
    "public/games/javelin/pose.mjs": {
      sha: "4802e83fb5b33ddf4d5e46f52180c9e365cdc8e5",
      mode: "100644"
    },
    "public/games/javelin/presentation.mjs": {
      sha: "68b92da40af7a1333a7c211ba075316a164b0943",
      mode: "100644"
    },
    "public/games/javelin/render3d.mjs": {
      sha: "35b305b4fb6ac350dc1c226d843f1f3b1a291302",
      mode: "100644"
    },
    "public/games/javelin/share.mjs": {
      sha: "96d50fddc1568c007d0cdf182c14c924741adf12",
      mode: "100644"
    },
    "public/games/javelin/shoe-contact.mjs": {
      sha: "24ff37714c5dd2b1d629de6d9f6a5ba4d96b43bb",
      mode: "100644"
    },
    "public/games/javelin/style.css": {
      sha: "757525771277d4fd851a6b45e71ce58ef76289f2",
      mode: "100644"
    },
    "public/games/javelin/vendor/THREE-LICENSE.txt": {
      sha: "556cb495510b5d4d61fa986975217a7ae2a76530",
      mode: "100644"
    },
    "public/games/javelin/vendor/three.core.min.js": {
      sha: "316285237e5460597ad7c75bee315f73508611b3",
      mode: "100644"
    },
    "public/games/javelin/vendor/three.module.min.js": {
      sha: "de2723256517cb522aa91fe273f3e68446701c0e",
      mode: "100644"
    },
    "public/games/long-jump/audio.mjs": {
      sha: "f15b585380c89fb7d6ddd1fac0867348a1306c20",
      mode: "100644"
    },
    "public/games/long-jump/audio/CC-BY-4.0-legalcode.txt": {
      sha: "865093b9e5e5c4e2544bcc32cf14b4bd2e1ee99f",
      mode: "100644"
    },
    "public/games/long-jump/audio/Kenney-RPG-License.txt": {
      sha: "c19921a2fb2402ead892083a2a5d09ce90e7e9e4",
      mode: "100644"
    },
    "public/games/long-jump/audio/NotJam-CC0-source-statement.txt": {
      sha: "1ef3611968eaad15814890ef9330d3ea58fc495d",
      mode: "100644"
    },
    "public/games/long-jump/audio/bgm.mp3": {
      sha: "1c4cde8e211854f2d820329cfd40205fa6cb8a2b",
      mode: "100644"
    },
    "public/games/long-jump/audio/bgm.ogg": {
      sha: "60a770bd5cd1fd030ad24153f5d091ec6021d189",
      mode: "100644"
    },
    "public/games/long-jump/audio/flight.mp3": {
      sha: "914c682a51bb3bc81bf34a34cea126c340257cc6",
      mode: "100644"
    },
    "public/games/long-jump/audio/flight.ogg": {
      sha: "04a054a7c6bc6404eb475096652c39439fec5a74",
      mode: "100644"
    },
    "public/games/long-jump/audio/jump.mp3": {
      sha: "505f256d29a5a9abf548a330c61e9c931cea5566",
      mode: "100644"
    },
    "public/games/long-jump/audio/jump.ogg": {
      sha: "769e7019e13806ad6c7b7f95cea39ddfbd77030a",
      mode: "100644"
    },
    "public/games/long-jump/audio/land.mp3": {
      sha: "3fd8fddeb89c546c302e064a613bdba29e8babb6",
      mode: "100644"
    },
    "public/games/long-jump/audio/land.ogg": {
      sha: "a6677e0956b575f08f963445915c03af5a4558e9",
      mode: "100644"
    },
    "public/games/long-jump/audio/result.mp3": {
      sha: "1cfd3b5f5c7cce6a0e00a6b75d92e8d637924ef5",
      mode: "100644"
    },
    "public/games/long-jump/audio/result.ogg": {
      sha: "480a8bb5e028b7f16709114667d4ef563d2fe65b",
      mode: "100644"
    },
    "public/games/long-jump/audio/step.mp3": {
      sha: "6691ba621d5b1c2b6506fd87cf6ad1cfd786c2ea",
      mode: "100644"
    },
    "public/games/long-jump/audio/step.ogg": {
      sha: "c78918965fd3984b48e3d2813a06c764ac4a3f3b",
      mode: "100644"
    },
    "public/games/long-jump/capture.mjs": {
      sha: "e609d930b5bbd283a376853b265d27502d68aaa8",
      mode: "100644"
    },
    "public/games/long-jump/character.mjs": {
      sha: "9eeffe3ac5526b6a75ecb7a7cffa6f525a3a811f",
      mode: "100644"
    },
    "public/games/long-jump/controls.mjs": {
      sha: "e1ce8aecd3282fcd0931d543fea33c328d02362d",
      mode: "100644"
    },
    "public/games/long-jump/cosmic-art.mjs": {
      sha: "2db42d4fcb672607dc7e032f041548a53c11f5ed",
      mode: "100644"
    },
    "public/games/long-jump/cosmic-data.mjs": {
      sha: "de6466b02d6aa4bbce88c44f691787c3fbdc0cd0",
      mode: "100644"
    },
    "public/games/long-jump/dialogs.mjs": {
      sha: "2168b78aea1ab10e72dd5838174f83d71df4d9a2",
      mode: "100644"
    },
    "public/games/long-jump/flavour.mjs": {
      sha: "d3f4e1e313d5ea4cb02f6ea6f1f690a9dcefe59f",
      mode: "100644"
    },
    "public/games/long-jump/game.mjs": {
      sha: "3c89d25f6fdae6c44040069d0a435d9f25d48613",
      mode: "100644"
    },
    "public/games/long-jump/index.html": {
      sha: "19f86616ced367e2665fcaa7e33be11f40db0137",
      mode: "100644"
    },
    "public/games/long-jump/landmarks.mjs": {
      sha: "a4eab3ddfab6a5ba4b1a4fd52589549fea01778c",
      mode: "100644"
    },
    "public/games/long-jump/layout.mjs": {
      sha: "597253d88dee6718a41e6961a7e62c59c9caa746",
      mode: "100644"
    },
    "public/games/long-jump/manifest.webmanifest": {
      sha: "827f01127c589b231e1078fe60cb578ec7301276",
      mode: "100644"
    },
    "public/games/long-jump/physics.mjs": {
      sha: "bb96f4ac6b07ff999b624766ed7758c6c82576d0",
      mode: "100644"
    },
    "public/games/long-jump/play-surface.mjs": {
      sha: "75867a2188d0fd03490a8e94a87f9d6b042de245",
      mode: "100644"
    },
    "public/games/long-jump/presentation.mjs": {
      sha: "2b8bca8c52267348de8c539dbf53a2d35f6a373f",
      mode: "100644"
    },
    "public/games/long-jump/replay.mjs": {
      sha: "63caf5d5c456bd6757b08b1c772489fb4f010859",
      mode: "100644"
    },
    "public/games/long-jump/result-view.mjs": {
      sha: "498d697ddb991983f8e4280b6858c520115fc3c6",
      mode: "100644"
    },
    "public/games/long-jump/route-data.mjs": {
      sha: "a1ccc244fa6d7a81be713f9bc9bd5ef2638e9103",
      mode: "100644"
    },
    "public/games/long-jump/sandpits.mjs": {
      sha: "eba71c4a1fdd05debd20d7c7715c09f6071d2033",
      mode: "100644"
    },
    "public/games/long-jump/scenery-art.mjs": {
      sha: "48a0df2b81da5467594bf290cd602780b40992e9",
      mode: "100644"
    },
    "public/games/long-jump/scenery.mjs": {
      sha: "39be1230c48f48236d305318afa5a6a9b9f99e26",
      mode: "100644"
    },
    "public/games/long-jump/share.mjs": {
      sha: "cb378fc643cc1dc963f0bbb2b986c0f9ab98a891",
      mode: "100644"
    },
    "public/games/long-jump/style.css": {
      sha: "407c2a7015858e425d0bbe77d73e2cf82b42e7d0",
      mode: "100644"
    },
    "public/games/long-jump/vendor/THREE-LICENSE.txt": {
      sha: "cf781430404b0ae0ba7d8dea3457a3515dd7c9b9",
      mode: "100644"
    },
    "public/games/long-jump/vendor/three.core.min.js": {
      sha: "70c40977daa0f6e1e312c6b58e9bfe49cb5a87a4",
      mode: "100644"
    },
    "public/games/long-jump/vendor/three.module.min.js": {
      sha: "20d3c112761a519c7780a5ccc9f72a40937fa83b",
      mode: "100644"
    },
    "public/games/long-jump/verdicts.mjs": {
      sha: "0bec16c55341f752ba4ac665651cbd3d530f2093",
      mode: "100644"
    },
    "public/games/long-jump/viewport-diagnostics.mjs": {
      sha: "dfe93e30eee9d8eff6577ab7d12d7a04f2316fae",
      mode: "100644"
    },
    "public/games/long-jump/world.mjs": {
      sha: "b9b18327b10711a80dbe310283330c2a5ddec769",
      mode: "100644"
    },
    "public/games/overtime-pinball/activities.js": {
      sha: "d3b9d0a0418cb89b77f93ad7adfc3b7a282fcf8d",
      mode: "100644"
    },
    "public/games/overtime-pinball/assist-machines.js": {
      sha: "9370f911beac12b04c8eaa432215bd7fcdfb4f16",
      mode: "100644"
    },
    "public/games/overtime-pinball/assist-office.js": {
      sha: "bfd5061931fd729e2644ca262e5c449809cf611b",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/CC0-1.0.txt": {
      sha: "2c4afabdb632b5d68e60c9fe9fe0b0819676a729",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/break.mp3": {
      sha: "c54a31119ec24d948d750392b9c5230a9404151a",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/break.ogg": {
      sha: "3fc1e31c5b60f165c47725e7ac1657ad638155c3",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/coin.mp3": {
      sha: "e5586abc249a11c5ed1775ae2c7fe33ad29da7d6",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/coin.ogg": {
      sha: "57cf9513c9b260feec360867166c220c6f701ce7",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/jump.mp3": {
      sha: "a61b0149d495c9812821f176996459f89433b0bf",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/jump.ogg": {
      sha: "e52f6a07e25c127716f67f72d7a9132afad5603c",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/kenney-source.txt": {
      sha: "7a5311484fe49569e10359fac772ddb1d93ea4d7",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/land.mp3": {
      sha: "70e65994c4684d62a136fec8dcbba1702c2e31cb",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/land.ogg": {
      sha: "3d97f7b09210641f9f3bdf020ff728e8d868f5ba",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/manifest.json": {
      sha: "ebd27b75a2ea6064dcc07aea8528bfffc835ba53",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/rail-entry.mp3": {
      sha: "e2dbfb4a3c22430ae6e42b55c905882d7f4bf87c",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/sparklin-source.txt": {
      sha: "e2a7749654380efcb2de9de58c76af21573c8331",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/theme-9.mp3": {
      sha: "119f504a70a1991f4b989ef17bc075ef8719fefe",
      mode: "100644"
    },
    "public/games/overtime-pinball/audio/theme-9.ogg": {
      sha: "e1ff40d2a7f36583b1850ef6d17a6498faf55d73",
      mode: "100644"
    },
    "public/games/overtime-pinball/board-features.js": {
      sha: "6878e983b7794c3997900bc6241585d48fb39696",
      mode: "100644"
    },
    "public/games/overtime-pinball/boss-visual.js": {
      sha: "590d3e90fd12195ec06ea748e18aab07c7b9f7fe",
      mode: "100644"
    },
    "public/games/overtime-pinball/camera.js": {
      sha: "73430035dbf159e97cf8af6f9315e52049bbd72d",
      mode: "100644"
    },
    "public/games/overtime-pinball/central-launch.js": {
      sha: "5c11bed77e6f8867b5fc2acaeaeb1331f5439e12",
      mode: "100644"
    },
    "public/games/overtime-pinball/character.js": {
      sha: "091588f202c64ecc74ec621c2a1b51e85c7f018a",
      mode: "100644"
    },
    "public/games/overtime-pinball/clock-cue.js": {
      sha: "35f69f24d5844fbf4ded9895845c234e1250a27e",
      mode: "100644"
    },
    "public/games/overtime-pinball/combo-office.js": {
      sha: "70d1d1a6b580e78042409a2f287fdce8dc98e29d",
      mode: "100644"
    },
    "public/games/overtime-pinball/combo-routes.js": {
      sha: "b08c4d953a4811f7d3cda4381c1bce9f9186d840",
      mode: "100644"
    },
    "public/games/overtime-pinball/company-design.js": {
      sha: "e49b2ca98a493a85382e6587ec0ce81796ba79aa",
      mode: "100644"
    },
    "public/games/overtime-pinball/company.css": {
      sha: "ec6d1304ea6948dcf260a84d77e252db5dadaf93",
      mode: "100644"
    },
    "public/games/overtime-pinball/contact.js": {
      sha: "7f9f45291a0db31483b269a405a775497323c04a",
      mode: "100644"
    },
    "public/games/overtime-pinball/desktop.css": {
      sha: "baff260a71eb5ce01dd4c6c4f951c19ed9bcbdd7",
      mode: "100644"
    },
    "public/games/overtime-pinball/dispatch-court.js": {
      sha: "91ec5445512e8d71ced6259b73e8d8e109ace0cb",
      mode: "100644"
    },
    "public/games/overtime-pinball/feedback-layout.js": {
      sha: "64cda18eb7dd7ffbcdf3f2b5dfb2871ea56c1673",
      mode: "100644"
    },
    "public/games/overtime-pinball/feedback-profile.js": {
      sha: "80cea47f7c23d16714f2b4423f1188ba21ed2974",
      mode: "100644"
    },
    "public/games/overtime-pinball/game-audio.js": {
      sha: "e99c650b38dda27e2690a67de1cc13fa602788e9",
      mode: "100644"
    },
    "public/games/overtime-pinball/game.html": {
      sha: "f87a531b1651385ee9c954ebd49c56d65582f292",
      mode: "100644"
    },
    "public/games/overtime-pinball/gameplay.css": {
      sha: "40cdef3a93ad0324b9ed8546af002fe4740827d8",
      mode: "100644"
    },
    "public/games/overtime-pinball/index.html": {
      sha: "ad90f8e2781c0b94fb8f870ac3f86ca5465ffbc6",
      mode: "100644"
    },
    "public/games/overtime-pinball/interactions.js": {
      sha: "75a4ffdec31ce3254b71983b4b19902f4958280b",
      mode: "100644"
    },
    "public/games/overtime-pinball/intro.js": {
      sha: "c17f03a72632b7c60f62e4646b7059656e198ef7",
      mode: "100644"
    },
    "public/games/overtime-pinball/jet-wake.js": {
      sha: "ac65216853d60a8f2720b2bc2fa957668e25dad9",
      mode: "100644"
    },
    "public/games/overtime-pinball/mail-office.js": {
      sha: "f26629bf9fc52cec49bf90e175aba48849ab0b02",
      mode: "100644"
    },
    "public/games/overtime-pinball/mail-run.js": {
      sha: "ba5bd22d43bf4b8dbf29c79dc5cbf2208b255212",
      mode: "100644"
    },
    "public/games/overtime-pinball/main.js": {
      sha: "46bad9a1f44bc8d47d51422a9dce0f86a83c6a03",
      mode: "100644"
    },
    "public/games/overtime-pinball/menu.css": {
      sha: "b4ee59d41ee150ced534aefe672ca24e7dde24d3",
      mode: "100644"
    },
    "public/games/overtime-pinball/occlusion.js": {
      sha: "79588dc15e6c5815dec16b06e412d3af82bb9c29",
      mode: "100644"
    },
    "public/games/overtime-pinball/office-features.js": {
      sha: "2a02f6757cf1199f049b50de7be83313903b7b44",
      mode: "100644"
    },
    "public/games/overtime-pinball/office-stories.js": {
      sha: "098c56d5b4af2480c9eb156c24e62be60e84d967",
      mode: "100644"
    },
    "public/games/overtime-pinball/opening.js": {
      sha: "bbe3d2a6f9eb86dc676bf587622aaccd40ea3760",
      mode: "100644"
    },
    "public/games/overtime-pinball/physics.js": {
      sha: "904a58aba43d614a43479767e722c2a707a0e7e2",
      mode: "100644"
    },
    "public/games/overtime-pinball/platform-layout.mjs": {
      sha: "f594564f917c017d4963c4b639422863f90b8401",
      mode: "100644"
    },
    "public/games/overtime-pinball/platform-share.mjs": {
      sha: "0b5df3136d56f81c7cf377b661b1995906eb4bf6",
      mode: "100644"
    },
    "public/games/overtime-pinball/platform-snapshot.mjs": {
      sha: "10955c08475146aed6ff80a515c1b16de80a22f0",
      mode: "100644"
    },
    "public/games/overtime-pinball/platform-ui.mjs": {
      sha: "c3efe1c69ab71632e3c5a2574fa9e142ff32efc7",
      mode: "100644"
    },
    "public/games/overtime-pinball/platform.css": {
      sha: "67f45741b4ff490e8f149c40771ce98d9287672b",
      mode: "100644"
    },
    "public/games/overtime-pinball/play-layout.css": {
      sha: "b9b30e4e13323a0090d4fe03472ab7974bef1179",
      mode: "100644"
    },
    "public/games/overtime-pinball/play-layout.js": {
      sha: "4f2e503602774ef1208fd13c8e85c4b973c38cf0",
      mode: "100644"
    },
    "public/games/overtime-pinball/play-polish.css": {
      sha: "a43f008180132fe76787eff9f9b78cc203f73d49",
      mode: "100644"
    },
    "public/games/overtime-pinball/prediction.js": {
      sha: "ec760ca2fb9f449b225606bf237aa870eb86938e",
      mode: "100644"
    },
    "public/games/overtime-pinball/preview.css": {
      sha: "137ab7dde45f49ffca5438a0a2313d8b8541b165",
      mode: "100644"
    },
    "public/games/overtime-pinball/render-proportions.js": {
      sha: "54c27d5c9da3bc8db20cbd7077062f39fd5c1e75",
      mode: "100644"
    },
    "public/games/overtime-pinball/round-options.js": {
      sha: "d48a67d0b27c366bbeb228f88b8591d6ff2dc275",
      mode: "100644"
    },
    "public/games/overtime-pinball/round-rules.js": {
      sha: "056345f3c6f84e19ccd2a5319e41e51496f41fc2",
      mode: "100644"
    },
    "public/games/overtime-pinball/route-layout.js": {
      sha: "f2e6f99e9d4fbcf05fb379f4c3d0d50d4152bef5",
      mode: "100644"
    },
    "public/games/overtime-pinball/route-rewards.js": {
      sha: "4de8e0beb7840c19776873a59c7bbec2b493d5de",
      mode: "100644"
    },
    "public/games/overtime-pinball/score-card.mjs": {
      sha: "2fa9daf35487e2c6028a783b17a1e506c4e880cf",
      mode: "100644"
    },
    "public/games/overtime-pinball/shell-geometry.js": {
      sha: "22b32ada13174466f082d198e6c8e8b7c89b8323",
      mode: "100644"
    },
    "public/games/overtime-pinball/special-feedback.js": {
      sha: "d2255cb7eaf79c4f08ac0465ebbf881b2c4304e0",
      mode: "100644"
    },
    "public/games/overtime-pinball/special-office.js": {
      sha: "496d637c0ebe982a8cf0d9ae531feb1bd3194de8",
      mode: "100644"
    },
    "public/games/overtime-pinball/station-label-anchor.js": {
      sha: "23ed39f162a0c3ca1d1bfc5631b20da2b5b0cecf",
      mode: "100644"
    },
    "public/games/overtime-pinball/station-label-layout.js": {
      sha: "a374b0f06b62ebdbf51f33fbe86f7524b761a0dd",
      mode: "100644"
    },
    "public/games/overtime-pinball/station-labels.js": {
      sha: "c1f9cb600f1368dd78887d04cf69b49f765390da",
      mode: "100644"
    },
    "public/games/overtime-pinball/style.css": {
      sha: "f33dc2a897e52ecca3959cd1252f134b25b20a9e",
      mode: "100644"
    },
    "public/games/overtime-pinball/text-layout.js": {
      sha: "ac686a9deb85baa49826415be10cc40c8ec5471b",
      mode: "100644"
    },
    "public/games/overtime-pinball/touch-policy.js": {
      sha: "8f81e3ecda2d05b1d26113b193129b77c230d4c0",
      mode: "100644"
    },
    "public/games/overtime-pinball/vendor/THREE-LICENSE.txt": {
      sha: "cf781430404b0ae0ba7d8dea3457a3515dd7c9b9",
      mode: "100644"
    },
    "public/games/overtime-pinball/vendor/three.core.min.js": {
      sha: "d2c995b9236a949a3116561b0431e6503984ea06",
      mode: "100644"
    },
    "public/games/overtime-pinball/vendor/three.module.min.js": {
      sha: "ca3702545fe4bed942582b6e6a6cd75c5d1d3e71",
      mode: "100644"
    },
    "public/games/overtime-pinball/viewport-recovery.js": {
      sha: "ce107392412ce2ef122e03d72b7de858f61d0bb4",
      mode: "100644"
    },
    "public/games/overtime-pinball/viewport-shell.js": {
      sha: "1305daa5032db077c1d25854ed94289078e97434",
      mode: "100644"
    },
    "public/games/pole-vault/altitude.mjs": {
      sha: "9d800079a1cf36e44edd4c3ded84a31897173a84",
      mode: "100644"
    },
    "public/games/pole-vault/audio.mjs": {
      sha: "f15b585380c89fb7d6ddd1fac0867348a1306c20",
      mode: "100644"
    },
    "public/games/pole-vault/audio/CC-BY-4.0-legalcode.txt": {
      sha: "865093b9e5e5c4e2544bcc32cf14b4bd2e1ee99f",
      mode: "100644"
    },
    "public/games/pole-vault/audio/Kenney-RPG-License.txt": {
      sha: "c19921a2fb2402ead892083a2a5d09ce90e7e9e4",
      mode: "100644"
    },
    "public/games/pole-vault/audio/NotJam-CC0-source-statement.txt": {
      sha: "1ef3611968eaad15814890ef9330d3ea58fc495d",
      mode: "100644"
    },
    "public/games/pole-vault/audio/bgm.mp3": {
      sha: "1c4cde8e211854f2d820329cfd40205fa6cb8a2b",
      mode: "100644"
    },
    "public/games/pole-vault/audio/bgm.ogg": {
      sha: "60a770bd5cd1fd030ad24153f5d091ec6021d189",
      mode: "100644"
    },
    "public/games/pole-vault/audio/flight.mp3": {
      sha: "914c682a51bb3bc81bf34a34cea126c340257cc6",
      mode: "100644"
    },
    "public/games/pole-vault/audio/flight.ogg": {
      sha: "04a054a7c6bc6404eb475096652c39439fec5a74",
      mode: "100644"
    },
    "public/games/pole-vault/audio/jump.mp3": {
      sha: "505f256d29a5a9abf548a330c61e9c931cea5566",
      mode: "100644"
    },
    "public/games/pole-vault/audio/jump.ogg": {
      sha: "769e7019e13806ad6c7b7f95cea39ddfbd77030a",
      mode: "100644"
    },
    "public/games/pole-vault/audio/land.mp3": {
      sha: "3fd8fddeb89c546c302e064a613bdba29e8babb6",
      mode: "100644"
    },
    "public/games/pole-vault/audio/land.ogg": {
      sha: "a6677e0956b575f08f963445915c03af5a4558e9",
      mode: "100644"
    },
    "public/games/pole-vault/audio/result.mp3": {
      sha: "1cfd3b5f5c7cce6a0e00a6b75d92e8d637924ef5",
      mode: "100644"
    },
    "public/games/pole-vault/audio/result.ogg": {
      sha: "480a8bb5e028b7f16709114667d4ef563d2fe65b",
      mode: "100644"
    },
    "public/games/pole-vault/audio/step.mp3": {
      sha: "6691ba621d5b1c2b6506fd87cf6ad1cfd786c2ea",
      mode: "100644"
    },
    "public/games/pole-vault/audio/step.ogg": {
      sha: "c78918965fd3984b48e3d2813a06c764ac4a3f3b",
      mode: "100644"
    },
    "public/games/pole-vault/character.mjs": {
      sha: "c0ae4bd873a7b54e50b1df669615c4abc7307ae2",
      mode: "100644"
    },
    "public/games/pole-vault/countdown.mjs": {
      sha: "e9d283733f265ea9ad1af01b071dfbec6d01c0f9",
      mode: "100644"
    },
    "public/games/pole-vault/favicon.svg": {
      sha: "ae2b279c109df77c8d731fb2e00abfa4ce17431a",
      mode: "100644"
    },
    "public/games/pole-vault/flight-profile.mjs": {
      sha: "c7497911fafb9a2defe23753310f45309bbc43d3",
      mode: "100644"
    },
    "public/games/pole-vault/game.mjs": {
      sha: "39835d99c0170756b67b7980677aa02b0ba76147",
      mode: "100644"
    },
    "public/games/pole-vault/height-sources.html": {
      sha: "637fff9402f6c9d5070fff512d3f4cd55e633428",
      mode: "100644"
    },
    "public/games/pole-vault/index.html": {
      sha: "23a435f970c638503c016309d481ac5972ed55a9",
      mode: "100644"
    },
    "public/games/pole-vault/input.mjs": {
      sha: "a27e3758767227254404a8575392231e3767e7d1",
      mode: "100644"
    },
    "public/games/pole-vault/journey-hud.mjs": {
      sha: "d303a5036932b9d12acb4367a3c93a62378659e6",
      mode: "100644"
    },
    "public/games/pole-vault/manifest.webmanifest": {
      sha: "ab18fe6b2f42707a767dc054cf1e45a29b55defd",
      mode: "100644"
    },
    "public/games/pole-vault/milestones.mjs": {
      sha: "6be054d17f5dddb2fb0b5c8297283d77c76354cb",
      mode: "100644"
    },
    "public/games/pole-vault/physics.mjs": {
      sha: "b08fd30863506e5b3740e571b3338bbc632ef320",
      mode: "100644"
    },
    "public/games/pole-vault/platform.css": {
      sha: "5cf3e9d3fd19e96ac8be68044da104c366c9c938",
      mode: "100644"
    },
    "public/games/pole-vault/render.mjs": {
      sha: "06847b4a80edff7c86f9f94cbf888fff62d823f5",
      mode: "100644"
    },
    "public/games/pole-vault/result-frame.mjs": {
      sha: "41fec577597d7702625f56a8d75690fa4dfde472",
      mode: "100644"
    },
    "public/games/pole-vault/result-guard.mjs": {
      sha: "684bf04991b61dca268ede1e58d0ea4f14c530f4",
      mode: "100644"
    },
    "public/games/pole-vault/scenery-models.mjs": {
      sha: "e3d608e89abd7dcc2582ed60c900de3fd16da5fe",
      mode: "100644"
    },
    "public/games/pole-vault/scenery.mjs": {
      sha: "ffcd231323b777b236049a37dc016cc915f03ba1",
      mode: "100644"
    },
    "public/games/pole-vault/share.mjs": {
      sha: "daca5284551c5eab72f08c246fea7fcd394233d0",
      mode: "100644"
    },
    "public/games/pole-vault/sky-journey.mjs": {
      sha: "28e4ebc697848bedc26b97692594cadd1665bf67",
      mode: "100644"
    },
    "public/games/pole-vault/sky-models.mjs": {
      sha: "23e4f4b2e38b08fbf9c1790f7e94c80d54ae66e2",
      mode: "100644"
    },
    "public/games/pole-vault/software-renderer.mjs": {
      sha: "a1e9be262883449f3366b2907901953622238231",
      mode: "100644"
    },
    "public/games/pole-vault/style.css": {
      sha: "17dd8fbf3a4351fa4b60039a4791c861e71e01f6",
      mode: "100644"
    },
    "public/games/pole-vault/ui-state.mjs": {
      sha: "71328320e92855c079b1394505dd52402109a384",
      mode: "100644"
    },
    "public/games/pole-vault/vendor/THREE-LICENSE.txt": {
      sha: "556cb495510b5d4d61fa986975217a7ae2a76530",
      mode: "100644"
    },
    "public/games/pole-vault/vendor/three.core.min.js": {
      sha: "316285237e5460597ad7c75bee315f73508611b3",
      mode: "100644"
    },
    "public/games/pole-vault/vendor/three.module.min.js": {
      sha: "de2723256517cb522aa91fe273f3e68446701c0e",
      mode: "100644"
    },
    "public/games/reaction-rod/final-moment.mjs": {
      sha: "92c345b8cd4d7e46b0926b0a8be3bd6c5e273554",
      mode: "100644"
    },
    "public/games/reaction-rod/framing.mjs": {
      sha: "4f07858e8b96b9c38fa06c9f5d27c60d821c07d8",
      mode: "100644"
    },
    "public/games/reaction-rod/game.mjs": {
      sha: "3401a42fe835703b11bd5118a0cfe98b9391cfb9",
      mode: "100644"
    },
    "public/games/reaction-rod/index.html": {
      sha: "7303e45d49a092f7e2723ded8fc90ffe0661a122",
      mode: "100644"
    },
    "public/games/reaction-rod/manifest.webmanifest": {
      sha: "b0b6a524c20de78a1070dd56327b33272b91a27e",
      mode: "100644"
    },
    "public/games/reaction-rod/physics.mjs": {
      sha: "a88e8f4437c4b224f725b1a13b3af2b39db5cd6d",
      mode: "100644"
    },
    "public/games/reaction-rod/replay.mjs": {
      sha: "115b8a4b470e5889f362184b1d5bbc7df2b0c3d9",
      mode: "100644"
    },
    "public/games/reaction-rod/result.css": {
      sha: "5e14fb7fa770ecbcd0228b91c9cc627e5b0b17ac",
      mode: "100644"
    },
    "public/games/reaction-rod/scene.mjs": {
      sha: "4d7313ddaebb299733b428b2ae639991acf2e0d3",
      mode: "100644"
    },
    "public/games/reaction-rod/share.mjs": {
      sha: "3742b71d55e34a2adbccd42f90cd96dc64cdefdf",
      mode: "100644"
    },
    "public/games/reaction-rod/snapshot.mjs": {
      sha: "28b318dc026fb2cdb263c02250ada3b07b4606a9",
      mode: "100644"
    },
    "public/games/reaction-rod/style.css": {
      sha: "6163314c8995e4c2881f52640aae49f03de58a89",
      mode: "100644"
    },
    "public/games/reaction-rod/vendor/THREE-LICENSE.txt": {
      sha: "556cb495510b5d4d61fa986975217a7ae2a76530",
      mode: "100644"
    },
    "public/games/reaction-rod/vendor/three.core.min.js": {
      sha: "316285237e5460597ad7c75bee315f73508611b3",
      mode: "100644"
    },
    "public/games/reaction-rod/vendor/three.module.min.js": {
      sha: "de2723256517cb522aa91fe273f3e68446701c0e",
      mode: "100644"
    },
    "public/games/reaction-rod/viewport.css": {
      sha: "ce20b50e4e13faf28e1f3aa40c8fcb12d98a5a1c",
      mode: "100644"
    },
    "public/games/run-1500m/app.mjs": {
      sha: "d3769e81c85daece9540492e925270cd7d297265",
      mode: "100644"
    },
    "public/games/run-1500m/audio/CREDITS.md": {
      sha: "2a6aa2d9a92bdbb841695b20ef1f54d9f1b982e0",
      mode: "100644"
    },
    "public/games/run-1500m/audio/bgm.mp3": {
      sha: "1c4cde8e211854f2d820329cfd40205fa6cb8a2b",
      mode: "100644"
    },
    "public/games/run-1500m/audio/land.mp3": {
      sha: "3fd8fddeb89c546c302e064a613bdba29e8babb6",
      mode: "100644"
    },
    "public/games/run-1500m/audio/result.mp3": {
      sha: "1cfd3b5f5c7cce6a0e00a6b75d92e8d637924ef5",
      mode: "100644"
    },
    "public/games/run-1500m/audio/step.mp3": {
      sha: "6691ba621d5b1c2b6506fd87cf6ad1cfd786c2ea",
      mode: "100644"
    },
    "public/games/run-1500m/character3d.mjs": {
      sha: "e37149830272fe7d05ca0a0d5a6574fd9c9e60d4",
      mode: "100644"
    },
    "public/games/run-1500m/index.html": {
      sha: "3ae52976e14698d835d1974050e1f134a6b7ccbd",
      mode: "100644"
    },
    "public/games/run-1500m/manifest.webmanifest": {
      sha: "2cbb828e2121449a60ed27c10025017fbdba2901",
      mode: "100644"
    },
    "public/games/run-1500m/pose.mjs": {
      sha: "a4642fb28129b107445a0515bdffd845824ad719",
      mode: "100644"
    },
    "public/games/run-1500m/race.mjs": {
      sha: "50cf63488e37c5cc3f1a2a6a03396c247c9b8a2e",
      mode: "100644"
    },
    "public/games/run-1500m/records.mjs": {
      sha: "1602eaba2682f767a310fbda4724f1c9a551b55f",
      mode: "100644"
    },
    "public/games/run-1500m/render.mjs": {
      sha: "b07cc0ecb6757d28b55210e9e87bf53c490401d8",
      mode: "100644"
    },
    "public/games/run-1500m/runner-atlas.png": {
      sha: "aa32eda1ff00647abdeb96c368f456081e7fe8d8",
      mode: "100644"
    },
    "public/games/run-1500m/style.css": {
      sha: "bdf9b80dd46530eb751b48ea4ce9f8ef86e9dcee",
      mode: "100644"
    },
    "public/games/run-1500m/vendor/THREE-LICENSE.txt": {
      sha: "556cb495510b5d4d61fa986975217a7ae2a76530",
      mode: "100644"
    },
    "public/games/run-1500m/vendor/three.core.min.js": {
      sha: "316285237e5460597ad7c75bee315f73508611b3",
      mode: "100644"
    },
    "public/games/run-1500m/vendor/three.module.min.js": {
      sha: "de2723256517cb522aa91fe273f3e68446701c0e",
      mode: "100644"
    },
    "public/games/run-400m/app.mjs": {
      sha: "dd67cf7662a4970869d99923ee5abaa1a432c1d2",
      mode: "100644"
    },
    "public/games/run-400m/audio.mjs": {
      sha: "95a53b863b78d18123456f74336d7f1a0814785d",
      mode: "100644"
    },
    "public/games/run-400m/audio/CREDITS.md": {
      sha: "2a6aa2d9a92bdbb841695b20ef1f54d9f1b982e0",
      mode: "100644"
    },
    "public/games/run-400m/audio/bgm.mp3": {
      sha: "1c4cde8e211854f2d820329cfd40205fa6cb8a2b",
      mode: "100644"
    },
    "public/games/run-400m/audio/land.mp3": {
      sha: "3fd8fddeb89c546c302e064a613bdba29e8babb6",
      mode: "100644"
    },
    "public/games/run-400m/audio/result.mp3": {
      sha: "1cfd3b5f5c7cce6a0e00a6b75d92e8d637924ef5",
      mode: "100644"
    },
    "public/games/run-400m/audio/step.mp3": {
      sha: "6691ba621d5b1c2b6506fd87cf6ad1cfd786c2ea",
      mode: "100644"
    },
    "public/games/run-400m/character3d.mjs": {
      sha: "e37149830272fe7d05ca0a0d5a6574fd9c9e60d4",
      mode: "100644"
    },
    "public/games/run-400m/clock.mjs": {
      sha: "e07a30f4927ac84764fc26070462b729a62db512",
      mode: "100644"
    },
    "public/games/run-400m/extra-poses.png": {
      sha: "cd8ec32f892f94f1488176c694c3b10883e73f54",
      mode: "100644"
    },
    "public/games/run-400m/fallback.mjs": {
      sha: "198f238d979bfea747beb4961490ab5d62ef5ffa",
      mode: "100644"
    },
    "public/games/run-400m/index.html": {
      sha: "047c90f3805c8116d5a5cdd8a250c143f18fbd07",
      mode: "100644"
    },
    "public/games/run-400m/manifest.webmanifest": {
      sha: "622494ba7ab6189f59e11888f63f042abc5928e8",
      mode: "100644"
    },
    "public/games/run-400m/pose3d.mjs": {
      sha: "99644e57398551e1a8a857d3b4479cea62e3eacc",
      mode: "100644"
    },
    "public/games/run-400m/race.mjs": {
      sha: "6192a0382b5e5be4188d6db9100eb3633a0929f0",
      mode: "100644"
    },
    "public/games/run-400m/render.mjs": {
      sha: "2188cb2259221f526abe8831f6fae14497738f21",
      mode: "100644"
    },
    "public/games/run-400m/runner-atlas.png": {
      sha: "c46a7c18da69c3b9b6afacfee6be0787c25d236a",
      mode: "100644"
    },
    "public/games/run-400m/software-renderer.mjs": {
      sha: "44a57c041ff951e4747984d35da69d5c1cbbfdc5",
      mode: "100644"
    },
    "public/games/run-400m/style.css": {
      sha: "d2df60fd3ee1fd44d75584aec26158d59af2265c",
      mode: "100644"
    },
    "public/games/run-400m/vendor/THREE-LICENSE.txt": {
      sha: "556cb495510b5d4d61fa986975217a7ae2a76530",
      mode: "100644"
    },
    "public/games/run-400m/vendor/three.core.min.js": {
      sha: "316285237e5460597ad7c75bee315f73508611b3",
      mode: "100644"
    },
    "public/games/run-400m/vendor/three.module.min.js": {
      sha: "de2723256517cb522aa91fe273f3e68446701c0e",
      mode: "100644"
    },
    "public/games/shared/audio-preferences.mjs": {
      sha: "ff71b706bb6eac4fa64d6a8b43275f864ee9e445",
      mode: "100644"
    },
    "public/games/shared/audio-runtime.mjs": {
      sha: "ceddec5ea717fe403dbb7b6a2114c9fcf515cb3c",
      mode: "100644"
    },
    "public/games/shared/controls-shell.css": {
      sha: "987bba24c132b4c21928283f3e72e360cebabc2a",
      mode: "100644"
    },
    "public/games/shared/controls-shell.mjs": {
      sha: "e1b1ecfc8784d5f1942c6c44b88c936b09b5863f",
      mode: "100644"
    },
    "public/games/shared/entry-content.mjs": {
      sha: "e4c4e65df7fa784d8f5a0cbab29043d04ab8f001",
      mode: "100644"
    },
    "public/games/shared/entry-shell.css": {
      sha: "d3563ce03f0ef59ab875732927cadb8be4200fed",
      mode: "100644"
    },
    "public/games/shared/entry-shell.mjs": {
      sha: "cd5f9fe1ce85c6970cb317a8d2d3352cb9b244ee",
      mode: "100644"
    },
    "public/games/shared/game-audio-events.mjs": {
      sha: "f55025d4b48f8c7fcdd3b046f3098436a1c026e0",
      mode: "100644"
    },
    "public/games/shared/game-ui.css": {
      sha: "e304c8ad64cd85ee334a449bf93da43c71b33143",
      mode: "100644"
    },
    "public/games/shared/game-ui.mjs": {
      sha: "5612f1a8b28df61df4f81651756380a07c77af08",
      mode: "100644"
    },
    "public/games/shared/help-coordinator.mjs": {
      sha: "01fc2f38df10bb85461233d0f0e8e4e6e3a830fd",
      mode: "100644"
    },
    "public/games/shared/leaderboard-config.mjs": {
      sha: "f078804f6dc0a1e6529e0053dbb5a090f4551349",
      mode: "100644"
    },
    "public/games/shared/leaderboard-metrics.mjs": {
      sha: "620c2e5cf9a25431fac86b0c08c909c6bda4679f",
      mode: "100644"
    },
    "public/games/shared/leaderboard-scroll.mjs": {
      sha: "50cebd4910329c2f75d36758dc87576e441ae1c1",
      mode: "100644"
    },
    "public/games/shared/leaderboard.css": {
      sha: "8429a7c664a684094533830c9c86d8b17134109c",
      mode: "100644"
    },
    "public/games/shared/leaderboard.mjs": {
      sha: "89ddafd3da32450703a8768f43ec7b7ddbe0f5e6",
      mode: "100644"
    },
    "public/games/shared/menu-audio.mjs": {
      sha: "35f161653dd3f036af9cff1c27fe8d545da69ae8",
      mode: "100644"
    },
    "public/games/shared/menu-content.mjs": {
      sha: "96477806a67ad663551c43451d1f41a302d6818b",
      mode: "100644"
    },
    "public/games/shared/mobile-gestures.css": {
      sha: "c243b2b191a7b559b8986ea0eaf27ed37fccfaec",
      mode: "100644"
    },
    "public/games/shared/mobile-gestures.mjs": {
      sha: "742c02719f74859bd2deffad309159e79e376ea5",
      mode: "100644"
    },
    "public/games/shared/play-counts.mjs": {
      sha: "af68f76963e3d7e9472c5b17ba6d92835398261a",
      mode: "100644"
    },
    "public/games/shared/runner-arm-pose.mjs": {
      sha: "440b3c59e6870fa6d844b02ee94a9c7714241557",
      mode: "100644"
    },
    "public/games/shared/runner-audio.mjs": {
      sha: "cdb4b680d0c8050cd96d1b91b63b28843767c4f6",
      mode: "100644"
    },
    "public/games/shared/runner-platform.css": {
      sha: "5e37694eaad3d3a3a9f576411fb87a6a2e5457a2",
      mode: "100644"
    },
    "public/games/shared/runner-platform.mjs": {
      sha: "46d346f3cca732d9f4a48198a69e5c6ca6486b25",
      mode: "100644"
    },
    "public/games/shared/runner-replay.mjs": {
      sha: "686389c4d0db0ed1c874bc8c9bb975fb24c0d4ea",
      mode: "100644"
    },
    "public/games/shared/runner-result.mjs": {
      sha: "935c0c38b2eab990bfa89c39440a2e3ddd83c75f",
      mode: "100644"
    },
    "public/games/shared/runner-sound.mjs": {
      sha: "4d55c1bf09bfe74596b9359a9825278be57f5562",
      mode: "100644"
    },
    "public/games/shared/scene-audio.mjs": {
      sha: "9307f95c1226a3981808f94209c257178d1c44f8",
      mode: "100644"
    },
    "public/games/shared/scrollbars.css": {
      sha: "e666c86163564eb7decf337ba2de3eef91f32b7b",
      mode: "100644"
    },
    "public/games/shared/sports-credits.html": {
      sha: "cb5133d2d88ea5b220309255e181b5ae844c51e9",
      mode: "100644"
    },
    "public/games/shared/sports-help.css": {
      sha: "c67d38de512e22cf3cfb281a3421ed64c231b659",
      mode: "100644"
    },
    "public/games/shared/sports-help.mjs": {
      sha: "7f23b6f440d01e8d4cf3357a4f1aec8519936a6d",
      mode: "100644"
    },
    "public/games/shared/startup.js": {
      sha: "5748d711cdae242810269a850d8c92242d85711c",
      mode: "100644"
    },
    "public/games/shared/studio-brand.css": {
      sha: "18ba8abc165e498154dd167de0c0045e36b7df36",
      mode: "100644"
    },
    "public/games/shared/upload-cooldown.mjs": {
      sha: "cb34a03111dc945f5fc52afa98f774115602f21e",
      mode: "100644"
    },
    "public/games/shot-put/air-scenery.mjs": {
      sha: "b12747849e6e248ac68b4203e002016d35ecbad1",
      mode: "100644"
    },
    "public/games/shot-put/audio/CC-BY-4.0-legalcode.txt": {
      sha: "865093b9e5e5c4e2544bcc32cf14b4bd2e1ee99f",
      mode: "100644"
    },
    "public/games/shot-put/audio/Kenney-RPG-License.txt": {
      sha: "c19921a2fb2402ead892083a2a5d09ce90e7e9e4",
      mode: "100644"
    },
    "public/games/shot-put/audio/NotJam-CC0-source-statement.txt": {
      sha: "1ef3611968eaad15814890ef9330d3ea58fc495d",
      mode: "100644"
    },
    "public/games/shot-put/audio/bgm.mp3": {
      sha: "1c4cde8e211854f2d820329cfd40205fa6cb8a2b",
      mode: "100644"
    },
    "public/games/shot-put/audio/land.mp3": {
      sha: "3fd8fddeb89c546c302e064a613bdba29e8babb6",
      mode: "100644"
    },
    "public/games/shot-put/audio/result.mp3": {
      sha: "1cfd3b5f5c7cce6a0e00a6b75d92e8d637924ef5",
      mode: "100644"
    },
    "public/games/shot-put/character.mjs": {
      sha: "9eeffe3ac5526b6a75ecb7a7cffa6f525a3a811f",
      mode: "100644"
    },
    "public/games/shot-put/controls.mjs": {
      sha: "86fc4b1b186d9e212412c7994a8f06260f1357f3",
      mode: "100644"
    },
    "public/games/shot-put/credits.html": {
      sha: "1a40c58703bba33b565c3cbfc263da753b84a909",
      mode: "100644"
    },
    "public/games/shot-put/distance-marks.mjs": {
      sha: "64a825ab3038a52b1aab25ce3f01ad44286f2e9c",
      mode: "100644"
    },
    "public/games/shot-put/engine.mjs": {
      sha: "cff90a5dba374093675cf3700d0ca91b0a229c8a",
      mode: "100644"
    },
    "public/games/shot-put/game.mjs": {
      sha: "4876115348118b652ff0cb3ce2c958d6d79dc7ac",
      mode: "100644"
    },
    "public/games/shot-put/index.html": {
      sha: "07ad9328c0e00ecf65548dc00044ee8c82a28d0f",
      mode: "100644"
    },
    "public/games/shot-put/manifest.webmanifest": {
      sha: "e7b01bb09c6b157bf58f4ded59d5644719d7a78e",
      mode: "100644"
    },
    "public/games/shot-put/pose.mjs": {
      sha: "e7ebb53856e24fc70010274386ddfd919bb7a769",
      mode: "100644"
    },
    "public/games/shot-put/relay-audio.mjs": {
      sha: "5379e55a4f365a3e4941322fb10e0c666a5b43a7",
      mode: "100644"
    },
    "public/games/shot-put/render.mjs": {
      sha: "0127711ca9da5563214850db5db19e1bdbefcf41",
      mode: "100644"
    },
    "public/games/shot-put/renderer-choice.mjs": {
      sha: "215729e9b5fd958499fedb9304acd0aafbc9da6d",
      mode: "100644"
    },
    "public/games/shot-put/share.mjs": {
      sha: "845e54572999beb543590f3d1391543113566eef",
      mode: "100644"
    },
    "public/games/shot-put/shared/game-ui.css": {
      sha: "0ee8856c87cd01a000c447f5edba7b1c6cce1abf",
      mode: "100644"
    },
    "public/games/shot-put/shared/game-ui.mjs": {
      sha: "5612f1a8b28df61df4f81651756380a07c77af08",
      mode: "100644"
    },
    "public/games/shot-put/sky-art/cosmic-art.mjs": {
      sha: "2db42d4fcb672607dc7e032f041548a53c11f5ed",
      mode: "100644"
    },
    "public/games/shot-put/sky-art/cosmic-data.mjs": {
      sha: "de6466b02d6aa4bbce88c44f691787c3fbdc0cd0",
      mode: "100644"
    },
    "public/games/shot-put/sky-art/scenery-art.mjs": {
      sha: "48a0df2b81da5467594bf290cd602780b40992e9",
      mode: "100644"
    },
    "public/games/shot-put/sky-route.mjs": {
      sha: "93ff6cfd5f8f680fc78601acf24d9e8279355502",
      mode: "100644"
    },
    "public/games/shot-put/sky-view.mjs": {
      sha: "7a765da02d24f83529eab0745adb111cd8e9733b",
      mode: "100644"
    },
    "public/games/shot-put/software-renderer.mjs": {
      sha: "a21e34668fe716ac03ffdd8407bcbc296ee45fcc",
      mode: "100644"
    },
    "public/games/shot-put/style.css": {
      sha: "3a0b1eaa4909ec3f1012d7df44a8821fc99c0358",
      mode: "100644"
    },
    "public/games/shot-put/vendor/THREE-LICENSE.txt": {
      sha: "cf781430404b0ae0ba7d8dea3457a3515dd7c9b9",
      mode: "100644"
    },
    "public/games/shot-put/vendor/three.core.min.js": {
      sha: "70c40977daa0f6e1e312c6b58e9bfe49cb5a87a4",
      mode: "100644"
    },
    "public/games/shot-put/vendor/three.module.min.js": {
      sha: "20d3c112761a519c7780a5ccc9f72a40937fa83b",
      mode: "100644"
    },
    "public/games/sprint-100m/app.mjs": {
      sha: "9866a9fa396e81cb561e7a657053978ff2cd256d",
      mode: "100644"
    },
    "public/games/sprint-100m/audio.mjs": {
      sha: "4a121332b6ec4d67fb59e12305df6d3869cbe67a",
      mode: "100644"
    },
    "public/games/sprint-100m/audio/CREDITS.md": {
      sha: "2a6aa2d9a92bdbb841695b20ef1f54d9f1b982e0",
      mode: "100644"
    },
    "public/games/sprint-100m/audio/bgm.mp3": {
      sha: "1c4cde8e211854f2d820329cfd40205fa6cb8a2b",
      mode: "100644"
    },
    "public/games/sprint-100m/audio/land.mp3": {
      sha: "3fd8fddeb89c546c302e064a613bdba29e8babb6",
      mode: "100644"
    },
    "public/games/sprint-100m/audio/result.mp3": {
      sha: "1cfd3b5f5c7cce6a0e00a6b75d92e8d637924ef5",
      mode: "100644"
    },
    "public/games/sprint-100m/audio/step.mp3": {
      sha: "6691ba621d5b1c2b6506fd87cf6ad1cfd786c2ea",
      mode: "100644"
    },
    "public/games/sprint-100m/camera.mjs": {
      sha: "9e7fdf3e7ab60950835819979f2f2d69e4fe0ff5",
      mode: "100644"
    },
    "public/games/sprint-100m/character3d.mjs": {
      sha: "b3e2964b89eaff3d8b3ba6780199264cb3a16873",
      mode: "100644"
    },
    "public/games/sprint-100m/index.html": {
      sha: "805ed310c3a2934455f09eaf6719c4bd5c1e5cc7",
      mode: "100644"
    },
    "public/games/sprint-100m/manifest.webmanifest": {
      sha: "0930cb7874c954e9858bd8fc1d1e0506a8c63502",
      mode: "100644"
    },
    "public/games/sprint-100m/platform.css": {
      sha: "a9ccc91a65bd5c2028cc9d0e4a0b0b81123cc5d0",
      mode: "100644"
    },
    "public/games/sprint-100m/pose3d.mjs": {
      sha: "2d1e6b10dea67e3d5f1b7e10ab3ad0f375a0028a",
      mode: "100644"
    },
    "public/games/sprint-100m/race.mjs": {
      sha: "f819c26fc843a35299c7cfc1ef518f3101bd30e5",
      mode: "100644"
    },
    "public/games/sprint-100m/records.mjs": {
      sha: "f0b108487ccee30bc494363ee67e85dcec6c823e",
      mode: "100644"
    },
    "public/games/sprint-100m/render3d.mjs": {
      sha: "1cf28fa51a96d81105c39a84842fa4fd69ae6f05",
      mode: "100644"
    },
    "public/games/sprint-100m/replay.mjs": {
      sha: "d2f15d17661f9938c4e06cb3804eea5680320639",
      mode: "100644"
    },
    "public/games/sprint-100m/runout.mjs": {
      sha: "35e72e71fbc37960c3b7800b32067f5ea94aaffa",
      mode: "100644"
    },
    "public/games/sprint-100m/share.mjs": {
      sha: "c3523edbcc96198bd2b1a9e23bb1b92251e769a2",
      mode: "100644"
    },
    "public/games/sprint-100m/style.css": {
      sha: "d215e216edcc6b3485d0cc54c7179ea5ee760f43",
      mode: "100644"
    },
    "public/games/sprint-100m/vendor/THREE-LICENSE.txt": {
      sha: "556cb495510b5d4d61fa986975217a7ae2a76530",
      mode: "100644"
    },
    "public/games/sprint-100m/vendor/three.core.min.js": {
      sha: "316285237e5460597ad7c75bee315f73508611b3",
      mode: "100644"
    },
    "public/games/sprint-100m/vendor/three.module.min.js": {
      sha: "de2723256517cb522aa91fe273f3e68446701c0e",
      mode: "100644"
    },
    "public/games/tower-climb/audio/CC-BY-4.0-legalcode.txt": {
      sha: "865093b9e5e5c4e2544bcc32cf14b4bd2e1ee99f",
      mode: "100644"
    },
    "public/games/tower-climb/audio/NotJam-CC0-source-statement.txt": {
      sha: "1ef3611968eaad15814890ef9330d3ea58fc495d",
      mode: "100644"
    },
    "public/games/tower-climb/audio/bgm.mp3": {
      sha: "1c4cde8e211854f2d820329cfd40205fa6cb8a2b",
      mode: "100644"
    },
    "public/games/tower-climb/character.mjs": {
      sha: "9eeffe3ac5526b6a75ecb7a7cffa6f525a3a811f",
      mode: "100644"
    },
    "public/games/tower-climb/engine.mjs": {
      sha: "1746e0c9d34237846d67d07a7501ce98b394b124",
      mode: "100644"
    },
    "public/games/tower-climb/floor-art.mjs": {
      sha: "658487c884141d36d5a91bdb378c5c10909beeba",
      mode: "100644"
    },
    "public/games/tower-climb/free-climb.mjs": {
      sha: "f19bdd10a2525a2d21cf5639dbd7b2a2f0b1dab7",
      mode: "100644"
    },
    "public/games/tower-climb/free-pose.mjs": {
      sha: "d72c0bb0cc1a204a669ec9247aceb1984a769ae5",
      mode: "100644"
    },
    "public/games/tower-climb/game.mjs": {
      sha: "fcb8a4809fa18f0119ce9feeb56b58cf1d2cafad",
      mode: "100644"
    },
    "public/games/tower-climb/index.html": {
      sha: "c795c6d817cea552e23759915d364d95fc886b38",
      mode: "100644"
    },
    "public/games/tower-climb/indoor-engine.mjs": {
      sha: "6a7ed0fdaae6326d661d81b77705bd6dd75e62b2",
      mode: "100644"
    },
    "public/games/tower-climb/input.mjs": {
      sha: "c8ba82d99d2ca94a153fc9998cf008bf0ee8684d",
      mode: "100644"
    },
    "public/games/tower-climb/layout-v3.css": {
      sha: "c277d8965c02211dcfd2efb015c482b954e42cc0",
      mode: "100644"
    },
    "public/games/tower-climb/legacy-pose.mjs": {
      sha: "738a0471372084d4ca1ed34ff84f4d1e197ed04f",
      mode: "100644"
    },
    "public/games/tower-climb/manifest.webmanifest": {
      sha: "1ff42eb26118c83b81049e6dc104c39e433b0d64",
      mode: "100644"
    },
    "public/games/tower-climb/outdoor-engine.mjs": {
      sha: "db648b81503ba2f510f4662b9ab01b50d39e1e75",
      mode: "100644"
    },
    "public/games/tower-climb/outdoor-pose.mjs": {
      sha: "7602e4ac0d2d5dba582c826ccd88a91bc8c8291b",
      mode: "100644"
    },
    "public/games/tower-climb/platform.css": {
      sha: "7a6f16264ef1e09a19c8f0aef56a02273ae28698",
      mode: "100644"
    },
    "public/games/tower-climb/presentation-clock.mjs": {
      sha: "c30778c59666ed237a29e0e01d33c7d9d8f79dce",
      mode: "100644"
    },
    "public/games/tower-climb/rail.mjs": {
      sha: "ca00e57e8fe7ead42e569fe85c1a1d2057561182",
      mode: "100644"
    },
    "public/games/tower-climb/record-result.mjs": {
      sha: "48a520a97a4987ca61dfeba9cf534d67963ff710",
      mode: "100644"
    },
    "public/games/tower-climb/render.mjs": {
      sha: "a327dcd40eab6909698e20a2e9e7c197892b3f8a",
      mode: "100644"
    },
    "public/games/tower-climb/replay.mjs": {
      sha: "f7f1e8c349f75ae0a765f6c3fec85c22467e1e12",
      mode: "100644"
    },
    "public/games/tower-climb/rhythm-audio.mjs": {
      sha: "1b18824cf1bc6987f172ab2f312420254a134f4b",
      mode: "100644"
    },
    "public/games/tower-climb/score-card.mjs": {
      sha: "354e80d54f7a9573163cde87a453070854888c4b",
      mode: "100644"
    },
    "public/games/tower-climb/share.mjs": {
      sha: "d0bdb96444ac37dbd4a9a3cda24c0e4f8dccadc7",
      mode: "100644"
    },
    "public/games/tower-climb/shared/game-ui.css": {
      sha: "0ee8856c87cd01a000c447f5edba7b1c6cce1abf",
      mode: "100644"
    },
    "public/games/tower-climb/shared/game-ui.mjs": {
      sha: "5612f1a8b28df61df4f81651756380a07c77af08",
      mode: "100644"
    },
    "public/games/tower-climb/software-renderer.mjs": {
      sha: "806616b2c69a8d95e9ea202509ebb2c652a37d9f",
      mode: "100644"
    },
    "public/games/tower-climb/sources.mjs": {
      sha: "e2b9861bfa5190f3c0b5eaf9007329bbf5fc4f8c",
      mode: "100644"
    },
    "public/games/tower-climb/stairs.mjs": {
      sha: "543fe39c5c3bb2ba10fd5785b0439b313bb775db",
      mode: "100644"
    },
    "public/games/tower-climb/style.css": {
      sha: "6eeb8333db9696532019d5eccb4e7070b837d6c1",
      mode: "100644"
    },
    "public/games/tower-climb/v2-engine.mjs": {
      sha: "33bf399b56f0cec994fb929f9f631897c29fecf3",
      mode: "100644"
    },
    "public/games/tower-climb/vendor/THREE-LICENSE.txt": {
      sha: "cf781430404b0ae0ba7d8dea3457a3515dd7c9b9",
      mode: "100644"
    },
    "public/games/tower-climb/vendor/three.core.min.js": {
      sha: "70c40977daa0f6e1e312c6b58e9bfe49cb5a87a4",
      mode: "100644"
    },
    "public/games/tower-climb/vendor/three.module.min.js": {
      sha: "20d3c112761a519c7780a5ccc9f72a40937fa83b",
      mode: "100644"
    },
    "public/index.html": {
      sha: "4a4834170fd2bd3056ae68be8b292d2fccd00920",
      mode: "100644"
    },
    "public/manifest.webmanifest": {
      sha: "aa16a9071ee62f9b769b5cc67dbc922673e7241a",
      mode: "100644"
    },
    "scripts/browser-platform-ui.mjs": {
      sha: "2318bd5becee397cca24fce0c0611d5fdf1f8fe3",
      mode: "100644"
    },
    "scripts/build.mjs": {
      sha: "4a21a38ff99a027cc2faa3eac55c30dd1b26bde1",
      mode: "100644"
    },
    "scripts/check-cosmos-parity.mjs": {
      sha: "24cc18f8981e2278693fa610c4a506b339bf8938",
      mode: "100644"
    },
    "scripts/check-release.mjs": {
      sha: "f8b36ce98d0959a5caa0bebfc207d6d9124e4739",
      mode: "100644"
    },
    "scripts/check-run1500-map-layout.mjs": {
      sha: "a1bf4e421d948ee9d95282d647c4b9dafc34b3d0",
      mode: "100644"
    },
    "scripts/check-run1500-tiers.mjs": {
      sha: "16e1196d7e52c322dd0cee9892808c1729709da5",
      mode: "100644"
    },
    "scripts/check-run1500-variation.mjs": {
      sha: "cccd8ff51963cdaf9caeeb4c3f1bd8fd22335ae9",
      mode: "100644"
    },
    "scripts/check-sports-results-portrait.mjs": {
      sha: "a8552c91fb4953becc446265b77e2eeeeab5fb2b",
      mode: "100644"
    },
    "scripts/check-sprint-rival-tiers.mjs": {
      sha: "3595dc0f6d8cec9396d621470acdf4fb600fe85b",
      mode: "100644"
    },
    "scripts/generate-courtesy-provenance.py": {
      sha: "23e98cebeb83951c6bc7df54768c97ea81e7c8e1",
      mode: "100644"
    },
    "scripts/paint-cosmos-evidence.py": {
      sha: "a284226fe035bbff4c319530600f8cda9fbb475b",
      mode: "100644"
    },
    "scripts/pin-vault-pace.mjs": {
      sha: "c6fcb3e1893e21af15a3d9941d0d4bd174598867",
      mode: "100644"
    },
    "scripts/render-cosmos-evidence.mjs": {
      sha: "866d18c2e666c07323ae21d91d0ee43df6f046f3",
      mode: "100644"
    },
    "scripts/render-fast-hands-demo.mjs": {
      sha: "e664b1a890c70a5ed381ffe1810c72dd09ea54e9",
      mode: "100644"
    },
    "scripts/render-fast-hands-levels.mjs": {
      sha: "e03bbbd957cc6342ee20b70a612d51b077f61242",
      mode: "100644"
    },
    "scripts/render-v10-blender.py": {
      sha: "d332b8f1ff8c8c692d2534ab83914f74e4b4733e",
      mode: "100644"
    },
    "scripts/render-v10-evidence.mjs": {
      sha: "b8aff7d317df89bfddb4f4fd0f50401eec5f1e9d",
      mode: "100644"
    },
    "scripts/render-v8-blender.py": {
      sha: "3759c198bf8e5d8ca2b4b847466a2d1276f9e9d1",
      mode: "100644"
    },
    "scripts/render-v8-evidence.mjs": {
      sha: "d99a461d26fcd6b7816cff181929864e7214d4e1",
      mode: "100644"
    },
    "scripts/render-v9-blender.py": {
      sha: "f01c2839e8ed0ae88ffca547bb97d17e7f1e3b87",
      mode: "100644"
    },
    "scripts/render-v9-evidence.mjs": {
      sha: "5327dd841a0adc20604d409a21ee38ed70561795",
      mode: "100644"
    },
    "scripts/verify.mjs": {
      sha: "4cb0dc4bfbbbb55f99de85c0559050514e3636b6",
      mode: "100644"
    },
    "source-assets/hurdles/Funin and Sunin.mp3": {
      sha: "9db49d4c091eff00de54255c72ac20a216c09fc9",
      mode: "100644"
    },
    "source-assets/hurdles/cheer1_FoolBoyMedia_397434_hq-preview.mp3": {
      sha: "42e6e02d9d0fe4e538fe0a017171d93b477145ea",
      mode: "100644"
    },
    "source-assets/hurdles/footstep04.ogg": {
      sha: "da3d8ea6250081ca302af44eb496d3758137dd1b",
      mode: "100644"
    },
    "source-assets/hurdles/licenses/CC-BY-4.0-legalcode.html": {
      sha: "ff01e642021cac7a66bcc26383b834cf484d3a48",
      mode: "100644"
    },
    "source-assets/hurdles/licenses/Kenney-RPG-License.txt": {
      sha: "c19921a2fb2402ead892083a2a5d09ce90e7e9e4",
      mode: "100644"
    },
    "source-assets/hurdles/licenses/cheer1-freesound.html": {
      sha: "bfaedc3cf53d08e583203de721f3f8cdf6a864c4",
      mode: "100644"
    },
    "source-assets/hurdles/licenses/cheer2-freesound.html": {
      sha: "7fac5876bd6f0268ac514d5a256636f825e30e11",
      mode: "100644"
    },
    "source-assets/hurdles/licenses/cheer3-freesound.html": {
      sha: "686178f77775abbf535905ceeb9199de7000090e",
      mode: "100644"
    },
    "source-assets/hurdles/licenses/incompetech-faq.html": {
      sha: "8dec1661506ca2664183b1c560bfce0157847b16",
      mode: "100644"
    },
    "source-assets/hurdles/licenses/incompetech-license-page.html": {
      sha: "03642ea731a54a828285bcaf44cafb2d9aefed2b",
      mode: "100644"
    },
    "source-assets/hurdles/licenses/selected-official-catalog-records.json": {
      sha: "2617ac650d651c1ef50326e1fc58c7d0635b7828",
      mode: "100644"
    },
    "source-assets/hurdles/render_selected.py": {
      sha: "eca8298d07fce1139c14f51a9c8a0d322f38cfc1",
      mode: "100644"
    },
    "src/catalog-entries/arcadeplatform.json": {
      sha: "c02056c40124efffe769cd7255d46a3d6a90aec6",
      mode: "100644"
    },
    "src/catalog-entries/echosboundary.json": {
      sha: "7fdf26eca66045090dc0f1b347129ebd4ff24fce",
      mode: "100644"
    },
    "src/catalog-entries/formosabattle.json": {
      sha: "221597b08f678908ded098f4861629a0673d0468",
      mode: "100644"
    },
    "src/catalog-entries/soul10power.json": {
      sha: "724357aa9477ec9f6640c60a3c16e5cc9237ae6d",
      mode: "100644"
    },
    "src/catalog-entries/taiwanfighter.json": {
      sha: "ad44b7734e7f1d7bb57b509c939507cb5172d79d",
      mode: "100644"
    },
    "src/catalog-entries/taiwankart.json": {
      sha: "ea78579532bf81df5906364227ff5f397c295356",
      mode: "100644"
    },
    "src/catalog.mjs": {
      sha: "60f1e1b2adb5f814a84d62d312bf9f11ebfdbb88",
      mode: "100644"
    },
    "src/external-catalog.mjs": {
      sha: "1b4a01e611bd2b2f036040f38f7f81e215d7cb26",
      mode: "100644"
    },
    "src/release.mjs": {
      sha: "abea4202fe9ba2526dd84e3be47234b0fbcae8ef",
      mode: "100644"
    },
    "src/render.mjs": {
      sha: "b1a8a27c3623326c841869e87eeeed08306c8274",
      mode: "100644"
    },
    "tests/app-icons-completion.test.mjs": {
      sha: "8f5a766e8da4e1aa2caedd748005986372f8a9d3",
      mode: "100644"
    },
    "tests/app-icons.test.mjs": {
      sha: "fea3d6b6459c4f6eed19cf247a4aaff52e5344c5",
      mode: "100644"
    },
    "tests/audio-controller-contract.test.mjs": {
      sha: "a6b3f7918b286e246be7ef70a1fc582889ddec53",
      mode: "100644"
    },
    "tests/batch2-integration.test.mjs": {
      sha: "e014860351ee90d7afa930c1f0cd1cce3406ae79",
      mode: "100644"
    },
    "tests/batch2-provenance.test.mjs": {
      sha: "82c4420d62aa26e75b86da80c445b0830bc3d246",
      mode: "100644"
    },
    "tests/beer-audio-channels.test.mjs": {
      sha: "f76826ccd006e877ac0f481edfc90bcfd6a7e5a9",
      mode: "100644"
    },
    "tests/beer-slide-platform.test.mjs": {
      sha: "8ec67c949dcd480baa035afbd7eb64280bb343c8",
      mode: "100644"
    },
    "tests/beer-slide/assets.test.mjs": {
      sha: "508a398989b7b8cedde105c79241c68ff6220bb5",
      mode: "100644"
    },
    "tests/beer-slide/audio-default-fetch.test.mjs": {
      sha: "5988475b9372ad37eaff6c0ebbef0f15c2c097b3",
      mode: "100644"
    },
    "tests/beer-slide/audio.test.mjs": {
      sha: "456e8321a777d9356c04ac86a9993c8692973a91",
      mode: "100644"
    },
    "tests/beer-slide/image-share.test.mjs": {
      sha: "087997d89432533e54e74a3130d8d1a7c96ba77e",
      mode: "100644"
    },
    "tests/beer-slide/physics.test.mjs": {
      sha: "5da88645ea8ae888a6769ec89a284e047eadd0e1",
      mode: "100644"
    },
    "tests/beer-slide/platform-share.test.mjs": {
      sha: "5692003749bc2e5bdfa76949edce21fc3e74b5d8",
      mode: "100644"
    },
    "tests/beer-slide/replay.test.mjs": {
      sha: "3e765f272d702f60f29fd337097012d2bb9ca4b8",
      mode: "100644"
    },
    "tests/beer-slide/revision.test.mjs": {
      sha: "d8fc2479f38150c987ebf2ea329a5b5fef10cb88",
      mode: "100644"
    },
    "tests/beer-slide/ui-flow.test.mjs": {
      sha: "f6c0ef12a44ba7e18202c4af752d55ff793394ba",
      mode: "100644"
    },
    "tests/browser/courtesy-platform.html": {
      sha: "f3aad342a8d0cc8436bf8c792d487830afd2fa5f",
      mode: "100644"
    },
    "tests/build.test.mjs": {
      sha: "7b84811e643c1054fb879a91f3cf4e16b1c6261a",
      mode: "100644"
    },
    "tests/catalog-release.test.mjs": {
      sha: "8e89a4b7651f4cde6f924923992bff0d0037910f",
      mode: "100644"
    },
    "tests/courtesy-contest/background-timing.test.mjs": {
      sha: "deeb195d437ef9497db499d3f3e127c751fb036a",
      mode: "100644"
    },
    "tests/courtesy-contest/bench-layout.test.mjs": {
      sha: "e7e0bbcb9294a2507b87b1c54a97431c5a76a304",
      mode: "100644"
    },
    "tests/courtesy-contest/comic-events.test.mjs": {
      sha: "8f87f4feb9258f65fbf1695d697537e71519babd",
      mode: "100644"
    },
    "tests/courtesy-contest/departure-layout.test.mjs": {
      sha: "06ed2a36a7ef66f85dfaef8e0d24e282a633a17d",
      mode: "100644"
    },
    "tests/courtesy-contest/gameplay-deadline.test.mjs": {
      sha: "f966fbcc8cc7e6ac7e77dd0c5520aef07c1e76bf",
      mode: "100644"
    },
    "tests/courtesy-contest/helpers/private-replay-reference.mjs": {
      sha: "fe641faa988199bc0ad27978b16cffd70503e4f6",
      mode: "100644"
    },
    "tests/courtesy-contest/helpers/scene-harness.mjs": {
      sha: "43092d689b2644329ffbb450e181a859cb4f5a4a",
      mode: "100644"
    },
    "tests/courtesy-contest/immediate-seating.test.mjs": {
      sha: "7474668798385ac1d9cd44cf6cee003f728a5055",
      mode: "100644"
    },
    "tests/courtesy-contest/integration-provenance.test.mjs": {
      sha: "7693d4ded836f0a0884c60af07b8e802b9ca6601",
      mode: "100644"
    },
    "tests/courtesy-contest/intruder-visual-scale.test.mjs": {
      sha: "073792c8d0d9300a10642314ec380b5e743e01fd",
      mode: "100644"
    },
    "tests/courtesy-contest/leaderboard.test.mjs": {
      sha: "c5a45cf943a5666d52a12e9a3ddc34a617a2f4ba",
      mode: "100644"
    },
    "tests/courtesy-contest/music-playback.test.mjs": {
      sha: "438564586982ef3c2585e970e2bf395d7b793914",
      mode: "100644"
    },
    "tests/courtesy-contest/music.test.mjs": {
      sha: "8b5280acfcfd5b7b2f0e6932409363319d093c14",
      mode: "100644"
    },
    "tests/courtesy-contest/page-tap-coverage.test.mjs": {
      sha: "571f8c1d78c20173b6ff19be8ff1776a29d97e4b",
      mode: "100644"
    },
    "tests/courtesy-contest/polish-ui.test.mjs": {
      sha: "5a181c382c01e6287b8a9e11705dffe37763a21f",
      mode: "100644"
    },
    "tests/courtesy-contest/result-mobile.test.mjs": {
      sha: "0543d16304096727e84d4e30ae9ef0b9b1262928",
      mode: "100644"
    },
    "tests/courtesy-contest/round-variation-scene.test.mjs": {
      sha: "de9b880cece0c639f9f1647ed0e488698b8f1b76",
      mode: "100644"
    },
    "tests/courtesy-contest/round-variation.test.mjs": {
      sha: "737afe93540d9c4e0784bd9feee56785aad3d6e7",
      mode: "100644"
    },
    "tests/courtesy-contest/rules.test.mjs": {
      sha: "b00c4db6de04d48748c4383b0a711e0f568a490a",
      mode: "100644"
    },
    "tests/courtesy-contest/runtime-inventory-provenance.test.mjs": {
      sha: "87c26693b07b6df6c3f43099d3bc980d0ccb2f91",
      mode: "100644"
    },
    "tests/courtesy-contest/score-card-polish.test.mjs": {
      sha: "118634118d31e994fac401fe56dc17d9225211fb",
      mode: "100644"
    },
    "tests/courtesy-contest/seat-visual-consistency.test.mjs": {
      sha: "c1149c0bb7ce0edb39586f42fbc1aa5016d89750",
      mode: "100644"
    },
    "tests/courtesy-contest/sfx-context.test.mjs": {
      sha: "56860dcb1ae7ec6084fc1b55bc1e63fdd2ac8a71",
      mode: "100644"
    },
    "tests/courtesy-contest/standing-offers.test.mjs": {
      sha: "1bfaabcb888f1f81f8f8ddce7fdd7c1ac3fbbc23",
      mode: "100644"
    },
    "tests/courtesy-contest/surface-tap-v15.test.mjs": {
      sha: "bbc7e8665fd6eafa9048f6daed3ee8fe4b399c8b",
      mode: "100644"
    },
    "tests/courtesy-contest/tap-guard-v13.test.mjs": {
      sha: "3fe037dd591dba6556e4d5f234ba5932af3dde60",
      mode: "100644"
    },
    "tests/courtesy-contest/tap-provenance.test.mjs": {
      sha: "7ed8424dfe0af244f4c5538a623f960cab0bd59d",
      mode: "100644"
    },
    "tests/courtesy-contest/touch-interaction.test.mjs": {
      sha: "1fd584d1a6206bbcd8f86b4b9518594f3bf88f77",
      mode: "100644"
    },
    "tests/courtesy-contest/v10-pressure.test.mjs": {
      sha: "81157ca25edd5ea3fd4d106f32523be7a44b7ab7",
      mode: "100644"
    },
    "tests/courtesy-contest/v11-pressure.test.mjs": {
      sha: "d4e55821c60a53a55938732b7aaf5a563ccb2634",
      mode: "100644"
    },
    "tests/courtesy-copy-preview.test.mjs": {
      sha: "8e5a2bb57c753403555620d37396d86b76626c17",
      mode: "100644"
    },
    "tests/courtesy-lifecycle.test.mjs": {
      sha: "b010a061f7e16ce12feae0eae7a82a289a0aed41",
      mode: "100644"
    },
    "tests/courtesy-platform.test.mjs": {
      sha: "5b99d85559d16859e6e36978f4d443eabd2efb69",
      mode: "100644"
    },
    "tests/courtesy-result-mobile-provenance.test.mjs": {
      sha: "7e406ed54c909826cb3aaecfc51403a71003c3b2",
      mode: "100644"
    },
    "tests/courtesy-sharing.test.mjs": {
      sha: "c4e78b27dbd7e897a2b49c271e06881521195448",
      mode: "100644"
    },
    "tests/courtesy-touch-inventory-chain.test.mjs": {
      sha: "c4667b752754614cea8a25f4557c67498ec9b50a",
      mode: "100644"
    },
    "tests/courtesy-ui-polish-provenance.test.mjs": {
      sha: "e09b549c4a5671c416352d38a8dc0084542f49cf",
      mode: "100644"
    },
    "tests/courtesy-upgrade-provenance.test.mjs": {
      sha: "e83a2070aef00a588bb2598b862704a3d2c95347",
      mode: "100644"
    },
    "tests/courtesy-upgrade.test.mjs": {
      sha: "4e6471719aff4144bb5c94b1c2c102a8aa1160c1",
      mode: "100644"
    },
    "tests/dialog-layout-provenance.test.mjs": {
      sha: "15893cfc85cbc39873e1d69a2be480728e21051c",
      mode: "100644"
    },
    "tests/dialog-layout-repair-provenance.test.mjs": {
      sha: "9a1e23db7473fa1f8e0d131cd0b6f89443854016",
      mode: "100644"
    },
    "tests/discus/connected-relay.test.mjs": {
      sha: "e99711d0fe64101ae19ec13336ae824b21742154",
      mode: "100644"
    },
    "tests/discus/result-layout-audit.mjs": {
      sha: "7994f19f074194301745af5be4d3a86ea56c386e",
      mode: "100644"
    },
    "tests/discus/share.test.mjs": {
      sha: "172a6ddd9450e2b9a6b889cb719724fce938a526",
      mode: "100644"
    },
    "tests/discus/v3-engine.test.mjs": {
      sha: "1d668f299956ae68aadab45b49810919ceef1112",
      mode: "100644"
    },
    "tests/discus/v3-input.test.mjs": {
      sha: "024b934f777dd82be4cfca75207989329ae0e5a6",
      mode: "100644"
    },
    "tests/discus/wind-review-regression.test.mjs": {
      sha: "63d1df01630a75afbe1429e0b3ff44932677525c",
      mode: "100644"
    },
    "tests/entry-firstpaint.test.mjs": {
      sha: "405dbd523a1711e50f1262a61a5ebe8326d39990",
      mode: "100644"
    },
    "tests/entry-hierarchy.test.mjs": {
      sha: "df472e5a82ca03039a84985f12511db38b7d7fd8",
      mode: "100644"
    },
    "tests/experiment-physics.test.mjs": {
      sha: "8ead78446d730d1945815a99182d8e50cd8d95dc",
      mode: "100644"
    },
    "tests/experiment-ui.test.mjs": {
      sha: "f4a57949c4d34432a0550ab097c389494edb7426",
      mode: "100644"
    },
    "tests/experiment-v2.test.mjs": {
      sha: "8a4b5d999cb5d6628d0dcb42c1a35a1c41bfe921",
      mode: "100644"
    },
    "tests/fast-hands-cooldown-backend.test.mjs": {
      sha: "a0e4da14b63357aa0ee1f667a91e0323d04beb51",
      mode: "100644"
    },
    "tests/fast-hands-leaderboard-api.test.mjs": {
      sha: "89d0fd92e4d9014532db27d0ae94bd503915be12",
      mode: "100644"
    },
    "tests/fast-hands-levels-leaderboard-api.test.mjs": {
      sha: "7ac5590b3d3d82dbb6bdc01efff9c542fad0e78f",
      mode: "100644"
    },
    "tests/fast-hands-upload-outside-top20.test.mjs": {
      sha: "028bac8ccd9b809410a86cbdfa3e81f3f22456de",
      mode: "100644"
    },
    "tests/fast-hands/app-3d.test.mjs": {
      sha: "fee222670e4730a4bcde9e9bd4ee8d381dcb0758",
      mode: "100644"
    },
    "tests/fast-hands/art-polish-presentation.test.mjs": {
      sha: "9f44fb6053fddb3001a3a7530671dde2872bef16",
      mode: "100644"
    },
    "tests/fast-hands/art-polish-provenance.test.mjs": {
      sha: "276e6f749f66280a2380254d010ab9a40d471ff7",
      mode: "100644"
    },
    "tests/fast-hands/auto-input.test.mjs": {
      sha: "717aa1d26cd3dba5aa01e1a31c63ad14678067ad",
      mode: "100644"
    },
    "tests/fast-hands/button-layout-provenance.test.mjs": {
      sha: "9a743ec2c0c1f2ff77c738214937016c9e77bef9",
      mode: "100644"
    },
    "tests/fast-hands/challenge.test.mjs": {
      sha: "16594a299ffd147d6ea9aab4eff66407ed39fe5c",
      mode: "100644"
    },
    "tests/fast-hands/character-appearance-provenance.test.mjs": {
      sha: "4270d2d82ad246514ce5e28af753b8e50a05bb5b",
      mode: "100644"
    },
    "tests/fast-hands/club-flow.test.mjs": {
      sha: "3109e40bb03321a95c328917de144a74aaa812df",
      mode: "100644"
    },
    "tests/fast-hands/club-layout.test.mjs": {
      sha: "d1e0f8a3d85b14ac3e14165e10a92bae76bdd0ed",
      mode: "100644"
    },
    "tests/fast-hands/club-navigation.test.mjs": {
      sha: "44b86307b1f76d88716b13a01846b92563ec1cae",
      mode: "100644"
    },
    "tests/fast-hands/club-provenance.test.mjs": {
      sha: "c1204cf4a5ca94982c90900d5c586fe59b80d6f5",
      mode: "100644"
    },
    "tests/fast-hands/club-results.test.mjs": {
      sha: "7c8c0bce1fe94add3e7a2d5ddee1453f4df65ee4",
      mode: "100644"
    },
    "tests/fast-hands/covers.test.mjs": {
      sha: "995668ca7daa53c14b12399f4d3f42002d36086f",
      mode: "100644"
    },
    "tests/fast-hands/demo-3d.test.mjs": {
      sha: "73a1a135a96a20cd05de4f82bc9c7d549faf0d72",
      mode: "100644"
    },
    "tests/fast-hands/desktop-layout.test.mjs": {
      sha: "1e55a88276d1cce04a1a4a2b16416eb37a354b16",
      mode: "100644"
    },
    "tests/fast-hands/desktop-provenance.test.mjs": {
      sha: "fdcfffe57033d6b4ffd773d111d319a309e11239",
      mode: "100644"
    },
    "tests/fast-hands/dialog-navigation.test.mjs": {
      sha: "12b05bb311677582f4d530d3282520f4c7e87f28",
      mode: "100644"
    },
    "tests/fast-hands/duck-completion-regression.test.mjs": {
      sha: "f930bbaf08c3eb2f088dbb66405bc921d9fb63cc",
      mode: "100644"
    },
    "tests/fast-hands/duck-finale-image.test.mjs": {
      sha: "808ecbe2b692f86c77b328f3e3e84818813314b2",
      mode: "100644"
    },
    "tests/fast-hands/duck-pointerup-regression.test.mjs": {
      sha: "3b16d81d351850962c469946059302530b272de2",
      mode: "100644"
    },
    "tests/fast-hands/duck-room.test.mjs": {
      sha: "1afc8a7bff0e1349930ddc4f6ab194b461670805",
      mode: "100644"
    },
    "tests/fast-hands/duck-score-layout.test.mjs": {
      sha: "5dae12dd25f959148998939f376f52e9fe8fdafd",
      mode: "100644"
    },
    "tests/fast-hands/duck-startup.test.mjs": {
      sha: "096675be9390fcf1ce2de45153c607279522a7a6",
      mode: "100644"
    },
    "tests/fast-hands/duel-athlete-proportions.test.mjs": {
      sha: "f131e32da54eb47fb8650342d026b7152280ecc2",
      mode: "100644"
    },
    "tests/fast-hands/duel-cover-fingers.test.mjs": {
      sha: "a9db6afdaa457612f671d057b64d5139e2866f43",
      mode: "100644"
    },
    "tests/fast-hands/entry-provenance.test.mjs": {
      sha: "7bd58fbeb537853c24a68b4f5c1e8db6db255650",
      mode: "100644"
    },
    "tests/fast-hands/eyes-3d.test.mjs": {
      sha: "cc2f9a6c2a7529472945643d0b73cdc6879ae9f9",
      mode: "100644"
    },
    "tests/fast-hands/feel-test-provenance.test.mjs": {
      sha: "aab083ecf2b19aa81977f265bd8f3062d212f77b",
      mode: "100644"
    },
    "tests/fast-hands/feel-test-rules.test.mjs": {
      sha: "83b2c0b3ee27435dcdfa0df923bc1d1408d8cf65",
      mode: "100644"
    },
    "tests/fast-hands/feel-test-ui.test.mjs": {
      sha: "aa47da7eafec2a38700e58ffd5d26727b1c90c0d",
      mode: "100644"
    },
    "tests/fast-hands/finale-css.test.mjs": {
      sha: "d31e1d598856a955326280bef6295bd7ff2d44c0",
      mode: "100644"
    },
    "tests/fast-hands/finale-image.test.mjs": {
      sha: "0df9e67b2832197a8c0a165d659afbffeaba2145",
      mode: "100644"
    },
    "tests/fast-hands/finale-layout.test.mjs": {
      sha: "5750978dabebd2deb8a5032cd3815f2de98c6f31",
      mode: "100644"
    },
    "tests/fast-hands/finale-provenance.test.mjs": {
      sha: "6b66a7a348a12b6429fb5ebe11e3dfa1cda5bf15",
      mode: "100644"
    },
    "tests/fast-hands/game-motion.test.mjs": {
      sha: "c4d663b93077c53c3e93af10c04e17928ec51a4d",
      mode: "100644"
    },
    "tests/fast-hands/generated-intro-covers.test.mjs": {
      sha: "2801b566cd7934bb408bbe751789b766b3508360",
      mode: "100644"
    },
    "tests/fast-hands/input-clock.test.mjs": {
      sha: "aa1fec020539a31f0716f23c257783b3a1bb092e",
      mode: "100644"
    },
    "tests/fast-hands/input.test.mjs": {
      sha: "418fc5655a0a99ccdb7f6a4f449fa13095a17ca9",
      mode: "100644"
    },
    "tests/fast-hands/intro-readable.test.mjs": {
      sha: "13224453a62d07765e44ae79e9f92a5262398ac3",
      mode: "100644"
    },
    "tests/fast-hands/king-trousers.test.mjs": {
      sha: "4eef4ba8265a6bfa688020499020429f3d4fd479",
      mode: "100644"
    },
    "tests/fast-hands/layout-dart-provenance.test.mjs": {
      sha: "f77120282add1eaea8872112cb8ea557ced2b628",
      mode: "100644"
    },
    "tests/fast-hands/leaderboard-app.test.mjs": {
      sha: "03a462007569cc1250e82fe75369732aad6fe787",
      mode: "100644"
    },
    "tests/fast-hands/leaderboard.test.mjs": {
      sha: "8996bedab1e2bc89ad71082c014c1a997a1dcb4e",
      mode: "100644"
    },
    "tests/fast-hands/levels-art-provenance.test.mjs": {
      sha: "530e0c0cd47731acf41d91939baeec68bef0a379",
      mode: "100644"
    },
    "tests/fast-hands/levels-art-rules.test.mjs": {
      sha: "436583cac5ef5613a25867d0a12f9851b249bc90",
      mode: "100644"
    },
    "tests/fast-hands/levels-art-ui.test.mjs": {
      sha: "21a43bceb35af77b189977220319455a6cc10618",
      mode: "100644"
    },
    "tests/fast-hands/levels-dart-shape.test.mjs": {
      sha: "f9d21d32bd5750573614cd0dcee119be1a8d7125",
      mode: "100644"
    },
    "tests/fast-hands/levels-finale-motion.test.mjs": {
      sha: "79cf3baa0f9ec1ccdf273d1f430e7e7cabe4565e",
      mode: "100644"
    },
    "tests/fast-hands/levels-finale-ui.test.mjs": {
      sha: "eb85767049bc32da8c6fa0c348bccc3222da5605",
      mode: "100644"
    },
    "tests/fast-hands/levels-leaderboard.test.mjs": {
      sha: "29223bd0564dd8eb206de1b70f2658ae3563080d",
      mode: "100644"
    },
    "tests/fast-hands/levels-motion.test.mjs": {
      sha: "e9746e639a65f80fb5b2b4a2135b205ae77e169e",
      mode: "100644"
    },
    "tests/fast-hands/levels-provenance.test.mjs": {
      sha: "3336e7fe86ba4e5472be875c67908ad75d1d7e65",
      mode: "100644"
    },
    "tests/fast-hands/levels-rasterizer.test.mjs": {
      sha: "da33077110960e8b676eae6258ee6d3e32750bd3",
      mode: "100644"
    },
    "tests/fast-hands/levels-replay.test.mjs": {
      sha: "4601264b9b4601d8c8713e5eaad4c6092cb88ac3",
      mode: "100644"
    },
    "tests/fast-hands/levels-rules.test.mjs": {
      sha: "19b01730b2a4c1383dfdf40389f53bfe1e7a89c7",
      mode: "100644"
    },
    "tests/fast-hands/levels-score-image.test.mjs": {
      sha: "a0b52373ebe7a794c8ae339b2e23ce67693d3fcc",
      mode: "100644"
    },
    "tests/fast-hands/levels-sharing.test.mjs": {
      sha: "dd8203c8e84476c765c2d800d24f118fbdd9d5e3",
      mode: "100644"
    },
    "tests/fast-hands/levels-sound.test.mjs": {
      sha: "29510e810961e1b5e04c825ce1c1050486c7f36c",
      mode: "100644"
    },
    "tests/fast-hands/levels-stage-capture.test.mjs": {
      sha: "12af91b73380e71056fd462f4cdad5e3f50a7fa0",
      mode: "100644"
    },
    "tests/fast-hands/levels-ui.test.mjs": {
      sha: "3a00ed9f92cb7a6a72cf51bd5b973adb919edc3f",
      mode: "100644"
    },
    "tests/fast-hands/levels-world.test.mjs": {
      sha: "6ad8b65006ec13afeb0929ca05be486b2a3b02a6",
      mode: "100644"
    },
    "tests/fast-hands/name-refresh-provenance.test.mjs": {
      sha: "803ad98a308b474dc6baefb5cf43965770ba5416",
      mode: "100644"
    },
    "tests/fast-hands/name-refresh-ui.test.mjs": {
      sha: "c4de5ad6b0789a7e0091174888087930c476a055",
      mode: "100644"
    },
    "tests/fast-hands/navigation-level-integration.test.mjs": {
      sha: "827c697d94f646223a554ce284fdad8de6b8fddb",
      mode: "100644"
    },
    "tests/fast-hands/physics.test.mjs": {
      sha: "f2f183104f602394f27b56479b91240709e9c3b1",
      mode: "100644"
    },
    "tests/fast-hands/platform-integration.test.mjs": {
      sha: "fa73e1943f8b97665ee6cc5fb4c9bb352f55d1ce",
      mode: "100644"
    },
    "tests/fast-hands/platform-provenance.test.mjs": {
      sha: "177b07aadaa5eceaaf06309deb35daa204000df4",
      mode: "100644"
    },
    "tests/fast-hands/play-counts-api.test.mjs": {
      sha: "dd4419f3e5140b24258ec16ecba09717cac01dbc",
      mode: "100644"
    },
    "tests/fast-hands/play-counts-client.test.mjs": {
      sha: "a10af0a60f286da7cddc284d7363b2e5cf85b8a1",
      mode: "100644"
    },
    "tests/fast-hands/play-counts-gameplay.test.mjs": {
      sha: "856e3d9ed1214e059b7bd5d3295e61db48916359",
      mode: "100644"
    },
    "tests/fast-hands/practice-choice.test.mjs": {
      sha: "227f5a4702310d44ba8ef94ce3e399f772169600",
      mode: "100644"
    },
    "tests/fast-hands/ranking-provenance.test.mjs": {
      sha: "0fe29e30b3c0bfa0cdcbf59dd8eba811ba5f9dbc",
      mode: "100644"
    },
    "tests/fast-hands/records.test.mjs": {
      sha: "1d3a2f4bf3afae81707f3c32e40f289716bf6e8e",
      mode: "100644"
    },
    "tests/fast-hands/replay.test.mjs": {
      sha: "062379d95d48f99352685477edea29777469dbd1",
      mode: "100644"
    },
    "tests/fast-hands/result-button-layout.test.mjs": {
      sha: "cb18b54eb3446cc579fd7da1e9880b9c2426e601",
      mode: "100644"
    },
    "tests/fast-hands/result-copy.test.mjs": {
      sha: "52b70d529e42e4c34547ff991dc4be051b28622e",
      mode: "100644"
    },
    "tests/fast-hands/result-upload-controller.test.mjs": {
      sha: "c83b2ab773f6e5a95fa16f1e3b2608112ecf5463",
      mode: "100644"
    },
    "tests/fast-hands/result-upload-layout.test.mjs": {
      sha: "a3b064eef567483da9bd61cdbb6b6ed26c39ddb1",
      mode: "100644"
    },
    "tests/fast-hands/result-upload-provenance.test.mjs": {
      sha: "264447a58ad4147a32fb05383d79e03c110582fa",
      mode: "100644"
    },
    "tests/fast-hands/scene.test.mjs": {
      sha: "1f0fac7d5c523601161b4f140e5f57d8e21c3953",
      mode: "100644"
    },
    "tests/fast-hands/score-image.test.mjs": {
      sha: "bd6ef4aeb1396dd47e154324d033b5e08506cf81",
      mode: "100644"
    },
    "tests/fast-hands/screen-alpha-atlas.test.mjs": {
      sha: "7f1a2f087237dbef5544030cd6a97cebacfe2a61",
      mode: "100644"
    },
    "tests/fast-hands/screen-alpha-provenance.test.mjs": {
      sha: "6388177c3a21c5a5182edeb40df140883902e7b3",
      mode: "100644"
    },
    "tests/fast-hands/screen-alpha-ui.test.mjs": {
      sha: "5be8c6c8e233ad74f662aba88e099c47fb20d7b2",
      mode: "100644"
    },
    "tests/fast-hands/selection-guards.test.mjs": {
      sha: "9c5cec93efd11b243034de5e97895107b519caf3",
      mode: "100644"
    },
    "tests/fast-hands/share-shell.test.mjs": {
      sha: "00e9753833c05a8a9953f3fe4e647fb4a441b302",
      mode: "100644"
    },
    "tests/fast-hands/share.test.mjs": {
      sha: "3710a7a3fee707908c92cf4fb87301b04c08f706",
      mode: "100644"
    },
    "tests/fast-hands/sharing-flow-provenance.test.mjs": {
      sha: "56ea0bf10e8ea7bb5f3f0eaa1ebf2d515ac9cc23",
      mode: "100644"
    },
    "tests/fast-hands/sharing-provenance.test.mjs": {
      sha: "a7ac2c5e3513e233449384774db29dafbe95f605",
      mode: "100644"
    },
    "tests/fast-hands/shuttle.test.mjs": {
      sha: "aed6c8f9b2680eeb6feebdaa2879c96376c7e254",
      mode: "100644"
    },
    "tests/fast-hands/sound.test.mjs": {
      sha: "442482aa95ca8a455b402a2f1adf1cbd0412f552",
      mode: "100644"
    },
    "tests/fast-hands/source-provenance.test.mjs": {
      sha: "047cb3ce2037ac0a402df139743bb0cd5a3176f0",
      mode: "100644"
    },
    "tests/fast-hands/split-entries-provenance.test.mjs": {
      sha: "be76f0e25e5a9713e5fc692a145dbdcbe7b602d5",
      mode: "100644"
    },
    "tests/fast-hands/split-entries.test.mjs": {
      sha: "5f956e6fa5b10081e0cb689b8ab6e797c8983c06",
      mode: "100644"
    },
    "tests/fast-hands/stability-provenance.test.mjs": {
      sha: "f289e23007b115835dce4f19df43a5967f3102d1",
      mode: "100644"
    },
    "tests/fast-hands/stability-ui.test.mjs": {
      sha: "a6b850dfb7cb399ee774ce09aca8c92831b26e8f",
      mode: "100644"
    },
    "tests/fast-hands/stage.test.mjs": {
      sha: "a94c67b5041e7f156047ae4dd7813c47cf0629b0",
      mode: "100644"
    },
    "tests/fast-hands/toolbar-safety.test.mjs": {
      sha: "3576489445641a9cbeba11ff042b15bc54ae666b",
      mode: "100644"
    },
    "tests/fast-hands/ui-shell.test.mjs": {
      sha: "8301dea497713ccc518ab1dc559d391245307c6f",
      mode: "100644"
    },
    "tests/fighter-entry-count.test.mjs": {
      sha: "b6e521dcfbcb3fccc54f177cda03929672da0ff8",
      mode: "100644"
    },
    "tests/fighter-entry-preview-provenance.test.mjs": {
      sha: "9b51a64fe74f01caef27a69eebd294d329661c85",
      mode: "100644"
    },
    "tests/first-render-readiness.test.mjs": {
      sha: "de3cdccc426bfcd4c69ed7cd57ec6256a2e931d2",
      mode: "100644"
    },
    "tests/fixtures/home-label-baseline.json": {
      sha: "66c9531c2335e35e36ecab7cc051361e363ca7ee",
      mode: "100644"
    },
    "tests/fixtures/javelin-humor-baseline.json": {
      sha: "e84937f06dd4ce856878de7a51a029f29bd51e34",
      mode: "100644"
    },
    "tests/fixtures/javelin-results-baseline.json": {
      sha: "0203f948c7912ded6809f520fcaacb14cc62d28a",
      mode: "100644"
    },
    "tests/fixtures/pinball-physics-baseline.json": {
      sha: "83699a771244c1dcc50f3e69d919e1131d2eaf46",
      mode: "100644"
    },
    "tests/fixtures/portal-catalog.mjs": {
      sha: "64d9fa4e512c8509840311e10a7884255711bc0b",
      mode: "100644"
    },
    "tests/fixtures/runner-integration-baseline.json": {
      sha: "f636e23897f2ec331eaf7ec9200e056885c6a7a8",
      mode: "100644"
    },
    "tests/fixtures/runner-visual-baseline.json": {
      sha: "cac4b0995d5d624c6874282bc70b4afe4a28ccda",
      mode: "100644"
    },
    "tests/fixtures/sprint-fall-baseline.json": {
      sha: "0b68cc3d91acca5bb1493d7c75f93a6a4e66b570",
      mode: "100644"
    },
    "tests/fixtures/upload-toolbar-polish-baseline.json": {
      sha: "395001880505d52c701971c8115f74dd1ae34375",
      mode: "100644"
    },
    "tests/fixtures/vault-journey-baseline.json": {
      sha: "50ffce18bae086fcd91fb09b068995a4f3681933",
      mode: "100644"
    },
    "tests/fixtures/vault-pace-baseline.json": {
      sha: "40d6a66c9d5be5eaeeb2120d47b52ad49325b930",
      mode: "100644"
    },
    "tests/fixtures/vault-sky-baseline.json": {
      sha: "ec2f67d013abebb2ff9c27849e34eb7eeb4a8c50",
      mode: "100644"
    },
    "tests/game-audio-events.test.mjs": {
      sha: "32524ce2ec0470f94c9fa76a75fdc6975e03669e",
      mode: "100644"
    },
    "tests/game-scrollbars.test.mjs": {
      sha: "63f9ac71d06a3c8d23d448602841e441ee826791",
      mode: "100644"
    },
    "tests/help-controller.test.mjs": {
      sha: "3f2884a4edc384a56310043680637c609c6d5993",
      mode: "100644"
    },
    "tests/helpers/app-icons-completion-provenance.mjs": {
      sha: "fec35f83907245500f1605b0b6dd0ba540c82a6b",
      mode: "100644"
    },
    "tests/helpers/courtesy-copy-preview-provenance.mjs": {
      sha: "24bf22218c5800c5241546da2de10d1a2a06971d",
      mode: "100644"
    },
    "tests/helpers/courtesy-integration-provenance.mjs": {
      sha: "3aa21f8f32ac39e5b394126c8c669dfc9a542105",
      mode: "100644"
    },
    "tests/helpers/courtesy-result-mobile-provenance.mjs": {
      sha: "8d9ee6b26fbe7dd06229f84c92de009fa8c5181c",
      mode: "100644"
    },
    "tests/helpers/courtesy-touch-coverage-provenance.mjs": {
      sha: "570513db00d5f04a19bb87d55e2d6895b4dbd0d4",
      mode: "100644"
    },
    "tests/helpers/courtesy-touch-inventory-repair.mjs": {
      sha: "982c11deacc89805b814d797189955d3250bd6cc",
      mode: "100644"
    },
    "tests/helpers/courtesy-ui-polish-provenance.mjs": {
      sha: "24c0f84bc6a89eb705b84e7330227d87344ada18",
      mode: "100644"
    },
    "tests/helpers/courtesy-upgrade-provenance.mjs": {
      sha: "897e0115e201e0d49a56d62b42ce15810cc1904d",
      mode: "100644"
    },
    "tests/helpers/dialog-layout-provenance.mjs": {
      sha: "406a0fae5bf2be71fd9981ed17c41fee957ff681",
      mode: "100644"
    },
    "tests/helpers/dialog-layout-repair-provenance.mjs": {
      sha: "65397759ac88f2ada9b83fbe3c673ccdc984f1a9",
      mode: "100644"
    },
    "tests/helpers/entry-boundary.mjs": {
      sha: "e429fd70ea2f848b7b42c59b8b68d2d7dd5dfbc4",
      mode: "100644"
    },
    "tests/helpers/fast-hands-allowlist.mjs": {
      sha: "e7cb874c6387c4d9bed2a5284c1b3abc5cf9ba45",
      mode: "100644"
    },
    "tests/helpers/fast-hands-art-polish-pins.mjs": {
      sha: "2d095353862f102ef21887aea44ec090cc06022f",
      mode: "100644"
    },
    "tests/helpers/fast-hands-art-polish-provenance.mjs": {
      sha: "a82408c3a6156bca3cfad540422abcf34bed566f",
      mode: "100644"
    },
    "tests/helpers/fast-hands-button-layout-provenance.mjs": {
      sha: "a8795faf03e43f4255ae0b35c8f5050dfe8a0168",
      mode: "100644"
    },
    "tests/helpers/fast-hands-character-appearance-pins.mjs": {
      sha: "53e2db95fe9bfe2cc183c98cace30bc5dae2bea5",
      mode: "100644"
    },
    "tests/helpers/fast-hands-character-appearance-provenance.mjs": {
      sha: "e9543830048755104d7640c37db63e65dbf24b35",
      mode: "100644"
    },
    "tests/helpers/fast-hands-club-provenance.mjs": {
      sha: "932a2e815c41f39d6c2d447262b94e9c0a0f6d54",
      mode: "100644"
    },
    "tests/helpers/fast-hands-desktop-provenance.mjs": {
      sha: "35b1d06b87b169f8013c81b850a29839a9af8f32",
      mode: "100644"
    },
    "tests/helpers/fast-hands-entry-provenance.mjs": {
      sha: "604d88e22064080eed03ac1c80541c8f96173af6",
      mode: "100644"
    },
    "tests/helpers/fast-hands-feel-test-provenance.mjs": {
      sha: "3be1fdbe4a5bb313e66ceb01f61858ff77033eb7",
      mode: "100644"
    },
    "tests/helpers/fast-hands-finale-pins.mjs": {
      sha: "897804d5178d82377d17f929676c2279c7d3c034",
      mode: "100644"
    },
    "tests/helpers/fast-hands-finale-provenance.mjs": {
      sha: "56ffdc47d9a40fdf05cb17428e4efd720dbbb8be",
      mode: "100644"
    },
    "tests/helpers/fast-hands-historical-world.mjs": {
      sha: "eee4feb0d9b1752d70c6de68f4461865e625594c",
      mode: "100644"
    },
    "tests/helpers/fast-hands-layout-dart-provenance.mjs": {
      sha: "35db1ed72dd00c185d538b0bcfeeaf0978199d2c",
      mode: "100644"
    },
    "tests/helpers/fast-hands-levels-art-provenance.mjs": {
      sha: "6a851adef59d32b7cc4248bb98e08f6a747009f1",
      mode: "100644"
    },
    "tests/helpers/fast-hands-levels-provenance.mjs": {
      sha: "cd7a011696369afa1df56ec48f28cbef3357d3f2",
      mode: "100644"
    },
    "tests/helpers/fast-hands-name-refresh-provenance.mjs": {
      sha: "8a2ebb3efd065f382db3a8d2dffb5afa58d5321c",
      mode: "100644"
    },
    "tests/helpers/fast-hands-provenance.mjs": {
      sha: "66538f14bac5f250bd782ac393c3a9bbb73e2a0d",
      mode: "100644"
    },
    "tests/helpers/fast-hands-ranking-provenance.mjs": {
      sha: "f9da64db01ef28e47a3a7c583d1c805c53b42305",
      mode: "100644"
    },
    "tests/helpers/fast-hands-result-upload-pins.mjs": {
      sha: "7b1aed14f9bd51a275a6f4e06be257f3c81abadb",
      mode: "100644"
    },
    "tests/helpers/fast-hands-result-upload-provenance.mjs": {
      sha: "8ff9189490c76497801fb99c6072aa62e201b476",
      mode: "100644"
    },
    "tests/helpers/fast-hands-screen-alpha-provenance.mjs": {
      sha: "bf88e47e53042d2a5b6850e715cabd58892571b9",
      mode: "100644"
    },
    "tests/helpers/fast-hands-sharing-flow-pins.mjs": {
      sha: "856fe9e887946ccc2ccc5477524841230b92f4b8",
      mode: "100644"
    },
    "tests/helpers/fast-hands-sharing-flow-provenance.mjs": {
      sha: "6408cf99d2a1cead419f4ac5fc01bb9e854cd8ed",
      mode: "100644"
    },
    "tests/helpers/fast-hands-sharing-provenance.mjs": {
      sha: "0f9b42b6315ab5fefe8543aafeee43626cd15170",
      mode: "100644"
    },
    "tests/helpers/fast-hands-split-entries-catalog.mjs": {
      sha: "375f78a348f243611c8790e8038596ec56865134",
      mode: "100644"
    },
    "tests/helpers/fast-hands-split-entries-pins.mjs": {
      sha: "17f14340ac8ef853473809b5bfc75f7ed97b67c9",
      mode: "100644"
    },
    "tests/helpers/fast-hands-split-entries-provenance.mjs": {
      sha: "494f9b5aac80d4b65e8279b3e618958ae731f8d3",
      mode: "100644"
    },
    "tests/helpers/fast-hands-stability-provenance.mjs": {
      sha: "6a585c928ed3b7ac029537157aeb2badb4363c29",
      mode: "100644"
    },
    "tests/helpers/fighter-entry-preview-provenance.mjs": {
      sha: "dcfea70af0f00c8e9de000432fc67c7e22cb7185",
      mode: "100644"
    },
    "tests/helpers/high-jump-compact-entry-provenance.mjs": {
      sha: "1010467d40d9e0cbe83a498ffe0b1bdb51d60edb",
      mode: "100644"
    },
    "tests/helpers/high-jump-coordination-provenance.mjs": {
      sha: "2bf15e168095e8f3795b5913d9bbbb37e7858784",
      mode: "100644"
    },
    "tests/helpers/high-jump-result-preview-provenance.mjs": {
      sha: "25e8aca5e5f55e560ef34768dbd0c08cca38eaaf",
      mode: "100644"
    },
    "tests/helpers/home-label-provenance.mjs": {
      sha: "3cf3cd2c391b6f7f549fe8915dd86d88d53f1643",
      mode: "100644"
    },
    "tests/helpers/javelin-humor-provenance.mjs": {
      sha: "bfefb6cc00ddb7cbac057a88d9aced6c7043647a",
      mode: "100644"
    },
    "tests/helpers/javelin-results-provenance.mjs": {
      sha: "e4482ff5828cd1ff0c85df98a2fff2d024934c0e",
      mode: "100644"
    },
    "tests/helpers/leaderboard-sqlite.mjs": {
      sha: "4027a4bc73e03dace2eb1774aefc844c6bef8c0e",
      mode: "100644"
    },
    "tests/helpers/loading-look-provenance.mjs": {
      sha: "ba1d71efffe476e6d9b50d7a63c345a1a5dba03e",
      mode: "100644"
    },
    "tests/helpers/mobile-gesture-page-provenance.mjs": {
      sha: "c6f6b247398954f58765ba1909f02ad433016c13",
      mode: "100644"
    },
    "tests/helpers/mobile-gestures-preview-provenance.mjs": {
      sha: "941ddd09b0eaf1b856438fb76ef0ccabfa0ad261",
      mode: "100644"
    },
    "tests/helpers/pinball-integration-provenance.mjs": {
      sha: "449abc35799c3805ffd46113c218a76dd8a7b904",
      mode: "100644"
    },
    "tests/helpers/pinball-polish-provenance.mjs": {
      sha: "04c4aba96a55fff2bbb221af9ae8189398cb13da",
      mode: "100644"
    },
    "tests/helpers/pinball-proportions-fixture.mjs": {
      sha: "fee60f878aff3b342bbb35d030c85841fe38a953",
      mode: "100644"
    },
    "tests/helpers/player-help-cleanup-provenance.mjs": {
      sha: "26315f995fdea6dffa855e181f6c4c719551565a",
      mode: "100644"
    },
    "tests/helpers/preview-fast-gate-provenance.mjs": {
      sha: "90e1471d2ef38d6f63120872cc0654ec00b809cd",
      mode: "100644"
    },
    "tests/helpers/preview-sports-counts-provenance.mjs": {
      sha: "4643d9ce34a7896425a20f2081d9a291e6d8beb8",
      mode: "100644"
    },
    "tests/helpers/rod-polish-provenance.mjs": {
      sha: "422e530128adc01d879c44ac9bac9bec2a886beb",
      mode: "100644"
    },
    "tests/helpers/rod-replay-provenance.mjs": {
      sha: "cf9eeaaa7151b20904da370942fcd3420b0ec127",
      mode: "100644"
    },
    "tests/helpers/rod-result-provenance.mjs": {
      sha: "e890a9dcc97beb9e57c6b9cd038686382ca97a98",
      mode: "100644"
    },
    "tests/helpers/rod-viewport-provenance.mjs": {
      sha: "eb0731ad3b197aba25b3969a2647b4b872729349",
      mode: "100644"
    },
    "tests/helpers/run1500-tiers-provenance.mjs": {
      sha: "8844220c3ddb805fdc52e79e18a622b1fc093c68",
      mode: "100644"
    },
    "tests/helpers/run1500-variation-provenance.mjs": {
      sha: "358d14d2c14123fa027140a114a17cfab6aae670",
      mode: "100644"
    },
    "tests/helpers/runner-catalog.mjs": {
      sha: "e9141782abb59f4a83e7fc65982e949469a0234c",
      mode: "100644"
    },
    "tests/helpers/runner-integration-provenance.mjs": {
      sha: "aa9db1d762acd485413f6ab92dd7a4246a7f72d5",
      mode: "100644"
    },
    "tests/helpers/runner-visual-provenance.mjs": {
      sha: "7cba9a9d3958132b2befcc69cad4d0fecaf6f00c",
      mode: "100644"
    },
    "tests/helpers/sports-help-provenance.mjs": {
      sha: "64752d3bc93a3eeceefbc41f4ca2c73733a9bd92",
      mode: "100644"
    },
    "tests/helpers/sports-results-portrait-provenance.mjs": {
      sha: "72fd469aad53044792c648f1bd401b1685a1e509",
      mode: "100644"
    },
    "tests/helpers/sprint-fall-provenance.mjs": {
      sha: "8d7117031499a7e4447e547d7a5766b9eaa14240",
      mode: "100644"
    },
    "tests/helpers/sprint-rival-tiers-provenance.mjs": {
      sha: "e163f2407424d02e7fb1bca34e0d469cc206d020",
      mode: "100644"
    },
    "tests/helpers/startup-provenance.mjs": {
      sha: "01dbf045390c9c2a43dc1bf4c92ed96c9ef1743d",
      mode: "100644"
    },
    "tests/helpers/studio-provenance.mjs": {
      sha: "838fd801bf73ba560f3aac6ccfc8fb717defbf41",
      mode: "100644"
    },
    "tests/helpers/upload-toolbar-polish-provenance.mjs": {
      sha: "c928d32cc9eb03c7b79a91d1ba04f87dee45ae46",
      mode: "100644"
    },
    "tests/helpers/v2-provenance.mjs": {
      sha: "afdcbf8b3d18b1a6298db98f1866abfb09731846",
      mode: "100644"
    },
    "tests/helpers/vault-air-balance-provenance.mjs": {
      sha: "6d85d7fedb9afb39ac2006fea32e3d1d4b3e2309",
      mode: "100644"
    },
    "tests/helpers/vault-air-coordination-provenance.mjs": {
      sha: "d5460c821b50cb5934c4c0f2e83fb1654ba8a1bd",
      mode: "100644"
    },
    "tests/helpers/vault-coordination-merge-provenance.mjs": {
      sha: "a2aa1355eed53dbded5e251d3dbd417948961090",
      mode: "100644"
    },
    "tests/helpers/vault-journey-provenance.mjs": {
      sha: "c9e0b14f0e6f194394f44cea6954a07771c48c26",
      mode: "100644"
    },
    "tests/helpers/vault-pace-provenance.mjs": {
      sha: "7db7dde0904b838f86a1d3586b8cb01c64018f5b",
      mode: "100644"
    },
    "tests/helpers/vault-sky-provenance.mjs": {
      sha: "e0f1b20fa535cfa49ab4ef9dd2d7b5fc34c784a2",
      mode: "100644"
    },
    "tests/high-jump/approach-instructions.test.mjs": {
      sha: "89e857242efbb3d6027ab562a9a3b0220794dbcb",
      mode: "100644"
    },
    "tests/high-jump/clock.test.mjs": {
      sha: "97066a0b4f309fcdf3d3e775ed6e64320d0327f6",
      mode: "100644"
    },
    "tests/high-jump/compact-entry-provenance.test.mjs": {
      sha: "971bbd0e3a81cc217e1c53cb6916ec6a6bcbcc85",
      mode: "100644"
    },
    "tests/high-jump/coordination-geometry.test.mjs": {
      sha: "bd2a2e98fe5fe81f2c375275de9681fe76e70e32",
      mode: "100644"
    },
    "tests/high-jump/coordination-input.test.mjs": {
      sha: "3138c1c24a3fed107383e5ec868267202eee81bb",
      mode: "100644"
    },
    "tests/high-jump/coordination.test.mjs": {
      sha: "b38c7b7586b994e236aebcaddf7a06f15848ad81",
      mode: "100644"
    },
    "tests/high-jump/desktop-dialog-layout.test.mjs": {
      sha: "e629150a00cbe731f218761875a3a40ccf28d6c5",
      mode: "100644"
    },
    "tests/high-jump/fixtures/highjump-c3baa575.mjs": {
      sha: "dc37c6a1b36622e51429e8b3d52a3635165d861c",
      mode: "100644"
    },
    "tests/high-jump/fixtures/longjump-main-reference.mjs": {
      sha: "6a7bd444081b91bc80ad4c591f8d1f5a87fd325b",
      mode: "100644"
    },
    "tests/high-jump/helpers/coordination-trace.mjs": {
      sha: "07c6e07889edeb99ed9ef88cfd6ebee0bc743f9c",
      mode: "100644"
    },
    "tests/high-jump/helpers/reproduce-asjk.mjs": {
      sha: "0b6bdd37ed83714e132d2fc241ab5f8774112508",
      mode: "100644"
    },
    "tests/high-jump/physics.test.mjs": {
      sha: "5a86b558ea8c0dfc9e76c55101d5513eaf77bb19",
      mode: "100644"
    },
    "tests/high-jump/provenance.test.mjs": {
      sha: "dfa424125b5ea1179c8114da194eb499becbe41f",
      mode: "100644"
    },
    "tests/high-jump/result-photo-consistency.test.mjs": {
      sha: "f3a2e76b7f1c6d2c0fd149eecf14ebcd4c19aabe",
      mode: "100644"
    },
    "tests/high-jump/result-preview-provenance.test.mjs": {
      sha: "b92a407f778331c28efedd1c3ba94a028fc23c8c",
      mode: "100644"
    },
    "tests/high-jump/sharing-flow.test.mjs": {
      sha: "7a500c9ac57255c8e35412253b7b7b942d098c61",
      mode: "100644"
    },
    "tests/high-jump/short-replay.test.mjs": {
      sha: "522f01efd7c3274a7f6e573832f6dfa522a02ed7",
      mode: "100644"
    },
    "tests/high-jump/v3-controller.test.mjs": {
      sha: "caa7bf366829e8b42717579d79645c2517da0440",
      mode: "100644"
    },
    "tests/high-jump/v3-input.test.mjs": {
      sha: "383d7d8ddd1d43e36576189b724e92ed3ac12289",
      mode: "100644"
    },
    "tests/home-layout.browser.html": {
      sha: "b414090915f0324cef8e1b4e70ef285d960d4c77",
      mode: "100644"
    },
    "tests/home-layout.test.mjs": {
      sha: "574e1f6c4f9ef8741067c1e2d97b49e46f473832",
      mode: "100644"
    },
    "tests/home-views-api.test.mjs": {
      sha: "68ebdb1f437a01e2ff1f5b4181ec065fb7d9caff",
      mode: "100644"
    },
    "tests/home-views-client.test.mjs": {
      sha: "3a3386b3923ffe6ee3cf335779f73fceeddbd95f",
      mode: "100644"
    },
    "tests/honor-board-api.test.mjs": {
      sha: "29c7856fb594bea4b11bd52c5ed76e4a4fd410f4",
      mode: "100644"
    },
    "tests/honor-board-view.test.mjs": {
      sha: "8bbd72491296451c4e8b061e24d3f1c7f1575b30",
      mode: "100644"
    },
    "tests/hurdles-catalog.test.mjs": {
      sha: "bd900c4de1e8db29f820be250b6eaa9a972759a3",
      mode: "100644"
    },
    "tests/hurdles-platform.test.mjs": {
      sha: "f8b61e3c3de932f4395db90c450a4554bc6f391e",
      mode: "100644"
    },
    "tests/hurdles/accessibility.test.mjs": {
      sha: "05c671e6ce36e869f66505bbc460f2d027aff418",
      mode: "100644"
    },
    "tests/hurdles/helpers/matched-race.mjs": {
      sha: "5265b022c3c7042cadfcedc47be481dd55abea19",
      mode: "100644"
    },
    "tests/hurdles/input.test.mjs": {
      sha: "8dd21c3bb0dc7209b1d1124cd17f09a00680fe4d",
      mode: "100644"
    },
    "tests/hurdles/pacing.test.mjs": {
      sha: "4e229103bea03899b99dd8b075b64b3bf186115f",
      mode: "100644"
    },
    "tests/hurdles/physics.test.mjs": {
      sha: "6042c48f5d2c31a3ef8f1982e558072e5c773a72",
      mode: "100644"
    },
    "tests/hurdles/platform-ui.test.mjs": {
      sha: "a7bf683b9e7b186cffc73106ceff824ad160888f",
      mode: "100644"
    },
    "tests/hurdles/play-surface.test.mjs": {
      sha: "8e98e889cd0fa97074e6f9dc0b49658442af7745",
      mode: "100644"
    },
    "tests/hurdles/replay.test.mjs": {
      sha: "01e155bf3967e6f2dc08309fc29b93ab3348bb9c",
      mode: "100644"
    },
    "tests/hurdles/result-fit.test.mjs": {
      sha: "a85e2993c034c897aacbae272422a578cb773d85",
      mode: "100644"
    },
    "tests/hurdles/result-guard.test.mjs": {
      sha: "438ae845b11b8277b7f25f32d19b201af5a1a694",
      mode: "100644"
    },
    "tests/hurdles/revision.test.mjs": {
      sha: "a61444b4329ed21e57f2c272ba211c1a03c029e7",
      mode: "100644"
    },
    "tests/hurdles/share.test.mjs": {
      sha: "8d70050fe39a35d275b7750fa4a01a31c95e158a",
      mode: "100644"
    },
    "tests/javelin/audio-adapter.test.mjs": {
      sha: "5609ca80fa2140cd489512bf1fe48247730dabc7",
      mode: "100644"
    },
    "tests/javelin/audio.test.mjs": {
      sha: "83f0467304872287363e0beb337f49875393fcbf",
      mode: "100644"
    },
    "tests/javelin/foul-v3.test.mjs": {
      sha: "1c3514bd4d4f281f0b53f5ad613dbd6fac4e3201",
      mode: "100644"
    },
    "tests/javelin/humor-provenance.test.mjs": {
      sha: "b5c55cc19f35641c2ef11b7037a5f13a6c20f455",
      mode: "100644"
    },
    "tests/javelin/integration.test.mjs": {
      sha: "7a2555c71fba2ecf70dadd4fc5156dd7fe343066",
      mode: "100644"
    },
    "tests/javelin/physics.test.mjs": {
      sha: "d1b1f503f1c19b7a48b682d1dd24bcd5aeab0d06",
      mode: "100644"
    },
    "tests/javelin/platform.test.mjs": {
      sha: "e4e987fe24cf9b41e9513e7090df24e3b9870ce5",
      mode: "100644"
    },
    "tests/javelin/presentation.test.mjs": {
      sha: "59d9efd0ef3f091a471a4a057a5f09d1b64d9744",
      mode: "100644"
    },
    "tests/javelin/range-v3.test.mjs": {
      sha: "9db282aefe3590d3a936c7eb84231372f50bfe84",
      mode: "100644"
    },
    "tests/javelin/render.test.mjs": {
      sha: "97a6f3d46db9d683d27833cad73700106282c74a",
      mode: "100644"
    },
    "tests/javelin/result-dom.test.mjs": {
      sha: "18a5a182c05710772b2556f2119ea52077d32046",
      mode: "100644"
    },
    "tests/javelin/result-humor.test.mjs": {
      sha: "c8273e44e0d3e9b3695ef86374c05cc5ece2fb6a",
      mode: "100644"
    },
    "tests/javelin/results-provenance.test.mjs": {
      sha: "eadbf7e22f69a48c3c43f4c797fb902a7076627b",
      mode: "100644"
    },
    "tests/javelin/share-platform.test.mjs": {
      sha: "c3a9da4a2d04461c908a0372417e58098de9fa8e",
      mode: "100644"
    },
    "tests/jump-batch1.test.mjs": {
      sha: "9a420418ce53cb090671f7bb42a1a9e53467ea1d",
      mode: "100644"
    },
    "tests/jump-provenance.test.mjs": {
      sha: "1344b07b21774f475a9bc8483a50991b51e16903",
      mode: "100644"
    },
    "tests/leaderboard-api.test.mjs": {
      sha: "900dd94d67820d1e85fb40bdac1e24cf1d7f746e",
      mode: "100644"
    },
    "tests/leaderboard-client.test.mjs": {
      sha: "056c3baee7c0d3551e361a22672db812ee969856",
      mode: "100644"
    },
    "tests/leaderboard-config.test.mjs": {
      sha: "0baf60b53d062d5ff34522e934f6453efc457aea",
      mode: "100644"
    },
    "tests/leaderboard-diagnostic-cost.test.mjs": {
      sha: "f2bc23031691f32f8cc43da9595f3f84f3993bff",
      mode: "100644"
    },
    "tests/leaderboard-enabled-controller.test.mjs": {
      sha: "63e3ba833df61befaa02bd2bbf088d43759ff3b8",
      mode: "100644"
    },
    "tests/leaderboard-nine.test.mjs": {
      sha: "4c3f4d90e9904c6af07599332f7f017f4700318b",
      mode: "100644"
    },
    "tests/leaderboard-repository.test.mjs": {
      sha: "f9ca76ca6ce3fd1d6cfa796b86860b3cc0cbe5f2",
      mode: "100644"
    },
    "tests/leaderboard-scroll.test.mjs": {
      sha: "f67be9039802ea757aceb722eb5332b516c9d51f",
      mode: "100644"
    },
    "tests/leaderboard-upload-cooldown.test.mjs": {
      sha: "d44969ff0c318a35a0816b60e2367aa1b0fc06b7",
      mode: "100644"
    },
    "tests/loading-look-provenance.test.mjs": {
      sha: "ede83cbcaba05b7ffd9e3d2619b4ecf15cfcde61",
      mode: "100644"
    },
    "tests/loading-look.test.mjs": {
      sha: "7bc95da69699e863cfb7fa95587298e6835294c1",
      mode: "100644"
    },
    "tests/long-jump/audio.test.mjs": {
      sha: "a42fc0494bc6e832a0e4b7986900470c26d85d96",
      mode: "100644"
    },
    "tests/long-jump/browser-dom.html": {
      sha: "6e283af9c7bbe980083017b568b91b9c1f3c2b13",
      mode: "100644"
    },
    "tests/long-jump/browser-portrait-layout.html": {
      sha: "aa94b2cf80fc391358846d464c565a5ace261a8a",
      mode: "100644"
    },
    "tests/long-jump/browser-recovery.html": {
      sha: "4542ff3bd37531ae248940f72e8a7274339543d0",
      mode: "100644"
    },
    "tests/long-jump/browser-root-origin.html": {
      sha: "f4306d61b1a451291d69b568c45792e533a2d378",
      mode: "100644"
    },
    "tests/long-jump/capture.test.mjs": {
      sha: "61d33b1b7fbf4bae9e7eeb996216343e32cdd687",
      mode: "100644"
    },
    "tests/long-jump/character.test.mjs": {
      sha: "e108e04a248043f6f7b03a1c5324c4dbfb8e1b3a",
      mode: "100644"
    },
    "tests/long-jump/controls.test.mjs": {
      sha: "3452ae4f10b1dae166aa946663954d4d25419715",
      mode: "100644"
    },
    "tests/long-jump/cosmic-route.test.mjs": {
      sha: "c33676cc6d0cd91400d400d551cf0c92ce3dad46",
      mode: "100644"
    },
    "tests/long-jump/cosmic-scenery.test.mjs": {
      sha: "2795e7bacd99eb6a258b4bb567d6f86168431d46",
      mode: "100644"
    },
    "tests/long-jump/cosmic-verdicts.test.mjs": {
      sha: "a5366cbea29003bc0f60f4095a6e64bbc1baead4",
      mode: "100644"
    },
    "tests/long-jump/dialogs.test.mjs": {
      sha: "b82f4aa78a63321b87bad3b10e894a5028ec1df6",
      mode: "100644"
    },
    "tests/long-jump/endless-multiverse.test.mjs": {
      sha: "a483e8d4cd4ef743481c2c7babda605fc668d54f",
      mode: "100644"
    },
    "tests/long-jump/fixtures/cosmic-legacy-route.json": {
      sha: "0af23c5eecd1590539bdd0c08125a0fc8a2ff450",
      mode: "100644"
    },
    "tests/long-jump/fixtures/v8-feel.json": {
      sha: "6a6b11e0534eeafee6363d72a295fdb7f7fe0eba",
      mode: "100644"
    },
    "tests/long-jump/flavour.test.mjs": {
      sha: "09eb5ade1e92b647819423dd6f37a59a508f656e",
      mode: "100644"
    },
    "tests/long-jump/game-lifecycle.test.mjs": {
      sha: "dfbc7e189debd754d242fb7ef186a82cfb7bcab7",
      mode: "100644"
    },
    "tests/long-jump/landing-preview.test.mjs": {
      sha: "ee578aab6ab5799917031e43644295c41a130b02",
      mode: "100644"
    },
    "tests/long-jump/layout.test.mjs": {
      sha: "3f66e2ed82324165e38ec94a1cda4811c8448483",
      mode: "100644"
    },
    "tests/long-jump/play-surface.test.mjs": {
      sha: "6f5908c67e483d70e762e1b511e69762fbad03a1",
      mode: "100644"
    },
    "tests/long-jump/polish.test.mjs": {
      sha: "0c617e91b1cf03e22a7cbe95b21b4f132998f659",
      mode: "100644"
    },
    "tests/long-jump/prepare-recovery-browser.mjs": {
      sha: "2516eebb90102719178205f6254ac79f11753cbe",
      mode: "100644"
    },
    "tests/long-jump/prepare-root-origin-browser.mjs": {
      sha: "bc22a75bba7bca0fa4a86769e15f07d1d5c850f1",
      mode: "100644"
    },
    "tests/long-jump/prepare-viewport-diagnostics-browser.mjs": {
      sha: "f97a00abc714de3af8286da410455fe95b17a5ae",
      mode: "100644"
    },
    "tests/long-jump/raw-result-preview.test.mjs": {
      sha: "56f14eff1fb2ee0e0355049dbd3c69043052e2cf",
      mode: "100644"
    },
    "tests/long-jump/replay-result-ui.test.mjs": {
      sha: "baf855c5d00db7f1373b61c87958ac756c64c4c6",
      mode: "100644"
    },
    "tests/long-jump/replay.test.mjs": {
      sha: "21ce3edbbd7a4889be79751edfbdc3abbb09a390",
      mode: "100644"
    },
    "tests/long-jump/result-view.test.mjs": {
      sha: "905d03a6487871f17757cb6882b2d4237c41c2a9",
      mode: "100644"
    },
    "tests/long-jump/rotation-dialog.test.mjs": {
      sha: "24c3d0cef3c022cfc8b9dd2f7cb09b062b82350b",
      mode: "100644"
    },
    "tests/long-jump/rotation-input.test.mjs": {
      sha: "d106563ccdd507d667e7443c70305c0ba9641736",
      mode: "100644"
    },
    "tests/long-jump/sandpits.test.mjs": {
      sha: "7b2375ea33feb4ccb1473744b30d4101eae51aa8",
      mode: "100644"
    },
    "tests/long-jump/scenario-v06.mjs": {
      sha: "d13bd4cc8fd605c5275e8f192bd818f80c7696d0",
      mode: "100644"
    },
    "tests/long-jump/selected-audio.test.mjs": {
      sha: "822bee2d9c003392c5958cb39693e4574eb82848",
      mode: "100644"
    },
    "tests/long-jump/selected-dialog.test.mjs": {
      sha: "d077d6f069c2098b27901defbe45c72acb2923c8",
      mode: "100644"
    },
    "tests/long-jump/share-v04.test.mjs": {
      sha: "a14355d87793c5464d2c3b16a84edafe73f3a2f8",
      mode: "100644"
    },
    "tests/long-jump/share-v05.test.mjs": {
      sha: "8fe0f2ddeae825b247865b0ba76ae689bd6ab45c",
      mode: "100644"
    },
    "tests/long-jump/share.test.mjs": {
      sha: "14c62fbf9c434b5ffa9320fb2e11c82d06222a5d",
      mode: "100644"
    },
    "tests/long-jump/standalone-dialog.test.mjs": {
      sha: "d02fb1125fc63dc5855f874e1da38b82c14f8172",
      mode: "100644"
    },
    "tests/long-jump/v10-landmark-structure.test.mjs": {
      sha: "1a523bab55d2bde48c023fcc8ead034447db3811",
      mode: "100644"
    },
    "tests/long-jump/v10-scenery.test.mjs": {
      sha: "36711cd7f2ba8cef9674bf65246b9af88991bb36",
      mode: "100644"
    },
    "tests/long-jump/v8-motion.test.mjs": {
      sha: "0bcbb1f0e49c016a756cb0fcfcfb34f71031d465",
      mode: "100644"
    },
    "tests/long-jump/v8-presentation.test.mjs": {
      sha: "68ec7c513fb3aad16e4088f89203fbd233f457da",
      mode: "100644"
    },
    "tests/long-jump/v8-scenarios.mjs": {
      sha: "48314cbf34befa4a0d5d73d13c644e99578f2149",
      mode: "100644"
    },
    "tests/long-jump/v8-scenery.test.mjs": {
      sha: "301f2ae57080bb0e9988310c20bc90ede5ccc74c",
      mode: "100644"
    },
    "tests/long-jump/v8-verdicts.test.mjs": {
      sha: "f6a8c1fd5f3b9349fe89abb204f9454220d8a812",
      mode: "100644"
    },
    "tests/long-jump/v8-world.test.mjs": {
      sha: "20d04391cbe3ef986c35b18bd0fed20ebc9a2fda",
      mode: "100644"
    },
    "tests/long-jump/v9-feel.test.mjs": {
      sha: "3b47512ebc4b5a3b43c3bfc0ce765d908c03596b",
      mode: "100644"
    },
    "tests/long-jump/v9-presentation.test.mjs": {
      sha: "035662d9425b90129f2e55f4a1c31216aef6fda4",
      mode: "100644"
    },
    "tests/long-jump/v9-route.test.mjs": {
      sha: "08b8a75e96c00958870ef3976c81f55d3bf74b81",
      mode: "100644"
    },
    "tests/long-jump/v9-scenery.test.mjs": {
      sha: "7b9d27060fc506371c3944ea6c5ec06c0fb929ac",
      mode: "100644"
    },
    "tests/long-jump/verdicts.test.mjs": {
      sha: "71ab3e9126381626d3f4bfaf416442a164e9a612",
      mode: "100644"
    },
    "tests/long-jump/viewport-diagnostics.test.mjs": {
      sha: "aad7faf184d1a4836647a95b33cf5b9043918728",
      mode: "100644"
    },
    "tests/long-jump/viewport-root-origin.test.mjs": {
      sha: "03e7ec568ab8ec57faf4d17fe443c0651ec857c3",
      mode: "100644"
    },
    "tests/minigame-provenance.test.mjs": {
      sha: "0224953c78bc08733b6a7d5ad00ee3432368189e",
      mode: "100644"
    },
    "tests/mobile-budget.test.mjs": {
      sha: "a6e1f6129993b16b6e0f7eb57826c2379c88cbdd",
      mode: "100644"
    },
    "tests/mobile-gesture-page-provenance.test.mjs": {
      sha: "c84f9aab0ed04ccf3901eb6ed528f49af9c1b1ca",
      mode: "100644"
    },
    "tests/mobile-gesture-page.test.mjs": {
      sha: "e0c127a852f53e01c30584cbb50308fd72e8515b",
      mode: "100644"
    },
    "tests/mobile-gestures-preview-provenance.test.mjs": {
      sha: "ae70555019e821c4474039e2bbcd930821d239d2",
      mode: "100644"
    },
    "tests/mobile-gestures.test.mjs": {
      sha: "6c3c606d8bf64065070281bcbbc9d61f239ed7c6",
      mode: "100644"
    },
    "tests/naming-followup.test.mjs": {
      sha: "070a6927ef6cb1f46440a6ea536470672b889de0",
      mode: "100644"
    },
    "tests/nine-game-metrics.test.mjs": {
      sha: "3f2122ba41c84a7a8a46ef425062938a5942fabd",
      mode: "100644"
    },
    "tests/nine-play-counts.test.mjs": {
      sha: "e314122f549488ae284c0132398498ea95129e2c",
      mode: "100644"
    },
    "tests/pinball-api.test.mjs": {
      sha: "35f1d2075a2c3e854f77aeade41ed6a3ba671135",
      mode: "100644"
    },
    "tests/pinball-isolation.test.mjs": {
      sha: "adf1f7096d0a392f8c66d14f575bf5d28e89265c",
      mode: "100644"
    },
    "tests/pinball-play-counts.test.mjs": {
      sha: "574e7919c30a4e1a06a86def4266ec60dfac338a",
      mode: "100644"
    },
    "tests/pinball-polish-provenance.test.mjs": {
      sha: "9d49a6a0124d0811b1b0d10b8873d33597ae684d",
      mode: "100644"
    },
    "tests/pinball-thumbnail.test.mjs": {
      sha: "f9d24829b71c7dfb524601598a5327ff74e96129",
      mode: "100644"
    },
    "tests/pinball/audio-default.test.mjs": {
      sha: "c7243c52f84b8da73582aba77c07797f4935c17c",
      mode: "100644"
    },
    "tests/pinball/catalog.test.mjs": {
      sha: "f1a84123ba2a039e2bd5b992b7ea4e9f7af40320",
      mode: "100644"
    },
    "tests/pinball/contact-extra.test.mjs": {
      sha: "a222bb21200022f834a7ce691e9d5d341acdb21f",
      mode: "100644"
    },
    "tests/pinball/engine-settlement.test.mjs": {
      sha: "9a1c74aafa71c2659de9dd0aea951c37c2b15792",
      mode: "100644"
    },
    "tests/pinball/interface.test.mjs": {
      sha: "118f4a639ec1e57f02d14d98a54fb1b53e23232b",
      mode: "100644"
    },
    "tests/pinball/layout.test.mjs": {
      sha: "045a7194dd44928e1cd126f2a3641810fbf29d1b",
      mode: "100644"
    },
    "tests/pinball/leaderboard.test.mjs": {
      sha: "fe19aeba6f86c099b273a293bfa279cef0cc0fd2",
      mode: "100644"
    },
    "tests/pinball/lifecycle.test.mjs": {
      sha: "8a5fd895c79f0616beb7a479deffd551e0a0749c",
      mode: "100644"
    },
    "tests/pinball/no-fade.test.mjs": {
      sha: "bca85762c8b7d800b9cb5a159a2d46cae509c54d",
      mode: "100644"
    },
    "tests/pinball/proportions.test.mjs": {
      sha: "33714e90bd4be2dcee2211d5c7a8f84358bfeff0",
      mode: "100644"
    },
    "tests/pinball/provenance.test.mjs": {
      sha: "f7d45b174fa303afec1e64b19931301050cda7cc",
      mode: "100644"
    },
    "tests/pinball/reentry-safety.test.mjs": {
      sha: "24d03e6c7691daee02181fd40ac37d6f8f214f1a",
      mode: "100644"
    },
    "tests/pinball/requested-polish.test.mjs": {
      sha: "b0327259dce21177db3554e500980a238a2af55f",
      mode: "100644"
    },
    "tests/pinball/result-focus.test.mjs": {
      sha: "e314c547a5b4e9214ebdd28ae02f14f5c09a8fc4",
      mode: "100644"
    },
    "tests/pinball/score-card.test.mjs": {
      sha: "57c14b59387e4f3c64ab3fa6a2c68249240a6124",
      mode: "100644"
    },
    "tests/pinball/share.test.mjs": {
      sha: "8f1e574d1f1bcbbfb53af40e27f9db4ac1e98b90",
      mode: "100644"
    },
    "tests/pinball/snapshot.test.mjs": {
      sha: "da71d95c59d21699bad3ce20d05700735d4805db",
      mode: "100644"
    },
    "tests/pinball/window-visibility.test.mjs": {
      sha: "8717ad3e5874a53c6c3098d866b5440327c58eb1",
      mode: "100644"
    },
    "tests/platform-game-ui.test.mjs": {
      sha: "52d1eb060cff9a949b3bfae8dcce9ca5e970d8c8",
      mode: "100644"
    },
    "tests/platform-home-label-provenance.test.mjs": {
      sha: "b592fadfb3f387d94a07042a4bc2bfd366241513",
      mode: "100644"
    },
    "tests/platform-home-label.test.mjs": {
      sha: "9ecced75767f80f4c8814ec140214318122ad875",
      mode: "100644"
    },
    "tests/platform-ui-helpers.test.mjs": {
      sha: "c4942e8f8033a8e14ec54b572d2b0497b8b4bedd",
      mode: "100644"
    },
    "tests/play-counts-api.test.mjs": {
      sha: "329a573239e1e39f98882bd54d0235e0ab298a12",
      mode: "100644"
    },
    "tests/play-counts-client.test.mjs": {
      sha: "313503e60e3937c8d6bd195f58e3b7179f16f57a",
      mode: "100644"
    },
    "tests/play-counts-home.test.mjs": {
      sha: "7ef9a7309d3b2e07184ed394f48811c74fc84849",
      mode: "100644"
    },
    "tests/play-counts-repository.test.mjs": {
      sha: "35178496d63f079b6df13cc249ff8e45629fb208",
      mode: "100644"
    },
    "tests/player-copy.test.mjs": {
      sha: "314d697cae9c8ee7d41b75265f7197ed2c170ced",
      mode: "100644"
    },
    "tests/player-help-cleanup-provenance.test.mjs": {
      sha: "f3abb64dfb72ed5504d5cb219d9d68b9ac1104c5",
      mode: "100644"
    },
    "tests/png-hierarchy.test.mjs": {
      sha: "a45e187ad36e371df6f9c6995e397fd5f2aa6a2a",
      mode: "100644"
    },
    "tests/png-score-completeness.test.mjs": {
      sha: "55faa67637daa28e0696035357b4db2d0f16496b",
      mode: "100644"
    },
    "tests/pole-vault-rules-isolation.test.mjs": {
      sha: "677493498692e6fb5e3e734add095bdffe1702ce",
      mode: "100644"
    },
    "tests/pole-vault/air-balance-provenance.test.mjs": {
      sha: "b9f608609e7b8e4e8b63536901f3533ec84eb644",
      mode: "100644"
    },
    "tests/pole-vault/air-balance.test.mjs": {
      sha: "a03e24355a02736586665aaa4e0425cce83bbf31",
      mode: "100644"
    },
    "tests/pole-vault/air-coordination.test.mjs": {
      sha: "391bd4b6ddfa4926d971aa78faf95e72fadd94f7",
      mode: "100644"
    },
    "tests/pole-vault/fixtures/build-ui-fixture.mjs": {
      sha: "8d72e0d40c14cab6d627ba80ec7cf90be7f56d4b",
      mode: "100644"
    },
    "tests/pole-vault/fixtures/continuous-scenery.html": {
      sha: "53b5dce8c422e637856d8ab12d7ccac68adb914e",
      mode: "100644"
    },
    "tests/pole-vault/fixtures/paced-journey.html": {
      sha: "1ac9be4f5758e50dc485cf29f3920fba0eaf3cc6",
      mode: "100644"
    },
    "tests/pole-vault/fixtures/visual-fixture.html": {
      sha: "7e81e88d4fa8c30a60dab95b4ae5e3740bf5018d",
      mode: "100644"
    },
    "tests/pole-vault/game-ending.test.mjs": {
      sha: "81ab4706c56c30140f442bde14bcd0aeffb79575",
      mode: "100644"
    },
    "tests/pole-vault/game-hand-events.test.mjs": {
      sha: "59c4cf474a976776619c02f22bcc572f72a09f6f",
      mode: "100644"
    },
    "tests/pole-vault/help-flow.test.mjs": {
      sha: "b3b19f38f52c4cc0a12242f850fc1d930532a194",
      mode: "100644"
    },
    "tests/pole-vault/helpers/balance-parent.mjs": {
      sha: "1b774f095c35000ad8d50c705d6e456f4c7e8687",
      mode: "100644"
    },
    "tests/pole-vault/helpers/balance-player.mjs": {
      sha: "c4c784b446556d533333ef0412b825faa9693f09",
      mode: "100644"
    },
    "tests/pole-vault/helpers/game-harness.mjs": {
      sha: "773a7298345db3b584d8f38c34aea3437ae2cc9e",
      mode: "100644"
    },
    "tests/pole-vault/helpers/motion-strategy.mjs": {
      sha: "e7a07b59cc36185b4ba0df63af3314a5ab3f1fb5",
      mode: "100644"
    },
    "tests/pole-vault/helpers/pace-strategy.mjs": {
      sha: "82105417039d0a44cf523909773568c412183b5a",
      mode: "100644"
    },
    "tests/pole-vault/helpers/scene-harness.mjs": {
      sha: "e08318620e99288385578eb0f58cbe529e248d05",
      mode: "100644"
    },
    "tests/pole-vault/imperfect-pace.test.mjs": {
      sha: "553e170e3f833c3288c5ccbe6b2f5ebfb733e8d9",
      mode: "100644"
    },
    "tests/pole-vault/input.test.mjs": {
      sha: "6cb6eeb1d37c1962e38eed5d6b8ecdfbe102bfcc",
      mode: "100644"
    },
    "tests/pole-vault/journey-hud.test.mjs": {
      sha: "f461a07a935f73ca15f6863bc39cfb40b0a8de5e",
      mode: "100644"
    },
    "tests/pole-vault/journey-models.test.mjs": {
      sha: "d7566a36453d94cd3c7c25402b0faa4c0531b770",
      mode: "100644"
    },
    "tests/pole-vault/journey-provenance.test.mjs": {
      sha: "28493545a9dd42263292d71cfb149f0022fe7fe9",
      mode: "100644"
    },
    "tests/pole-vault/journey-stages.test.mjs": {
      sha: "061fbf4a7e45971fe5f9ec1fd4ece7e0a25dc9bf",
      mode: "100644"
    },
    "tests/pole-vault/mobile-hud.test.mjs": {
      sha: "263d0c9ee777986a317cf4faf1cae0850ef77f5c",
      mode: "100644"
    },
    "tests/pole-vault/pace-provenance.test.mjs": {
      sha: "000abc170bc2b635881ad4fef1c0ea2d680f430e",
      mode: "100644"
    },
    "tests/pole-vault/paced-ascent.test.mjs": {
      sha: "84545b9ba72951704fd889132a60a3714dd87e26",
      mode: "100644"
    },
    "tests/pole-vault/physics.test.mjs": {
      sha: "b45c3e48e80e6a0928ec1bf745f826e460e3530e",
      mode: "100644"
    },
    "tests/pole-vault/platform-lifecycle.test.mjs": {
      sha: "193c29318648f8eaac88ded783ad6d918211db78",
      mode: "100644"
    },
    "tests/pole-vault/result-frame.test.mjs": {
      sha: "7c14f794d3142cc5bc255bfea897f85e7b641d0b",
      mode: "100644"
    },
    "tests/pole-vault/result-guard.test.mjs": {
      sha: "8eaff8f7cb47d17b8055a16da3d95367a8326789",
      mode: "100644"
    },
    "tests/pole-vault/share.test.mjs": {
      sha: "891404aba2b4282f9e9a41657bf7176ec3fdf351",
      mode: "100644"
    },
    "tests/pole-vault/sky-journey.test.mjs": {
      sha: "8398818e824f14949f2d5af9882c0b5c02b24643",
      mode: "100644"
    },
    "tests/pole-vault/sky-provenance.test.mjs": {
      sha: "068d7eaae6a4eb3ee2863311283074c85c0898d8",
      mode: "100644"
    },
    "tests/pole-vault/sky-render.test.mjs": {
      sha: "aefa9ce089c74357cb5f02d5e095a9918ab5727f",
      mode: "100644"
    },
    "tests/portal-art.test.mjs": {
      sha: "8efafc2dbe5cc07b55e0d3557d2337795f1d4826",
      mode: "100644"
    },
    "tests/portal-catalog.test.mjs": {
      sha: "439a54dd2fd1552267875123932835ce1babfe97",
      mode: "100644"
    },
    "tests/preview-fast-gate-provenance.test.mjs": {
      sha: "2e48fc86725914e7f1ef1b3609f861b8b86d278f",
      mode: "100644"
    },
    "tests/preview-sports-counts-provenance.test.mjs": {
      sha: "53d76b896b40497b90016d93ddef674108c54d15",
      mode: "100644"
    },
    "tests/preview-upload-isolation.test.mjs": {
      sha: "c8efa05f9fc5e3ed82134718f2eadeeacc008c69",
      mode: "100644"
    },
    "tests/ranking-refinement.test.mjs": {
      sha: "2d0dbfe6ae919fc5452d284a540f556e856b305e",
      mode: "100644"
    },
    "tests/reaction-rod-platform.test.mjs": {
      sha: "2d61911bea56f607c750a16a9bd4b95e4c0f3b0e",
      mode: "100644"
    },
    "tests/reaction-rod/art-v4-baseline.json": {
      sha: "639389d18929de809230e7b848865be4874d5fff",
      mode: "100644"
    },
    "tests/reaction-rod/art.test.mjs": {
      sha: "f35dea5e0f8fd691b3355bf4e968977cdeb974b6",
      mode: "100644"
    },
    "tests/reaction-rod/crouch.test.mjs": {
      sha: "c01e0bb434f58fbe67bc8220765bb26adc81f795",
      mode: "100644"
    },
    "tests/reaction-rod/difficulty.test.mjs": {
      sha: "ede7f009641de425bae7a012ac4e506135582ce8",
      mode: "100644"
    },
    "tests/reaction-rod/final-moment.test.mjs": {
      sha: "dc6db9abb3110187d2a79e8c0969dd3ca8f962b4",
      mode: "100644"
    },
    "tests/reaction-rod/final-photo.test.mjs": {
      sha: "c2fa8eae107796c5daf8985dc00d3dcf832fbfb5",
      mode: "100644"
    },
    "tests/reaction-rod/fixtures/source-result-base-physics.mjs": {
      sha: "087846f9432cfc622ac20f7f552b89f3011f9fae",
      mode: "100644"
    },
    "tests/reaction-rod/fixtures/source-v9-game.mjs": {
      sha: "a3ee98fbab23b9dce1fdc6b207f6640ebfc2c7f1",
      mode: "100644"
    },
    "tests/reaction-rod/framing-v7.test.mjs": {
      sha: "1f58cbe8cb24c7b2ee3982ecb246d8f0d02d0054",
      mode: "100644"
    },
    "tests/reaction-rod/model-crouch.test.mjs": {
      sha: "d00eafdc439c07b3c308bf2f3fb49b6778c5edfb",
      mode: "100644"
    },
    "tests/reaction-rod/physics.test.mjs": {
      sha: "9ceb250f770639df274ab1f3638f823727fc164c",
      mode: "100644"
    },
    "tests/reaction-rod/polish-provenance.test.mjs": {
      sha: "88938b4a14fce7594e7730d6fd1dbc67c08160de",
      mode: "100644"
    },
    "tests/reaction-rod/refinement.test.mjs": {
      sha: "13ace31e44359b9012213fb91e4ad5adc5afc415",
      mode: "100644"
    },
    "tests/reaction-rod/replay-integration.test.mjs": {
      sha: "759fbd2fbe9125e3ff68567cb4a8c7d9f43ebda8",
      mode: "100644"
    },
    "tests/reaction-rod/replay-layout.test.mjs": {
      sha: "2cec936b07dff5b8f4a0156c1fe8d841e679794e",
      mode: "100644"
    },
    "tests/reaction-rod/replay-provenance.test.mjs": {
      sha: "98019865e1a9ce7be900db0b582a02679017f704",
      mode: "100644"
    },
    "tests/reaction-rod/replay-scene.test.mjs": {
      sha: "38156f6d7fb50519003591d6f7c66661b0ae1259",
      mode: "100644"
    },
    "tests/reaction-rod/replay.test.mjs": {
      sha: "09bc89daafe8c3f32153fe3e3bff9e133703f70d",
      mode: "100644"
    },
    "tests/reaction-rod/result-layout.test.mjs": {
      sha: "fd19e0cf5779ad4f9c7f2cd315760de9af96ee31",
      mode: "100644"
    },
    "tests/reaction-rod/result-polish.test.mjs": {
      sha: "98149e543d626bf938fafae7344fa8c88fb08278",
      mode: "100644"
    },
    "tests/reaction-rod/result-provenance.test.mjs": {
      sha: "1abc4b68f1a72c3feb53767f4db64c8629f35d12",
      mode: "100644"
    },
    "tests/reaction-rod/share.test.mjs": {
      sha: "3f1f7d7f59aab500d8b8b1a1c6da672e34af69c7",
      mode: "100644"
    },
    "tests/reaction-rod/snapshot-v7.test.mjs": {
      sha: "25802c244dd546129d79e373843aa220c24d34e5",
      mode: "100644"
    },
    "tests/reaction-rod/standing.test.mjs": {
      sha: "d6de1b04d7caeb90b0f5789a1f794159c687e72d",
      mode: "100644"
    },
    "tests/reaction-rod/ui.test.mjs": {
      sha: "2776ab2ba2837b92c05b215e449583f8de2c8bb7",
      mode: "100644"
    },
    "tests/reaction-rod/viewport-provenance.test.mjs": {
      sha: "1b70eede10590f06a8e4df60de43adb4d59deebe",
      mode: "100644"
    },
    "tests/reaction-rod/viewport.test.mjs": {
      sha: "31d8bb8c69a04258bcbcb4215faa2a43fea3d94b",
      mode: "100644"
    },
    "tests/render.test.mjs": {
      sha: "5d8249d34e50ce0a84926ac0c3e191a923df4092",
      mode: "100644"
    },
    "tests/result-hierarchy.test.mjs": {
      sha: "049fc6b45e2e638f78344e2a23fffa9abdccf5ee",
      mode: "100644"
    },
    "tests/rival-tiers/simulation.mjs": {
      sha: "e6951c9e034f3df817878461083e5b80bb98ee17",
      mode: "100644"
    },
    "tests/run-1500m/arcade.test.mjs": {
      sha: "b12d35ea90755893d1165d11433b273c3bf14026",
      mode: "100644"
    },
    "tests/run-1500m/race.test.mjs": {
      sha: "06d1a4cdfce360f0833a21341dc4fa8244c77683",
      mode: "100644"
    },
    "tests/run-1500m/simulation.mjs": {
      sha: "b2c8ca02a58b21aea042e70099da7f969813397e",
      mode: "100644"
    },
    "tests/run-1500m/tactics-review.test.mjs": {
      sha: "4806cadca79697865d0e64e9ebe7a9356f14af6c",
      mode: "100644"
    },
    "tests/run-1500m/tactics.test.mjs": {
      sha: "75a29499adf749c72d0578068d3adc5862df58c0",
      mode: "100644"
    },
    "tests/run-1500m/tiers.test.mjs": {
      sha: "9fad0d397ea17ae01e590e590aaee7108c0cffc6",
      mode: "100644"
    },
    "tests/run-1500m/variation.test.mjs": {
      sha: "5e4a6e25c68aba9c5d22985e28a7bf783fc658d9",
      mode: "100644"
    },
    "tests/run-1500m/view.test.mjs": {
      sha: "653b996553479379a03dc13cb8ddbe713a7c2da3",
      mode: "100644"
    },
    "tests/run-400m/clock.test.mjs": {
      sha: "5a3dd79b53a80af9aa4d80e3bb4d3002820070a2",
      mode: "100644"
    },
    "tests/run-400m/difficulty.test.mjs": {
      sha: "cef0e345fe67f2e2abdd4437e38c65896929267f",
      mode: "100644"
    },
    "tests/run-400m/full-race.test.mjs": {
      sha: "df1202e66774cd43fa09d85a70ec2709d919fb0a",
      mode: "100644"
    },
    "tests/run-400m/guidance.test.mjs": {
      sha: "56a2c4821f723ce41c314465e1c2dd8f9e7bc05f",
      mode: "100644"
    },
    "tests/run-400m/phased-rhythm.test.mjs": {
      sha: "b52133347e6f8e71ac394395d08ad00a5a6aa914",
      mode: "100644"
    },
    "tests/run-400m/race.test.mjs": {
      sha: "21238e0420a6af4edb9d778a8613ce3f9102d94d",
      mode: "100644"
    },
    "tests/run1500-tiers-provenance.test.mjs": {
      sha: "0784606ee71586280b1d81ef42d51541e0b29038",
      mode: "100644"
    },
    "tests/run1500-variation-provenance.test.mjs": {
      sha: "95c52d53aed005b4350ee7bd6001096968c73a1a",
      mode: "100644"
    },
    "tests/runners/audio.test.mjs": {
      sha: "32697438887244c2aa1e41f9b3ab2be3df744071",
      mode: "100644"
    },
    "tests/runners/contracts.test.mjs": {
      sha: "d7459dd1b0b9796f3331f753ddf59ec79adb1af9",
      mode: "100644"
    },
    "tests/runners/leaderboard-ui.test.mjs": {
      sha: "a7d80f7535ada224c13013ba71e79ba69ad125fd",
      mode: "100644"
    },
    "tests/runners/lifecycle.test.mjs": {
      sha: "e3fd936d9df75470aa226eca22a90bb3ff8384be",
      mode: "100644"
    },
    "tests/runners/presentation.test.mjs": {
      sha: "c8cb18d47cf7f696d3a0dcd476f2f353599677c2",
      mode: "100644"
    },
    "tests/runners/provenance.test.mjs": {
      sha: "9268695c279043feefb448a2e9486f8c0d585554",
      mode: "100644"
    },
    "tests/runners/result-replay.test.mjs": {
      sha: "515c3799de65617ca2b10d0a4d9ffc4dbe047e9e",
      mode: "100644"
    },
    "tests/runners/rig.test.mjs": {
      sha: "39e5d57a46e6adea35d60a4d6994b100ac685b63",
      mode: "100644"
    },
    "tests/runners/share-behavior.test.mjs": {
      sha: "881c59d5728e6305944d605c04a1d460ceaaf852",
      mode: "100644"
    },
    "tests/runners/share-config.test.mjs": {
      sha: "36b795726456e0ca3de4d36961e396496d33e371",
      mode: "100644"
    },
    "tests/runners/visual-provenance.test.mjs": {
      sha: "d46c9485d11c21f6a93dea608cf9a202d195bc34",
      mode: "100644"
    },
    "tests/shared-controls.test.mjs": {
      sha: "bb23dafde1d1130db04bae1f625e76e6d40a610b",
      mode: "100644"
    },
    "tests/shared-entry-provenance.test.mjs": {
      sha: "0b79c9fdfbf46476c559bd4e12885b1a15e4a2e4",
      mode: "100644"
    },
    "tests/shared-entry.test.mjs": {
      sha: "4ab63dc208f3475d0d919ade84b031b592f008f2",
      mode: "100644"
    },
    "tests/shared-help.test.mjs": {
      sha: "3fa7f7ab67122997cdfea102803085372911d5eb",
      mode: "100644"
    },
    "tests/shot-put/controller.test.mjs": {
      sha: "4da1b8697a3aa5a9561e46e4b8962c184a85e487",
      mode: "100644"
    },
    "tests/shot-put/relay-opportunity.test.mjs": {
      sha: "8f4c647d05c8c1e2a53db0cb46e3f31fb8ed6d5c",
      mode: "100644"
    },
    "tests/shot-put/share.test.mjs": {
      sha: "41914ff4ae76bcf26a61a2ac48ca57e08f9d34b1",
      mode: "100644"
    },
    "tests/shot-put/sky-route.test.mjs": {
      sha: "d5cb8bb10ef21c3cc801e2dcd49542f7176f3b9d",
      mode: "100644"
    },
    "tests/shot-put/v3-controls.test.mjs": {
      sha: "b91d07e4c4f8cec3d4f0723dceb483c609e071e3",
      mode: "100644"
    },
    "tests/shot-put/v3-engine.test.mjs": {
      sha: "efc339aa4166f4707f873efb28c4477bfea9830c",
      mode: "100644"
    },
    "tests/soul-catalog.test.mjs": {
      sha: "5dafc25aa086cfc0bf5225e409dec8f4ecfdab5c",
      mode: "100644"
    },
    "tests/sports-counts-api.test.mjs": {
      sha: "a92fcf7049f207fa6c5d9a4748bec6087cf1fde6",
      mode: "100644"
    },
    "tests/sports-help-provenance.test.mjs": {
      sha: "0e0e4272438b9d378a25d84f4b3c1454ac02e2ed",
      mode: "100644"
    },
    "tests/sports-help.test.mjs": {
      sha: "a30203217fa03d84dfbd04442f215bb6dbeeba5d",
      mode: "100644"
    },
    "tests/sports-missing-counts.test.mjs": {
      sha: "6bcd721abcc80edbe03cec2258475c7e907a0f71",
      mode: "100644"
    },
    "tests/sports-results-portrait-provenance.test.mjs": {
      sha: "1877ab25068c9be42120433af829e175fe344bdf",
      mode: "100644"
    },
    "tests/sprint-100m/INTEGRATION.md": {
      sha: "9f06ecb00a51644fc5ec00363ed2229131491946",
      mode: "100644"
    },
    "tests/sprint-100m/audio.test.mjs": {
      sha: "8d11c6582306a433d86ecbdf60d1b2b734ec0b64",
      mode: "100644"
    },
    "tests/sprint-100m/baseline-race-v3.txt": {
      sha: "3f5423f74617ffeddbd4943a70c819611a2d66ef",
      mode: "100644"
    },
    "tests/sprint-100m/camera-continuity.test.mjs": {
      sha: "6eb7958c11dce9403115704cb9661ca279dc8566",
      mode: "100644"
    },
    "tests/sprint-100m/camera.test.mjs": {
      sha: "b98e8e22759ddc749bbfc75ceeeac025699c46ab",
      mode: "100644"
    },
    "tests/sprint-100m/fall-provenance.test.mjs": {
      sha: "4bd0ab81ee0aa6e350c0272bcf51e8a29f561fed",
      mode: "100644"
    },
    "tests/sprint-100m/fall-rig.test.mjs": {
      sha: "ea4f4fbb6e6d6edfe6861ffce0c7634593401845",
      mode: "100644"
    },
    "tests/sprint-100m/frozen-source.test.mjs": {
      sha: "7cadbe5a05f1ac9bba73d006c2a7895b5a18f27b",
      mode: "100644"
    },
    "tests/sprint-100m/integration.test.mjs": {
      sha: "7b90deadfb6deb0a1a44be4bf7a4063c635ef13b",
      mode: "100644"
    },
    "tests/sprint-100m/platform-flow.test.mjs": {
      sha: "9a63173b7a45508d31307ad392f9afbb79ad4ef1",
      mode: "100644"
    },
    "tests/sprint-100m/race.test.mjs": {
      sha: "3c4a99e9c356a9e9b96e94d7137154466698069a",
      mode: "100644"
    },
    "tests/sprint-100m/records.test.mjs": {
      sha: "b3754ef604d10ca3a5fa2dbc1b80669059cf79a4",
      mode: "100644"
    },
    "tests/sprint-100m/render3d.test.mjs": {
      sha: "5e6e7bd9cbdaea54186c9dedfa296cc3a3c64b84",
      mode: "100644"
    },
    "tests/sprint-100m/replay.test.mjs": {
      sha: "8e77e138e38206a2ee12313bba08d409904aea2d",
      mode: "100644"
    },
    "tests/sprint-100m/runout.test.mjs": {
      sha: "f86f7ad6ae2cf8052ab7728a74021f2ad4b1ef5d",
      mode: "100644"
    },
    "tests/sprint-100m/share.test.mjs": {
      sha: "65db608eb00ec3a319f4cb4401e3b661ff244db7",
      mode: "100644"
    },
    "tests/sprint-100m/start-course.test.mjs": {
      sha: "e7a301bc87af45f5f60d6834ec6def53135ce714",
      mode: "100644"
    },
    "tests/sprint-rival-tiers-provenance.test.mjs": {
      sha: "74e92a4d44146d0b853a7290cdd4dadd089230c1",
      mode: "100644"
    },
    "tests/sprint-rival-tiers.test.mjs": {
      sha: "8fd6590923f0cb7454dce1bb61268f6ff2cb4104",
      mode: "100644"
    },
    "tests/startup-provenance.test.mjs": {
      sha: "de52ade93dbf2c3c68d09f1ab4c151c5af1842cf",
      mode: "100644"
    },
    "tests/startup.test.mjs": {
      sha: "676a4a5ba3bec7c7882f5021dcc93c6240714ee5",
      mode: "100644"
    },
    "tests/studio-brand.test.mjs": {
      sha: "474bea35410088fca8891f567d4f2438a6764486",
      mode: "100644"
    },
    "tests/studio-provenance.test.mjs": {
      sha: "538dec4e84694f12e2f296d1dd15ffab18fc5f6b",
      mode: "100644"
    },
    "tests/tower-climb/controller-v3.test.mjs": {
      sha: "ea377fe274a6f28dc35a71aec22981321fe6f2d9",
      mode: "100644"
    },
    "tests/tower-climb/coordination-v4.test.mjs": {
      sha: "5bd12ee62c5795e6ab3b4dd7e78560e3dfd89652",
      mode: "100644"
    },
    "tests/tower-climb/input-share.test.mjs": {
      sha: "a13b8ee926dee2b9b532bf0ac5ce5173c33d8220",
      mode: "100644"
    },
    "tests/tower-climb/results-v8.test.mjs": {
      sha: "38860a783bae5b8aec6afd0a03bd2a0a743cd56f",
      mode: "100644"
    },
    "tests/tower-climb/source-clock-v3.test.mjs": {
      sha: "c0ad677818d660ad6e016b02c7d3ddf31f904fea",
      mode: "100644"
    },
    "tests/tower-climb/speedrun-trace.mjs": {
      sha: "d5f38f3391e0c647cdcde278b3a4b9587fd61a79",
      mode: "100644"
    },
    "tests/unified-audio.test.mjs": {
      sha: "a5466705af9c2d2c22770bb119ed51d2d4bbc416",
      mode: "100644"
    },
    "tests/unified-v2-provenance.test.mjs": {
      sha: "b6eb081135bbbed8d3223c76fe71cef8c1ec43ab",
      mode: "100644"
    },
    "tests/upload-toolbar-polish-provenance.test.mjs": {
      sha: "6cce9d58f83eb968513087ea56309ad12078ca5c",
      mode: "100644"
    },
    "tests/upload-toolbar-polish-reversal.test.mjs": {
      sha: "e95252ed2322d541f17d87ff61da21be612bad96",
      mode: "100644"
    },
    "tests/v2-menu-audio.test.mjs": {
      sha: "cf53cb89153542576a7f53b4369e4325ba180c66",
      mode: "100644"
    },
    "tests/v2-menu-controllers.test.mjs": {
      sha: "92c853f4338bb176a3f4d242ce08b839d6f95964",
      mode: "100644"
    },
    "tests/v2-menu-identity.test.mjs": {
      sha: "77eced5ca5ee2a471a3a0a15c3641871f7c121e4",
      mode: "100644"
    },
    "tests/v2-menu-style.test.mjs": {
      sha: "45d053c3178371fd319c9ef0e2e72791e5a4ee5d",
      mode: "100644"
    },
    "tests/v2-menu.test.mjs": {
      sha: "bb6d15d1b6fb634cdc72a4bad0631067b7b9857e",
      mode: "100644"
    },
    "tests/v2-nine-board-view.test.mjs": {
      sha: "f6a4a5c5278ff04728df1997fc6a5ac6d54844b0",
      mode: "100644"
    },
    "tests/v2-result-guard.test.mjs": {
      sha: "42a8a38ceb1c44425fecbfbf565fa8614adb3ed2",
      mode: "100644"
    },
    "tests/vault-air-coordination-provenance.test.mjs": {
      sha: "7ea4fcdd8eda3e0516866903ffb1fc6cb976e722",
      mode: "100644"
    },
    "tests/vault-coordination-merge-provenance.test.mjs": {
      sha: "03e61c3874ccc1039fcf49c651ee3cf5fed9f829",
      mode: "100644"
    },
    "tools/render-runner-covers.mjs": {
      sha: "c5d5de4a90ce2a2b8f9fd9075155a03b1a4992be",
      mode: "100644"
    },
    "tools/render-runner-rig.mjs": {
      sha: "cb0c206efc40891688d800c1da32bcdd9bfb9199",
      mode: "100644"
    },
    "tools/runner-sprite-renderer.mjs": {
      sha: "3a5b95c6359b86350414517e93245ec22c53780a",
      mode: "100644"
    },
    "tools/vault-pace-report.mjs": {
      sha: "a3ade023c84c29fa9ac7f293604c609426e83a6e",
      mode: "100644"
    },
    "worker/leaderboard/0001.sql": {
      sha: "7591f7c7c4957cfd923e835af91e9da421abedd7",
      mode: "100644"
    },
    "worker/leaderboard/003.sql": {
      sha: "95da05a4cf4cd14f25cb52c37722240026a614eb",
      mode: "100644"
    },
    "worker/leaderboard/COURTESY-QA.md": {
      sha: "fc4fc966e95a03d69cc5e5c0184509de0f9618a2",
      mode: "100644"
    },
    "worker/leaderboard/DEPLOYMENT-NOTES.md": {
      sha: "7a33a0993b2c01227a7679ee4a183d092ae37745",
      mode: "100644"
    },
    "worker/leaderboard/README.md": {
      sha: "369df0d0ce3ae2f4862e84121641bbf6d443d7cb",
      mode: "100644"
    },
    "worker/leaderboard/index.mjs": {
      sha: "667792a11f510b5e5c61a8cad836734fe98b4cde",
      mode: "100644"
    },
    "worker/leaderboard/repository.mjs": {
      sha: "34f375384b3593ef082f9c5390c3fc320fda7564",
      mode: "100644"
    },
    "worker/play-counts/002.sql": {
      sha: "ceffcb74368ae33ab233899f506b88d361f0e875",
      mode: "100644"
    },
    "worker/play-counts/README.md": {
      sha: "bad14a5bdf7f7e7eb6b48e90dea63cfeb56f8783",
      mode: "100644"
    },
    "worker/play-counts/entries.mjs": {
      sha: "b96851fa7584c3d97ab48ea36c3219f19da59a76",
      mode: "100644"
    },
    "worker/play-counts/index.mjs": {
      sha: "7a3523fc41873879638909f0260211fd5940a233",
      mode: "100644"
    },
    "worker/play-counts/repository.mjs": {
      sha: "72b72b4665e68700ad4a9e95fa99cfaf5e3c5b4b",
      mode: "100644"
    },
    "wrangler.jsonc": {
      sha: "f8bf9f0da7d858e653aebb799dfbf06265d20ffa",
      mode: "100644"
    }
  },
  scopes: [
    {
      id: "pinball",
      prefix: "public/games/overtime-pinball/",
      paths: [
        "public/games/overtime-pinball/character.js",
        "public/games/overtime-pinball/combo-routes.js",
        "public/games/overtime-pinball/game-audio.js",
        "public/games/overtime-pinball/interactions.js",
        "public/games/overtime-pinball/main.js",
        "public/games/overtime-pinball/occlusion.js",
        "public/games/overtime-pinball/office-features.js",
        "public/games/overtime-pinball/platform-share.mjs",
        "public/games/overtime-pinball/platform.css",
        "public/games/overtime-pinball/play-polish.css",
        "public/games/overtime-pinball/render-proportions.js",
        "public/games/overtime-pinball/round-options.js",
        "public/games/overtime-pinball/round-rules.js",
        "public/games/overtime-pinball/score-card.mjs",
        "public/games/overtime-pinball/special-office.js",
        "public/games/overtime-pinball/station-labels.js"
      ],
      tests: [
        "tests/pinball-api.test.mjs",
        "tests/pinball-isolation.test.mjs",
        "tests/pinball-play-counts.test.mjs",
        "tests/pinball-polish-provenance.test.mjs",
        "tests/pinball-thumbnail.test.mjs",
        "tests/pinball/audio-default.test.mjs",
        "tests/pinball/catalog.test.mjs",
        "tests/pinball/contact-extra.test.mjs",
        "tests/pinball/engine-settlement.test.mjs",
        "tests/pinball/interface.test.mjs",
        "tests/pinball/layout.test.mjs",
        "tests/pinball/leaderboard.test.mjs",
        "tests/pinball/lifecycle.test.mjs",
        "tests/pinball/no-fade.test.mjs",
        "tests/pinball/proportions.test.mjs",
        "tests/pinball/provenance.test.mjs",
        "tests/pinball/reentry-safety.test.mjs",
        "tests/pinball/requested-polish.test.mjs",
        "tests/pinball/result-focus.test.mjs",
        "tests/pinball/score-card.test.mjs",
        "tests/pinball/share.test.mjs",
        "tests/pinball/snapshot.test.mjs",
        "tests/pinball/window-visibility.test.mjs"
      ]
    }
  ],
  guards: [
    "tests/catalog-release.test.mjs",
    "tests/fast-hands-cooldown-backend.test.mjs",
    "tests/fast-hands/auto-input.test.mjs",
    "tests/fast-hands/duck-completion-regression.test.mjs",
    "tests/fast-hands/duck-finale-image.test.mjs",
    "tests/fast-hands/duck-pointerup-regression.test.mjs",
    "tests/fast-hands/duck-room.test.mjs",
    "tests/fast-hands/duck-score-layout.test.mjs",
    "tests/fast-hands/duck-startup.test.mjs",
    "tests/fast-hands/input-clock.test.mjs",
    "tests/fast-hands/input.test.mjs",
    "tests/fast-hands/leaderboard-app.test.mjs",
    "tests/fast-hands/leaderboard.test.mjs",
    "tests/fast-hands/records.test.mjs",
    "tests/fast-hands/replay.test.mjs",
    "tests/fast-hands/result-copy.test.mjs",
    "tests/fast-hands/shuttle.test.mjs",
    "tests/leaderboard-api.test.mjs",
    "tests/leaderboard-client.test.mjs",
    "tests/leaderboard-config.test.mjs",
    "tests/leaderboard-diagnostic-cost.test.mjs",
    "tests/leaderboard-enabled-controller.test.mjs",
    "tests/leaderboard-nine.test.mjs",
    "tests/leaderboard-repository.test.mjs",
    "tests/leaderboard-scroll.test.mjs",
    "tests/leaderboard-upload-cooldown.test.mjs",
    "tests/nine-play-counts.test.mjs",
    "tests/play-counts-api.test.mjs",
    "tests/play-counts-client.test.mjs",
    "tests/play-counts-home.test.mjs",
    "tests/play-counts-repository.test.mjs",
    "tests/preview-fast-gate-provenance.test.mjs",
    "tests/preview-sports-counts-provenance.test.mjs",
    "tests/preview-upload-isolation.test.mjs",
    "tests/sports-counts-api.test.mjs",
    "tests/sports-missing-counts.test.mjs"
  ],
  mechanicalManifests: {
    "docs/preview-fast-gate/MANIFEST.json": {
      shape: "9e5191686643a506a1706c6f70ce294f9615bc7c4fb597d25e93452d8b64a168",
      allowedPaths: [
        "public/games/overtime-pinball/character.js",
        "public/games/overtime-pinball/combo-routes.js",
        "public/games/overtime-pinball/game-audio.js",
        "public/games/overtime-pinball/interactions.js",
        "public/games/overtime-pinball/main.js",
        "public/games/overtime-pinball/occlusion.js",
        "public/games/overtime-pinball/office-features.js",
        "public/games/overtime-pinball/platform-share.mjs",
        "public/games/overtime-pinball/platform.css",
        "public/games/overtime-pinball/play-polish.css",
        "public/games/overtime-pinball/render-proportions.js",
        "public/games/overtime-pinball/round-options.js",
        "public/games/overtime-pinball/round-rules.js",
        "public/games/overtime-pinball/score-card.mjs",
        "public/games/overtime-pinball/special-office.js",
        "public/games/overtime-pinball/station-labels.js",
        "scripts/preview-fast-gate.mjs"
      ]
    }
  }
};

// ../../shared/preview-gate-20261113/scripts/bundle-entry.mjs
try {
  const pin = /^--bundle-sha256=([a-f0-9]{64})$/.exec(process.argv[2] || "")?.[1];
  if (!pin || process.argv.length !== 3) throw Error("A fixed external bundle SHA256 is required.");
  const root = process.cwd(), self = fileURLToPath(import.meta.url);
  if (GENERATED_POLICY_default.repository !== "jeiwu1020/playformosa" || GENERATED_POLICY_default.channel !== "preview" || GENERATED_POLICY_default.externalFiles.length !== 1 || resolve2(root, GENERATED_POLICY_default.externalFiles[0]) !== self) throw Error("Wrong repository/channel/bundle location.");
  if (createHash4("sha256").update(readFileSync2(self)).digest("hex") !== pin) throw Error("External bundle SHA256 mismatch.");
  const result = runPreview(root, GENERATED_POLICY_default, { externalPins: { [GENERATED_POLICY_default.externalFiles[0]]: pin } });
  console.log(JSON.stringify({ kind: "preview-scope-check", ...result }));
} catch (error) {
  console.error(error.message);
  console.error("Fast preview is held. Review the change or run the unchanged full check outside the Cloudflare build limit; do not bypass this hold.");
  process.exitCode = 1;
}
