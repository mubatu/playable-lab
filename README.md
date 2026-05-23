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

Use `My Playables` to see projects generated under `my-playables`.

- `Preview` starts a temporary local dev server for the selected playable and opens it in a new tab.
- `Build` opens a modal populated from that playable's `build.json`, lets you choose supported ad networks, and runs one build per selected network.
