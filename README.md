# juhokarhu.com

My personal site. Jekyll, plain CSS, no framework.

```bash
bundle exec jekyll serve
```

## Layout of the repo

| Path | What |
|---|---|
| `_layouts/home.html` | the front page (work / about / contact) |
| `_layouts/case-dark.html` | shell for the dark case page |
| `_layouts/case-study.html` | shell for the light case-study write-up |
| `_cases/` | the case pages themselves, one file each |
| `_data/work.yml` | the work cards on the front page |
| `assets/main.css` | site chrome + front page |
| `assets/case-*.css` | one stylesheet per case page, loaded via `extra_css` |
| `assets/main.js` | progressive enhancement only - nav scroll-spy, the screenshot lightbox, the map pins |
| `MOTION.md` | every animation on the site: what it is, where it lives, how it degrades |

Pages are a fixed 1400px canvas scaled to the viewport with CSS `zoom`
above 1250px, so most lengths in the CSS are Figma design pixels. Below
that the layout reflows unscaled.

A case page adds its own stylesheet through front matter rather than
loading on every page:

```yaml
extra_css:
  - /assets/case-doconomy.css
```
