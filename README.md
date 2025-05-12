# Quick Instructions for reviewing data

Thanks for helping out feel free to take breaks and close the app — your progress will be saved. If you run into any issues or questions feel free to reach out.

## 1. Download the App

Choose the right version for your machine:

- [Windows (.zip)](https://drive.google.com/file/d/1uvNfOptaGEWmxkEugZYZmwuflsbR15-u/view?usp=drive_link)
- [Mac (Intel) (.zip)](https://drive.google.com/file/d/1eLqhR7q9e1FvmPdlA6MlfhHI-41pPRY2/view?usp=drive_link)
- [Mac (M1/M2/M3) (.zip)](https://drive.google.com/file/d/16SoxnGNUqqIut2N2YMxhmhDXHC1MNHX-/view?usp=drive_link)

After downloading, unzip the folder.

### 📌 Mac Users — Read This First!

macOS will complain that the app is from an unidentified developer since I don't have an apple developer key. Run these commands to override this:

```bash
`xattr -rd com.apple.quarantine /<path-to-app>/UDI\ Review.app`

`codesign --force --deep --sign - /<path-to-app>/UDI\ Review.app`
```

More info:

https://forums.macrumors.com/threads/unsigned-self-signed-app-permissions.2417038/?post=32874396#post-32874396

If this does not work, the last resort option is to build the application from source. See instructions to build from source at bottom..

## 2. Review

The goal of this project is to collect natural language queries that can be posed to a specific dataset and a visualization response. So you are evaluating if the question and visualization are reasonable together. You are not evaluating any issues with the data itself.

You can stop and come back later — your progress is saved. Please try to get through at least the **first 20 items**.

## 3. Send Me Your Results

When you're done:

- Use the **"Download Results"** button in the app.
- Email or Slack me the `review.json` file.

## 4. About the Data

Your responses (including free-text feedback) will be used in a research paper and **will be published in full** — please keep that in mind.

Thanks again!

## Build from Source

1. git clone

```bash
git clone https://github.com/hms-dbmi/udi-dataset-review
cd udi-dataset-review
```

2.  **Install dependencies**

```bash
yarn
```

3. download the database file and move it to the `.quasar/dev-electron/` folder.

4. **Run the code editor with Quasar in development mode.**

```bash
quasar dev -m electron
```
