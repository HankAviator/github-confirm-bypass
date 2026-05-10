# github-confirm-bypass
Bypass typing confirmation when doing dangerous stuff on GitHub.

This is a Greasemonkey/Tampermonkey userscript for GitHub confirmation forms that ask you to type a repository name before continuing. It fills the required confirmation text for cases such as archiving or transferring a repository, but it does not submit the form for you.

## Install

Install `github-confirm-bypass.user.js` in Greasemonkey, Tampermonkey, or another userscript manager.

## Supported Prompts

The script looks for GitHub text inputs whose labels or nearby text say things like:

- `Type owner/repo to confirm.`
- `Please type owner/repo to confirm.`

It supports both regular GitHub dialog forms and newer React-rendered settings pages.

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE).
