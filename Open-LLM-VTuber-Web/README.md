# Open LLM Vtuber

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

## Share to a Windows friend (single installer EXE)

To share **one file** that installs the desktop app on Windows (with backend included), build the Windows installer:

1) **On a Windows PC** (recommended), build the backend executable and copy it into the Electron app:

```bash
cd Open-LLM-VTuber
powershell -ExecutionPolicy Bypass -File .\\scripts\\build_backend_win.ps1
```

This will populate `Open-LLM-VTuber-Web/backend-dist/` with:
- `open-llm-vtuber-backend.exe`
- `conf.yaml`, `model_dict.json`, `characters/`, `live2d-models/`, `models/`, etc.

2) Build the Windows installer (this outputs **one shareable file**):

```bash
cd ..\\Open-LLM-VTuber-Web
npm install
npm run build:win
```

3) Send your friend the generated installer:
- Look under `release/<version>/` for `open-llm-vtuber-<version>-setup.exe`

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
