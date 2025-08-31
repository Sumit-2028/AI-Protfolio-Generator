package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/ledongthuc/pdf"
	"github.com/unidoc/unioffice/document"
)

const (
	addr            = ":8080"
	routeGenerate   = "/generate"
	maxMemoryUpload = 32 << 20 // 32 MB
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc(routeGenerate, handleGenerate)

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w, r)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	s := &http.Server{
		Addr:              addr,
		Handler:           logMiddleware(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}
	log.Printf("Listening on http://localhost%v", addr)
	log.Fatal(s.ListenAndServe())
}

func handleGenerate(w http.ResponseWriter, r *http.Request) {
	enableCORS(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		http.Error(w, "Server misconfigured: missing GEMINI_API_KEY", http.StatusInternalServerError)
		return
	}

	if err := r.ParseMultipartForm(maxMemoryUpload); err != nil {
		http.Error(w, "Invalid multipart form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("resume")
	if err != nil {
		http.Error(w, "Missing 'resume' file field", http.StatusBadRequest)
		return
	}
	defer file.Close()

	tempDir := os.TempDir()
	ext := strings.ToLower(filepath.Ext(header.Filename))
	tmpf, err := os.CreateTemp(tempDir, "resume-*"+ext)
	if err != nil {
		http.Error(w, "Failed to create temp file", http.StatusInternalServerError)
		return
	}
	defer func() {
		tmpf.Close()
		os.Remove(tmpf.Name())
	}()

	if _, err := io.Copy(tmpf, file); err != nil {
		http.Error(w, "Failed to read uploaded file", http.StatusBadRequest)
		return
	}
	if _, err := tmpf.Seek(0, io.SeekStart); err != nil {
		http.Error(w, "Failed to rewind temp file", http.StatusInternalServerError)
		return
	}

	var extracted string
	switch ext {
	case ".pdf":
		extracted, err = extractTextFromPDF(tmpf.Name())
	case ".docx":
		extracted, err = extractTextFromDocx(tmpf.Name())
	default:
		http.Error(w, "Unsupported file type. Use .pdf or .docx", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, "Failed to extract text: "+err.Error(), http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(extracted) == "" {
		http.Error(w, "Failed to extract text from file", http.StatusBadRequest)
		return
	}

	prompt := buildPrompt(extracted)

	reqBody := map[string]any{
		"contents": []any{
			map[string]any{
				"parts": []any{
					map[string]any{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]any{
			"response_mime_type": "application/json",
		},
	}
	payload, _ := json.Marshal(reqBody)

	// Non-streaming endpoint
	geminiURL := "https://generativelanguage.googleapis.com/v1beta/models/" +
		"gemini-2.5-flash-preview-05-20:generateContent?key=" + apiKey

	req, err := http.NewRequest(http.MethodPost, geminiURL, bytes.NewReader(payload))
	if err != nil {
		http.Error(w, "Failed to create upstream request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Upstream error: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		http.Error(w, "Upstream "+resp.Status+": "+string(body), http.StatusBadGateway)
		return
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read upstream response", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(respBody)
}

func extractTextFromPDF(path string) (string, error) {
	f, r, err := pdf.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	var buf bytes.Buffer
	b, err := r.GetPlainText()
	if err != nil {
		return "", err
	}
	if _, err := io.Copy(&buf, b); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func extractTextFromDocx(path string) (string, error) {
	doc, err := document.Open(path)
	if err != nil {
		return "", err
	}
	defer doc.Close()

	var sb strings.Builder
	for _, para := range doc.Paragraphs() {
		for _, run := range para.Runs() {
			sb.WriteString(run.Text())
		}
		sb.WriteString("\n")
	}
	return sb.String(), nil
}

func buildPrompt(resumeText string) string {
	sb := &strings.Builder{}
	sb.WriteString("You are given a candidate's resume text.\n")
	sb.WriteString("Return a SINGLE valid JSON object ONLY, with no preface, no markdown, no code fences.\n")
	sb.WriteString("MANDATORY keys: name, title, about, skills, projects, experience, education.\n")
	sb.WriteString("- name: string\n")
	sb.WriteString("- title: concise professional title\n")
	sb.WriteString("- about: 2-4 sentences summary\n")
	sb.WriteString("- skills: array of strings (deduplicate, normalized)\n")
	sb.WriteString("- projects: array of objects [{name, description, tech}]\n")
	sb.WriteString("- experience: array of objects [{company, role, start, end, summary, achievements[]}]\n")
	sb.WriteString("- education: array of objects [{institution, degree, start, end, details}]\n")
	sb.WriteString("If information is missing, infer conservatively or use empty strings/arrays, but STILL return a single valid JSON object.\n")
	sb.WriteString("\nRESUME TEXT BELOW:\n")
	sb.WriteString(resumeText)
	return sb.String()
}

func enableCORS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Vary", "Origin")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func logMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s %v", r.RemoteAddr, r.Method, r.URL.Path, time.Since(start))
	})
}
