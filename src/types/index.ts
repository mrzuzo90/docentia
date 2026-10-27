export interface SourceDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string; // extracted text
  pageCount?: number;
  base64Data?: string;
  mimeType?: string;
  uploadedAt: string;
}

export interface TestQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  points: number; // weight in exam
}

export interface OpenExercise {
  id: string;
  title: string;
  statement: string;
  rubricCriteria: string[]; // key criteria for grading
  solutionSteps: string; // full solution / model answer
  points: number; // weight in exam
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  targetLevel: string; // e.g. "2º Bachillerato", "4º ESO", "Grado Universitario"
  institution?: string; // e.g. "IES Ramiro de Maeztu / Dpto. de Ciencias"
  durationMinutes?: number;
  testPenalty?: number; // e.g. 0, 0.25, 0.33, 0.50 (penalty fraction per wrong answer)
  instructions?: string;
  status?: 'draft' | 'ready' | 'grading' | 'closed';
  createdAt: string;
  documents: SourceDocument[];
  testQuestions: TestQuestion[];
  exercises: OpenExercise[];
  totalScore: number; // Target max score (usually 10)
  testSectionWeight: number; // default e.g. 4.0
  exerciseSectionWeight: number; // default e.g. 6.0
}

export interface QuestionCorrection {
  questionId: string;
  type: 'test' | 'exercise';
  questionTitle: string;
  studentAnswer: string;
  ocrExtractedText: string;
  ocrConfidence: 'high' | 'medium' | 'low' | 'illegible';
  scoreAwarded: number;
  maxScore: number;
  feedback: string;
  needsManualReview: boolean;
  reviewReason?: string; // Reason why teacher must review
  reviewResolvedByTeacher?: boolean;
  teacherOverrideScore?: number;
  teacherComment?: string;
}

export interface StudentSubmission {
  id: string;
  examId: string;
  studentName: string;
  studentIdCode?: string; // DNI / Matrícula / Expediente
  submissionDate: string;
  scanImageUrl?: string; // Base64 or SVG data URI
  scanPdfName?: string;
  rawStudentText?: string;
  status: 'pending' | 'grading' | 'graded' | 'needs_review';
  gradeReport?: StudentGradeReport;
}

export interface StudentGradeReport {
  id: string;
  submissionId: string;
  studentName: string;
  testSectionScore: number; // weighted score earned in test section
  testSectionMax: number; // max weighted points for test section
  testSectionScoreOutOf10: number; // 0 to 10 evaluation of test section
  exerciseSectionScore: number; // weighted score earned in exercise section
  exerciseSectionMax: number; // max weighted points for exercise section
  exerciseSectionScoreOutOf10: number; // 0 to 10 evaluation of exercise section
  finalScore: number; // 0 to 10 final weighted grade
  corrections: QuestionCorrection[];
  overallFeedback: string;
  needsManualReview: boolean;
  manualReviewReasons: string[];
  gradedAt: string;
  reviewedByTeacherAt?: string;
}

export interface ExamGenerationConfig {
  numTestQuestions: number;
  numExercises: number;
  difficulty: 'fácil' | 'medio' | 'difícil' | 'avanzado';
  topicFocus?: string;
  customInstructions?: string;
  testSectionWeight: number;
  exerciseSectionWeight: number;
  testPenalty?: number;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

export type SubscriptionTierId = 'free' | 'pro_monthly' | 'pro_annual' | 'school';

export interface CreditTransaction {
  id: string;
  timestamp: string;
  description: string;
  creditsDelta: number; // negative for consumption, positive for topup/subscription
  balanceAfter: number;
  category: 'welcome' | 'generation' | 'grading' | 'pack_purchase' | 'subscription' | 'refund';
  estimatedAiCostEur?: number; // internal unit economics telemetry for SaaS owner
  amountPaidEur?: number; // revenue generated in EUR
}

export interface SubscriptionPlan {
  id: SubscriptionTierId;
  name: string;
  badge: string;
  priceEur: number;
  billingPeriod: 'mes' | 'año' | 'gratis';
  monthlyEquivalentEur: number;
  creditsIncluded: number;
  rolloverCredits: boolean;
  description: string;
  features: string[];
  highlighted?: boolean;
  stripePaymentLink?: string;
}

export interface CreditPack {
  id: string;
  name: string;
  badge: string;
  credits: number;
  priceEur: number;
  pricePerCreditEur: number;
  equivalentDescription: string;
  description: string;
  popular?: boolean;
  stripePaymentLink?: string;
}

export interface UserBillingAccount {
  userName: string;
  userEmail: string;
  institution: string;
  tierId: SubscriptionTierId;
  tierName: string;
  creditsBalance: number;
  monthlyAllowance: number;
  renewsAt?: string;
  cancelAtPeriodEnd?: boolean;
  totalExamsGenerated: number;
  totalSubmissionsGraded: number;
  totalSpentEur: number;
  totalEstimatedAiCostEur: number;
  transactions: CreditTransaction[];
}

