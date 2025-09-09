import {
  QuestionType,
  ScriptCategory,
  ScriptStatus,
} from '../enums/call-scripts.enum';

export const initialCallScripts = [
  {
    title: 'Medication Reminder',
    category: ScriptCategory.MEDICATION_REMINDER,
    opening_message: `Hello , this is Sarah, your check-in assistant from WyzeCare. I'm calling as part of your scheduled check-in — is now a good time to talk for a moment?`,
    closing_message: `Thank you for your time, We'll check in again at the next scheduled time.`,
    estimated_duration: 600,
    description:
      'This is the script to remind patients about taking their medication properly and on time',
    status: ScriptStatus.ACTIVE,
    version: 'v1.0',
    questions: [
      {
        question_text: `Did you take your medication on time?`,
        question_type: QuestionType.YES_NO,
        yes_response: `Great! I’m glad to hear that. Thank you for staying on top of it!`,
        no_response: `No problem. Just a gentle reminder to take it as soon as you can. Do you need any help remembering later?`,
        question_order: 1,
      },
      {
        question_text: `Do you ever have trouble remembering to take your medication?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 2,
      },
      {
        question_text: `Is everything okay with your medication routine today?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 3,
      },
    ],
  },

  {
    title: 'Safety Check',
    category: ScriptCategory.SAFETY_CHECK,
    opening_message: `Hello, this is Sarah from WyzeCare. I'm checking in to make sure you’re safe and comfortable at home. May I ask you a few quick questions?`,
    closing_message: `Thank you for sharing with me. Your safety is very important to us. Take care, and we’ll check in again soon.`,
    estimated_duration: 600,
    description:
      'Script to assess patient safety and living environment conditions.',
    status: ScriptStatus.ACTIVE,
    version: 'v1.0',
    questions: [
      {
        question_text: `Have you had any falls or accidents recently?`,
        question_type: QuestionType.YES_NO,
        question_order: 1,
      },
      {
        question_text: `Is everything working properly in your home?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 2,
      },
      {
        question_text: `Do you feel safe in your home today?`,
        question_type: QuestionType.YES_NO,
        question_order: 3,
      },
      {
        question_text: `Do you have everything you need right now?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 4,
      },
    ],
  },

  {
    title: 'Mood Assessment',
    category: ScriptCategory.MOOD_ASSESSMENT,
    opening_message: `Hello, this is Sarah from WyzeCare. I’d like to ask a few questions to understand how you’ve been feeling lately. Is that okay?`,
    closing_message: `Thank you for sharing how you’ve been feeling. Remember, it’s always okay to talk about your feelings. Take care until next time.`,
    estimated_duration: 600,
    description: 'Script to assess patient mood and emotional well-being.',
    status: ScriptStatus.ACTIVE,
    version: 'v1.0',
    questions: [
      {
        question_text: `Have you been feeling happy, sad, anxious, or maybe a little lonely?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 1,
      },
      {
        question_text: `Have you been sleeping okay lately?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 2,
      },
      {
        question_text: `Have you still been enjoying your usual activities, or has that changed?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 3,
      },
      {
        question_text: `Have you been spending time with anyone or talking to friends or family?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 4,
      },
      {
        question_text: `Is there anything you’d like to talk about or share with me today?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 5,
      },
    ],
  },

  {
    title: 'Daily Wellness Check',
    category: ScriptCategory.WELLNESS_CHECK,
    opening_message: `Hi, this is Sarah from WyzeCare. I’d like to do a quick wellness check with you today. Can I ask you a few questions about how you’re feeling?`,
    closing_message: `Thank you for updating me on your wellness today. We’ll check in again soon to make sure everything is going well.`,
    estimated_duration: 600,
    description: 'Script for a general daily wellness check-in with patients.',
    status: ScriptStatus.ACTIVE,
    version: 'v1.0',
    questions: [
      {
        question_text: `Did you sleep well last night?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 1,
      },
      {
        question_text: `How has your appetite been? Did you eat well today or yesterday?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 2,
      },
      {
        question_text: `How's your energy level today? Do you feel tired or more energetic than usual?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 3,
      },
      {
        question_text: `Are you feeling any pain or discomfort anywhere in your body?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 4,
      },
      {
        question_text: `How is your mood today? Do you feel happy, sad, anxious, or something else?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 5,
      },
      {
        question_text: `Have you had any accidents or unusual symptoms lately? For example, did you fall, feel dizzy, or feel confused?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 6,
      },
      {
        question_text: `Is there anything else you'd like to share or talk about today?`,
        question_type: QuestionType.OPEN_ENDED,
        question_order: 7,
      },
    ],
  },
];
