# Veylora Studio

Updated replacement website package for **Veylora Studio**, a digital agency offering 2D web design, 3D web experiences, and AI automation. It includes a dark premium visual system with purple and electric-blue accents, a custom V monogram logo, portfolio concepts, a quick-demo chatbot, optional real AI integration, lead capture, and consultation request forms.

## Replacing your existing GitHub website

1. Download this ZIP and extract it on your phone or computer.
2. Open your existing GitHub repository: `https://github.com/veylora-studio/veylora-studio`.
3. Replace the existing `index.html`, `styles.css`, `app.js`, `server.js`, `package.json`, and `README.md` with the matching files from this folder. Add the new `logo.svg` file.
4. Do **not** upload `.env`, `node_modules`, or the `data` folder. Never place an AI API key in website files.
5. Commit the changes to the `main` branch. Render should redeploy automatically if it is connected to this repository.

The ZIP keeps the same main filenames as the existing site so you can replace them rather than rebuild the project. Keep any existing hosting environment variables in Render.

## What's included

- Responsive landing page with services, concept portfolio, process, and contact form
- Floating chatbot with predefined/demo responses
- Optional server-side AI chat integration (API key stays on the server)
- Lead capture endpoint that saves enquiries locally
- Appointment request endpoint that saves requests locally
- Accessible labels, mobile navigation, and reduced-motion support

## Requirements

- Node.js 18 or newer
- An AI provider API key for real AI mode (optional for demo mode)

## Run locally

1. Download and extract this project.
2. Open a terminal inside the extracted `veylora-studio` folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env`.
5. For real AI chat, add your API key to `OPENAI_API_KEY` in `.env`. Keep this secret. Without it, the quick demo still works.
6. Start the server:

   ```bash
   npm start
   ```

7. Open `http://localhost:3000` in your browser.

Do not open `index.html` directly with `file://` if you want forms and the AI backend to work. Use the local server.

## Chatbot modes

- **Quick demo** responds to common questions about services, pricing, project enquiries, and consultations without an API key.
- **AI conversation** calls `/api/chat` on your server. Add `OPENAI_API_KEY` to `.env`, confirm that your account has access to the model in `OPENAI_MODEL`, then restart the server.
- **Lead capture** collects a visitor's name, email, service, and project brief, then submits to `/api/leads`.
- **Appointment request** collects a preferred date and time and submits to `/api/appointments`.

Appointment requests are not automatic calendar bookings. The site clearly tells the visitor that a person must confirm availability. To create actual bookings, integrate a scheduling provider or calendar API and configure its credentials server-side.

## Where submissions are saved

The server writes submissions to:

- `data/leads.json`
- `data/appointments.json`

These local JSON files are suitable for a starter project or local testing, not a robust production CRM. For public production use, replace local-file storage with a database or CRM, add spam protection/rate limiting, set retention rules, and publish a privacy notice. Do not commit the `data` directory.

## Publish online

Use a Node.js hosting service that supports a long-running Express app, environment variables, and persistent storage or an external database. General deployment checklist:

1. Upload the project to a private or public Git repository, excluding `.env`, `node_modules`, and `data`.
2. Create a new Node.js web service on your host and connect the repository.
3. Set build/install command to `npm install` and start command to `npm start`.
4. Add `OPENAI_API_KEY` and `OPENAI_MODEL` in the host's environment-variable settings if enabling AI chat. Never add the key to `app.js`, `index.html`, or `styles.css`.
5. Configure persistent storage or connect a database/CRM for submissions. Local files may be erased on redeploy or may not persist on some hosts.
6. Enable HTTPS, test the contact form and chatbot, and add a privacy policy and spam prevention before advertising the site.

You can also deploy the static frontend to a static host, but the API routes require the included Node server or a separately deployed backend. If frontend and backend use different domains, configure CORS carefully and update the API URLs accordingly.

## Customize before launch

- Replace the concept portfolio cards with real work. The current portfolio cards are explicitly labeled as concepts.
- Add real client testimonials only with permission. No fabricated testimonials are included.
- Update contact details, service descriptions, business hours, and social links.
- Connect a real calendar/scheduling service if you want confirmed appointment slots.
- Add analytics only after choosing a privacy-compliant setup.

## API endpoints

- `GET /api/health` — health check
- `POST /api/leads` — saves a project enquiry
- `POST /api/appointments` — saves an appointment request (pending confirmation)
- `POST /api/chat` — sends a chat message to the configured AI provider

## Security notes

The included backend is a starter implementation. Before a public launch, add request rate limits and spam protection, validate all input, move submissions into managed storage, configure backups and access control, and set appropriate privacy/retention practices. Do not store sensitive information through the chatbot.
