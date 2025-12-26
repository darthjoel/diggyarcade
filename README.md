# Diggy Arcade 🕹️

This repository contains the source code for the Diggy Arcade landing page and its hosted games.

## Deployment

To deploy all files (including games and assets) to [https://diggyarcade.com](https://diggyarcade.com), run the following command in your terminal:

```bash
./deploy.sh
```

### What this script does:
1.  **Packages the project**: Runs `./package.sh` to gather all necessary files into the `dist/` directory.
2.  **Deploys to S3**: Runs `deploy.js` to upload the contents of the `dist/` directory to the `diggyarcade.com` AWS S3 bucket.

---
*Powered by Diggy Arcade*
