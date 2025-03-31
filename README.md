# <img src="app/build/icon.png" width="28" height="28" style="vertical-align: middle"> Translation Annotator

![App Screenshot](screenshots/LS_light.png)

An Electron application to visualize and compare manual and AI-generated annotations of English translations of "Conversations on the Plurality of Worlds" by Bernard Le Bovier de Fontenelle, 1686. 

## Instructions

### To run the application:

1. Navigate to /app

2. Install nodejs and Electron

3. Run  ```npm start```

### To build executables:

1. Navigate to /app 

2. Install electron-builder

2. Run ```npm run build:[win/mac/linux]```

3. Navigate to app/dist for executables

### Python Scripts

Python scripts have already been run. If the data or prompts are modified, run: 

- ```python src/preprocess.py``` to extract and align cleaned paragraphs from the source and translated texts.
- ```python src/call.py --translator [translator] --tag [tag]``` to make API calls to Anthropic on all of the translator's text for the selected tag. Ensure that a .env file is created in the root folder with an ANTHROPIC_API_KEY.

Translators:
- knight
- behn
- glanvill

Tags:
- LS
- NCE
- RW
- SC
- UP
- IIM