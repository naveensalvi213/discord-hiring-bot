import { GoogleGenAI, Type } from '@google/genai';

export interface JobClassification {
  is_hiring: boolean;
  job_title?: string;
  company_or_project?: string;
  job_type?: string;
  location_remote?: string;
  salary_budget?: string;
  required_skills?: string[];
  summary?: string;
  contact_info?: string;
  reasoning?: string;
}

export class GeminiJobClassifier {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async classify(content: string, author: string, channelName: string): Promise<JobClassification> {
    if (!content || content.trim().length < 10) {
      return { is_hiring: false, reasoning: 'Content too short' };
    }

    const prompt = `
Analyze the following post from Discord channel #${channelName} (author: ${author}).
Determine if this post is an active HIRING opening (an employer/project owner offering work, hiring freelancers, or recruiting employees).

CRITICAL DISTINCTION:
- IS HIRING (is_hiring = true): "Looking for a React developer", "Hiring fullstack engineer", "Need a designer for project", "Paying $50/hr for logo design", "Job position open".
- NOT HIRING (is_hiring = false): "I am looking for work", "For Hire: Fullstack Dev available", "Check out my portfolio", general chatter, self-promotion, selling services, looking for a job.

Post content:
"""
${content}
"""
`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              is_hiring: { type: Type.BOOLEAN, description: 'True ONLY if the poster is offering work/hiring someone' },
              job_title: { type: Type.STRING, description: 'Job title or role name' },
              company_or_project: { type: Type.STRING, description: 'Company or project name if available' },
              job_type: { type: Type.STRING, description: 'Full-time, Part-time, Contract, Freelance, One-time task' },
              location_remote: { type: Type.STRING, description: 'Remote, hybrid, or specific location' },
              salary_budget: { type: Type.STRING, description: 'Salary or budget details' },
              required_skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Extracted key skills/stack' },
              summary: { type: Type.STRING, description: '2-3 sentence clean summary of what the employer needs' },
              contact_info: { type: Type.STRING, description: 'How to apply/contact (Discord DM, email, link)' },
              reasoning: { type: Type.STRING, description: 'Brief explanation of decision' }
            },
            required: ['is_hiring']
          }
        }
      });

      const text = response.text;
      if (!text) {
        return { is_hiring: false, reasoning: 'Empty response from Gemini' };
      }

      return JSON.parse(text) as JobClassification;
    } catch (error) {
      console.error('[Gemini] Error during classification:', error);
      return { is_hiring: false, reasoning: `Gemini error: ${error}` };
    }
  }
}
