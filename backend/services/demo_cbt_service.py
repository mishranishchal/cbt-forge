from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from schemas.configuration import (
    BehaviorConfig,
    MarkingScheme,
    NavigationConfig,
    TestConfiguration,
    TestMetadata,
    TestSection,
    TimingConfig,
    TimingMode,
)
from schemas.question import Option, Question, QuestionImage, QuestionType
from services.configuration_service import ConfigurationService
from utils.files import EXTRACTED_IMAGE_DIR, ensure_data_dirs, test_dir, write_json

DEMO_TEST_ID = "demo_cbt"


def _draw_image(filename: str, bars: list[tuple[str, int]], title: str) -> str:
    ensure_data_dirs()
    path = EXTRACTED_IMAGE_DIR / filename
    image = Image.new("RGB", (720, 400), "#f7f8fb")
    draw = ImageDraw.Draw(image)
    draw.rectangle((16, 16, 704, 384), outline="#1f6f78", width=2)
    draw.rectangle((16, 16, 704, 64), fill="#1f6f78")
    try:
        font = ImageFont.truetype("arial.ttf", 18)
        small = ImageFont.truetype("arial.ttf", 14)
    except OSError:
        font = ImageFont.load_default()
        small = font
    draw.text((28, 28), title, fill="white", font=font)
    origin_x, origin_y = 80, 330
    max_h = 220
    max_val = max(value for _, value in bars) or 1
    width = 90
    gap = 40
    for index, (label, value) in enumerate(bars):
        height = int(max_h * value / max_val)
        x0 = origin_x + index * (width + gap)
        y0 = origin_y - height
        draw.rectangle((x0, y0, x0 + width, origin_y), fill="#b06b34")
        draw.text((x0 + 30, origin_y + 8), label, fill="#172033", font=small)
        draw.text((x0 + 28, y0 - 22), str(value), fill="#172033", font=small)
    image.save(path, "PNG")
    return str(path)


def demo_questions() -> list[Question]:
    chart = _draw_image("demo_chart.png", [("A", 40), ("B", 80), ("C", 140), ("D", 95)], "Monthly output by option")
    code = _draw_image("demo_code.png", [("A", 20), ("B", 60), ("C", 45), ("D", 30)], "Sample output bars")
    raw = [
        ("What is 25% of 200?", [("A", "25"), ("B", "50"), ("C", "75"), ("D", "100")], ["B"], "25% of 200 is 50.", "Percentages", "Quantitative Aptitude", "single_choice"),
        ("A shirt costing 250 is sold at 20% profit. Profit amount is:", [("A", "40"), ("B", "45"), ("C", "50"), ("D", "60")], ["C"], "20% of 250 is 50.", "Percentages", "Quantitative Aptitude", "single_choice"),
        ("If 40% of a number is 80, the number is:", [("A", "160"), ("B", "180"), ("C", "200"), ("D", "220")], ["C"], "x = 80 / 0.4 = 200.", "Percentages", "Quantitative Aptitude", "single_choice"),
        ("Solve: 3x + 7 = 22.", [("A", "3"), ("B", "5"), ("C", "7"), ("D", "9")], ["B"], "3x = 15, so x = 5.", "Algebra", "Quantitative Aptitude", "single_choice"),
        ("If 2x - 4 = 10, x equals:", [("A", "5"), ("B", "6"), ("C", "7"), ("D", "8")], ["C"], "2x = 14, x = 7.", "Algebra", "Quantitative Aptitude", "single_choice"),
        ("The average of 10, 20 and 30 is:", [("A", "15"), ("B", "20"), ("C", "25"), ("D", "30")], ["B"], "Sum 60 divided by 3 is 20.", "Arithmetic", "Quantitative Aptitude", "single_choice"),
        ("A car covers 60 km in 2 hours. Average speed is:", [("A", "20 km/h"), ("B", "30 km/h"), ("C", "40 km/h"), ("D", "60 km/h")], ["B"], "Speed = 60/2 = 30 km/h.", "Arithmetic", "Quantitative Aptitude", "single_choice"),
        ("Select all even numbers.", [("A", "2"), ("B", "3"), ("C", "4"), ("D", "5")], ["A", "C"], "2 and 4 are even.", "Arithmetic", "Quantitative Aptitude", "multiple_choice"),
        ("Using the chart, which option has the highest output?", [("A", "A"), ("B", "B"), ("C", "C"), ("D", "D")], ["C"], "Bar C is the tallest.", "Data Interpretation", "Quantitative Aptitude", "image_based"),
        ("Simple interest on 1000 at 10% for 2 years is:", [("A", "100"), ("B", "150"), ("C", "200"), ("D", "250")], ["C"], "SI = PRT/100 = 200.", "Arithmetic", "Quantitative Aptitude", "single_choice"),
        ("Find the odd one out: Dog, Cat, Lion, Car", [("A", "Dog"), ("B", "Cat"), ("C", "Lion"), ("D", "Car")], ["D"], "Car is not an animal.", "Logical Reasoning", "Reasoning & Language", "single_choice"),
        ("Book : Read :: Pen : ?", [("A", "Ink"), ("B", "Write"), ("C", "Paper"), ("D", "Cap")], ["B"], "A pen is used to write.", "Logical Reasoning", "Reasoning & Language", "single_choice"),
        ("All squares are rectangles.", [("A", "True"), ("B", "False")], ["A"], "A square is a special rectangle.", "Logical Reasoning", "Reasoning & Language", "true_false"),
        ("Choose the synonym of rapid.", [("A", "Slow"), ("B", "Quick"), ("C", "Late"), ("D", "Idle")], ["B"], "Rapid means quick.", "Grammar", "Reasoning & Language", "single_choice"),
        ("Choose the correctly spelled word.", [("A", "Recieve"), ("B", "Receive"), ("C", "Receeve"), ("D", "Receve")], ["B"], "Receive follows i-before-e exceptions for 'cei'.", "Grammar", "Reasoning & Language", "single_choice"),
        ("Identify the error: She don't like tea.", [("A", "She"), ("B", "don't"), ("C", "like"), ("D", "tea")], ["B"], "Use doesn't with she.", "Grammar", "Reasoning & Language", "single_choice"),
        ("What does range(3) produce in Python?", [("A", "1 2 3"), ("B", "0 1 2"), ("C", "0 1 2 3"), ("D", "Error")], ["B"], "range(3) yields 0, 1, and 2.", "Programming", "Reasoning & Language", "single_choice"),
        ("In Python, which keyword defines a function?", [("A", "func"), ("B", "def"), ("C", "lambda"), ("D", "method")], ["B"], "Named functions use def.", "Programming", "Reasoning & Language", "single_choice"),
        ("The sample output chart is highest at which label?", [("A", "A"), ("B", "B"), ("C", "C"), ("D", "D")], ["B"], "Bar B is highest in the second chart.", "Programming", "Reasoning & Language", "image_based"),
        ("A series is 2, 4, 8, 16. The next term is:", [("A", "18"), ("B", "24"), ("C", "32"), ("D", "36")], ["C"], "Each term doubles.", "Logical Reasoning", "Reasoning & Language", "single_choice"),
    ]
    questions: list[Question] = []
    for index, item in enumerate(raw, start=1):
        text, options, answer, explanation, topic, section, qtype = item
        images = []
        if index == 9:
            images = [QuestionImage(path=chart, type="question_image")]
            explanation = None
        if index == 19:
            images = [QuestionImage(path=code, type="question_image")]
        questions.append(
            Question(
                id=f"{DEMO_TEST_ID}_q{index:03d}",
                question_number=index,
                section=section,
                topic=topic,
                question_type=QuestionType(qtype),
                question_text=text,
                options=[Option(id=option_id, text=option_text) for option_id, option_text in options],
                correct_answer=answer,
                explanation=explanation,
                images=images,
                difficulty="medium",
                confidence=0.95,
                validation_status="valid",
            )
        )
    return questions


def ensure_demo_test() -> str:
    questions = demo_questions()
    directory = test_dir(DEMO_TEST_ID)
    write_json(directory / "questions.json", [question.model_dump(mode="json") for question in questions])
    quant_ids = [question.id for question in questions if question.section == "Quantitative Aptitude"]
    language_ids = [question.id for question in questions if question.section == "Reasoning & Language"]
    config = TestConfiguration(
        test=TestMetadata(
            id=DEMO_TEST_ID,
            title="CBT Forge Demo Mock Test",
            description="A 20-question mixed-type demo with two sections, images, and section timing.",
            instructions=(
                "1. This demo contains 20 questions in two sections.\n"
                "2. Each section has its own timer.\n"
                "3. Correct answers carry +1 mark.\n"
                "4. Wrong answers carry -0.25 marks.\n"
                "5. Unattempted questions carry 0 marks.\n"
                "6. Mark for review and section switching are allowed.\n"
                "7. Explanations and correct answers are hidden until you submit."
            ),
            timing=TimingConfig(mode=TimingMode.section, total_minutes=40),
            navigation=NavigationConfig(),
            behavior=BehaviorConfig(auto_submit=True),
            global_marking=MarkingScheme(correct=1, wrong=-0.25, unattempted=0),
            use_global_marking=True,
        ),
        sections=[
            TestSection(id="section_quant", name="Quantitative Aptitude", duration_minutes=20, expected_question_count=10, marking=MarkingScheme(), question_ids=quant_ids),
            TestSection(id="section_language", name="Reasoning & Language", duration_minutes=20, expected_question_count=10, marking=MarkingScheme(), question_ids=language_ids),
        ],
    )
    ConfigurationService().save(DEMO_TEST_ID, config)
    write_json(
        directory / "test.json",
        {"test_id": DEMO_TEST_ID, "title": config.test.title, "status": "ready", "demo": True},
    )
    return DEMO_TEST_ID
