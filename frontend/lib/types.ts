// export type FileRole =
//   | "question_paper"
//   | "answer_key"
//   | "explanation"
//   | "other";


// // ============================================================
// // QUESTION TYPES
// // ============================================================

// export type QuestionType =
//   | "single_choice"
//   | "multiple_choice"       // legacy
//   | "multiple_select"       // new canonical type
//   | "true_false"
//   | "integer"
//   | "real_number"
//   | "numerical_tolerance"
//   | "short_answer"
//   | "long_answer"
//   | "image_based"            // legacy compatibility
//   | "unknown";

// export type ValidationStatus =
//   | "valid"
//   | "warning"
//   | "error";


// // ============================================================
// // ANSWER CONFIGURATION
// // ============================================================

// export type AnswerInputMode =
//   | "single_choice"
//   | "multiple_select"
//   | "integer"
//   | "real_number"
//   | "text"
//   | "long_text";

// export type EvaluationMode =
//   | "automatic"
//   | "manual";

// export interface AnswerConfig {
//   input_mode?: AnswerInputMode | null;

//   /**
//    * Used for:
//    *
//    * single_choice
//    * multiple_select
//    * integer
//    * real_number
//    * numerical_tolerance
//    * true_false
//    */
//   correct_answers: string[];

//   /**
//    * Used mainly for short-answer questions.
//    */
//   accepted_answers: string[];

//   /**
//    * Used by numerical_tolerance.
//    *
//    * String is intentional so exact decimal representation
//    * is preserved.
//    */
//   tolerance?: string | null;

//   case_sensitive: boolean;

//   evaluation: EvaluationMode;
// }


// // ============================================================
// // MARKING
// // ============================================================

// export interface MarkingRule {
//   /**
//    * Stored as string rather than number.
//    *
//    * Examples:
//    *
//    * "1"
//    * "1.5"
//    * "-0.33"
//    * "-1/3"
//    */
//   correct: string;

//   incorrect: string;

//   unattempted: string;

//   /**
//    * Mainly useful for long/descriptive questions.
//    */
//   maximum_marks?: string | null;

//   /**
//    * false:
//    * inherit test/section marking
//    *
//    * true:
//    * use this question's marking
//    */
//   override_default: boolean;
// }


// // ============================================================
// // IMAGES
// // ============================================================

// export interface QuestionImage {
//   id?: string | null;

//   path: string;

//   filename?: string | null;

//   mime_type?: string | null;

//   alt_text?: string | null;

//   width?: number | null;

//   height?: number | null;

//   type:
//     | "question_image"
//     | "page_render"
//     | "embedded_image";

//   page_number?: number | null;
// }


// export interface Option {
//   id: string;

//   text: string;

//   /**
//    * Optional.
//    *
//    * An option can contain:
//    *
//    * text only
//    * image only
//    * text + image
//    */
//   images?: QuestionImage[];
// }


// export interface Explanation {
//   /**
//    * Explanation itself is optional.
//    */
//   text: string | null;

//   /**
//    * Explanation images are optional.
//    */
//   images: QuestionImage[];
// }


// // ============================================================
// // QUESTION
// // ============================================================

// export interface Question {
//   id: string;

//   question_number: number | null;

//   section: string | null;

//   topic: string | null;

//   subtopic: string | null;

//   question_type: QuestionType;

//   question_text: string;

//   /**
//    * Zero, one or multiple images.
//    */
//   question_images: QuestionImage[];

//   /**
//    * Zero or more options.
//    *
//    * Not every question type requires options.
//    */
//   options: Option[];

//   /**
//    * Legacy answer field retained for backward compatibility.
//    *
//    * New code should prefer answer_config.
//    */
//   correct_answer: string[] | null;

//   /**
//    * New flexible answer configuration.
//    */
//   answer_config: AnswerConfig;

//   /**
//    * New per-question marking rule.
//    */
//   marking: MarkingRule;

//   /**
//    * Explanation may be completely absent.
//    */
//   explanation: Explanation | null;

//   difficulty:
//     | "easy"
//     | "medium"
//     | "hard"
//     | "unknown";

//   source_page: number | null;

//   confidence: number;

//   validation_status: ValidationStatus;

//   warnings: string[];
// }


// // ============================================================
// // EXTRACTION
// // ============================================================

// export interface ExtractionSummary {
//   questions_found: number;

//   valid: number;

//   warnings: number;

//   errors: number;

//   pages_total: number;

//   pages_processed: number;

//   pages_ocr: number;

//   pages_failed: number;

//   warnings_list: string[];
// }


// export interface ExtractResponse {
//   test_id: string;

//   status: string;

//   message: string;

//   summary: ExtractionSummary;

//   questions: Question[];
// }


// // ============================================================
// // TEST CONFIGURATION
// // ============================================================

// export type TimingMode =
//   | "single"
//   | "section";


// export interface MarkingScheme {
//   /**
//    * Test/section default marking.
//    *
//    * These remain strings so the exact representation can
//    * preserve values such as "-1/3".
//    */
//   correct: string;

//   wrong: string;

//   unattempted: string;
// }


// export interface TimingConfig {
//   mode: TimingMode;

//   total_minutes: number;
// }


// export interface NavigationConfig {
//   section_switching: boolean;

//   back_navigation: boolean;

//   previous_question: boolean;

//   next_question: boolean;

//   clear_response: boolean;

//   mark_for_review: boolean;

//   question_palette: boolean;
// }


// export interface BehaviorConfig {
//   shuffle_questions: boolean;

//   shuffle_options: boolean;

//   auto_submit: boolean;
// }


// export interface TestMetadata {
//   id: string;

//   title: string;

//   description: string;

//   instructions: string;

//   timing: TimingConfig;

//   navigation: NavigationConfig;

//   behavior: BehaviorConfig;

//   global_marking: MarkingScheme;

//   use_global_marking: boolean;
// }


// export interface TestSection {
//   id: string;

//   name: string;

//   description: string;

//   duration_minutes: number;

//   expected_question_count: number | null;

//   /**
//    * Section-level default marking.
//    *
//    * A question can override this.
//    */
//   marking: MarkingScheme;

//   question_ids: string[];

//   selection_mode:
//     | "automatic"
//     | "manual";

//   allow_section_switching: boolean;
// }


// export interface TestConfiguration {
//   test: TestMetadata;

//   sections: TestSection[];
// }


// export interface ConfigurationValidationResult {
//   valid: boolean;

//   errors: string[];

//   warnings: string[];
// }


// // ============================================================
// // ATTEMPT
// // ============================================================

// export type AttemptStatus =
//   | "NOT_STARTED"
//   | "IN_PROGRESS"
//   | "COMPLETED"
//   | "TIMED_OUT"
//   | "ABANDONED";


// export type RuntimeStatus =
//   | "NOT_VISITED"
//   | "NOT_ANSWERED"
//   | "ANSWERED"
//   | "MARKED_FOR_REVIEW"
//   | "ANSWERED_AND_MARKED";


// // ============================================================
// // CANDIDATE RESPONSE
// // ============================================================

// export interface AttemptResponse {
//   attempt_id: string;

//   question_id: string;

//   /**
//    * Used for choice-based questions.
//    *
//    * Examples:
//    *
//    * ["B"]
//    * ["A", "C"]
//    */
//   selected_answers: string[];

//   /**
//    * Used for integer/real/numerical questions.
//    *
//    * Stored as string to avoid floating-point issues.
//    */
//   numeric_value?: string | null;

//   /**
//    * Used for short and long answers.
//    */
//   text_answer?: string | null;

//   visited: boolean;

//   marked_for_review: boolean;

//   status: RuntimeStatus;

//   time_spent_seconds: number;

//   last_updated: string;
// }


// export interface Attempt {
//   attempt_id: string;

//   test_id: string;

//   start_time: string;

//   end_time: string | null;

//   status: AttemptStatus;

//   current_section: string | null;

//   current_question: string | null;

//   remaining_time_seconds: number;

//   section_timers: Record<
//     string,
//     {
//       remaining_seconds: number;
//       entered_at: string | null;
//       finished: boolean;
//     }
//   >;

//   submission_reason: string | null;

//   configuration: TestConfiguration;

//   questions: Question[];

//   responses: Record<string, AttemptResponse>;

//   events: {
//     tab_hidden_count: number;

//     tab_visible_count: number;

//     recent: unknown[];
//   };
// }


// // ============================================================
// // QUESTION RESULT
// // ============================================================

// export type QuestionEvaluationStatus =
//   | "correct"
//   | "wrong"
//   | "unattempted"
//   | "pending_evaluation"
//   | "partially_correct";


// export interface QuestionResult {
//   question_id: string;

//   section_id: string | null;

//   topic: string | null;

//   subtopic: string | null;

//   difficulty: string;

//   question_number: number | null;

//   time_spent_seconds: number;

//   visited: boolean;

//   marked_for_review: boolean;

//   runtime_status: RuntimeStatus;

//   status: QuestionEvaluationStatus;

//   /**
//    * Marks should eventually be returned by the backend
//    * using the authoritative scoring calculation.
//    */
//   marks: number | null;

//   /**
//    * Exact string representation of marks if required.
//    *
//    * Example:
//    *
//    * "-1/3"
//    */
//   marks_exact?: string | null;

//   selected_answers: string[];

//   correct_answer: string[];

//   is_correct: boolean | null;
// }


// // ============================================================
// // SCORING SUMMARY
// // ============================================================

// export interface ScoringSummary {
//   score: number;

//   maximum_score: number;

//   percentage: number;

//   attempted: number;

//   correct: number;

//   wrong: number;

//   unattempted: number;

//   pending_evaluation?: number;

//   accuracy: number;

//   total_questions: number;

//   question_results: QuestionResult[];
// }


// // ============================================================
// // ANALYTICS
// // ============================================================

// export interface AnalysisGroup {
//   id?: string;

//   name: string;

//   questions: number;

//   attempted: number;

//   correct: number;

//   wrong: number;

//   unattempted: number;

//   pending_evaluation?: number;

//   score: number;

//   accuracy: number;

//   average_time: number;

//   classification:
//     | "STRONG"
//     | "AVERAGE"
//     | "WEAK"
//     | "INSUFFICIENT DATA";
// }


// // ============================================================
// // RESULT
// // ============================================================

// export interface ResultPayload {
//   attempt_id: string;

//   test_id: string;

//   status: AttemptStatus;

//   submission_reason: string;

//   start_time: string;

//   end_time: string;

//   time_used_seconds: number;

//   configuration: TestConfiguration;

//   questions: Question[];

//   responses: Record<string, AttemptResponse>;

//   scoring: ScoringSummary;

//   analytics: {
//     section_analysis: AnalysisGroup[];

//     topic_analysis: AnalysisGroup[];

//     subtopic_analysis: AnalysisGroup[];

//     strengths: AnalysisGroup[];

//     weaknesses: AnalysisGroup[];

//     insufficient_topics: AnalysisGroup[];

//     display: {
//       score: number;
//       maximum_score: number;
//       percentage: number;
//       accuracy: number;
//     };
//   };

//   ai_analysis: Record<string, unknown> | null;
// }


// // ============================================================
// // HISTORY
// // ============================================================

// export interface HistoryItem {
//   attempt_id: string;

//   test_id: string;

//   title: string;

//   date: string;

//   status: AttemptStatus;

//   score: number | null;

//   maximum_score: number | null;

//   accuracy: number | null;

//   attempted: number | null;

//   total_questions: number | null;
// }



export type FileRole =
  | "question_paper"
  | "answer_key"
  | "explanation"
  | "other";

/* ============================================================
   QUESTION TYPES
============================================================ */

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "multiple_select"
  | "true_false"
  | "integer"
  | "real_number"
  | "numerical_tolerance"
  | "short_answer"
  | "long_answer"
  | "image_based"
  | "unknown";

export type AnswerInputMode =
  | "single_choice"
  | "multiple_select"
  | "integer"
  | "real_number"
  | "text"
  | "long_text";

export type EvaluationMode =
  | "automatic"
  | "manual";

export type ValidationStatus =
  | "valid"
  | "warning"
  | "error";

export type Difficulty =
  | "easy"
  | "medium"
  | "hard"
  | "unknown";

/* ============================================================
   QUESTION IMAGES / OPTIONS
============================================================ */

export interface QuestionImage {
  id?: string | null;
  path: string;
  filename?: string | null;
  mime_type?: string | null;
  alt_text?: string | null;
  width?: number | null;
  height?: number | null;

  type:
    | "question_image"
    | "page_render"
    | "embedded_image";

  page_number?: number | null;
}

export interface Option {
  id: string;
  text: string;
  images?: QuestionImage[];
}

/* ============================================================
   EXPLANATION
============================================================ */

export interface Explanation {
  text: string | null;
  images: QuestionImage[];
}

/* ============================================================
   NUMERICAL ANSWER
============================================================ */

export interface NumericalAnswer {
  value?: string | null;
  tolerance?: string | null;
  unit?: string | null;
}

/* ============================================================
   ANSWER CONFIGURATION
============================================================ */

export interface AnswerConfig {
  /*
   * Defines HOW the candidate answers the question.
   *
   * This is intentionally separate from marking.
   */
  input_mode?: AnswerInputMode | null;

  /*
   * Used for:
   * - single choice
   * - multiple select
   * - integer
   * - real number
   * - numerical tolerance
   * - true/false
   */
  correct_answers: string[];

  /*
   * Mainly used by short-answer questions.
   */
  accepted_answers: string[];

  /*
   * Used by numerical tolerance.
   */
  tolerance?: string | null;

  case_sensitive: boolean;

  evaluation: EvaluationMode;
}

/* ============================================================
   PER-QUESTION MARKING
============================================================ */

export interface MarkingRule {
  /*
   * Stored as strings intentionally.
   *
   * Example:
   * "1"
   * "1.5"
   * "-0.33"
   * "-1/3"
   */
  correct: string;

  /*
   * Marks awarded when answer is incorrect.
   */
  incorrect: string;

  /*
   * Marks awarded when question is unattempted.
   */
  unattempted: string;

  /*
   * Especially useful for descriptive/manual questions.
   */
  maximum_marks?: string | null;

  /*
   * When true, this question overrides
   * section/test default marking.
   */
  override_default: boolean;
}

/* ============================================================
   QUESTION
============================================================ */

export interface Question {
  id: string;

  question_number: number | null;

  section: string | null;

  topic: string | null;

  subtopic: string | null;

  question_type: QuestionType;

  question_text: string;

  question_images: QuestionImage[];

  options: Option[];

  /*
   * Legacy field retained for compatibility.
   */
  correct_answer: string[] | null;

  /*
   * New answer configuration.
   */
  answer_config: AnswerConfig;

  /*
   * Question-specific marking.
   */
  marking: MarkingRule;

  /*
   * Optional numerical configuration.
   */
  numerical_answer?: NumericalAnswer | null;

  explanation: Explanation | null;

  difficulty: Difficulty;

  source_page: number | null;

  confidence: number;

  validation_status: ValidationStatus;

  warnings: string[];
}

/* ============================================================
   EXTRACTION
============================================================ */

export interface ExtractionSummary {
  questions_found: number;
  valid: number;
  warnings: number;
  errors: number;

  pages_total: number;
  pages_processed: number;
  pages_ocr: number;
  pages_failed: number;

  warnings_list: string[];
}

export interface ExtractResponse {
  test_id: string;
  status: string;
  message: string;
  summary: ExtractionSummary;
  questions: Question[];
}

/* ============================================================
   TEST MARKING
============================================================ */

export interface MarkingScheme {
  /*
   * Strings are required so values like
   * "-0.33" and "-1/3" remain distinguishable.
   */
  correct: string;
  wrong: string;
  unattempted: string;
}

/* ============================================================
   TIMING
============================================================ */

export type TimingMode =
  | "single"
  | "section";

export interface TimingConfig {
  mode: TimingMode;
  total_minutes: number;
}

/* ============================================================
   NAVIGATION
============================================================ */

export interface NavigationConfig {
  section_switching: boolean;
  back_navigation: boolean;
  previous_question: boolean;
  next_question: boolean;
  clear_response: boolean;
  mark_for_review: boolean;
  question_palette: boolean;
}

/* ============================================================
   TEST BEHAVIOR
============================================================ */

export interface BehaviorConfig {
  shuffle_questions: boolean;
  shuffle_options: boolean;
  auto_submit: boolean;
}

/* ============================================================
   TEST METADATA
============================================================ */

export interface TestMetadata {
  id: string;

  title: string;

  description: string;

  instructions: string;

  timing: TimingConfig;

  navigation: NavigationConfig;

  behavior: BehaviorConfig;

  global_marking: MarkingScheme;

  use_global_marking: boolean;
}

/* ============================================================
   TEST SECTION
============================================================ */

export interface TestSection {
  id: string;

  name: string;

  description: string;

  duration_minutes: number;

  expected_question_count: number | null;

  marking: MarkingScheme;

  question_ids: string[];

  selection_mode:
    | "automatic"
    | "manual";

  allow_section_switching: boolean;
}

/* ============================================================
   CONFIGURATION
============================================================ */

export interface TestConfiguration {
  test: TestMetadata;
  sections: TestSection[];
}

export interface ConfigurationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/* ============================================================
   ATTEMPT
============================================================ */

export type AttemptStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "TIMED_OUT"
  | "ABANDONED";

export type RuntimeStatus =
  | "NOT_VISITED"
  | "NOT_ANSWERED"
  | "ANSWERED"
  | "MARKED_FOR_REVIEW"
  | "ANSWERED_AND_MARKED";

// export interface AttemptResponse {
//   attempt_id: string;

//   question_id: string;

//   /*
//    * All answers are transported as strings.
//    *
//    * This supports:
//    * - option IDs
//    * - integers
//    * - real numbers
//    * - text answers
//    */
//   selected_answers: string[];

//   visited: boolean;

//   marked_for_review: boolean;

//   status: RuntimeStatus;

//   time_spent_seconds: number;

//   last_updated: string;
// }

export interface AttemptResponse {
  attempt_id: string;

  question_id: string;

  /**
   * Used for choice-based questions.
   *
   * Examples:
   * ["B"]
   * ["A", "C"]
   *
   * For non-choice questions this should normally be [].
   */
  selected_answers: string[];

  /**
   * Used for integer, real-number and numerical-tolerance questions.
   *
   * Stored as string intentionally so values such as:
   *
   * 10
   * 10.5
   * 0.333333333
   *
   * are not altered by JavaScript floating-point conversion.
   */
  numeric_value?: string | null;

  /**
   * Used for short-answer questions.
   */
  text_answer?: string | null;

  visited: boolean;

  marked_for_review: boolean;

  status: RuntimeStatus;

  time_spent_seconds: number;

  last_updated: string;
}



export interface Attempt {
  attempt_id: string;

  test_id: string;

  start_time: string;

  end_time: string | null;

  status: AttemptStatus;

  current_section: string | null;

  current_question: string | null;

  remaining_time_seconds: number;

  section_timers: Record<
    string,
    {
      remaining_seconds: number;
      entered_at: string | null;
      finished: boolean;
    }
  >;

  submission_reason: string | null;

  configuration: TestConfiguration;

  questions: Question[];

  responses: Record<
    string,
    AttemptResponse
  >;

  events: {
    tab_hidden_count: number;
    tab_visible_count: number;
    recent: unknown[];
  };
}

/* ============================================================
   QUESTION RESULT
============================================================ */

export interface QuestionResult {
  question_id: string;

  section_id: string | null;

  topic: string | null;

  subtopic: string | null;

  difficulty: string;

  question_number: number | null;

  time_spent_seconds: number;

  visited: boolean;

  marked_for_review: boolean;

  runtime_status: RuntimeStatus;

  status:
    | "correct"
    | "wrong"
    | "unattempted";

  /*
   * NULL is important.
   *
   * It means the question is awaiting manual evaluation.
   */
  marks: number | null;

  selected_answers: string[];

  correct_answer: string[];

  is_correct: boolean | null;

  /*
   * Backend scoring includes this information
   * for automatically/manual evaluated questions.
   */
  evaluation?:
    | "automatic"
    | "manual";

  /*
   * Maximum marks applicable to this question.
   */
  maximum_marks?: number | null;
}

/* ============================================================
   SCORING SUMMARY
============================================================ */

export interface ScoringSummary {
  score: number;

  maximum_score: number;

  percentage: number;

  attempted: number;

  correct: number;

  wrong: number;

  unattempted: number;

  /*
   * Number of questions awaiting manual evaluation.
   */
  manual?: number;

  accuracy: number;

  total_questions: number;

  question_results: QuestionResult[];
}

/* ============================================================
   ANALYTICS
============================================================ */

export interface AnalysisGroup {
  id?: string;

  name: string;

  questions: number;

  attempted: number;

  correct: number;

  wrong: number;

  unattempted: number;

  score: number;

  accuracy: number;

  average_time: number;

  classification:
    | "STRONG"
    | "AVERAGE"
    | "WEAK"
    | "INSUFFICIENT DATA";
}

/* ============================================================
   RESULT PAYLOAD
============================================================ */

export interface ResultPayload {
  attempt_id: string;

  test_id: string;

  status: AttemptStatus;

  submission_reason: string;

  start_time: string;

  end_time: string;

  time_used_seconds: number;

  configuration: TestConfiguration;

  questions: Question[];

  responses: Record<
    string,
    AttemptResponse
  >;

  scoring: ScoringSummary;

  analytics: {
    section_analysis: AnalysisGroup[];

    topic_analysis: AnalysisGroup[];

    subtopic_analysis: AnalysisGroup[];

    strengths: AnalysisGroup[];

    weaknesses: AnalysisGroup[];

    insufficient_topics: AnalysisGroup[];

    display: {
      score: number;
      maximum_score: number;
      percentage: number;
      accuracy: number;
    };
  };

  ai_analysis:
    | Record<string, unknown>
    | null;
}

/* ============================================================
   HISTORY
============================================================ */

export interface HistoryItem {
  attempt_id: string;

  test_id: string;

  title: string;

  date: string;

  status: AttemptStatus;

  score: number | null;

  maximum_score: number | null;

  accuracy: number | null;

  attempted: number | null;

  total_questions: number | null;
}