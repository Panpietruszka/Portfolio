"""Normalizacja surowych nazw języków z edytorów do krótkiej, stałej listy."""

KNOWN = {
    "python": "Python",
    "pythonstub": "Python",
    "typescript": "TypeScript",
    "typescriptreact": "TypeScript",
    "javascript": "JavaScript",
    "javascriptreact": "JavaScript",
    "html": "HTML",
    "css": "CSS",
    "scss": "CSS",
    "less": "CSS",
    "json": "JSON",
    "jsonc": "JSON",
    "markdown": "Markdown",
    "yaml": "YAML",
    "sql": "SQL",
    "java": "Java",
    "kotlin": "Kotlin",
    "c": "C",
    "cpp": "C++",
    "csharp": "C#",
    "go": "Go",
    "rust": "Rust",
    "shellscript": "Shell",
    "powershell": "PowerShell",
}

OTHER = "Other"


def normalize_language(raw: str) -> str:
    return KNOWN.get(raw.strip().lower(), OTHER)