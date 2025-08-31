import React, { useState } from "react";

const App = () => {
  const [file, setFile] = useState(null);
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState("modern");

  const themes = {
    modern: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      cardBg: "bg-white",
      shadow: "shadow-lg",
      accent: "text-blue-600",
      inputBorder: "border-gray-300",
    },
    minimal: {
      bg: "bg-white",
      text: "text-gray-900",
      cardBg: "bg-gray-50",
      shadow: "shadow-md",
      accent: "text-green-600",
      inputBorder: "border-gray-200",
    },
    colorful: {
      bg: "bg-indigo-50",
      text: "text-indigo-900",
      cardBg: "bg-white",
      shadow: "shadow-xl",
      accent: "text-pink-600",
      inputBorder: "border-indigo-200",
    },
  };

  const currentTheme = themes[theme];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file.");
      return;
    }

    setLoading(true);
    setError("");
    setPortfolioData(null);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const response = await fetch("http://localhost:8080/generate", {
        method: "POST",
        body: formData, // send the resume file
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with a non-200 status: ${errorText}`);
      }

      // Parse the JSON directly
      const json = await response.json();
      setPortfolioData(json);
    } catch (err) {
      setError(`Error: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen font-sans antialiased p-8 flex items-center justify-center ${currentTheme.bg}`}
    >
      <div
        className={`container mx-auto p-8 rounded-xl ${currentTheme.cardBg} ${currentTheme.shadow} max-w-4xl`}
      >
        <h1
          className={`text-4xl font-bold mb-4 text-center ${currentTheme.accent}`}
        >
          AI Portfolio Generator
        </h1>
        <p className={`text-center mb-8 ${currentTheme.text}`}>
          Upload your resume and let AI create a professional portfolio for you.
        </p>

        {/* Theme Selector */}
        <div className="flex justify-center mb-6 space-x-4">
          {Object.keys(themes).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`py-2 px-4 rounded-full font-medium transition-all duration-300 ${
                t === theme
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* File Upload Form */}
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => {
              setFile(e.target.files[0]);
              setPortfolioData(null);
              setError("");
            }}
            className={`file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 mb-4 p-2 rounded-full cursor-pointer
                      ${currentTheme.inputBorder} border`}
          />
          <button
            type="submit"
            disabled={loading}
            className={`py-2 px-6 font-semibold rounded-full shadow-md transition-transform
                        ${
                          loading
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
          >
            {loading ? "Generating..." : "Generate Portfolio"}
          </button>
        </form>

        {/* Status and Error Messages */}
        {loading && (
          <p className="text-center mt-4 text-blue-500 font-medium">
            Generating your portfolio, please wait...
          </p>
        )}
        {error && (
          <p className="text-center mt-4 text-red-500 font-medium">{error}</p>
        )}

        {/* Portfolio Display */}
        {portfolioData && (
          <div className="mt-8 space-y-8">
            {/* Header */}
            <div className="text-center">
              <h2 className={`text-3xl font-bold ${currentTheme.text}`}>
                {portfolioData.name}
              </h2>
              <p className={`text-xl font-light ${currentTheme.accent}`}>
                {portfolioData.title}
              </p>
            </div>

            {/* About Section */}
            {portfolioData.about && (
              <div>
                <h3
                  className={`text-2xl font-bold mb-2 ${currentTheme.accent}`}
                >
                  About Me
                </h3>
                <p className={`leading-relaxed ${currentTheme.text}`}>
                  {portfolioData.about}
                </p>
              </div>
            )}

            {/* Skills */}
            {portfolioData.skills && portfolioData.skills.length > 0 && (
              <div>
                <h3
                  className={`text-2xl font-bold mb-2 ${currentTheme.accent}`}
                >
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {portfolioData.skills.map((skill, index) => (
                    <span
                      key={index}
                      className={`py-1 px-3 rounded-full text-sm font-medium ${currentTheme.accent} bg-opacity-10 ${currentTheme.bg}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {portfolioData.experience &&
              portfolioData.experience.length > 0 && (
                <div>
                  <h3
                    className={`text-2xl font-bold mb-2 ${currentTheme.accent}`}
                  >
                    Experience
                  </h3>
                  <div className="space-y-4">
                    {portfolioData.experience.map((exp, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <h4
                          className={`text-lg font-semibold ${currentTheme.text}`}
                        >
                          {exp.role} at {exp.company}
                        </h4>
                        <p className={`text-sm italic ${currentTheme.text}`}>
                          {exp.start} - {exp.end}
                        </p>
                        <p className={`text-sm ${currentTheme.text} mt-1`}>
                          {exp.summary}
                        </p>
                        {exp.achievements && exp.achievements.length > 0 && (
                          <ul className="list-disc ml-5 mt-1">
                            {exp.achievements.map((ach, i) => (
                              <li key={i} className={currentTheme.text}>
                                {ach}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Projects */}
            {portfolioData.projects && portfolioData.projects.length > 0 && (
              <div>
                <h3
                  className={`text-2xl font-bold mb-2 ${currentTheme.accent}`}
                >
                  Projects
                </h3>
                <div className="space-y-4">
                  {portfolioData.projects.map((proj, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <h4
                        className={`text-lg font-semibold ${currentTheme.text}`}
                      >
                        {proj.name}
                      </h4>
                      <p className={`text-sm ${currentTheme.text} mt-1`}>
                        {proj.description}
                      </p>
                      {proj.tech && proj.tech.length > 0 && (
                        <p className={`text-sm ${currentTheme.text} mt-1`}>
                          Tech: {proj.tech.join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {portfolioData.education && portfolioData.education.length > 0 && (
              <div>
                <h3
                  className={`text-2xl font-bold mb-2 ${currentTheme.accent}`}
                >
                  Education
                </h3>
                <div className="space-y-4">
                  {portfolioData.education.map((edu, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <h4
                        className={`text-lg font-semibold ${currentTheme.text}`}
                      >
                        {edu.degree}
                      </h4>
                      <p className={`text-sm italic ${currentTheme.text}`}>
                        {edu.institution}, {edu.start} - {edu.end}
                      </p>
                      {edu.details && (
                        <p className={currentTheme.text}>{edu.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
