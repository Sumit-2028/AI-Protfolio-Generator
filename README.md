AI Portfolio Generator
This is a full-stack web application that generates a professional portfolio from a resume using the power of generative AI. Users can upload a PDF or DOCX resume, and the application will extract the text, send it to the Google Gemini API, and return a beautifully structured and styled portfolio in real time.

The project is built with a Go backend and a React frontend.

Features
Resume Parsing: Accepts and parses text from both .pdf and .docx files.

AI-Powered Generation: Uses the Google Gemini API to analyze resume content and generate a structured portfolio.

Real-time Streaming: Streams the AI-generated content back to the frontend using Server-Sent Events (SSE).

Theming: Includes three distinct UI themes (Modern, Minimal, and Colorful).

Responsive Design: The frontend is built with Tailwind CSS and is fully responsive for desktop and mobile devices.

Technologies Used
Backend
Go: The main programming language for the server.

Gorilla Mux: A powerful HTTP router for handling requests.

github.com/ledongthuc/pdf: An open-source library for parsing PDF files.

github.com/unidoc/unioffice/document: An open-source library for parsing DOCX files.

Google Gemini API: The generative AI model used to create the portfolio content.

Frontend
React: A JavaScript library for building the user interface.

Vite: A modern frontend build tool for a fast development experience.

Tailwind CSS: A utility-first CSS framework for styling.

Getting Started
Follow these steps to set up and run the project locally.

Prerequisites
Go: Make sure you have Go installed on your machine.

Node.js & npm: Ensure you have Node.js and npm installed for the frontend.

Gemini API Key: You will need to obtain a Gemini API key from Google AI Studio.

1. Backend Setup (Go)
Navigate to the AI Protfolio Maker directory in your terminal.

Initialize the Go module and download dependencies:

go mod init ai-portfolio-generator
go get [github.com/ledongthuc/pdf](https://github.com/ledongthuc/pdf) [github.com/unidoc/unioffice/document](https://github.com/unidoc/unioffice/document)
go mod tidy

Set your Gemini API key as an environment variable (replace YOUR_API_KEY_HERE with your key):

Windows (PowerShell): $env:GEMINI_API_KEY="YOUR_API_KEY_HERE"

Linux/macOS: export GEMINI_API_KEY="YOUR_API_KEY_HERE"

Run the Go server:

go run main.go

The server will start on http://localhost:8080.

2. Frontend Setup (React)
Navigate to the frontend directory in a new terminal window.

Install frontend dependencies:

npm install

Add your API key to the fetch request in src/App.jsx:

// In src/App.jsx, update this line in the handleSubmit function
const response = await fetch("http://localhost:8080/generate", {
    method: "POST",
    headers: {
        "X-Gemini-API-Key": "YOUR_API_KEY_HERE", // Replace with your key
    },
    body: formData,
});

Run the React development server:

npm run dev

The frontend will be available at http://localhost:5173.

3. Usage
With both the backend and frontend servers running, open http://localhost:5173 in your browser. You can now upload a PDF or DOCX resume and generate a professional portfolio.
