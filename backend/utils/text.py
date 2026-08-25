import re


ANSWER_PATTERNS = [
    re.compile(r"^\s*(?:Q(?:uestion)?\s*)?(\d{1,4})\s*[-:.]?\s*([A-H](?:\s*[,/]\s*[A-H])*)\s*$", re.I),
]


def normalize_whitespace(text: str) -> str:
    return re.sub(r"[ \t]+", " ", text.replace("\r\n", "\n").replace("\r", "\n")).strip()


def chunk_text(text: str, max_chars: int = 12000) -> list[str]:
    text = normalize_whitespace(text)
    if len(text) <= max_chars:
        return [text] if text else []
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0
    for block in re.split(r"\n(?=\s*(?:Q\.?\s*)?\d{1,4}[\).:-])", text):
        block = block.strip()
        if not block:
            continue
        if current_len + len(block) > max_chars and current:
            chunks.append("\n".join(current))
            current = []
            current_len = 0
        current.append(block)
        current_len += len(block)
    if current:
        chunks.append("\n".join(current))
    return chunks


def parse_answer_key(text: str) -> dict[int, list[str]]:
    answers: dict[int, list[str]] = {}
    for raw_line in normalize_whitespace(text).splitlines():
        line = raw_line.strip()
        for pattern in ANSWER_PATTERNS:
            match = pattern.match(line)
            if match:
                answers[int(match.group(1))] = [part.strip().upper() for part in re.split(r"[,/]", match.group(2))]
                break
    return answers


def parse_explanations(text: str) -> dict[int, str]:
    explanations: dict[int, str] = {}
    pattern = re.compile(r"(?:^|\n)\s*(?:Q(?:uestion)?\s*)?(\d{1,4})\s*[:.)-]\s*", re.I)
    matches = list(pattern.finditer(text))
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        if body:
            explanations[int(match.group(1))] = body
    return explanations
