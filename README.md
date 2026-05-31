# Playable Lab

Playable Lab is a local workspace for creating playable ads faster. It gives the team three paths:

- **Template**: start from a ready-made playable, replace assets, tune config, preview, and build.
- **Video**: upload gameplay footage, add interactive stopovers, customize the end button, and export it as a playable.
- **Custom**: download a starter pack with reusable modules and example games for bespoke playable development.

## Run

From the `playable-lab` folder:

```sh
npm install
npm run dev
```

Then open:

```txt
http://127.0.0.1:3000
```

## Workflow

1. Open **Create Playable**.
2. Choose **Template**, **Video**, or **Custom**.
3. Create or download the playable source.
4. Use **My Playables** to edit, preview, and build saved projects.

Generated playables are stored locally in:

```txt
my-playables/<playable-name>/
```

Template and video creation copy source files into `my-playables`, so the original kits stay unchanged.

## Build And Preview

From **My Playables**:

- **Edit** updates assets, gameplay parameters, or video stopovers.
- **Preview** creates a local preview build and opens the generated HTML.
- **Build** edits `build.json`, selects supported ad networks, and runs one build per selected network.
- Build artifacts are listed in the app and can be opened or deleted from the workspace.

## Project Layout

```txt
app/            Local React app and Node API
templates/      Template-based playable kits
video/          Video playable runtime
custom/         Starter pack source for custom playables
my-playables/   Locally generated playable projects
```

## Scripts

```sh
npm run dev      # start the local lab
npm run build    # build the frontend app
npm run check    # run TypeScript checks
```
