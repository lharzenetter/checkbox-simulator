# Restricting access to the deployed simulator

Research for the GitHub issue *Password-protect the GitHub Pages deployment*.
These are research notes, not a spec. They collect what the primary sources say, so the issue can pick an approach.

The setting: a purely client-side TypeScript + Vite + React app with no backend, keeping state only in browser storage.
It is built by GitHub Actions on every push to `main` (alongside semantic-release) and is meant to go to GitHub Pages.
The repository `lharzenetter/checkbox-simulator` is **private** and owned by a **personal account**, not an organization.
GitHub Pages is not enabled yet (the Pages API returns 404).
We don't know which GitHub plan the account is on, so each option below states what it requires.

Every claim is tagged:

- **[Docs]**: stated in vendor documentation or on a vendor pricing page. The URL is given.
- **[Source]**: read from a tool's source code or README. The URL is given.
- **[Inferred]**: my own reasoning from the sources, not stated in them. Verify before relying on it.

## 0. Baseline: what GitHub Pages gives us

| # | Fact | Tag / source |
| --- | --- | --- |
| 0.1 | "If the account that owns the repository uses GitHub Free or GitHub Free for organizations, the repository must be public." | [Docs] https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site |
| 0.2 | GitHub Pro lists "GitHub Pages" under advanced tools in **private** repositories. | [Docs] https://docs.github.com/en/get-started/learning-about-github/githubs-plans |
| 0.3 | "GitHub Pages sites are publicly available on the internet, even if the repository for the site is private." | [Docs] https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site |
| 0.4 | "To publish a GitHub Pages site privately, you need to have an organization account", and the organization must use GitHub Enterprise Cloud. | [Docs] https://docs.github.com/en/get-started/learning-about-github/githubs-plans |
| 0.5 | Custom Actions workflows are a supported publishing source. They deploy to a `github-pages` environment, and GitHub recommends a protection rule so only the default branch can deploy. | [Docs] https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site |
| 0.6 | Pages is "not intended for or allowed to be used as a free web-hosting service to run your online business … or commercial SaaS". Limits: 1 GB site, 100 GB/month soft bandwidth. | [Docs] https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits |
| 0.7 | Actions minutes for private repos: 2,000/month on Free, 3,000/month on Pro. Public repos on standard runners are free. | [Docs] https://docs.github.com/en/billing/concepts/product-billing/github-actions |
| 0.8 | GitHub Pro is $4/month. The only official source found is a 2020 FAQ. github.com/pricing no longer lists Pro, so check the account's billing page. | [Docs] https://docs.github.com/en/get-started/learning-about-github/faq-about-changes-to-githubs-plans |

What this means for us:

- **On GitHub Free, Pages forces the repository public (0.1).** The source code *is* the app, so anyone could clone and run it. Any password on the deployed site would then be pointless. [Inferred]
- **On GitHub Pro, the repo can stay private, but the site is still public (0.3).** Without one of the measures below, anyone with the URL can use the app.
- **The default URL is `https://lharzenetter.github.io/checkbox-simulator/`.** Every project site of the account shares the origin `lharzenetter.github.io`. So `localStorage` and IndexedDB are shared with any other Pages project the account publishes. [Inferred, from the browser same-origin rule]

## 1. Client-side encryption of the bundle (StaticCrypt and similar)

### 1.1 How StaticCrypt works

| # | Fact | Tag / source |
| --- | --- | --- |
| 1.1.1 | "StatiCrypt uses AES-256 and WebCrypto to encrypt your HTML file with your long password." Mode is AES-CBC. A fresh random IV is prepended to the ciphertext. | [Source] https://github.com/robinmoisson/staticrypt, https://github.com/robinmoisson/staticrypt/blob/main/lib/cryptoEngine.js |
| 1.1.2 | Key derivation: 600k PBKDF2 iterations in total. They run as three chained rounds: 1,000 × SHA-1, then 14,000 × SHA-256, then 585,000 × SHA-256 (staged "for backward compatibility"). Output is 256 bits. | [Source] https://github.com/robinmoisson/staticrypt/blob/main/lib/cryptoEngine.js |
| 1.1.3 | The salt is 16 random bytes. "The salt isn't secret (it's publicly visible on the encrypted file)". It is saved in `.staticrypt.json` and can be pinned with `--salt`. | [Source] README, cryptoEngine.js |
| 1.1.4 | Integrity: an HMAC-SHA-256 over the ciphertext, keyed with the same derived key. There is no authenticated encryption mode. | [Source] cryptoEngine.js |
| 1.1.5 | On success the page is replaced with `document.write(plainHTML); document.close();`, unless a `replaceHtmlCallback` is configured. | [Source] https://raw.githubusercontent.com/robinmoisson/staticrypt/main/lib/staticryptJs.js |
| 1.1.6 | WebCrypto needs HTTPS or localhost. Pages serves `github.io` over HTTPS automatically. | [Source] README; [Docs] https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https |

### 1.2 Only HTML is encrypted, so the Vite chunks would stay public

| # | Fact | Tag / source |
| --- | --- | --- |
| 1.2.1 | With `-r` (recursive), HTML files are encrypted. "Non-HTML files will be copied as-is from the input directory." | [Source] https://github.com/robinmoisson/staticrypt |
| 1.2.2 | PageCrypt is a similar tool. It "only encrypts the contents of a single HTML file" and advises to "inline as much JS, CSS and other sensitive assets into this HTML file as possible." | [Source] https://github.com/Greenheart/pagecrypt |
| 1.2.3 | `vite-plugin-singlefile` "allows you to *inline* all JavaScript and CSS resources directly into the final `dist/index.html` file". `useRecommendedBuildConfig` (default on) adjusts the Vite config so assets combine into one file. | [Source] https://github.com/richardtallent/vite-plugin-singlefile |
| 1.2.4 | Known gaps in that plugin: `public/` files (e.g. favicon) are not inlined, SVG is not inlined by Vite, worklets are unsupported, and sourcemaps are useless. "There may be other situations where referenced files aren't inlined." | [Source] same |

Consequences:

- **A default Vite build would leave the app public.** It produces `index.html` plus hashed `assets/*.js` / `*.css`. StaticCrypt would encrypt only the ~1 KB HTML shell, and the whole React app would remain downloadable from `/assets/` in plain form. The hashed file names are hidden inside the encrypted HTML, but anyone who has ever had the password (or a cached copy) can share them, and the URLs never stop working. [Inferred from 1.2.1]
- **To cover the whole app**, the build must output exactly one self-contained `index.html`:
  1. Add `vite-plugin-singlefile`.
  2. Avoid `React.lazy` / dynamic `import()` code splitting, web workers, and anything in `public/` that matters.
  3. Inline images and SVG (for example as React components or data URIs).
  4. Run `staticrypt dist/index.html`.

  [Inferred from 1.2.3–1.2.4]
- **The app would boot through `document.write` (1.1.5).** Whether Vite's inlined `<script type="module">` runs correctly after that call needs a throwaway prototype. Two other effects to check: on decrypt, the URL and history are unchanged, and the base path `/checkbox-simulator/` still applies. [Inferred, unverified]

### 1.3 "Remember me", share links, logout

| # | Fact | Tag / source |
| --- | --- | --- |
| 1.3.1 | When "Remember me" is checked, the *hashed* (derived) password goes into `localStorage` under the key `staticrypt_passphrase`, with expiry under `staticrypt_expiration`. `--remember <days>` sets the expiry. 0 (the default) means it never expires, and `--remember false` hides the checkbox. | [Source] README, staticryptJs.js, password_template.html |
| 1.3.2 | "In case the value stored in the browser becomes compromised an attacker can decrypt the page." | [Source] README |
| 1.3.3 | Share links append `#staticrypt_pwd=<hashed password>` and auto-decrypt. They need a pinned salt to survive re-encryption. | [Source] README, staticryptJs.js |
| 1.3.4 | Logout: add `staticrypt_logout` to the URL fragment or query, which clears the stored values. | [Source] README, staticryptJs.js |

Consequences:

- **The stored value is password-equivalent.** It is the derived key, so anyone who can read this browser's `localStorage` can decrypt the page. That includes any other page on the shared `lharzenetter.github.io` origin (section 0). [Inferred]
- **Rotation**: re-encrypt with a new password. Old remembered keys and share links then fail to decrypt, and users are prompted again. Pinning the salt does not keep old *passwords* working, only links for the *same* password. [Inferred from 1.1.2–1.1.3]

### 1.4 Security level

- **What an attacker without the password gets:** the ciphertext, the salt, and the iteration scheme. They can run an offline dictionary/brute-force attack at unlimited speed, with no rate limit and no lockout. The README: "brute-force/dictionary attacks would be easy to do at a fast pace", and it recommends "16+ alphanum characters". [Source] README
- With a long random password (for example 20+ random characters from a password manager), offline guessing against 600k PBKDF2 iterations is impractical. A memorable shared password is weak. [Inferred]
- **Who knows the password:** everyone who has it can decrypt forever, unless the password is rotated and the site redeployed. There is no per-user revocation. Old ciphertexts may also persist in caches or archives. [Inferred]
- The author's own disclaimer: "I am not a cryptographer." [Source] README

### 1.5 Effect on build and CI

- Build changes: add `vite-plugin-singlefile`, keep the app to a single chunk, and add a post-build step `npx staticrypt dist/index.html -d dist --remember 30` (or similar). Commit `.staticrypt.json` to pin the salt. [Source] README for flags and the `.staticrypt.json` advice
- Password: store it as an Actions secret and expose it to the step as `STATICRYPT_PASSWORD`. The CLI reads that variable. [Source] README
- Deploy: unchanged. Upload the artifact and deploy to Pages on push to `main`. semantic-release is unaffected. [Inferred]
- Local dev (`vite dev`) runs unencrypted. Encryption happens only in CI. [Inferred]

### 1.6 Cost and requirements

- **Tool cost: zero.** StatiCrypt is a free npm package.
- **But it is only meaningful on GitHub Pro or above.** On Free the repository must be public (0.1), which publishes the plaintext source.
- Alternative: build in the private repo and push only the encrypted `dist/` to a separate *public* repo whose Pages site serves it. That works on Free, since only ciphertext is public. [Inferred: the public repo must contain nothing but the encrypted build]

## 2. An authenticating proxy in front

### 2.1 Cloudflare Access (Zero Trust)

| # | Fact | Tag / source |
| --- | --- | --- |
| 2.1.1 | Free plan: "$0 … forever", "50 user limit", "Best for teams under 50 users". Pay-as-you-go: $7 per user/month (annual), no user limit. | [Docs] https://www.cloudflare.com/sase/products/access/ |
| 2.1.2 | "A user consumes a seat when they perform an authentication event", including any Access login. "Once the total amount of seats … has been consumed, additional users who attempt to log in are blocked." Seat expiration can free inactive users after 1–12 months. | [Docs] https://developers.cloudflare.com/cloudflare-one/team-and-resources/users/seat-management/ |
| 2.1.3 | One-time PIN: Access emails a PIN that "expires 10 minutes after the initial request", is single-use, and is only sent "if the email is allowed by an Access policy". No identity provider is needed. OTP is no longer enabled by default for new organizations. | [Docs] https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/ |
| 2.1.4 | Policies deny by default. Common mistake: allowing Login Method = One-time PIN with no other rule lets anyone with a valid email in. Use an explicit `Emails` include list. | [Docs] https://developers.cloudflare.com/cloudflare-one/policies/access/ |
| 2.1.5 | Session duration defaults to 24 hours and can be set from immediate to one month. Tokens can be revoked per application or per user. | [Docs] https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/ |
| 2.1.6 | Prerequisite for a self-hosted app: "An active domain on Cloudflare" with a full or partial (CNAME) setup. If the origin is publicly routable, "you will need to protect your origin IP using other methods". Validating the Access JWT at the origin rejects "requests which bypass Cloudflare Access". | [Docs] https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/ |

**Can it front `*.github.io`?** No.

- `github.io` is GitHub's zone, so it cannot be an active domain in our Cloudflare account (2.1.6).
- The only way is a custom domain we own, on Cloudflare, with a proxied CNAME to `lharzenetter.github.io`. [Inferred]
- **The bypass is fundamental.** GitHub Pages is a publicly routable origin we cannot configure: no JWT validation, no IP allow-list (0.3, 2.1.6).
  - The `github.io` URL, or a request straight to GitHub's Pages servers, reaches the site without passing Access. [Inferred]
  - GitHub may redirect the `github.io` URL to the custom domain, but none of the pages I read says so (checked https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site and https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages). A redirect is a convenience, not access control. [Inferred]
  - GitHub's HTTPS for custom domains provisions a Let's Encrypt certificate after a DNS check (https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https). That check may fail while Cloudflare proxies the record. [Inferred, not verified]
- **Verdict: Access + GitHub Pages is security by obscurity of the origin.** On its own it is not worth the setup. [Inferred]

### 2.2 Cloudflare Pages + Access (moving the host)

| # | Fact | Tag / source |
| --- | --- | --- |
| 2.2.1 | Access can protect the `*.pages.dev` production domain and previews. Enable the project's access policy, then edit the generated Access app's hostname to remove the wildcard. A custom domain needs its own self-hosted Access app; otherwise "an Access authentication will render but not work". | [Docs] https://developers.cloudflare.com/pages/platform/known-issues/ |
| 2.2.2 | The built-in "Enable access policy" toggle alone protects only preview deployments, not `*.pages.dev` or the custom domain. | [Docs] https://developers.cloudflare.com/pages/configuration/preview-deployments/ |
| 2.2.3 | You can deploy from GitHub Actions with Direct Upload: `cloudflare/wrangler-action@v4` running `wrangler pages deploy <DIR> --project-name=<NAME>`, with secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. A Git-integration project cannot later switch to Direct Upload. | [Docs] https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/, https://developers.cloudflare.com/pages/configuration/git-integration/ |
| 2.2.4 | Free plan: 500 builds/month, 20,000 files, 25 MiB per asset, 100 custom domains per project. | [Docs] https://developers.cloudflare.com/pages/platform/limits/ |

Consequences:

- **No custom domain is required.** `checkbox-simulator.pages.dev` can sit behind Access (2.2.1). Cloudflare is both the edge and the origin, so there is no public origin to go around. [Inferred]
- **Unprotected first deploy.** The site is public between the first deploy and the policy being configured, so configure Access before the first real deploy. [Inferred]
- **Vite build: unchanged.** It is a normal multi-chunk `dist/`. CI swaps `actions/deploy-pages` for `wrangler-action` and leaves semantic-release untouched. Works with the private repo on GitHub Free, at the cost of Actions minutes (0.7). [Inferred]
- **Origin and paths:** the app gets its own origin `checkbox-simulator.pages.dev`, with no shared `localStorage` and no `/checkbox-simulator/` base path. [Inferred]
- **Security level:** without an allowed email address, an attacker gets only the Access login page. No app bytes are served. Access is per person: you add or remove an email, or revoke a session (2.1.5). There is no shared password to rotate. Accounts are only as strong as each user's mailbox (OTP). [Inferred from 2.1.3–2.1.5]
- **Cost:** $0 up to 50 users who have ever logged in (seat expiration can recycle seats). Above 50, $7 per user/month (2.1.1, 2.1.2).
- **Caveat on seat counting:** community answers say that above 50, every seat is billed, not just the extra ones. That is not stated in the official pages I read. [Unverified]

### 2.3 Netlify and Vercel (briefly)

| Host | What protects a site | Plan / price | Source |
| --- | --- | --- | --- |
| Netlify | Site-wide shared password. "Basic password protection for your entire site is available on all Pro plans". Not available on credit-based Free and Personal. | Pro $20/month (unlimited members) | [Docs] https://docs.netlify.com/manage/security/secure-access-to-sites/password-protection/, https://www.netlify.com/pricing/ |
| Vercel | Password Protection: Pro at $20/month **per protected project**, on top of Pro at $20/developer seat/month. Hobby is not available and is "for personal, non-commercial use". | ≈ $40/month | [Docs] https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/password-protection, https://vercel.com/pricing |
| Vercel | Vercel Authentication. Since 2026-09-09 it "can now protect all deployments in a project, including production, at no additional cost on every plan". Viewers need a Vercel account with access to the project. | $0 | [Docs] https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan |

These protections are enforced server-side, so without credentials no bytes are served. [Inferred]
Each one still means moving the deploy off GitHub Pages, the same as Cloudflare Pages.

## 3. GitHub Enterprise Cloud: private Pages

| # | Fact | Tag / source |
| --- | --- | --- |
| 3.1 | Publishing a private site requires that "your organization must use GitHub Enterprise Cloud." It applies only to project sites in a private or internal repo owned by the organization, not to organization sites. | [Docs] https://docs.github.com/en/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site |
| 3.2 | "A privately published site can only be accessed by people with read access to the repository". It is served on a separate unique subdomain. | [Docs] same |
| 3.3 | Enterprise is listed at $21 per user/month ("starting at", first 12 months). Team is $4. | [Docs] https://github.com/pricing |
| 3.4 | On paid org plans, members **and** "outside collaborators on private repositories owned by your organization" each consume a license. Each person is counted once. | [Docs] https://docs.github.com/en/billing/reference/github-license-users |

Consequences:

- **The repo must move to an organization.** Transfer it from the personal account to an org on Enterprise Cloud. GitHub Team is not enough (3.1).
- **Every viewer needs a GitHub account with read access to the repo**, so they can also read the source. Each viewer is a paid seat: roughly $21 per viewer per month (3.2–3.4). [Inferred from 3.2 + 3.4]
- **Security level:** the strongest of the options. GitHub authentication runs server-side, and access is per person, revoked by removing repo access.
- **Build and CI:** unchanged from plain Pages. Use the standard `actions/deploy-pages` workflow and the normal multi-chunk Vite build, with semantic-release untouched.
- **Cost:** heavily overpriced for a training simulator unless the org already pays for Enterprise Cloud. [Inferred]

## 4. Comparison

| | StaticCrypt on GitHub Pages | Cloudflare Access in front of GitHub Pages | Cloudflare Pages + Access | GitHub Enterprise Cloud private Pages |
| --- | --- | --- | --- | --- |
| **GitHub plan needed** | Pro ($4/mo), or Free with a separate public repo holding only ciphertext | Pro, or Free with a public repo | Any, Free included (repo stays private) | Org on Enterprise Cloud |
| **Other requirements** | none | Custom domain on Cloudflare | Cloudflare account; custom domain optional | Every viewer has a GitHub account |
| **Without credentials, an attacker gets** | Ciphertext + salt; offline brute-force with no rate limit | Login page, but the origin is still public via `github.io` / GitHub's servers | Login page only | Nothing (GitHub login) |
| **Strength** | Equals password entropy | Weak (bypassable) | Strong | Strong |
| **Credential model** | One shared password | Per-email OTP | Per-email OTP | Per-GitHub-account |
| **Revoke one person** | No: rotate the password and redeploy | Yes | Yes | Yes |
| **Effect on Vite build** | Must be single-file (`vite-plugin-singlefile`, no code splitting, inlined assets) plus a post-build encrypt step | none | none | none |
| **CI change** | Add the encrypt step; `STATICRYPT_PASSWORD` secret | DNS and Access config outside CI | Swap `deploy-pages` for `wrangler-action`; 2 Cloudflare secrets | none |
| **Running cost** | $0 (+ Pro $4/mo) | $0 for ≤ 50 users (+ domain, + Pro) | $0 for ≤ 50 users, then $7/user/mo | ≈ $21 per viewer/mo |

Sources for every cell are in the sections above.

## 5. Recommendation (depends on the account tier)

- **GitHub Free (most likely for a personal account):** use **Cloudflare Pages + Access** with one-time PIN and an explicit email allow-list.
  - It is the only option that keeps the repo private and serves no app bytes to outsiders, at $0.
  - It leaves the Vite build untouched; the cost is a different deploy step and a Cloudflare account.
  - If staying on GitHub-hosted infrastructure matters more than strength, the fallback is StaticCrypt with a single-file build. Push only the encrypted `dist/` to a separate public Pages repo.
- **GitHub Pro:** choose by the shape of the audience.
  - Prefer Cloudflare Pages + Access when users are known individuals and you want per-person revocation.
  - Choose **StaticCrypt on GitHub Pages** when a single shared password for the whole crew is acceptable and you want to stay on GitHub Pages. Use a long random password from an Actions secret, `--remember` with a finite number of days, and the single-file build.
  - First prototype that the `document.write` boot works with the inlined module script (1.2).
- **Organization on GitHub Enterprise Cloud (only if it already exists):** private Pages. It needs no build change and gives per-user access, but each viewer is a paid seat with read access to the source.
- **Not recommended in any tier:**
  - Cloudflare Access in front of GitHub Pages. The public origin makes it bypassable (2.1).
  - StaticCrypt over a default multi-chunk Vite build. The JS chunks would be public (1.2).
