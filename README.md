# F1XL website

This repository contains the public F1XL website at [f1xl.co.uk](https://www.f1xl.co.uk/).

The site is hosted as a static GitHub Pages website. Most changing information—such as standings, results, schedules, teams, tickets and licence information—is downloaded read-only from public Google Sheets when a visitor opens a page.

For project architecture, safe-working rules and succession information, begin with [docs/handover/README.md](docs/handover/README.md).

## Local preview

From the repository folder, run:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8000/`. Stop the server with `Ctrl+C` in the terminal that started it.

Do not open the HTML files directly: browser security rules can make Sheet loading and other website behaviour differ from the live site.
