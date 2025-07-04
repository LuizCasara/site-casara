# 🚀 Luiz Casara - Portfolio & Utility Apps

<div align="center">
  <img src="/public/android-chrome-512x512.png" alt="Luiz Casara Logo" width="120" height="120" />
  <br />
  <p><em>Web Developer & Software Engineer Portfolio</em></p>
</div>

## 📋 Overview

This is a personal portfolio website and collection of utility applications built with modern web technologies. The site showcases my skills, projects, and provides useful web-based tools for various tasks.

### ✨ Features

- 🎨 Responsive design that works on all devices
- 🧰 Collection of utility applications:
    - 💱 Currency and unit converters (Bitcoin, standard currencies, file sizes, kitchen units, number systems)
    - 🔄 File format converters (Image to SVG)
    - 📊 Mathematical tools (Compound interest calculator, percentage calculator, rule of three)
    - 🎭 Personalization tools (QR code generator)
    - 🧠 Personal development tools (Temperament assessment)
- 📱 Telegram integration for notifications
- 📧 Email sending functionality
- 📄 PDF generation for reports and documents

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/)
- **Fonts**: Google Fonts (Quicksand, Space Mono)
- **Build Tool**: [Turbopack](https://turbo.build/pack)
- **Analytics**: [Vercel Analytics](https://vercel.com/analytics)
- **Libraries**:
  - [potrace](https://github.com/tooolbox/node-potrace) - For image to SVG conversion
  - [qrcode](https://github.com/soldair/node-qrcode) - For QR code generation
  - [html2canvas](https://html2canvas.hertzen.com/) - For capturing HTML content as canvas
  - [jspdf](https://github.com/parallax/jsPDF) - For generating PDF documents
  - [nodemailer](https://nodemailer.com/) - For sending emails

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# Telegram Integration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
TELEGRAM_THREAD_ID=your_telegram_thread_id

# Email Configuration (for nodemailer)
EMAIL_HOST=your_smtp_host
EMAIL_PORT=your_smtp_port
EMAIL_USER=your_email_username
EMAIL_PASS=your_email_password
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/site-luizcasara.git
   cd site-luizcasara
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables as described above.

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the site.

## 📱 Mobile Optimization

The site is fully responsive and optimized for mobile devices:

- Responsive layout that adapts to different screen sizes
- Touch-friendly UI elements
- Mobile navigation menu
- Optimized performance for mobile networks

## 📂 Project Structure

```
site-luizcasara/
├── app/                  # Next.js app router
│   ├── about/            # About page
│   ├── api/              # API routes
│   │   ├── send-email/   # Email sending API
│   │   └── telegram/     # Telegram integration API
│   ├── projects/         # Projects page
│   ├── page.tsx          # Home page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── apps/                 # Utility applications
│   ├── conversion/       # Currency and unit converters
│   │   ├── bitcoin.tsx   # Bitcoin converter
│   │   ├── currency.tsx  # Currency converter
│   │   ├── file-size.tsx # File size converter
│   │   ├── kitchen-units.tsx # Kitchen units converter
│   │   └── number-systems.tsx # Number systems converter
│   ├── desenvolvimento-pessoal/ # Personal development tools
│   │   └── descubra-seu-temperamento.tsx # Temperament assessment
│   ├── math/             # Mathematical tools
│   │   ├── compound-interest.tsx # Compound interest calculator
│   │   ├── percentage.tsx # Percentage calculator
│   │   └── rule-of-three.tsx # Rule of three calculator
│   └── personalization/  # Personalization tools
│       ├── image-to-svg.tsx # Image to SVG converter
│       └── qr-code.tsx   # QR code generator
├── components/           # Reusable UI components
│   ├── AppFooter.tsx     # Alternative footer component
│   ├── Footer.tsx        # Site footer
│   └── Header.tsx        # Site header with navigation
├── public/               # Static assets
├── utils/                # Utility functions
│   └── pdf-generator.tsx # PDF generation utility
└── ...
```

## 🔌 API Routes

The project includes several API routes for backend functionality:

### 📧 Email API

Located at `/app/api/send-email`, this API uses nodemailer to send emails from the contact form.

### 📱 Telegram API

Located at `/app/api/telegram`, this API integrates with the Telegram Bot API to send notifications.

## 🔧 Available Scripts

- `npm run dev` - Run the development server with Turbopack
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

## 🌐 Deployment

The site can be deployed to any platform that supports Next.js, such as:

- [Vercel](https://vercel.com/) (recommended)
- [Netlify](https://www.netlify.com/)
- [AWS Amplify](https://aws.amazon.com/amplify/)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

Feel free to reach out if you have any questions or suggestions!

---

<div align="center">
  <p>Made with ❤️ by Luiz Casara</p>
  <p>
    <a href="https://github.com/luizcasara">GitHub</a> •
    <a href="https://linkedin.com/in/luizcasara">LinkedIn</a>
  </p>
</div>
