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

// All endpoints to try, in order
const ENDPOINTS = [
  'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
  'https://generativelanguage.googleapis.com/v1/models/{model}:generateContent',
];

// Models to try, in order
const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

async function callGemini(apiKey: string, prompt: string, asJson: boolean): Promise<string> {
  const key = (apiKey || '').trim();
  if (!key) throw new Error('GEMINI_API_KEY is empty');

  const errors: string[] = [];

  for (const model of MODELS) {
    for (const endpointTemplate of ENDPOINTS) {
      const url = endpointTemplate.replace('{model}', model);

      // Build request body
      const body: any = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
      };
      if (asJson) {
        body.generationConfig.responseMimeType = 'application/json';
      }

      // Try with ?key= query param
      try {
        const res = await fetch(`${url}?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json() as any;
        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
        if (data?.error) {
          errors.push(`[${model} ?key]: ${data.error.message || JSON.stringify(data.error)}`);
        }
      } catch (e) {
        errors.push(`[${model} ?key fetch error]: ${String(e)}`);
      }

      // Try with x-goog-api-key header
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key
          },
          body: JSON.stringify(body)
        });
        const data = await res.json() as any;
        if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
        if (data?.error) {
          errors.push(`[${model} header]: ${data.error.message || JSON.stringify(data.error)}`);
        }
      } catch (e) {
        errors.push(`[${model} header fetch error]: ${String(e)}`);
      }
    }
  }

  throw new Error(`All Gemini strategies failed:\n${errors.slice(-4).join('\n')}`);
}

export class GeminiJobClassifier {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = (apiKey || '').trim();
  }

  async classify(content: string, author: string, channelName: string): Promise<JobClassification> {
    if (!content || content.trim().length < 5) {
      return { is_hiring: false, reasoning: 'Content too short' };
    }

    if (!this.apiKey) {
      return { is_hiring: false, reasoning: 'GEMINI_API_KEY environment variable is empty.' };
    }

    const prompt = `Analyze this Discord post from #${channelName} (by ${author}) and return ONLY valid JSON:

Post:
"""
${content.slice(0, 1500)}
"""

Return JSON with these exact fields:
{
  "is_hiring": true or false,
  "job_title": "the role being hired for" or null,
  "company_or_project": "company/project name" or null,
  "job_type": "Full-time/Part-time/Freelance/Contract" or null,
  "location_remote": "Remote/Onsite/location" or null,
  "salary_budget": "salary or budget if mentioned" or null,
  "required_skills": ["skill1", "skill2"] or [],
  "summary": "one sentence summary of the post",
  "contact_info": "how to apply or DM info" or null,
  "reasoning": "brief reason for is_hiring decision"
}

is_hiring = true ONLY if an employer is OFFERING work/job. is_hiring = false if person is SEEKING work or self-promoting.`;

    try {
      const text = await callGemini(this.apiKey, prompt, true);
      // Strip markdown code fences if present
      const clean = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
      return JSON.parse(clean) as JobClassification;
    } catch (err) {
      const msg = String(err);
      console.error('[Gemini Classify Error]', msg);
      return { is_hiring: false, reasoning: msg };
    }
  }

  async chat(userPrompt: string, context: string): Promise<string> {
    if (!this.apiKey) {
      return 'Error: GEMINI_API_KEY is not set in Render environment variables.';
    }

    const prompt = `You are an AI assistant for a Discord hiring monitor bot.

${context}

User question: ${userPrompt}

Answer helpfully and concisely.`;

    try {
      return await callGemini(this.apiKey, prompt, false);
    } catch (err) {
      return `Gemini error: ${String(err).slice(0, 300)}`;
    }
  }
}
