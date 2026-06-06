# Nile - An Amazon Clone

Nile is a visually stunning, full-stack Amazon clone. It features a modern, responsive user interface with high-fidelity components, a persistence layer using a lightweight local database, and features such as search, user cart management, order history, ratings/reviews, and a Seller Dashboard to list and manage products.

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, Vanilla CSS3 (Custom design system), Vanilla JavaScript (Single Page Application architecture)
- **Database**: Local JSON storage (`data/db.json`) auto-seeded on first run.

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run the Application locally**:
   ```bash
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Render

To deploy this project to Render:

1. **Push the code to GitHub**:
   - Create a new repository on GitHub.
   - Push this local repository to GitHub:
     ```bash
     git add .
     git commit -m "Initial commit of Nile clone"
     git branch -M main
     git remote add origin <your-github-repo-url>
     git push -u origin main
     ```

2. **Deploy on Render**:
   - Log into [Render](https://render.com/).
   - Click **New** -> **Web Service**.
   - Connect your GitHub repository.
   - Configure the Web Service settings:
     - **Name**: `nile-amazon-clone` (or any name you prefer)
     - **Runtime**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
   - Render will build and deploy the application automatically.
