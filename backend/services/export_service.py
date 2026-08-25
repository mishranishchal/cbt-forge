import base64
import html
import json
from io import BytesIO
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from services.cbt_service import CbtService
from utils.files import EXTRACTED_IMAGE_DIR, UPLOAD_DIR


def safe_image_path(path: str | None) -> Path | None:
    if not path:
        return None
    name = Path(str(path).replace("\\", "/")).name
    if not name or name in {".", ".."}:
        return None
    normalized = str(path).replace("\\", "/")
    if normalized.startswith("uploads/"):
        candidate = (UPLOAD_DIR.parent / normalized).resolve()
        root = UPLOAD_DIR.resolve()
    else:
        candidate = (EXTRACTED_IMAGE_DIR / name).resolve()
        root = EXTRACTED_IMAGE_DIR.resolve()
    if root not in candidate.parents and candidate != root:
        return None
    return candidate if candidate.is_file() else None


def image_data_uri(path: str | None) -> str | None:
    file_path = safe_image_path(path)
    if not file_path:
        return None
    suffix = file_path.suffix.lower().lstrip(".") or "png"
    mime = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "gif": "gif", "webp": "webp"}.get(suffix, "png")
    encoded = base64.b64encode(file_path.read_bytes()).decode("ascii")
    return f"data:image/{mime};base64,{encoded}"


class ExportService:
    def __init__(self) -> None:
        self.cbt = CbtService()

    def export_payload(self, attempt_id: str) -> dict[str, Any]:
        result = self.cbt.get_result(attempt_id)
        return {
            "test": {
                "id": result["test_id"],
                "title": result["configuration"]["test"]["title"],
                "description": result["configuration"]["test"].get("description"),
            },
            "configuration": result["configuration"],
            "questions": [self._portable_question(question) for question in result["questions"]],
            "responses": result["responses"],
            "result": result["scoring"],
            "section_analysis": result["analytics"]["section_analysis"],
            "topic_analysis": result["analytics"]["topic_analysis"],
            "strengths": result["analytics"]["strengths"],
            "weaknesses": result["analytics"]["weaknesses"],
            "ai_analysis": result.get("ai_analysis"),
            "time_used_seconds": result.get("time_used_seconds"),
            "submission_reason": result.get("submission_reason"),
            "attempt_id": attempt_id,
        }

    def export_json(self, attempt_id: str) -> dict[str, Any]:
        return self.export_payload(attempt_id)

    def _portable_question(self, question: dict[str, Any]) -> dict[str, Any]:
        item = json.loads(json.dumps(question))
        item["question_images"] = item.pop("question_images", item.pop("images", []))
        for image in self._all_images(item):
            path = str(image.get("path") or "")
            if path and not path.replace("\\", "/").startswith("uploads/"):
                image["path"] = f"extracted_images/{Path(path).name}"
        return item

    @staticmethod
    def _all_images(question: dict[str, Any]) -> list[dict[str, Any]]:
        images = list(question.get("question_images") or question.get("images") or [])
        for option in question.get("options") or []:
            images.extend(option.get("images") or [])
        if isinstance(question.get("explanation"), dict):
            images.extend(question["explanation"].get("images") or [])
        return [image for image in images if isinstance(image, dict)]

    def export_html(self, attempt_id: str) -> str:
        payload = self.export_payload(attempt_id)
        result = self.cbt.get_result(attempt_id)
        title = html.escape(payload["test"]["title"])
        display = result["analytics"]["display"]
        sections_rows = "".join(
            f"<tr><td>{html.escape(item['name'])}</td><td>{item['questions']}</td><td>{item['attempted']}</td>"
            f"<td>{item['correct']}</td><td>{item['wrong']}</td><td>{item['unattempted']}</td>"
            f"<td>{item['score']:.2f}</td><td>{item['accuracy']:.2f}%</td></tr>"
            for item in payload["section_analysis"]
        )
        topics_rows = "".join(
            f"<tr><td>{html.escape(item['name'])}</td><td>{item['attempted']}</td><td>{item['accuracy']:.2f}%</td>"
            f"<td>{html.escape(item['classification'])}</td></tr>"
            for item in payload["topic_analysis"]
        )
        strong = "".join(f"<li>{html.escape(item['name'])} — {item['accuracy']:.2f}%</li>" for item in payload["strengths"]) or "<li>No strong areas yet.</li>"
        weak = "".join(f"<li>{html.escape(item['name'])} — {item['accuracy']:.2f}%</li>" for item in payload["weaknesses"]) or "<li>No weak areas yet.</li>"
        questions_html = []
        questions = {item["id"]: item for item in result["questions"]}
        for row in result["scoring"]["question_results"]:
            question = questions.get(row["question_id"], {})
            images = ""
            for image in self._all_images(question):
                uri = image_data_uri(image.get("path"))
                if uri:
                    images += f'<img alt="Question image" src="{uri}" style="max-width:100%;margin:8px 0;" />'
            questions_html.append(
                f"""<article class="question">
                <h3>Question {html.escape(str(row.get('question_number') or row['question_id']))}</h3>
                <p>{html.escape(question.get('question_text') or '')}</p>
                {images}
                <p>Your answer: {html.escape(', '.join(row.get('selected_answers') or []) or 'Not Attempted')}</p>
                <p>Correct answer: {html.escape(', '.join(row.get('correct_answer') or []) or '—')}</p>
                <p>Status: {html.escape(row['status'])} | Marks: {row['marks']:+.2f} | Time: {row.get('time_spent_seconds') or 0}s</p>
                <p>Topic: {html.escape(row.get('topic') or 'Uncategorized')} | Difficulty: {html.escape(str(row.get('difficulty') or ''))}</p>
                <p>Explanation: {html.escape((question.get('explanation') or {}).get('text') if isinstance(question.get('explanation'), dict) else 'Explanation not provided.')}</p>
                </article>"""
            )
        ai = payload.get("ai_analysis")
        ai_html = ""
        if ai:
            ai_html = f"<section><h2>AI Performance Review</h2><p>{html.escape(str(ai.get('overall_assessment') or ''))}</p></section>"
        return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>{title} Report</title>
<style>
body {{ font-family: Georgia, serif; color: #172033; margin: 24px; }}
h1,h2,h3 {{ font-family: Arial, sans-serif; }}
table {{ border-collapse: collapse; width: 100%; margin: 12px 0 24px; }}
th, td {{ border: 1px solid #d8dee8; padding: 8px; text-align: left; }}
.question {{ border-top: 1px solid #d8dee8; padding-top: 12px; }}
@media print {{ button {{ display: none; }} }}
</style></head>
<body>
<button onclick="window.print()">Print Report</button>
<h1>{title}</h1>
<p>Date: {html.escape(str(result.get('end_time') or ''))}</p>
<p>Score: {display['score']} / {display['maximum_score']} | Percentage: {display['percentage']}% | Accuracy: {display['accuracy']}%</p>
<h2>Summary</h2>
<p>Attempted {result['scoring']['attempted']} | Correct {result['scoring']['correct']} | Wrong {result['scoring']['wrong']} | Unattempted {result['scoring']['unattempted']}</p>
<h2>Section Analysis</h2>
<table><thead><tr><th>Section</th><th>Questions</th><th>Attempted</th><th>Correct</th><th>Wrong</th><th>Unattempted</th><th>Score</th><th>Accuracy</th></tr></thead>
<tbody>{sections_rows}</tbody></table>
<h2>Topic Analysis</h2>
<table><thead><tr><th>Topic</th><th>Attempted</th><th>Accuracy</th><th>Classification</th></tr></thead>
<tbody>{topics_rows}</tbody></table>
<h2>Strong Areas</h2><ul>{strong}</ul>
<h2>Weak Areas</h2><ul>{weak}</ul>
{ai_html}
<h2>Question Review</h2>
{''.join(questions_html)}
</body></html>"""

    def export_pdf(self, attempt_id: str) -> bytes:
        result = self.cbt.get_result(attempt_id)
        payload = self.export_payload(attempt_id)
        buffer = BytesIO()
        styles = getSampleStyleSheet()
        heading = ParagraphStyle("CoverTitle", parent=styles["Title"], fontSize=22, spaceAfter=12)
        section_style = ParagraphStyle("SectionHead", parent=styles["Heading2"], textColor=colors.HexColor("#1f6f78"))
        body = ParagraphStyle("Body", parent=styles["BodyText"], leading=14, spaceAfter=6)

        def add_header_footer(canvas, doc):
            canvas.saveState()
            canvas.setFont("Helvetica", 9)
            canvas.setFillColor(colors.HexColor("#475569"))
            canvas.drawString(18 * mm, A4[1] - 12 * mm, payload["test"]["title"][:80])
            canvas.drawRightString(A4[0] - 18 * mm, 12 * mm, f"Page {doc.page}")
            canvas.restoreState()

        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=20 * mm, bottomMargin=18 * mm)
        story: list[Any] = [
            Paragraph("CBT Forge Performance Report", heading),
            Paragraph(html.escape(payload["test"]["title"]), styles["Heading1"]),
            Paragraph(f"Score: {result['analytics']['display']['score']} / {result['analytics']['display']['maximum_score']}", body),
            Paragraph(f"Percentage: {result['analytics']['display']['percentage']}% | Accuracy: {result['analytics']['display']['accuracy']}%", body),
            Paragraph(f"Time used: {result.get('time_used_seconds') or 0} seconds", body),
            PageBreak(),
            Paragraph("Performance Summary", section_style),
            Paragraph(
                f"Attempted {result['scoring']['attempted']}, correct {result['scoring']['correct']}, "
                f"wrong {result['scoring']['wrong']}, unattempted {result['scoring']['unattempted']}.",
                body,
            ),
            Paragraph("Section Analysis", section_style),
        ]
        section_data = [["Section", "Q", "Att", "Corr", "Wrong", "Unatt", "Score", "Acc %"]]
        for item in payload["section_analysis"]:
            section_data.append(
                [
                    item["name"],
                    str(item["questions"]),
                    str(item["attempted"]),
                    str(item["correct"]),
                    str(item["wrong"]),
                    str(item["unattempted"]),
                    f"{item['score']:.2f}",
                    f"{item['accuracy']:.2f}",
                ]
            )
        table = Table(section_data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f6f78")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d8dee8")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.extend([table, Spacer(1, 12), Paragraph("Topic Analysis", section_style)])
        topic_data = [["Topic", "Attempted", "Accuracy", "Class"]]
        for item in payload["topic_analysis"]:
            topic_data.append([item["name"], str(item["attempted"]), f"{item['accuracy']:.2f}%", item["classification"]])
        topic_table = Table(topic_data, repeatRows=1)
        topic_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#172033")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d8dee8")),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(topic_table)
        story.append(Paragraph("Strengths", section_style))
        if payload["strengths"]:
            for item in payload["strengths"]:
                story.append(Paragraph(f"{html.escape(item['name'])}: {item['accuracy']:.2f}%", body))
        else:
            story.append(Paragraph("No strong areas yet.", body))
        story.append(Paragraph("Weaknesses", section_style))
        if payload["weaknesses"]:
            for item in payload["weaknesses"]:
                story.append(Paragraph(f"{html.escape(item['name'])}: {item['accuracy']:.2f}%", body))
        else:
            story.append(Paragraph("No weak areas yet.", body))
        story.append(PageBreak())
        story.append(Paragraph("Detailed Question Review", section_style))
        questions = {item["id"]: item for item in result["questions"]}
        for row in result["scoring"]["question_results"]:
            question = questions.get(row["question_id"], {})
            story.append(Paragraph(f"Question {row.get('question_number') or row['question_id']}", styles["Heading3"]))
            story.append(Paragraph(html.escape(question.get("question_text") or ""), body))
            for image in self._all_images(question):
                file_path = safe_image_path(image.get("path"))
                if file_path:
                    try:
                        story.append(Image(str(file_path), width=140 * mm, height=70 * mm, kind="proportional"))
                    except Exception:
                        story.append(Paragraph("Question image could not be embedded.", body))
            selected = ", ".join(row.get("selected_answers") or []) or "Not Attempted"
            correct = ", ".join(row.get("correct_answer") or []) or "—"
            story.append(Paragraph(f"Your answer: {html.escape(selected)} | Correct: {html.escape(correct)}", body))
            story.append(Paragraph(f"Status: {row['status']} | Marks: {row['marks']:+.2f} | Time: {row.get('time_spent_seconds') or 0}s", body))
            explanation = question.get("explanation") or {}
            text = explanation.get("text") if isinstance(explanation, dict) else None
            story.append(Paragraph(f"Explanation: {html.escape(text or 'Explanation not provided.')}", body))
        doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
        return buffer.getvalue()
