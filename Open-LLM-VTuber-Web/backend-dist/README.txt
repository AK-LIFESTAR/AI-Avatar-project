Put the packaged backend payload here before building installers.

Expected layout (Windows):
  backend-dist/
    open-llm-vtuber-backend.exe
    conf.yaml
    model_dict.json
    characters/
    live2d-models/
    models/
    (any other runtime files the backend needs)

Then build the Windows installer:
  npm run build:win

electron-builder will bundle this folder into the app at:
  process.resourcesPath/backend

On first launch, the app copies it into a writable directory:
  app.getPath('userData')/backend







