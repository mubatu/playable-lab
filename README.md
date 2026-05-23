# playable-lab

Run the lab from the repo root:

```sh
npm run dev
```

The lab currently supports a saved Template flow for `Catcher`:

- open `Create Playable`
- choose `Catcher`
- enter a playable name
- upload `end-background.png`
- upload one or more `target-*.png` files
- edit standard or advanced config fields
- click `Create`

Create generates a local project under `my-playables/<playable-name>/`, injects the uploaded assets and config, and keeps the original template files unchanged.

Use `My Playables` to see projects generated under `my-playables`. Project-level Preview and Build actions are shown there as placeholders for the next milestone.
