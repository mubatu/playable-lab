# playable-lab

Run the lab from the repo root:

```sh
npm run dev
```

The first milestone supports the Template flow for `Catcher`:

- open `Template`
- choose `Catcher`
- upload `end-background.png`
- upload one or more `target-*.png` files
- edit standard or advanced config fields
- click `Preview`

Preview creates a disposable copy under `.playable-lab/previews/`, injects the uploaded assets and config, then starts a temporary playable dev server. The original template files stay unchanged.
